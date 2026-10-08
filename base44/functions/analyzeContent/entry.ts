import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { creditFreezeActive, creditFreezeResponse } from '../../shared/creditFreeze.ts';

// How a scan flows through this function:
//   1. validate the input
//   2. for URLs: normalize it, serve a cached report if we have a fresh one,
//      otherwise fetch the page HTML
//   3. send the content to the LLM and get a structured verdict back
//   4. save it as a Report and return it to the caller

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML = 50000;
const MAX_ANALYSIS = 40000;

function extractMeta(html, attr, key) {
  const re = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

// Terms & privacy policy check — find links to the site's own terms /
// privacy policy pages inside its homepage HTML.
function findPolicyLinks(html, baseUrl) {
  const found = { terms: '', privacy: '' };
  let baseHost = '';
  try { baseHost = new URL(baseUrl).host; } catch { return found; }
  const re = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,150}?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && (!found.terms || !found.privacy)) {
    const href = m[1];
    const text = (m[2] || '').replace(/<[^>]*>/g, ' ').toLowerCase();
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
    let abs;
    try { abs = new URL(href, baseUrl).toString(); } catch { continue; }
    try { if (new URL(abs).host !== baseHost) continue; } catch { continue; }
    const hay = abs.toLowerCase() + ' ' + text;
    if (!found.terms && /(terms|conditions|tos\b|legal)/.test(hay)) found.terms = abs;
    else if (!found.privacy && /(privacy|datenschutz|confidentialit)/.test(hay)) found.privacy = abs;
  }
  return found;
}

async function fetchPolicyText(url) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    });
    const html = await resp.text();
    return html.slice(0, 15000);
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

    if (!['url', 'html', 'code', 'email', 'text', 'terms', 'document'].includes(inputType)) {
      return Response.json({ error: 'Invalid input type' }, { status: 400 });
    }
    if (inputType === 'document') {
      if (!fileUrl) return Response.json({ error: 'A document file is required' }, { status: 400 });
    } else if (!content) {
      return Response.json({ error: 'Content is required' }, { status: 400 });
    }
    // Credit freeze for all non-URL inputs (URL scans are guarded below, after the cache check)
    if (inputType !== 'url' && creditFreezeActive()) return creditFreezeResponse();

    let analysisContent = content;
    let policySection = '';
    let url = '';
    let pageHtml = '';
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
      // reuse that report instead of spending a new LLM call.
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
          terms_privacy: prev.terms_privacy || null,
          reportId: prev.id,
          cached: true
        });
      }
      // Credit freeze: block new scans (cached results above still serve for free)
      if (creditFreezeActive()) return creditFreezeResponse();
      try {
        const resp = await fetch(u, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
          redirect: 'follow',
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        });
        const html = await resp.text();
        pageHtml = html;
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
      // Fetch the site's own terms & conditions and privacy policy pages so
      // the LLM can tell the user what those documents really say.
      try {
        const links = findPolicyLinks(pageHtml, u);
        const [termsText, privacyText] = await Promise.all([
          links.terms ? fetchPolicyText(links.terms) : Promise.resolve(''),
          links.privacy ? fetchPolicyText(links.privacy) : Promise.resolve('')
        ]);
        if (termsText) policySection += `\n----- SITE TERMS & CONDITIONS (excerpt) -----\n${termsText}\n`;
        if (privacyText) policySection += `\n----- SITE PRIVACY POLICY (excerpt) -----\n${privacyText}\n`;
      } catch {}
    }

    let documentNote = '';
    if (inputType === 'document') {
      documentNote = `The user uploaded a document named "${fileName || 'document'}". Read the attached document file carefully and base your analysis on its actual contents.`;
      analysisContent = 'The document is provided as an attached file.';
      preview.title = fileName || 'Uploaded document';
    }

    const prompt = `You are "Sus or Bus", a sharp web-safety analyzer. Slang: "Bus" (short for "bussin") means really good / safe / legit. "Sus" means suspicious / sketchy / unsafe.

Analyze the following ${inputType === 'document' ? 'DOCUMENT (see the attached file)' : inputType.toUpperCase()} input for safety, privacy, security, and trustworthiness.

${documentNote}

----- INPUT START -----
${analysisContent.slice(0, MAX_ANALYSIS)}
----- INPUT END -----
${policySection}

Produce a rigorous but fair assessment. Look for: data collection & privacy practices, third-party trackers, suspicious scripts, phishing/social-engineering signals, misleading content, code safety, reputation signals, and (for emails) spoofing/urgency/red flags. For documents, also inspect: suspicious links, requests for sensitive information or payments, scam patterns, malicious instructions, and the legitimacy of the sender's claims.

Return a JSON object with EXACTLY this shape:
{
  "verdict": "bus" or "sus",
  "score": number 0-100 (100 = very safe),
  "summary": "one punchy sentence: a TECHNICAL explanation for security-savvy users (may use terms like XSS, CSP, obfuscation, etc.)",
  "simple_summary": "one sentence in plain everyday language anyone can understand (no jargon, explain like you're talking to your grandma)",
  "points": [
    { "title": "short label", "severity": "good" | "warning" | "bad", "category": "privacy" | "security" | "trackers" | "content" | "code" | "email" | "reputation", "description": "1-2 sentence TECHNICAL explanation", "simple_description": "1-2 sentence plain-language explanation anyone can understand (no jargon)" }
  ],
  "details": {
    "title": "page/site/document title if known, else empty string",
    "description": "site/page/document description if known, else empty string",
    "dataCollected": ["data types collected, if any"],
    "trackers": ["tracking/analytics services found, if any"],
    "technologies": ["technologies/frameworks detected, if any"],
    "redFlags": ["specific concerns"],
    "greenFlags": ["specific positives"],
    "codeNotes": "TECHNICAL notes about any code/html analyzed, or empty string",
    "simple_code_notes": "plain-language version of the code notes (what it means in everyday terms), or empty string"
  },
  "terms_privacy": {
    "found": ["which policy documents you actually saw: 'terms' and/or 'privacy'; empty array if none"],
    "summary": "one TECHNICAL sentence about what the site's terms & privacy policy actually mean for the user — warn about one-sided clauses, surprise charges, auto-renewals, broad data sharing or vague deletion rights; give genuine encouragement when the policies are user-friendly. Empty string if no policies were seen.",
    "simple_summary": "plain-language version of the same sentence (explain like you're talking to your grandma), or empty string",
    "points": [
      { "title": "short label", "severity": "good" | "warning" | "bad", "description": "1-2 sentence TECHNICAL explanation of one policy point", "simple_description": "1-2 sentence plain-language explanation anyone can understand" }
    ]
  }
}

Rules:
- Give 5 to 8 points covering different angles.
- Score guide: 75-100 = clearly bus, 60-74 = leans bus, 45-59 = leans sus, below 45 = clearly sus. Set "verdict" to match the lean.
- Be concrete: cite what you actually saw in the input. Never invent facts not supported by the input.
- The "simple_*" fields must convey the SAME meaning as their technical counterparts but in plain language a non-technical person understands. Never contradict the technical version.
- Fill "terms_privacy" ONLY from the SITE POLICY excerpts (terms & conditions / privacy policy). Give 1 to 4 points about the policies themselves: what data they collect and share, one-sided clauses, surprise charges, auto-renewals, account deletion rights, etc. If no policy excerpts were provided, use found: [], empty summaries and empty points.
${inputType === 'terms' ? "- This input IS a terms / privacy policy document. Base \"terms_privacy\" on the input itself, and make your main points about what the policy means for the user." : ''}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      ...(inputType === 'document' ? { file_urls: [fileUrl] } : {}),
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string', enum: ['bus', 'sus'] },
          score: { type: 'number' },
          summary: { type: 'string' },
          simple_summary: { type: 'string' },
          points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                severity: { type: 'string' },
                category: { type: 'string' },
                description: { type: 'string' },
                simple_description: { type: 'string' }
              }
            }
          },
          details: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              dataCollected: { type: 'array', items: { type: 'string' } },
              trackers: { type: 'array', items: { type: 'string' } },
              technologies: { type: 'array', items: { type: 'string' } },
              redFlags: { type: 'array', items: { type: 'string' } },
              greenFlags: { type: 'array', items: { type: 'string' } },
              codeNotes: { type: 'string' },
              simple_code_notes: { type: 'string' }
            }
          },
          terms_privacy: {
            type: 'object',
            properties: {
              found: { type: 'array', items: { type: 'string' } },
              summary: { type: 'string' },
              simple_summary: { type: 'string' },
              points: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    severity: { type: 'string' },
                    description: { type: 'string' },
                    simple_description: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!sourceCode && (inputType === 'html' || inputType === 'code')) {
      sourceCode = content.slice(0, 20000);
    }

    const report = await base44.asServiceRole.entities.Report.create({
      input_type: inputType,
      input_content: inputType === 'document' ? `Document: ${fileName || 'uploaded file'}` : content.slice(0, 5000),
      url: inputType === 'document' ? fileUrl : url,
      verdict: result.verdict,
      score: result.score,
      summary: result.summary,
      simple_summary: result.simple_summary || result.summary,
      points: result.points || [],
      details: {
        ...(result.details || {}),
        simple_code_notes: (result.details && result.details.simple_code_notes) || (result.details && result.details.codeNotes) || ''
      },
      preview_title: preview.title || (result.details && result.details.title) || '',
      preview_description: preview.description || (result.details && result.details.description) || '',
      source_code: sourceCode,
      terms_privacy: result.terms_privacy || null
    });

    return Response.json({
      verdict: result.verdict,
      score: result.score,
      summary: result.summary,
      points: result.points || [],
      details: result.details || {},
      preview,
      sourceCode,
      terms_privacy: result.terms_privacy || null,
      reportId: report.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}