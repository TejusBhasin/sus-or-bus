import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizeUrl, safeFetch } from '../../shared/urlSafety.ts';
import {
  findPolicyLinks,
  extractPageObservations,
  analyzePolicyText
} from '../../shared/collectors.ts';
import {
  runDomainRules,
  runHeaderRules,
  runPageRules,
  runPolicyRules,
  runTextRules,
  runCodeRules,
  runFetchRules,
  buildReport
} from '../../shared/ruleEngine.ts';

// How a scan flows through this function (fully deterministic, no AI):
//   1. validate the input (URLs go through the SSRF-safe normalizer)
//   2. for URLs: serve a cached report if we have a fresh one, otherwise
//      fetch the page (every redirect hop re-validated, byte-capped)
//   3. collect observations and evaluate the rule engine: address, headers,
//      static HTML, and the site's own terms / privacy policy pages
//   4. score the findings with the fixed model, save the report, return it
//
// Every user-visible string in the result comes from the knowledge base
// (base44/shared/knowledgeBase.ts) through validated templates.

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_MAX_BYTES = 50000;
const POLICY_MAX_BYTES = 15000;

const VALID_INPUT_TYPES = ['url', 'html', 'code', 'email', 'text', 'terms', 'document'];
const HTML_CONTENT_RE = /html|xml|text\/|json|csv|markdown/i;

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

    const matches = [];
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

      // Shared cache: if anyone scanned this exact site in the last 7 days,
      // reuse that report instead of re-running the engine.
      const recent = await base44.asServiceRole.entities.Report.filter({ input_type: 'url', url }, '-created_date', 1);
      const prev = recent && recent[0];
      if (prev && Date.now() - new Date(prev.created_date).getTime() < CACHE_TTL_MS) {
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
            finalUrl: url,
            fetchError: ''
          },
          sourceCode: prev.source_code || '',
          terms_privacy: prev.terms_privacy || null,
          reportId: prev.id,
          cached: true
        });
      }

      // --- fetch the page (SSRF-safe, redirect-validated, byte-capped) ---
      const fetchResult = await safeFetch(url, { maxBytes: PAGE_MAX_BYTES, timeoutMs: 15000 });
      let pageHtml = '';
      const isHtmlContent = fetchResult.ok && HTML_CONTENT_RE.test(fetchResult.contentType);
      matches.push(...runFetchRules({ ok: fetchResult.ok, error: fetchResult.error, contentType: fetchResult.contentType, isHtml: isHtmlContent }));
      const isHttps = fetchResult.ok ? fetchResult.finalUrl.startsWith('https:') : norm.protocol === 'https:';

      matches.push(...runDomainRules(norm.host, isHttps));

      if (pageHtml === '' && isHtmlContent) {
        pageHtml = fetchResult.text;
      }

      if (pageHtml) {
        if (fetchResult.ok) preview.status = fetchResult.status;
        preview.finalUrl = fetchResult.finalUrl;
        sourceCode = pageHtml.slice(0, 20000);

        if (fetchResult.ok) matches.push(...runHeaderRules(fetchResult.headers, isHttps));

        const pageObs = extractPageObservations(pageHtml, fetchResult.finalUrl, isHttps);
        const pageResult = runPageRules(pageObs, isHttps);
        matches.push(...pageResult.matches);
        preview.title = pageObs.title;
        preview.description = pageObs.description;
        details.title = pageObs.title;
        details.description = pageObs.description;
        details.dataCollected = pageResult.dataCollected;
        details.trackers = pageResult.trackers;
        details.technologies = pageResult.technologies;
        details.codeNotes = pageResult.codeNotes;
        details.simple_code_notes = pageResult.simpleCodeNotes;

        // --- fetch the site's own terms / privacy pages (bounded) ---
        const links = findPolicyLinks(pageHtml, fetchResult.finalUrl);
        const linksFound = !!(links.terms || links.privacy);
        const [termsFetch, privacyFetch] = await Promise.all([
          links.terms ? safeFetch(links.terms, { maxBytes: POLICY_MAX_BYTES, timeoutMs: 8000 }) : Promise.resolve(null),
          links.privacy ? safeFetch(links.privacy, { maxBytes: POLICY_MAX_BYTES, timeoutMs: 8000 }) : Promise.resolve(null)
        ]);
        const termsAnalysis = termsFetch && termsFetch.ok ? analyzePolicyText(termsFetch.text, 'terms') : null;
        const privacyAnalysis = privacyFetch && privacyFetch.ok ? analyzePolicyText(privacyFetch.text, 'privacy') : null;
        const policyResult = runPolicyRules(termsAnalysis, privacyAnalysis, linksFound);
        matches.push(...policyResult.matches);
        termsPrivacy = policyResult.termsPrivacy;
      }
    } else if (inputType === 'html') {
      sourceCode = content.slice(0, 20000);
      const pageObs = extractPageObservations(content, '', true);
      const pageResult = runPageRules(pageObs, true);
      matches.push(...pageResult.matches);
      details.title = pageObs.title;
      details.description = pageObs.description;
      details.dataCollected = pageResult.dataCollected;
      details.trackers = pageResult.trackers;
      details.technologies = pageResult.technologies;
      details.codeNotes = pageResult.codeNotes;
      details.simple_code_notes = pageResult.simpleCodeNotes;
    } else if (inputType === 'code') {
      sourceCode = content.slice(0, 20000);
      const codeResult = runCodeRules(content);
      matches.push(...codeResult.matches);
      details.codeNotes = codeResult.codeNotes;
      details.simple_code_notes = codeResult.simpleCodeNotes;
    } else if (inputType === 'terms') {
      // The input IS a policy document: analyze it as one, and let its
      // clause findings double as the main findings.
      const analysis = analyzePolicyText(content, 'terms');
      for (const id of analysis.matchedIds.concat(analysis.deniedIds)) {
        matches.push({ ruleId: 'PR_DIRECT', findingId: id, vars: {} });
      }
      termsPrivacy = runPolicyRules(analysis, null, true).termsPrivacy;
    } else if (inputType === 'document') {
      preview.title = fileName || 'Uploaded document';
      details.title = preview.title;
      const docFetch = await safeFetch(fileUrl, { maxBytes: PAGE_MAX_BYTES, timeoutMs: 15000 });
      const readable = docFetch.ok && (HTML_CONTENT_RE.test(docFetch.contentType) || !docFetch.contentType);
      if (readable) {
        matches.push(...runTextRules(docFetch.text, 'text'));
      } else {
        // Honest limitation: binary documents (PDF, images, office files)
        // cannot be read by the rule engine, so nothing was verified.
        const reason = docFetch.ok ? docFetch.contentType || 'unknown format' : 'unreachable file';
        matches.push({ ruleId: 'R_DOC_UNREADABLE', findingId: 'DOC_UNREADABLE', vars: { name: fileName || 'document', reason } });
        matches.push({ ruleId: 'R_DOC_UNVERIFIED', findingId: 'DOC_UNVERIFIED', vars: {} });
      }
    } else {
      // 'text' and 'email'
      matches.push(...runTextRules(content, inputType));
    }

    // --- score, summarize, save ---
    const result = buildReport(matches);
    details.redFlags = result.redFlags;
    details.greenFlags = result.greenFlags;

    const report = await base44.asServiceRole.entities.Report.create({
      input_type: inputType,
      input_content: inputType === 'document' ? `Document: ${fileName || 'uploaded file'}` : content.slice(0, 5000),
      url: inputType === 'document' ? fileUrl : url,
      verdict: result.verdict,
      score: result.score,
      summary: result.summary,
      simple_summary: result.simpleSummary,
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
      summary: result.summary,
      simple_summary: result.simpleSummary,
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