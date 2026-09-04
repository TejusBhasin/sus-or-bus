import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML = 50000;
const MAX_ANALYSIS = 40000;

function extractMeta(html, attr, key) {
  const re = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const inputType = body.inputType;
    const content = (body.content || '').trim();
    if (!content) return Response.json({ error: 'Content is required' }, { status: 400 });
    if (!['url', 'html', 'code', 'email', 'text'].includes(inputType)) {
      return Response.json({ error: 'Invalid input type' }, { status: 400 });
    }

    let analysisContent = content;
    let url = '';
    let sourceCode = '';
    const preview = { title: '', description: '', status: null, finalUrl: '', fetchError: '' };

    if (inputType === 'url') {
      let u = content;
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      url = u;
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

    const prompt = `You are "Sus or Bus", a sharp web-safety analyzer. Slang: "Bus" (short for "bussin") means really good / safe / legit. "Sus" means suspicious / sketchy / unsafe.

Analyze the following ${inputType.toUpperCase()} input for safety, privacy, security, and trustworthiness.

----- INPUT START -----
${analysisContent.slice(0, MAX_ANALYSIS)}
----- INPUT END -----

Produce a rigorous but fair assessment. Look for: data collection & privacy practices, third-party trackers, suspicious scripts, phishing/social-engineering signals, misleading content, code safety, reputation signals, and (for emails) spoofing/urgency/red flags.

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
    "title": "page/site title if known, else empty string",
    "description": "site/page description if known, else empty string",
    "dataCollected": ["data types collected, if any"],
    "trackers": ["tracking/analytics services found, if any"],
    "technologies": ["technologies/frameworks detected, if any"],
    "redFlags": ["specific concerns"],
    "greenFlags": ["specific positives"],
    "codeNotes": "TECHNICAL notes about any code/html analyzed, or empty string",
    "simple_code_notes": "plain-language version of the code notes (what it means in everyday terms), or empty string"
  }
}

Rules:
- Give 5 to 8 points covering different angles.
- Score guide: 75-100 = clearly bus, 60-74 = leans bus, 45-59 = leans sus, below 45 = clearly sus. Set "verdict" to match the lean.
- Be concrete: cite what you actually saw in the input. Never invent facts not supported by the input.
- The "simple_*" fields must convey the SAME meaning as their technical counterparts but in plain language a non-technical person understands. Never contradict the technical version.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
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
          }
        }
      }
    });

    if (!sourceCode && (inputType === 'html' || inputType === 'code')) {
      sourceCode = content.slice(0, 20000);
    }

    const report = await base44.asServiceRole.entities.Report.create({
      input_type: inputType,
      input_content: content.slice(0, 5000),
      url,
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
      source_code: sourceCode
    });

    return Response.json({
      verdict: result.verdict,
      score: result.score,
      summary: result.summary,
      points: result.points || [],
      details: result.details || {},
      preview,
      sourceCode,
      reportId: report.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}