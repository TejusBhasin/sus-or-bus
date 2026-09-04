import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { runAnalysis, type Finding } from '../../shared/analysisSignals.ts';
import { hashString, makeRng, pick, fillTemplate, TITLE_BANKS, DESC_BANKS, SUMMARY_KEYS, VARIANTS_PER_KEY, expandSummaryVariant } from '../../shared/wordBank.ts';

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML = 50000;
const GENERIC_TITLE = 'Attention needed';

function extractMeta(html: string, attr: string, key: string): string {
  const re = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function hostOf(u: string): string {
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return '';
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const inputType = body.inputType;
    const content = (body.content || '').trim();
    const fileUrl = (body.fileUrl || '').trim();
    const fileName = (body.fileName || '').trim();

    if (!['url', 'html', 'code', 'email', 'text', 'document'].includes(inputType)) {
      return Response.json({ error: 'Invalid input type' }, { status: 400 });
    }
    if (inputType === 'document') {
      if (!fileUrl) return Response.json({ error: 'A document file is required' }, { status: 400 });
    } else if (!content) {
      return Response.json({ error: 'Content is required' }, { status: 400 });
    }

    let analysisContent = content;
    let url = '';
    let sourceCode = '';
    const preview = { title: '', description: '', status: null, finalUrl: '', fetchError: '' };

    if (inputType === 'url') {
      let u = content;
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      try {
        const p = new URL(u);
        p.host = p.host.toLowerCase(); // normalize so shared-cache lookups always match
        u = p.origin + (p.pathname && p.pathname !== '/' ? p.pathname : '') + p.search + p.hash;
      } catch {}
      url = u;
      // Shared cache: if anyone scanned this exact site in the last 7 days,
      // reuse that report — zero analysis work, zero credits.
      const recent = await base44.asServiceRole.entities.Report.filter(
        { input_type: 'url', url: u },
        '-created_date',
        1
      );
      const prev = recent && recent[0];
      if (prev && Date.now() - new Date(prev.created_date).getTime() < 7 * 24 * 60 * 60 * 1000) {
        return Response.json({
          verdict: prev.verdict,
          score: prev.score,
          summary: prev.simple_summary || prev.summary,
          points: prev.points || [],
          details: prev.details || {},
          preview: {
            title: prev.preview_title || '',
            description: prev.preview_description || '',
            status: null,
            finalUrl: u,
            fetchError: ''
          },
          sourceCode: prev.source_code || '',
          reportId: prev.id,
          cached: true
        });
      }
      try {
        const resp = await fetch(u, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
          redirect: 'follow',
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        });
        const html = await resp.text();
        analysisContent = html.slice(0, MAX_HTML);
        sourceCode = html.slice(0, 20000);
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        preview.title = titleMatch ? titleMatch[1].trim() : '';
        preview.description = extractMeta(html, 'name', 'description') || extractMeta(html, 'property', 'og:description');
        preview.status = resp.status;
        preview.finalUrl = resp.url;
      } catch (e) {
        preview.fetchError = e.message;
      }
    }

    // Documents: fetch the file and pull out readable text ourselves.
    let docText = '';
    if (inputType === 'document') {
      preview.title = fileName || 'Uploaded document';
      try {
        const resp = await fetch(fileUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        docText = await resp.text();
      } catch (e) {
        preview.fetchError = e.message;
      }
    }

    /* ---------- Deterministic analysis (zero AI, zero credits) ---------- */

    const siteProblem = preview.fetchError
      ? 'it could not be reached'
      : preview.status && preview.status >= 400
        ? `it answered with HTTP ${preview.status}`
        : '';
    const analysis = runAnalysis(
      inputType,
      inputType === 'url' ? url : (inputType === 'document' ? '' : content),
      inputType === 'url' ? analysisContent : '',
      fileName,
      docText,
      siteProblem
    );

    // Wording: every phrase is picked from variant banks with a seeded RNG
    // (seed rotates daily so re-scans read fresh) and filled with the concrete
    // facts the engine found.
    const daySalt = Math.floor(Date.now() / 86400000);
    const normInput = (inputType === 'url' ? url : content).toLowerCase();
    const rng = makeRng(hashString(normInput + '|' + daySalt));

    const points = analysis.findings.map((f: Finding) => {
      const titles = TITLE_BANKS[f.id] || [f.id.replace(/_/g, ' ')];
      const descs = DESC_BANKS[f.id] || {
        tech: ['Flagged by the deterministic safety engine.'],
        simple: ['Something about this was flagged as a caution point.']
      };
      return {
        title: fillTemplate(pick(rng, titles), f.values),
        severity: f.severity,
        category: f.category,
        description: fillTemplate(pick(rng, descs.tech), f.values),
        simple_description: fillTemplate(pick(rng, descs.simple), f.values)
      };
    });

    // Summaries: 500 variants per tone live in the WordingBank database.
    // Pick one by a stable index; fall back to the in-code bank if needed.
    const topBad = points.find((p) => p.severity === 'bad');
    const redCount = points.filter((p) => p.severity === 'bad').length;
    const siteLabel = hostOf(url) || (inputType === 'document' ? fileName : 'this input');
    const summaryValues = {
      host: siteLabel,
      top: (topBad ? topBad.title : 'no notable findings').toLowerCase(),
      n: redCount,
      score: analysis.score,
      detail: siteProblem || 'it could not be reached'
    };

    async function pickSummary(key: string): Promise<string> {
      const idx = hashString(key + '|' + normInput + '|' + daySalt) % VARIANTS_PER_KEY;
      try {
        const rows = await base44.asServiceRole.entities.WordingBank.filter({ key, idx }, '-created_date', 1);
        if (rows && rows[0] && rows[0].text) return fillTemplate(rows[0].text, summaryValues);
      } catch {}
      return fillTemplate(expandSummaryVariant(key, idx), summaryValues);
    }

    const techKey = analysis.verdict === 'bus' ? (siteProblem ? 'bus_error' : 'bus_tech') : 'sus_tech';
    const simpleKey = analysis.verdict === 'bus' ? (siteProblem ? 'bus_error_simple' : 'bus_simple') : 'sus_simple';
    const summary = await pickSummary(techKey);
    const simpleSummary = await pickSummary(simpleKey);

    if (!sourceCode && (inputType === 'html' || inputType === 'code')) {
      sourceCode = content.slice(0, 20000);
    }

    const details = {
      title: preview.title || siteLabel,
      description: preview.description,
      dataCollected: analysis.dataCollected,
      trackers: analysis.trackers,
      technologies: analysis.technologies,
      redFlags: analysis.redFlags,
      greenFlags: analysis.greenFlags,
      codeNotes: analysis.codeNotes,
      simple_code_notes: analysis.simpleCodeNotes
    };

    const report = await base44.asServiceRole.entities.Report.create({
      input_type: inputType,
      input_content: inputType === 'document' ? `Document: ${fileName || 'uploaded file'}` : content.slice(0, 5000),
      url: inputType === 'document' ? fileUrl : url,
      verdict: analysis.verdict,
      score: analysis.score,
      summary,
      simple_summary: simpleSummary,
      points,
      details,
      preview_title: preview.title,
      preview_description: preview.description,
      source_code: sourceCode
    });

    return Response.json({
      verdict: analysis.verdict,
      score: analysis.score,
      summary,
      points,
      details,
      preview,
      sourceCode,
      reportId: report.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}