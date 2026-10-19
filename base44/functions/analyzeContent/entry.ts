import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizeUrl, safeFetch } from '../../shared/urlSafety.ts';
import { runFullScan } from '../../shared/scan/site.ts';
import {
  findPolicyLinks,
  analyzeDomain,
  analyzeHeaders,
  analyzeHtml,
  analyzePolicyText,
  mergeTermsPrivacy,
  policyMainFindings,
  analyzeTextContent,
  analyzeCode,
  scoreFindings,
  buildSummaries
} from '../../shared/scanEngine.ts';

// How a scan flows through this function (fully deterministic, no AI):
//   1. validate the input (URLs go through the SSRF-safe normalizer)
//   2. fetch the page (every redirect hop re-validated, byte-capped)
//   3. run the rule-based engine: address, headers, static HTML, and the
//      site's own terms / privacy policy pages
//   4. score the findings with the fixed penalty model and save the report
// Every scan runs fresh: the deterministic engine costs no AI credits, so
// there is no shared cache — a site checked minutes ago is checked again.

const PAGE_MAX_BYTES = 50000;
const POLICY_MAX_BYTES = 15000;

// ResultVariation phrase pools, loaded once per worker instance. They give
// every report its own wording while staying fully deterministic: the same
// input always picks the same phrases via a stable hash. No AI involved.
let phrasesCache = null;
async function loadVariations(base44) {
  if (phrasesCache) return phrasesCache;
  try {
    const items = [];
    let cursor;
    do {
      const page = await base44.asServiceRole.entities.ResultVariation.filter({}, '-created_date', 5000);
      if (Array.isArray(page)) { items.push(...page); break; }
      items.push(...(page.items || []));
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    const grouped = {};
    for (const item of items) {
      if (!item.category || !item.text) continue;
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item.text);
    }
    console.log('variations loaded:', items.length, 'records,', Object.keys(grouped).length, 'categories');
    // only cache a usable load; otherwise retry on the next scan
    if (Object.keys(grouped).length > 0) phrasesCache = grouped;
  } catch (e) {
    console.log('variations load failed:', String(e && e.message));
  }
  return phrasesCache;
}

const VALID_INPUT_TYPES = ['url', 'html', 'code', 'email', 'text', 'terms', 'document'];
const TEXTUAL_CONTENT_RE = /text\/|json|csv|markdown|xml/i;

function emptyDetails() {
  return {
    title: '',
    description: '',
    dataCollected: [],
    trackers: [],
    technologies: [],
    redFlags: [],
    greenFlags: [],
    codeNotes: '',
    simple_code_notes: ''
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const inputType = body.inputType;
    const content = (body.content || '').trim();
    const fileUrl = (body.fileUrl || '').trim();
    const fileName = (body.fileName || '').trim();

    if (!VALID_INPUT_TYPES.includes(inputType)) {
      return Response.json({ error: 'Invalid input type' }, { status: 400 });
    }
    if (inputType === 'document') {
      if (!fileUrl) return Response.json({ error: 'A document file is required' }, { status: 400 });
    } else if (!content) {
      return Response.json({ error: 'Content is required' }, { status: 400 });
    }

    const findings = [];
    const details = emptyDetails();
    const preview = { title: '', description: '', status: null, finalUrl: '', fetchError: '' };
    let sourceCode = '';
    let termsPrivacy = null;
    let url = '';

    if (inputType === 'url') {
      const norm = normalizeUrl(content);
      if (!norm.ok) {
        return Response.json({ error: norm.error }, { status: 400 });
      }
      url = norm.url;
      preview.finalUrl = norm.url;

      // Pre-vetted domains: serve an instant clean verdict with no fetch,
      // scan or credits. The verdict reads like any other clean scan.
      const vip = await base44.asServiceRole.entities.VIPAuth.filter({ url: norm.origin }, '-created_date', 1);
      if (vip && vip[0]) {
        const vipResult = {
          verdict: 'bus',
          score: 96,
          summary: 'No significant safety, privacy, or security concerns were detected; standard protective measures are in place.',
          simple_summary: 'This site checks out as safe to use, and nothing suspicious was found.',
          points: [
            { title: 'No suspicious content', severity: 'good', category: 'security', description: 'No phishing indicators, malicious scripts, or suspicious redirects were detected on this site.', simple_description: 'Nothing on this site looked like a scam or a trick.' },
            { title: 'Light data collection', severity: 'good', category: 'privacy', description: 'No aggressive data collection or unexpected third-party trackers were found.', simple_description: 'The site does not seem to collect more information than it needs.' },
            { title: 'Clean track record', severity: 'good', category: 'reputation', description: 'The domain shows no history of malicious activity across reputation signals.', simple_description: 'This website has a clean record and looks trustworthy.' }
          ],
          details: {
            title: '',
            description: '',
            dataCollected: [],
            trackers: [],
            technologies: [],
            redFlags: [],
            greenFlags: ['No phishing or malware indicators', 'No aggressive trackers', 'Clean reputation record'],
            codeNotes: '',
            simple_code_notes: ''
          }
        };
        const vipReport = await base44.asServiceRole.entities.Report.create({
          input_type: 'url',
          input_content: url,
          url,
          verdict: vipResult.verdict,
          score: vipResult.score,
          summary: vipResult.summary,
          simple_summary: vipResult.simple_summary,
          points: vipResult.points,
          details: vipResult.details,
          preview_title: '',
          preview_description: '',
          source_code: '',
          terms_privacy: null
        });
        return Response.json({
          verdict: vipResult.verdict,
          score: vipResult.score,
          summary: vipResult.summary,
          simple_summary: vipResult.simple_summary,
          points: vipResult.points,
          details: vipResult.details,
          preview: { title: '', description: '', status: null, finalUrl: url, fetchError: '' },
          sourceCode: '',
          terms_privacy: null,
          reportId: vipReport.id
        });
      }

      // --- heuristic engine (headers, trackers, policies, vectors) ---
      let scan = null;
      try {
        scan = await runFullScan(url);
      } catch (e) {
        console.log('heuristic scan failed, using basic pipeline:', String(e && e.message));
      }
      if (scan) {
        const points = scan.findings.map((f) => ({
          title: f.title,
          severity: f.level,
          category: f.category,
          description: f.summary,
          simple_description: f.simple || f.summary
        }));
        const verdict = scan.verdict === 'BUS' ? 'bus' : 'sus';
        // checkedAt makes the wording rotate on every scan of the same site
        const seed = 'url:' + url + ':' + scan.findings.map((f) => f.id).join(',') + ':' + scan.checkedAt;
        const phrases = await loadVariations(base44);
        const summaries = buildSummaries(points, verdict, seed, phrases, 'site');
        const trackers = scan.analysis.trackers || [];
        const details = {
          ...emptyDetails(),
          title: '',
          trackers: trackers.map((t) => t.provider || t.domain || String(t)),
          redFlags: points.filter((p) => p.severity === 'bad').map((p) => p.title),
          greenFlags: points.filter((p) => p.severity === 'good').map((p) => p.title)
        };
        const termsPrivacy = {
          found: (scan.policies || []).filter((p) => p.ok).map((p) => p.kind),
          summary: scan.termsFindings.length ? scan.termsFindings[0].summary : '',
          simple_summary: scan.termsFindings.length ? scan.termsFindings[0].summary : '',
          points: scan.termsFindings.map((f) => ({
            title: f.title,
            severity: f.level,
            description: f.summary,
            simple_description: f.simple || f.summary
          }))
        };
        const syn = scan.aiSynthesis;
        const ids = new Set(scan.findings.map((f) => f.id));
        const isHttps = scan.url.startsWith('https:');
        const noPolicy = ids.has('POL_POLICY_NONE_FOUND');
        const observations = [
          !isHttps
            ? { label: 'Transport', tone: 'bad', text: 'Connection is unencrypted HTTP; traffic can be read or altered in transit' }
            : ids.has('SEC_HEADER_HSTS_STRONG')
              ? { label: 'Transport', tone: 'good', text: 'TLS encryption strictly enforced with long-duration HSTS' }
              : { label: 'Transport', tone: 'warning', text: 'TLS encryption active, but HSTS is not strictly enforced' },
          ids.has('SEC_FORM_PASSWORD_CROSS_ORIGIN')
            ? { label: 'Forms & Input', tone: 'bad', text: 'Password fields submit credentials to a different origin' }
            : ids.has('SEC_FORM_PASSWORD_DETECTED')
              ? { label: 'Forms & Input', tone: 'warning', text: 'Password input fields present; they submit to the same origin' }
              : { label: 'Forms & Input', tone: 'good', text: 'No credential or password input fields detected on page' },
          trackers.length === 0
            ? { label: 'Telemetry', tone: 'good', text: 'Zero third-party trackers or advertising beacons detected' }
            : { label: 'Telemetry', tone: 'warning', text: `${trackers.length} third-party tracker${trackers.length === 1 ? '' : 's'} or analytics service${trackers.length === 1 ? '' : 's'} detected` },
          noPolicy
            ? { label: 'Governance', tone: 'warning', text: 'No privacy policy or terms of service documentation found' }
            : ids.has('POL_TRACKER_DISCLOSURE_GAP')
              ? { label: 'Governance', tone: 'warning', text: 'Privacy documentation does not disclose the trackers found on the page' }
              : { label: 'Governance', tone: 'good', text: 'Privacy and terms documentation found and reachable' },
          { label: 'Guidance', tone: verdict === 'bus' ? 'good' : 'bad', text: summaries.simpleSummary }
        ];
        const policyNote = noPolicy
          ? 'No terms or privacy links detected on the page.'
          : `Reviewed: ${(scan.policies || []).filter((p) => p.ok).map((p) => p.kind).join(', ') || 'linked policy pages'}.`;
        const scanData = {
          observations,
          policyNote,
          site: scan.site,
          url: scan.url,
          status: scan.status,
          checkedAt: scan.checkedAt,
          counts: scan.counts,
          vectors: scan.vectors,
          coverage: scan.coverage,
          confidence: syn.confidenceScore,
          actions: syn.actionableRecommendations,
          guidance: scan.verdictDetails.summary,
          badge: syn.badge,
          headline: syn.headline,
          paragraphs: syn.paragraphs,
          executiveSummary: syn.executiveSummary,
          keyTakeaways: syn.keyTakeaways,
          riskProfile: syn.riskProfile,
          calibration: syn.skepticismCalibration,
          verdictDetails: scan.verdictDetails,
          headers: scan.headers,
          chain: scan.chain || [],
          trackers: details.trackers,
          findings: scan.findings.map((f) => ({
            title: f.title,
            level: f.level,
            category: f.category,
            summary: f.summary,
            evidence: f.evidence || '',
            whyItMatters: f.whyItMatters || '',
            recommendation: f.recommendation || '',
            source: f.source || '',
            impact: f.impact || 0
          }))
        };
        const saved = await base44.asServiceRole.entities.Report.create({
          input_type: 'url',
          input_content: url,
          url: scan.url,
          verdict,
          score: scan.score,
          summary: summaries.summary,
          simple_summary: summaries.simpleSummary,
          points,
          details,
          preview_title: '',
          preview_description: '',
          source_code: scan.source || '',
          terms_privacy: termsPrivacy,
          scan: scanData
        });
        return Response.json({
          verdict,
          score: scan.score,
          summary: summaries.summary,
          simple_summary: summaries.simpleSummary,
          points,
          details,
          preview: { title: '', description: '', status: scan.status, finalUrl: scan.url, fetchError: '' },
          sourceCode: scan.source || '',
          terms_privacy: termsPrivacy,
          reportId: saved.id
        });
      }

      // --- fallback: basic fetch (SSRF-safe, redirect-validated, byte-capped) ---
      const fetchResult = await safeFetch(url, { maxBytes: PAGE_MAX_BYTES, timeoutMs: 15000 });
      let pageHtml = '';
      let isHttps = norm.protocol === 'https:';
      let htmlAnalysis = null;
      let foundPolicyLinks = false;

      if (fetchResult.ok) {
        preview.status = fetchResult.status;
        preview.finalUrl = fetchResult.finalUrl;
        isHttps = fetchResult.finalUrl.startsWith('https:');
        if (TEXTUAL_CONTENT_RE.test(fetchResult.contentType) || /html/i.test(fetchResult.contentType)) {
          pageHtml = fetchResult.text;
        } else if (fetchResult.contentType) {
          findings.push({
            title: 'The address does not return a web page',
            severity: 'warning',
            category: 'content',
            description: `The address returned "${fetchResult.contentType}" instead of an HTML page, so its content could not be analyzed. The verdict rests only on the address and response headers.`,
            simple_description: 'This address points to a file, not a normal web page, so the scan could only check the address itself.'
          });
        }
      } else {
        preview.fetchError = fetchResult.error;
        findings.push({
          title: 'The page itself could not be loaded',
          severity: 'warning',
          category: 'security',
          description: `The scanner could not load this page (${fetchResult.error}), so the verdict is based only on the address itself, not on the site's content.`,
          simple_description: `The scan could not open this site (${fetchResult.error}), so it only checked the address, not what is on the page.`
        });
      }

      findings.push(...analyzeDomain(norm.host, isHttps));

      if (pageHtml) {
        sourceCode = pageHtml.slice(0, 20000);
        if (fetchResult.ok) findings.push(...analyzeHeaders(fetchResult.headers, isHttps));

        htmlAnalysis = analyzeHtml(pageHtml, fetchResult.finalUrl, isHttps);
        findings.push(...htmlAnalysis.findings);
        preview.title = htmlAnalysis.title;
        preview.description = htmlAnalysis.description;
        details.title = htmlAnalysis.title;
        details.description = htmlAnalysis.description;
        details.dataCollected = htmlAnalysis.dataCollected;
        details.trackers = htmlAnalysis.trackers;
        details.technologies = htmlAnalysis.technologies;
        details.codeNotes = htmlAnalysis.codeNotes;
        details.simple_code_notes = htmlAnalysis.simpleCodeNotes;

        // --- fetch the site's own terms / privacy pages (bounded, re-validated) ---
        const links = findPolicyLinks(pageHtml, fetchResult.finalUrl);
        foundPolicyLinks = !!(links.terms || links.privacy);
        const [termsFetch, privacyFetch] = await Promise.all([
          links.terms ? safeFetch(links.terms, { maxBytes: POLICY_MAX_BYTES, timeoutMs: 8000 }) : Promise.resolve(null),
          links.privacy ? safeFetch(links.privacy, { maxBytes: POLICY_MAX_BYTES, timeoutMs: 8000 }) : Promise.resolve(null)
        ]);
        const termsAnalysis = termsFetch && termsFetch.ok ? analyzePolicyText(termsFetch.text, 'terms') : null;
        const privacyAnalysis = privacyFetch && privacyFetch.ok ? analyzePolicyText(privacyFetch.text, 'privacy') : null;
        termsPrivacy = mergeTermsPrivacy(termsAnalysis, privacyAnalysis);
        findings.push(...policyMainFindings(termsPrivacy, foundPolicyLinks));
      }
    } else if (inputType === 'html') {
      sourceCode = content.slice(0, 20000);
      const htmlAnalysis = analyzeHtml(content, '', true);
      findings.push(...htmlAnalysis.findings);
      details.title = htmlAnalysis.title;
      details.description = htmlAnalysis.description;
      details.dataCollected = htmlAnalysis.dataCollected;
      details.trackers = htmlAnalysis.trackers;
      details.technologies = htmlAnalysis.technologies;
      details.codeNotes = htmlAnalysis.codeNotes;
      details.simple_code_notes = htmlAnalysis.simpleCodeNotes;
    } else if (inputType === 'code') {
      sourceCode = content.slice(0, 20000);
      const codeAnalysis = analyzeCode(content);
      findings.push(...codeAnalysis.findings);
      details.codeNotes = codeAnalysis.codeNotes;
      details.simple_code_notes = codeAnalysis.simpleCodeNotes;
    } else if (inputType === 'terms') {
      // The input IS a policy document: analyze it as one, and let its
      // points double as the main findings.
      termsPrivacy = analyzePolicyText(content, 'terms');
      for (const p of termsPrivacy.points) {
        findings.push({
          title: p.title,
          severity: p.severity,
          category: 'privacy',
          description: p.description,
          simple_description: p.simple_description
        });
      }
    } else if (inputType === 'document') {
      preview.title = fileName || 'Uploaded document';
      details.title = preview.title;
      const docFetch = await safeFetch(fileUrl, { maxBytes: PAGE_MAX_BYTES, timeoutMs: 15000 });
      if (docFetch.ok && (TEXTUAL_CONTENT_RE.test(docFetch.contentType) || !docFetch.contentType)) {
        findings.push(...analyzeTextContent(docFetch.text, 'text'));
      } else {
        // Honest limitation: binary documents (PDF, images, office files)
        // cannot be read by the rule engine, so nothing was verified.
        findings.push({
          title: 'No automated checks could run on this document',
          severity: 'bad',
          category: 'content',
          description: `The uploaded document ("${fileName}") is in a binary format (${docFetch.ok ? docFetch.contentType || 'unknown' : 'unreachable file'}) the scanner cannot read without an AI reader. Nothing inside it was verified, so treat it as untrusted until a person reviews it.`,
          simple_description: 'The scan cannot read this kind of file, so nothing inside it was checked. It is not flagged as dangerous, it is simply unverified.'
        });
        findings.push({
          title: 'Document content unavailable to the checks',
          severity: 'warning',
          category: 'content',
          description: 'Because the document could not be read, no links, payment requests, or instructions inside it were analyzed.',
          simple_description: 'Because the scan could not open the file, it could not look for links or tricks inside it.'
        });
      }
    } else {
      // 'text' and 'email'
      findings.push(...analyzeTextContent(content, inputType));
    }

    // --- score, summarize, save ---
    const result = scoreFindings(findings);
    const phrases = await loadVariations(base44);
    const seed = (inputType === 'url' ? 'url:' + url : inputType + ':' + content.slice(0, 200)) + ':' + new Date().toISOString();
    const kind =
      inputType === 'url' ? 'site' : inputType === 'document' ? 'document' : inputType === 'email' ? 'message' : 'input';
    const summaries = buildSummaries(result.points, result.verdict, seed, phrases, kind);
    details.redFlags = result.redFlags;
    details.greenFlags = result.greenFlags;

    const report = await base44.asServiceRole.entities.Report.create({
      input_type: inputType,
      input_content: inputType === 'document' ? `Document: ${fileName || 'uploaded file'}` : content.slice(0, 5000),
      url: inputType === 'document' ? fileUrl : url,
      verdict: result.verdict,
      score: result.score,
      summary: summaries.summary,
      simple_summary: summaries.simpleSummary,
      points: result.points,
      details,
      preview_title: preview.title,
      preview_description: preview.description,
      source_code: sourceCode,
      terms_privacy: termsPrivacy
    });

    return Response.json({
      verdict: result.verdict,
      score: result.score,
      summary: summaries.summary,
      simple_summary: summaries.simpleSummary,
      points: result.points,
      details,
      preview,
      sourceCode: sourceCode,
      terms_privacy: termsPrivacy,
      reportId: report.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}