// Observation collectors for the Sus or Bus deterministic engine.
//
// These functions only EXTRACT observations from raw material (HTML, policy
// text, pasted text, code). They contain no scoring and no message text —
// interpretation lives in ruleEngine, and text lives in knowledgeBase.

import { TECH_SIGNATURES, POLICY_RULES, findServiceMatch } from './knowledgeBase.ts';

// ---------------------------------------------------------------------------
// Page observations (static HTML; no JavaScript is executed)

export function extractPageObservations(html, baseUrl, isHttps) {
  const page = {
    title: '',
    description: '',
    kb: Math.max(1, Math.round(html.length / 1024)),
    externalScriptCount: 0,
    inlineScriptCount: 0,
    externalOrigins: [],
    thirdPartyOrigins: [],
    referencedHosts: [],
    forms: [],
    iframeCount: 0,
    metaRefresh: false,
    mixedContentCount: 0,
    obfuscation: null,
    technologies: [],
    dataCollected: []
  };

  // --- title and description ---
  const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  if (titleMatch) page.title = titleMatch[1].trim();
  const descMatch = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html);
  if (descMatch) page.description = descMatch[1].trim();
  else {
    const ogMatch = /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i.exec(html);
    if (ogMatch) page.description = ogMatch[1].trim();
  }

  // --- referenced hosts (parsed from src/href attributes; never a raw
  // substring scan of the whole HTML) ---
  const hosts = new Set();
  const attrRe = /\b(?:src|href)=["']([^"'#]+)["']/gi;
  let am;
  while ((am = attrRe.exec(html)) && hosts.size < 100) {
    let u;
    try {
      u = new URL(am[1], baseUrl || 'https://example.invalid');
    } catch {
      continue;
    }
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      hosts.add(u.hostname.toLowerCase());
    }
  }
  page.referencedHosts = [...hosts];

  // --- scripts ---
  const scriptBlocks = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const srcRe = /\bsrc=["']([^"']+)["']/i;
  let m;
  while ((m = scriptRe.exec(html))) {
    scriptBlocks.push({ attrs: m[1] || '', body: m[2] || '' });
  }
  const externalSrcs = [];
  for (const b of scriptBlocks) {
    const s = srcRe.exec(b.attrs);
    if (s) externalSrcs.push(s[1]);
  }
  const inlineBlocks = scriptBlocks.filter((b) => !srcRe.test(b.attrs));
  page.externalScriptCount = externalSrcs.length;
  page.inlineScriptCount = inlineBlocks.length;

  const origins = new Set();
  for (const src of externalSrcs) {
    let o = null;
    try {
      o = new URL(src, baseUrl || 'https://example.invalid').origin;
    } catch {}
    if (o && o !== 'null') origins.add(o);
  }
  page.externalOrigins = [...origins];

  let pageOrigin = null;
  try {
    if (baseUrl) pageOrigin = new URL(baseUrl).origin;
  } catch {}
  page.pageOrigin = pageOrigin;
  page.thirdPartyOrigins = pageOrigin
    ? page.externalOrigins.filter((o) => o !== pageOrigin)
    : [...page.externalOrigins];

  // --- obfuscated inline scripts (first block that trips indicators) ---
  for (const b of inlineBlocks) {
    const techniques = [];
    if (/\beval\s*\(/.test(b.body)) techniques.push('eval()');
    if (/\batob\s*\(|\bunescape\s*\(|fromcharcode/i.test(b.body)) techniques.push('atob/unescape/fromCharCode');
    if (/[0-9a-fA-F]{60,}/.test(b.body)) techniques.push('long encoded blobs');
    if (/\\x[0-9a-f]{2}/i.test(b.body)) techniques.push('escaped byte sequences');
    if (techniques.length >= 1) {
      page.obfuscation = {
        techniques,
        touchesCookies: /document\.cookie\s*=/.test(b.body),
        touchesRedirect: /location\.(href|replace|assign)\s*=/.test(b.body)
      };
      break;
    }
  }

  // --- forms ---
  const formRe = /<form\b([^>]*)>([\s\S]*?)(?:<\/form>|(?=<form\b)|(?=<body)|$)/gi;
  let fm;
  while ((fm = formRe.exec(html)) && page.forms.length < 10) {
    const attrs = fm[1] || '';
    const inner = fm[2] || '';
    const actionUrl = (/\baction=["']([^"']+)["']/i.exec(attrs) || [])[1] || '';
    const method = (/\bmethod=["']([^"']+)["']/i.exec(attrs) || [])[1] || 'get';
    const hasPassword = /type=["']password["']/i.test(inner);
    let actionOrigin = null;
    let actionProtocol = '';
    if (actionUrl) {
      try {
        const au = new URL(actionUrl, baseUrl || 'https://example.invalid');
        actionOrigin = au.origin;
        actionProtocol = au.protocol;
      } catch {}
    }
    page.forms.push({ actionUrl, actionOrigin, actionProtocol, method, hasPassword, inner });

    if (/type=["']email["']|name=["'][^"']*email/i.test(inner)) page.dataCollected.push('Email address');
    if (/type=["']tel["']|name=["'][^"']*phone/i.test(inner)) page.dataCollected.push('Phone number');
    if (/name=["'][^"']*(card|cvc|ccnum|expir)/i.test(inner)) page.dataCollected.push('Payment card details');
    if (/name=["'][^"']*address/i.test(inner)) page.dataCollected.push('Postal address');
    if (hasPassword) page.dataCollected.push('Password (login form)');
  }

  // --- misc content signals ---
  page.iframeCount = (html.match(/<iframe\b/i) || []).length;
  page.metaRefresh = /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=/i.test(html);
  if (isHttps) {
    page.mixedContentCount = (html.match(/(?:src|href)=["']http:\/\//gi) || []).length;
  }

  // --- technologies ---
  for (const t of TECH_SIGNATURES) {
    if (t[1].test(html)) page.technologies.push(t[0]);
  }
  // Recognized third-party services also count as technology context.
  const seenTech = new Set(page.technologies);
  for (const host of page.referencedHosts) {
    const svc = findServiceMatch(host);
    if (svc && !seenTech.has(svc.provider)) {
      seenTech.add(svc.provider);
      page.technologies.push(svc.provider);
    }
  }

  return page;
}

// ---------------------------------------------------------------------------
// Policy link discovery (same-site links only)

export function findPolicyLinks(html, baseUrl) {
  const found = { terms: '', privacy: '' };
  let baseHost = '';
  try {
    baseHost = new URL(baseUrl).host;
  } catch {
    return found;
  }
  const re = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,150}?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && (!found.terms || !found.privacy)) {
    const href = m[1];
    const text = (m[2] || '').replace(/<[^>]*>/g, ' ').toLowerCase();
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
    let abs;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    try {
      if (new URL(abs).host !== baseHost) continue;
    } catch {
      continue;
    }
    const hay = abs.toLowerCase() + ' ' + text;
    if (!found.terms && /(terms|conditions|tos\b|legal)/.test(hay)) found.terms = abs;
    else if (!found.privacy && /(privacy|datenschutz|confidentialit)/.test(hay)) found.privacy = abs;
  }
  return found;
}

// ---------------------------------------------------------------------------
// Policy text extraction and negation-aware clause matching

export function extractPolicyText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// True when the text right before the match position (within the same
// sentence) negates the phrase, e.g. "we do NOT sell ...".
function isNegated(text, matchIndex) {
  const start = Math.max(0, matchIndex - 100);
  const before = text.slice(start, matchIndex);
  const segment = before.split(/[.!?]/).pop() || '';
  return /\b(?:do(?:es)?\s+not|don'?t|never|will\s+not|won'?t|shall\s+not|no\s+longer|not)\b/i.test(segment);
}

// Runs every policy rule against the text. Returns:
//   status:       'analyzed' | 'too-short'
//   matchedIds:   finding IDs whose clause was affirmatively present
//   deniedIds:    finding IDs for explicit denials (positive findings)
//   matchedTitles: lowercase titles for summary assembly
export function analyzePolicyText(rawHtml, docLabel) {
  const text = extractPolicyText(rawHtml);

  if (text.length < 200) {
    return { label: docLabel, status: 'too-short', text, matchedIds: ['POLICY_EMPTY'], deniedIds: [], matchedTitles: ['policy page appears empty or very short'] };
  }

  const matchedIds = [];
  const deniedIds = [];
  const matchedTitles = [];

  for (const rule of POLICY_RULES) {
    const m = rule.re.exec(text);
    if (!m) continue;
    if (rule.negation && isNegated(text, m.index)) {
      // The matched phrase is negated nearby. If the document contains an
      // explicit denial pattern, report the denial instead of a false alarm.
      if (rule.denialRe && rule.denialRe.test(text) && !deniedIds.includes(rule.denialFindingId)) {
        deniedIds.push(rule.denialFindingId);
      }
      continue;
    }
    if (!matchedIds.includes(rule.findingId)) matchedIds.push(rule.findingId);
  }

  if (matchedIds.length === 0 && deniedIds.length === 0) {
    matchedIds.push('POLICY_NO_CLAUSES');
    matchedTitles.push('none of the standard clauses');
  }

  return { label: docLabel, status: 'analyzed', text, matchedIds, deniedIds, matchedTitles };
}

// ---------------------------------------------------------------------------
// Text / email helpers

export function extractTextLinks(content) {
  const links = [];
  const re = /https?:\/\/[^\s<>"')\]]+/gi;
  let m;
  while ((m = re.exec(content)) && links.length < 20) {
    let u;
    try {
      u = new URL(m[0]);
    } catch {
      continue;
    }
    links.push({ url: m[0], host: u.hostname.toLowerCase(), protocol: u.protocol });
  }
  return links;
}

export function extractEmailHeaderDomains(content) {
  const fromMatch = /from:\s*(?:.*?<)?([a-z0-9.-]+@[a-z0-9.-]+)>?/i.exec(content);
  const replyMatch = /reply-to:\s*(?:.*?<)?([a-z0-9.-]+@[a-z0-9.-]+)>?/i.exec(content);
  if (fromMatch && replyMatch) {
    const fromDomain = fromMatch[1].split('@')[1].toLowerCase();
    const toDomain = replyMatch[1].split('@')[1].toLowerCase();
    if (fromDomain && toDomain) return { fromDomain, toDomain };
  }
  return null;
}