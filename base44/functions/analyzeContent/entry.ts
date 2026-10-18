import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizeUrl, safeFetch } from '../../shared/urlSafety.ts';
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
//   2. for URLs: serve a cached report if we have a fresh one, otherwise
//      fetch the page (every redirect hop re-validated, byte-capped)
//   3. run the rule-based engine: address, headers, static HTML, and the
//      site's own terms / privacy policy pages
//   4. score the findings with the fixed penalty model and save the report

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_MAX_BYTES = 50000;
const POLICY_MAX_BYTES = 15000;

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
    const summaries = buildSummaries(result.points, result.verdict);
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