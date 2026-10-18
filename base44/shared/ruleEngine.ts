// Deterministic rule engine for Sus or Bus.
//
// Rules consume normalized observations and emit MATCHES:
//   { ruleId, findingId, vars }
// Every emitted findingId must resolve to a definition in the knowledge
// base, which supplies all text through validated templates. Nothing here
// calls an AI, performs I/O, or invents facts.

import {
  FINDING_BY_ID,
  SCORING,
  STATUS_MESSAGES,
  RISKY_TLDS,
  POLICY_RULES,
  TEXT_RULES,
  CODE_RULES,
  renderTemplate,
  findServiceMatch,
  findBrandLookalike,
  KB_VERSION
} from './knowledgeBase.ts';
import { extractTextLinks, extractEmailHeaderDomains } from './collectors.ts';

function match(ruleId, findingId, vars) {
  return { ruleId, findingId, vars: vars || {} };
}

// ---------------------------------------------------------------------------
// Domain rules

export function runDomainRules(host, isHttps) {
  const out = [];
  const m = (ruleId, findingId, vars) => out.push(match(ruleId, findingId, vars));

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) m('R_DOMAIN_IP', 'DOMAIN_BARE_IP');
  if (host.indexOf('xn--') !== -1) m('R_DOMAIN_PUNYCODE', 'DOMAIN_PUNYCODE');

  const lookalike = findBrandLookalike(host);
  if (lookalike) {
    m('R_BRAND_LOOKALIKE', 'DOMAIN_BRAND_LOOKALIKE', { brand: lookalike.brand, official: lookalike.official });
  }

  const tld = host.split('.').pop() || '';
  if (RISKY_TLDS.indexOf(tld) !== -1) m('R_RISKY_TLD', 'DOMAIN_RISKY_TLD', { tld });

  const labels = host.split('.').length;
  const hyphens = (host.match(/-/g) || []).length;
  if (hyphens >= 3 || labels >= 5) {
    m('R_DOMAIN_SHAPE', 'DOMAIN_ODD_SHAPE', { labels: String(labels), hyphens: String(hyphens) });
  }

  if (isHttps) m('R_HTTPS', 'DOMAIN_HTTPS');
  else m('R_NO_HTTPS', 'DOMAIN_NO_HTTPS');

  return out;
}

// ---------------------------------------------------------------------------
// Security header rules

const HEADER_NAMES = [
  ['strict-transport-security', 'Strict-Transport-Security (forces HTTPS on return visits)'],
  ['content-security-policy', 'Content Security Policy (restricts what the page may load and execute)'],
  ['x-content-type-options', 'X-Content-Type-Options (blocks MIME-sniffing)'],
  ['x-frame-options', 'X-Frame-Options (limits who may embed the page)'],
  ['referrer-policy', 'Referrer-Policy (limits referrer information leaks)'],
  ['permissions-policy', 'Permissions-Policy (restricts browser capabilities)']
];

export function runHeaderRules(headers, isHttps) {
  const present = [];
  for (const entry of HEADER_NAMES) {
    if (headers && headers.get && headers.get(entry[0])) present.push(entry[1]);
  }
  // HSTS is only meaningful on HTTPS.
  if (!isHttps) {
    const filtered = present.filter((p) => p.indexOf('Strict-Transport-Security') !== 0);
    if (filtered.length !== present.length) present.length = 0;
  }
  const out = [];
  if (present.length > 0) {
    out.push(match('R_HEADERS_PRESENT', 'SEC_HEADERS_PRESENT', { count: String(present.length), list: present.join('; ') }));
  } else {
    out.push(match('R_HEADERS_NONE', 'SEC_NO_HEADERS'));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Page rules (static HTML observations)

export function runPageRules(page, isHttps) {
  const out = [];
  const m = (ruleId, findingId, vars) => out.push(match(ruleId, findingId, vars));
  const pageOrigin = page.pageOrigin || null;

  // Trackers: boundary-safe matching of referenced hosts against the DB.
  const trackers = [];
  for (const host of page.referencedHosts) {
    const svc = findServiceMatch(host);
    if (svc && svc.tracking) trackers.push(svc.provider + ' (' + svc.classification + ')');
  }
  if (trackers.length > 0) {
    m('R_TRACKERS', 'TRACKERS_FOUND', { count: String(trackers.length), list: trackers.join(', ') });
  } else {
    m('R_NO_TRACKERS', 'NO_TRACKER_MATCH');
  }

  if (page.thirdPartyOrigins.length >= 8) {
    m('R_MANY_THIRD_PARTY', 'MANY_THIRD_PARTY', { count: String(page.thirdPartyOrigins.length) });
  }

  // Forms
  let loginHandled = false;
  for (const f of page.forms) {
    if (f.hasPassword) {
      if (f.actionProtocol === 'http:') {
        m('R_LOGIN_HTTP_ACTION', 'LOGIN_HTTP_ACTION', { action: f.actionUrl });
      } else if (isHttps && f.actionOrigin && pageOrigin && f.actionOrigin !== pageOrigin) {
        m('R_LOGIN_CROSS_ORIGIN', 'LOGIN_CROSS_ORIGIN', { origin: f.actionOrigin });
      } else if (isHttps) {
        m('R_LOGIN_SAME_ORIGIN', 'LOGIN_SAME_ORIGIN');
      } else {
        m('R_LOGIN_ON_HTTP_PAGE', 'LOGIN_ON_HTTP_PAGE');
      }
      loginHandled = true;
    } else if (f.actionOrigin && pageOrigin && f.actionOrigin !== pageOrigin) {
      m('R_FORM_CROSS_ORIGIN', 'FORM_CROSS_ORIGIN', { origin: f.actionOrigin });
    }
  }

  // Obfuscated scripts
  if (page.obfuscation) {
    const tech = page.obfuscation.techniques.join(', ');
    if (page.obfuscation.techniques.length >= 2 && (page.obfuscation.touchesCookies || page.obfuscation.touchesRedirect)) {
      m('R_OBFUSCATION_HEAVY', 'OBFUSCATION_HEAVY', { techniques: tech });
    } else {
      m('R_OBFUSCATION', 'OBFUSCATION', { techniques: tech });
    }
  }

  if (page.metaRefresh) m('R_META_REFRESH', 'META_REFRESH');
  if (page.mixedContentCount > 0) {
    m('R_MIXED_CONTENT', 'MIXED_CONTENT', { count: String(page.mixedContentCount) });
  }

  const codeNotes =
    `Static (no-execution) review of ~${page.kb} KB of HTML: ${page.externalScriptCount} external script(s) from ${page.externalOrigins.length} origin(s), ` +
    `${page.inlineScriptCount} inline script block(s), ${page.forms.length} form(s), ${page.iframeCount} iframe(s).` +
    (trackers.length ? ` Service list matches: ${trackers.join(', ')}.` : ' No known tracking services matched.');
  const simpleCodeNotes =
    `We read the page's code without running any of it. It loads ${page.externalScriptCount} file(s) from other companies, has ${page.forms.length} form(s) and ${page.iframeCount} embedded frame(s).` +
    (trackers.length ? ' It uses known visitor-tracking tools.' : ' No known visitor-tracking tools were found.');

  return {
    matches: out,
    trackers,
    dataCollected: page.dataCollected,
    technologies: page.technologies,
    codeNotes,
    simpleCodeNotes
  };
}

// ---------------------------------------------------------------------------
// Policy rules: clause findings + the structured terms/privacy payload

function renderPolicyPoint(findingId) {
  const def = FINDING_BY_ID[findingId];
  return {
    title: renderTemplate(def.title, {}),
    severity: def.severity,
    description: renderTemplate(def.description, {}),
    simple_description: renderTemplate(def.simpleDescription, {})
  };
}

// termsAnalysis / privacyAnalysis: results of analyzePolicyText, or null.
// linksFound: whether same-site policy links existed at all.
export function runPolicyRules(termsAnalysis, privacyAnalysis, linksFound) {
  const out = [];
  const docs = [];
  const points = [];
  const matchedTitles = [];

  for (const a of [termsAnalysis, privacyAnalysis]) {
    if (!a) continue;
    docs.push(a.label);
    for (const id of a.matchedIds.concat(a.deniedIds)) {
      if (!points.some((p) => p.title === renderPolicyPoint(id).title)) points.push(renderPolicyPoint(id));
    }
    matchedTitles.push(...a.matchedTitles);
  }

  if (docs.length === 0) {
    if (linksFound === false) out.push(match('R_POLICY_MISSING', 'POLICY_MISSING'));
    return { matches: out, termsPrivacy: null };
  }

  // The strongest policy signals feed the main score (capped, deduped).
  const all = points.slice();
  const bad = all.filter((p) => p.severity === 'bad').slice(0, 1);
  const warn = all.filter((p) => p.severity === 'warning').slice(0, 1);
  for (const p of bad) {
    if (p.title === renderPolicyPoint('POLICY_SELL').title) out.push(match('PR_SELL_MAIN', 'POLICY_SELL'));
  }
  for (const p of warn) {
    if (p.title === renderPolicyPoint('POLICY_SHARE').title) out.push(match('PR_SHARE_MAIN', 'POLICY_SHARE'));
    else if (p.title === renderPolicyPoint('POLICY_ARBITRATION').title) out.push(match('PR_ARBITRATION_MAIN', 'POLICY_ARBITRATION'));
    else if (p.title === renderPolicyPoint('POLICY_UNILATERAL_CHANGE').title) out.push(match('PR_CHANGE_MAIN', 'POLICY_UNILATERAL_CHANGE'));
    else if (p.title === renderPolicyPoint('POLICY_TRANSFERS').title) out.push(match('PR_TRANSFERS_MAIN', 'POLICY_TRANSFERS'));
    else if (p.title === renderPolicyPoint('POLICY_EMPTY').title) out.push(match('PR_EMPTY_MAIN', 'POLICY_EMPTY'));
    else if (p.title === renderPolicyPoint('POLICY_NO_CLAUSES').title) out.push(match('PR_NO_CLAUSES_MAIN', 'POLICY_NO_CLAUSES'));
  }

  const matched = matchedTitles.length ? matchedTitles.join('; ') : 'none of the standard clauses';
  const termsPrivacy = {
    found: docs,
    points,
    summary: renderTemplate(STATUS_MESSAGES.POLICY_SUMMARY, { docs: docs.join(' and '), matched }),
    simple_summary: renderTemplate(STATUS_MESSAGES.POLICY_SUMMARY_SIMPLE, { docs: docs.join(' and '), matched })
  };

  return { matches: out, termsPrivacy };
}

// ---------------------------------------------------------------------------
// Text / email rules

export function runTextRules(content, kind) {
  const out = [];
  const m = (ruleId, findingId, vars) => out.push(match(ruleId, findingId, vars));
  let matchedAny = false;

  for (const rule of TEXT_RULES) {
    if (rule.re.test(content)) {
      matchedAny = true;
      m(rule.id, rule.findingId);
    }
  }

  // Link rules (complex logic: needs parsing, kept as named functions)
  const links = extractTextLinks(content);
  let sawHttpLink = false;
  for (const link of links) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(link.host) || link.host.indexOf('xn--') !== -1) {
      m('R_LINK_IP', 'TEXT_LINK_IP', { host: link.host });
      matchedAny = true;
      break;
    }
    const lookalike = findBrandLookalike(link.host);
    if (lookalike) {
      m('R_LINK_BRAND', 'TEXT_LINK_BRAND', { brand: lookalike.brand, host: link.host });
      matchedAny = true;
      break;
    }
    if (link.protocol === 'http:') sawHttpLink = true;
  }
  if (sawHttpLink) {
    m('R_LINK_HTTP', 'TEXT_LINK_HTTP');
    matchedAny = true;
  } else if (links.length > 0) {
    m('R_LINKS_SECURE', 'TEXT_LINKS_SECURE', { count: String(links.length) });
  }

  if (kind === 'email') {
    const hdr = extractEmailHeaderDomains(content);
    if (hdr && hdr.fromDomain !== hdr.toDomain) {
      m('R_REPLYTO_MISMATCH', 'EMAIL_REPLYTO_MISMATCH', { fromDomain: hdr.fromDomain, toDomain: hdr.toDomain });
      matchedAny = true;
    }
  }

  if (!matchedAny) m('R_TEXT_CLEAN', 'TEXT_NO_SCAM_PATTERNS');
  return out;
}

// ---------------------------------------------------------------------------
// Code rules

export function runCodeRules(content) {
  const out = [];
  const notes = [];
  for (const rule of CODE_RULES) {
    if (rule.re.test(content)) {
      out.push(match(rule.id, rule.findingId));
      notes.push(rule.id.toLowerCase().replace('cr_', '').replace(/_/g, ' '));
    }
  }
  if (out.length === 0) {
    out.push(match('R_CODE_CLEAN', 'CODE_CLEAN'));
    notes.push('no pattern matches');
  } else {
    notes.push('static review only, nothing was executed');
  }
  const kb = Math.max(1, Math.round(content.length / 1024));
  const codeNotes = `Static (no-execution) review of ~${kb} KB of code. Pattern matches: ${notes.join(', ')}.`;
  const simpleCodeNotes = `We read the code without running it. Things worth noting: ${notes.join(', ')}.`;
  return { matches: out, codeNotes, simpleCodeNotes };
}

// ---------------------------------------------------------------------------
// Fetch / document rules

export function runFetchRules(fetchObs) {
  const out = [];
  if (!fetchObs.ok) {
    out.push(match('R_FETCH_FAILED', 'FETCH_FAILED', { reason: fetchObs.error }));
  } else if (!fetchObs.isHtml && fetchObs.contentType) {
    out.push(match('R_NOT_HTML', 'FETCH_NOT_HTML', { type: fetchObs.contentType }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Report assembly: dedupe, resolve, render, score

const SEVERITY_ORDER = { bad: 0, warning: 1, good: 2 };

export function buildReport(rawMatches) {
  // Deduplicate by findingId: the first rule to emit a finding wins, so a
  // single underlying issue is never penalized twice.
  const seen = new Set();
  const matches = [];
  const ruleTrace = [];
  for (const m of rawMatches || []) {
    if (!m || !m.findingId) continue;
    if (seen.has(m.findingId)) {
      ruleTrace.push({ findingId: m.findingId, ruleId: m.ruleId, deduped: true });
      continue;
    }
    seen.add(m.findingId);
    matches.push(m);
    ruleTrace.push({ findingId: m.findingId, ruleId: m.ruleId, deduped: false });
  }

  // Resolve every finding from the knowledge base. An unknown findingId is
  // a programming error and throws here rather than shipping broken text.
  const resolved = matches.map((m) => {
    const def = FINDING_BY_ID[m.findingId];
    if (!def) throw new Error('Unknown findingId: ' + m.findingId);
    let description = renderTemplate(def.description, m.vars);
    if (def.recommendation && def.severity !== 'good') {
      const rec = renderTemplate(def.recommendation, m.vars);
      description = description + ' ' + rec;
    }
    return {
      id: def.id,
      title: renderTemplate(def.title, m.vars),
      severity: def.severity,
      category: def.category,
      description,
      simple_description: renderTemplate(def.simpleDescription, m.vars)
    };
  });

  resolved.sort((a, b) => {
    const oa = SEVERITY_ORDER[a.severity] !== undefined ? SEVERITY_ORDER[a.severity] : 3;
    const ob = SEVERITY_ORDER[b.severity] !== undefined ? SEVERITY_ORDER[b.severity] : 3;
    return oa - ob;
  });

  const badCount = resolved.filter((f) => f.severity === 'bad').length;
  const warnCount = resolved.filter((f) => f.severity === 'warning').length;
  const goodCount = resolved.filter((f) => f.severity === 'good').length;

  const penalty =
    SCORING.weights.bad * Math.min(badCount, SCORING.caps.bad) +
    SCORING.weights.warning * Math.min(warnCount, SCORING.caps.warning);
  const bonus = SCORING.goodBonus * Math.min(goodCount, SCORING.caps.good);
  const score = Math.max(0, Math.min(100, SCORING.base - penalty + bonus));
  const verdict = score >= SCORING.busThreshold ? 'bus' : 'sus';

  const lead = resolved.slice(0, 3).map((f) => f.title.toLowerCase()).join('; ');
  const summary = verdict === 'bus'
    ? renderTemplate(STATUS_MESSAGES.SUMMARY_BUS, {
        goodCount: String(goodCount), warnCount: String(warnCount), badCount: String(badCount), lead: lead || 'none'
      })
    : renderTemplate(STATUS_MESSAGES.SUMMARY_SUS, {
        badCount: String(badCount), warnCount: String(warnCount), lead: lead || 'none'
      });
  const simpleSummary = verdict === 'bus'
    ? renderTemplate(STATUS_MESSAGES.SUMMARY_SIMPLE_BUS, { warnCount: String(warnCount), warnPlural: warnCount === 1 ? '' : 's' })
    : renderTemplate(STATUS_MESSAGES.SUMMARY_SIMPLE_SUS, {
        issueCount: String(badCount + warnCount), issuePlural: badCount + warnCount === 1 ? '' : 's'
      });

  return {
    kbVersion: KB_VERSION,
    scoringModelVersion: SCORING.modelVersion,
    score,
    verdict,
    points: resolved,
    redFlags: resolved.filter((f) => f.severity === 'bad').map((f) => f.title),
    greenFlags: resolved.filter((f) => f.severity === 'good').map((f) => f.title),
    summary,
    simpleSummary,
    ruleTrace
  };
}