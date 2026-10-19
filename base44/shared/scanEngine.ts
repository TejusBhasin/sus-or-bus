// Deterministic scan engine for Sus or Bus.
//
// No AI calls, no external reputation services, zero integration credits.
// Every finding is produced by a rule that cites something actually observed
// in the fetched page, pasted text, or code. Missing evidence is never
// treated as proof of safety: checks that could not run are reported as such.
//
// SCORING MODEL (fixed and deterministic):
//   score starts at 85
//   each "bad" finding     -18  (at most 3 counted)
//   each "warning" finding  -7  (at most 5 counted)
//   each "good" finding     +2  (at most 4 counted)
//   the result is clamped to 0..100
//   verdict: 60 or above = "bus" (leans safe), below 60 = "sus"
//
// A finding's severity is about potential impact; the wording carries the
// honesty ("no match does not prove safety", "could not be checked").

const CATEGORY_LIST = ['privacy', 'security', 'trackers', 'content', 'code', 'email', 'reputation'];

// ---------------------------------------------------------------------------
// Built-in lists (documented, maintainable, no external calls)

// Known analytics / advertising / social endpoints. A match means the page
// references the domain, nothing more — it is context, not proof of spying.
const TRACKER_DOMAINS = [
  ['google-analytics.com', 'Google Analytics', 'analytics'],
  ['googletagmanager.com', 'Google Tag Manager', 'analytics'],
  ['doubleclick.net', 'Google DoubleClick (advertising)', 'advertising'],
  ['googlesyndication.com', 'Google AdSense (advertising)', 'advertising'],
  ['adsystem.com', 'Amazon Ads', 'advertising'],
  ['connect.facebook.net', 'Facebook pixel', 'social'],
  ['facebook.net', 'Facebook (social embeds)', 'social'],
  ['hotjar.com', 'Hotjar (session analytics)', 'analytics'],
  ['clarity.ms', 'Microsoft Clarity (analytics)', 'analytics'],
  ['mixpanel.com', 'Mixpanel (analytics)', 'analytics'],
  ['segment.io', 'Segment (data pipeline)', 'analytics'],
  ['segment.com', 'Segment (data pipeline)', 'analytics'],
  ['amplitude.com', 'Amplitude (analytics)', 'analytics'],
  ['heap.io', 'Heap (analytics)', 'analytics'],
  ['quantserve.com', 'Quantcast (advertising)', 'advertising'],
  ['scorecardresearch.com', 'Comscore (analytics)', 'analytics'],
  ['criteo.com', 'Criteo (advertising)', 'advertising'],
  ['taboola.com', 'Taboola (advertising)', 'advertising'],
  ['outbrain.com', 'Outbrain (advertising)', 'advertising'],
  ['adnxs.com', 'Xandr/AppNexus (advertising)', 'advertising'],
  ['pubmatic.com', 'PubMatic (advertising)', 'advertising'],
  ['rubiconproject.com', 'Magnite (advertising)', 'advertising'],
  ['matomo.cloud', 'Matomo (analytics)', 'analytics']
];

// [token, official domains]. If the token appears in the host but the host
// is not one of the official domains, it is treated as a lookalike.
const BRANDS = [
  ['paypal', ['paypal.com']],
  ['apple', ['apple.com', 'icloud.com']],
  ['microsoft', ['microsoft.com', 'office.com', 'live.com', 'outlook.com']],
  ['amazon', ['amazon.com', 'amzn.to']],
  ['netflix', ['netflix.com']],
  ['google', ['google.com', 'googleapis.com', 'gstatic.com', 'googleusercontent.com', 'youtube.com', 'blogger.com']],
  ['facebook', ['facebook.com', 'fb.com', 'instagram.com', 'whatsapp.com']],
  ['chase', ['chase.com']],
  ['wellsfargo', ['wellsfargo.com']],
  ['coinbase', ['coinbase.com']],
  ['binance', ['binance.com']],
  ['dhl', ['dhl.com']],
  ['usps', ['usps.com']]
];

// Cheap or abuse-prone top-level domains. Context signal only.
const RISKY_TLDS = ['zip', 'mov', 'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'click', 'cam', 'rest', 'country', 'stream', 'loan', 'work', 'review', 'download', 'racing'];

// Technology fingerprints in the HTML.
const TECH_SIGNATURES = [
  ['Shopify', /cdn\.shopify\.com|shopify\.com\/s\//i],
  ['WordPress', /wp-content|wp-includes/i],
  ['Wix', /static\.wixstatic\.com|wixstatic/i],
  ['Squarespace', /squarespace/i],
  ['React', /__NEXT_DATA__|data-reactroot|_reactListening/i],
  ['jQuery', /jquery/i],
  ['Bootstrap', /bootstrap(?:\.min)?\.(?:css|js)/i],
  ['Google Fonts', /fonts\.googleapis\.com/i],
  ['Cloudflare', /cdn-cgi\/|cloudflare/i],
  ['Stripe', /js\.stripe\.com/i],
  ['Google Sign-in', /accounts\.google\.com\/gsi/i]
];

// ---------------------------------------------------------------------------
// Small helpers

function pushFinding(list, f) {
  list.push({
    title: f.title,
    severity: f.severity,
    category: CATEGORY_LIST.includes(f.category) ? f.category : 'security',
    description: f.description,
    simple_description: f.simpleDescription
  });
}

function originOf(href, base) {
  try {
    return new URL(href, base).origin;
  } catch {
    return null;
  }
}

function countMatches(html, re) {
  const m = html.match(re);
  return m ? m.length : 0;
}

function bytesOf(text) {
  return Math.max(1, Math.round(text.length / 1024));
}

// ---------------------------------------------------------------------------
// Domain / address analysis

export function analyzeDomain(host, isHttps) {
  const findings = [];
  const tld = host.split('.').pop() || '';

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    pushFinding(findings, {
      title: 'Bare IP address instead of a domain name',
      severity: 'bad',
      category: 'security',
      description: 'The site is served directly from an IP address with no domain name, which is common with disposable or throwaway hosting and skips normal domain oversight.',
      simpleDescription: 'The site has no name, just a number. Legitimate sites almost always have a real name.'
    });
  }
  if (host.indexOf('xn--') !== -1) {
    pushFinding(findings, {
      title: 'Non-latin characters in the address',
      severity: 'warning',
      category: 'security',
      description: 'The address uses internationalized (punycode) characters. These are legitimate, but they can also be used to create convincing lookalikes of well-known domains.',
      simpleDescription: 'The address contains special letters. That is allowed, but it is also a trick scammers use to fake well-known names, so double-check the spelling.'
    });
  }
  for (const entry of BRANDS) {
    const token = entry[0];
    const official = entry[1];
    if (host.indexOf(token) !== -1 && !official.some((d) => host === d || host.endsWith('.' + d))) {
      pushFinding(findings, {
        title: 'Address imitates a well-known brand',
        severity: 'bad',
        category: 'reputation',
        description: `The address contains "${token}" but is not one of the official ${token} domains (${official.join(', ')}), a classic lookalike pattern.`,
        simpleDescription: `This address pretends to be ${token} but is not the real one. That is a common scam trick.`
      });
      break;
    }
  }
  if (RISKY_TLDS.indexOf(tld) !== -1) {
    pushFinding(findings, {
      title: `Unusual address ending (.${tld})`,
      severity: 'warning',
      category: 'reputation',
      description: `The address ends in .${tld}, a domain space with low registration cost and a track record of abuse. This is a context signal, not proof of anything.`,
      simpleDescription: `The address ends in ".${tld}", which is popular with scam sites. It is not proof of a scam, but stay careful.`
    });
  }
  const labels = host.split('.');
  const hyphens = (host.match(/-/g) || []).length;
  if (hyphens >= 3 || labels.length >= 5) {
    pushFinding(findings, {
      title: 'Unusually shaped address',
      severity: 'warning',
      category: 'reputation',
      description: `The address has ${labels.length} parts and ${hyphens} dashes, which is a common shape for generated or deceptive hostnames. Context signal only.`,
      simpleDescription: 'The address looks long, chopped-up, and unnatural, which is often a bad sign.'
    });
  }
  if (!isHttps) {
    pushFinding(findings, {
      title: 'No HTTPS encryption',
      severity: 'warning',
      category: 'security',
      description: 'The page loaded over plain HTTP, so traffic between the visitor and the site is not encrypted or authenticated in transit.',
      simpleDescription: 'Data sent to this site travels unencrypted, so others on the network could read or change it.'
    });
  } else {
    pushFinding(findings, {
      title: 'HTTPS encryption in use',
      severity: 'good',
      category: 'security',
      description: 'The page loaded over HTTPS with TLS, protecting data in transit. This says nothing about the honesty of the site operator.',
      simpleDescription: 'The connection to the site is encrypted, which is a good basic sign.'
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Security header analysis (absent headers are reported as absent, never as
// detected attacks)

export function analyzeHeaders(headers, isHttps) {
  const findings = [];
  const has = (name) => !!(headers && headers.get && headers.get(name));
  const present = [];

  if (isHttps && has('strict-transport-security')) {
    present.push('Strict-Transport-Security (forces HTTPS on return visits)');
  }
  if (has('content-security-policy')) {
    present.push('Content Security Policy (restricts what the page may load and execute)');
  }
  if (has('x-content-type-options')) {
    present.push('X-Content-Type-Options (blocks MIME-sniffing)');
  }
  if (has('x-frame-options')) {
    present.push('X-Frame-Options (limits who may embed the page)');
  }
  if (has('referrer-policy')) {
    present.push('Referrer-Policy (limits referrer information leaks)');
  }
  if (has('permissions-policy')) {
    present.push('Permissions-Policy (restricts browser capabilities)');
  }

  if (present.length > 0) {
    pushFinding(findings, {
      title: `Security headers present: ${present.length} found`,
      severity: 'good',
      category: 'security',
      description: `The response includes ${present.join('; ')}. These are hardening measures, not a guarantee the site is honest.`,
      simpleDescription: 'The site has extra safety settings switched on, which shows some care went into building it.'
    });
  } else {
    pushFinding(findings, {
      title: 'None of the common security headers were present',
      severity: 'warning',
      category: 'security',
      description: 'The response carried no HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy or Permissions-Policy. Their absence is common and is a hardening gap, not evidence of malice.',
      simpleDescription: 'The site is missing the usual safety settings that protect visitors. Not a scam sign on its own, but careless.'
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Static HTML analysis (no JavaScript is executed)

export function analyzeHtml(html, baseUrl, isHttps) {
  const findings = [];
  const trackers = [];
  const dataCollected = [];
  const technologies = [];

  // --- title and description ---
  const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1].trim() : '';
  let description = '';
  const descMatch = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html);
  if (descMatch) description = descMatch[1].trim();
  else {
    const ogMatch = /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i.exec(html);
    if (ogMatch) description = ogMatch[1].trim();
  }

  // --- scripts ---
  const scriptBlocks = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html))) {
    scriptBlocks.push({ attrs: m[1] || '', body: m[2] || '' });
  }
  const srcRe = /\bsrc=["']([^"']+)["']/i;
  const externalSrcs = [];
  for (const b of scriptBlocks) {
    const s = srcRe.exec(b.attrs);
    if (s) externalSrcs.push(s[1]);
  }
  const inlineBlocks = scriptBlocks.filter((b) => !srcRe.test(b.attrs));
  const externalOrigins = new Set();
  for (const src of externalSrcs) {
    const o = originOf(src, baseUrl || 'https://example.invalid');
    if (o && o !== 'null') externalOrigins.add(o);
  }
  const pageOrigin = baseUrl ? originOf(baseUrl, undefined) : null;
  const thirdPartyOrigins = pageOrigin ? [...externalOrigins].filter((o) => o !== pageOrigin) : [...externalOrigins];

  // --- trackers (built-in list match; context, not proof) ---
  const htmlLower = html.toLowerCase();
  const matchedTrackers = [];
  for (const entry of TRACKER_DOMAINS) {
    if (htmlLower.indexOf(entry[0]) !== -1) matchedTrackers.push(entry[1] + ' (' + entry[2] + ')');
  }
  if (matchedTrackers.length > 0) {
    trackers.push(...matchedTrackers);
    pushFinding(findings, {
      title: `Connects to known analytics/advertising services: ${matchedTrackers.length} matched`,
      severity: 'warning',
      category: 'trackers',
      description: `The page references: ${matchedTrackers.join(', ')}. These domains are matched against the scanner's built-in list; a match means the service is referenced, which is common and not automatically harmful.`,
      simpleDescription: `The site uses tools that watch what visitors do (${matchedTrackers.slice(0, 3).join(', ')}${matchedTrackers.length > 3 ? ' and others' : ''}). Many normal sites do this too.`
    });
  } else {
    pushFinding(findings, {
      title: 'No known analytics or advertising trackers matched',
      severity: 'good',
      category: 'trackers',
      description: 'No domain in the scanner built-in list of known analytics/advertising endpoints was referenced. Absence of a match does not prove there is no tracking.',
      simpleDescription: 'The scan found none of the usual tracking tools. A good sign, though it cannot see everything.'
    });
  }

  // --- forms ---
  const forms = [];
  const formRe = /<form\b([^>]*)>([\s\S]*?)(?:<\/form>|(?=<form\b)|(?=<body)|$)/gi;
  let fm;
  while ((fm = formRe.exec(html)) && forms.length < 10) {
    const attrs = fm[1] || '';
    const inner = fm[2] || '';
    const action = (/\baction=["']([^"']+)["']/i.exec(attrs) || [])[1] || '';
    const method = (/\bmethod=["']([^"']+)["']/i.exec(attrs) || [])[1] || 'get';
    forms.push({ attrs, inner, action, method, hasPassword: /type=["']password["']/i.test(inner) });
  }
  for (const f of forms) {
    if (/type=["']email["']|name=["'][^"']*email/i.test(f.inner)) dataCollected.push('Email address');
    if (/type=["']tel["']|name=["'][^"']*phone/i.test(f.inner)) dataCollected.push('Phone number');
    if (/name=["'][^"']*(card|cvc|ccnum|expir)/i.test(f.inner)) dataCollected.push('Payment card details');
    if (/name=["'][^"']*address/i.test(f.inner)) dataCollected.push('Postal address');
    if (f.hasPassword) dataCollected.push('Password (login form)');

    if (f.hasPassword && f.action && /^http:\/\//i.test(f.action)) {
      pushFinding(findings, {
        title: 'Password field sent to an unencrypted (http) address',
        severity: 'bad',
        category: 'security',
        description: `A form containing a password field submits to "${f.action}" over plain HTTP, so the password would travel unencrypted.`,
        simpleDescription: 'There is a sign-in box on this page, and the password would be sent without encryption. Never enter a password here.'
      });
    } else if (f.hasPassword && f.action && isHttps) {
      const actionOrigin = originOf(f.action, baseUrl || 'https://example.invalid');
      if (pageOrigin && actionOrigin && actionOrigin !== pageOrigin) {
        pushFinding(findings, {
          title: 'Login form sends the password to a different site',
          severity: 'bad',
          category: 'security',
          description: `The password form on this page submits to ${actionOrigin}, a different origin from the page itself, a classic credential-harvesting pattern.`,
          simpleDescription: 'The password box on this page secretly sends your password to a different website. Do not use it.'
        });
      } else {
        pushFinding(findings, {
          title: 'Login form keeps data on the same encrypted site',
          severity: 'good',
          category: 'security',
          description: 'A password form is present and submits to the same origin over HTTPS.',
          simpleDescription: 'The sign-in box sends your password only to this same site, encrypted. That is how it should work.'
        });
      }
    } else if (f.action) {
      const actionOrigin = originOf(f.action, baseUrl || 'https://example.invalid');
      if (pageOrigin && actionOrigin && actionOrigin !== pageOrigin) {
        pushFinding(findings, {
          title: 'Form submits to a different site',
          severity: 'warning',
          category: 'privacy',
          description: `A form on this page sends its data to ${actionOrigin} instead of this site. Sometimes legitimate (e.g. payment processors), sometimes not.`,
          simpleDescription: 'The form on this page sends what you type to a different website. That can be fine (like a payment company) or a trick.'
        });
      }
    }
  }

  // --- obfuscated inline scripts ---
  for (const b of inlineBlocks) {
    const hits = [];
    if (/\beval\s*\(/.test(b.body)) hits.push('eval()');
    if (/\batob\s*\(|\bunescape\s*\(|fromcharcode/i.test(b.body)) hits.push('atob/unescape/fromCharCode');
    if (/[0-9a-fA-F]{60,}/.test(b.body)) hits.push('long encoded blobs');
    if (/\\x[0-9a-f]{2}/i.test(b.body)) hits.push('escaped byte sequences');
    if (hits.length >= 1) {
      const touchesCookies = /document\.cookie\s*=/.test(b.body);
      const touchesRedirect = /location\.(href|replace|assign)\s*=/.test(b.body);
      if (hits.length >= 2 && (touchesCookies || touchesRedirect)) {
        pushFinding(findings, {
          title: 'Heavily obfuscated script that touches cookies or redirects',
          severity: 'bad',
          category: 'code',
          description: `An inline script uses multiple encoding techniques (${hits.join(', ')}) and also writes ${touchesCookies ? 'cookies' : ''}${touchesCookies && touchesRedirect ? ' and ' : ''}${touchesRedirect ? 'the redirect location' : ''}. Deliberate obfuscation combined with those actions is a strong phishing/malware indicator.`,
          simpleDescription: 'The page contains a hidden, scrambled script that can change cookies or send you elsewhere. This is a serious red flag.'
        });
      } else {
        pushFinding(findings, {
          title: 'Encoded or obfuscated inline script',
          severity: 'warning',
          category: 'code',
          description: `An inline script uses encoding techniques (${hits.join(', ')}). Minification is normal, but deliberate obfuscation hides what code really does.`,
          simpleDescription: 'Part of the page code is deliberately scrambled so you cannot read what it does. Sometimes innocent, but worth avoiding.'
        });
      }
      break; // report once, not per block
    }
  }

  // --- meta refresh auto-redirect ---
  const metaRefresh = /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=/i.test(html);
  if (metaRefresh) {
    pushFinding(findings, {
      title: 'Page auto-forwards to another address',
      severity: 'warning',
      category: 'content',
      description: 'A meta-refresh tag forwards visitors to a different URL, a technique sometimes used to slip past a quick glance at the address bar.',
      simpleDescription: 'The page immediately bounces you to another address before you can look at it.'
    });
  }

  // --- mixed content on an https page ---
  if (isHttps) {
    const mixed = countMatches(html, /(?:src|href)=["']http:\/\//gi);
    if (mixed > 0) {
      pushFinding(findings, {
        title: `Mixed content: ${mixed} unencrypted http reference(s)`,
        severity: 'warning',
        category: 'security',
        description: `The page loads over HTTPS but references ${mixed} plain-http resources, which browsers may block or warn about.`,
        simpleDescription: 'Some parts of the page load without encryption even though the page itself looks secure.'
      });
    }
  }

  // --- iframes ---
  const iframes = countMatches(html, /<iframe\b/i);

  // --- technologies ---
  for (const t of TECH_SIGNATURES) {
    if (t[1].test(html)) technologies.push(t[0]);
  }

  const codeNotes =
    `Static (no-execution) review of ~${bytesOf(html)} KB of HTML: ${externalSrcs.length} external script(s) from ${externalOrigins.size} origin(s), ` +
    `${inlineBlocks.length} inline script block(s), ${forms.length} form(s), ${iframes} iframe(s).` +
    (matchedTrackers.length ? ` Tracker list matches: ${matchedTrackers.join(', ')}.` : ' No tracker list matches.');
  const simpleCodeNotes =
    `We read the page's code without running any of it. It loads ${externalSrcs.length} file(s) from other companies, has ${forms.length} form(s) and ${iframes} embedded frame(s).` +
    (matchedTrackers.length ? ' It uses known visitor-tracking tools.' : ' No known visitor-tracking tools were found.');

  return {
    findings,
    title,
    description,
    trackers,
    dataCollected,
    technologies,
    codeNotes,
    simpleCodeNotes
  };
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
// Policy text analysis (keyword-level, explicitly not legal advice)

const POLICY_CHECKS = [
  {
    key: 'sell',
    re: /\bsell(?:ing|s)?\b[^.]{0,80}(personal|your|user|data|information)/i,
    severity: 'bad',
    title: 'Language about selling personal information',
    description: 'The policy contains wording about selling personal information. Read the exact context yourself before trusting the service.',
    simpleDescription: 'The policy says they may sell information about you. That is a big deal for your privacy.'
  },
  {
    key: 'share',
    re: /third[- ]part(?:y|ies)/i,
    severity: 'warning',
    title: 'Discloses sharing with third parties',
    description: 'The policy says data is shared with third parties. This is common practice, but it means other companies can receive information about you.',
    simpleDescription: 'The policy says other companies can get information about you. Normal, but worth knowing.'
  },
  {
    key: 'arbitration',
    re: /arbitration|class[- ]action/i,
    severity: 'warning',
    title: 'Arbitration or class-action language',
    description: 'The policy contains arbitration or class-action language, which can limit your ability to take disputes to court.',
    simpleDescription: 'The fine print may stop you from suing them in court if something goes wrong.'
  },
  {
    key: 'changes',
    re: /(?:change|modif\w*|updat\w*)[^.]{0,60}at any time/i,
    severity: 'warning',
    title: 'Terms can change at any time',
    description: 'The policy says the terms can be changed at any time, potentially without notice.',
    simpleDescription: 'They can change the rules whenever they want.'
  },
  {
    key: 'retention',
    re: /retent|retain|how long we (?:keep|store)/i,
    severity: 'good',
    title: 'Explains how long data is kept',
    description: 'The policy describes a data retention approach, which is a transparency positive.',
    simpleDescription: 'The policy explains how long they keep your information.'
  },
  {
    key: 'deletion',
    re: /delet\w*\s+(?:your|data|account)|right to (?:be forgotten|delet)/i,
    severity: 'good',
    title: 'Mentions deletion rights',
    description: 'The policy mentions deleting your data or account, a user-friendly signal.',
    simpleDescription: 'They say you can ask them to delete your information.'
  },
  {
    key: 'children',
    re: /child|minor|coppa|under (?:13|16|18)/i,
    severity: 'good',
    title: "Addresses children's privacy",
    description: "The policy addresses children's data, which shows awareness of privacy obligations.",
    simpleDescription: 'The policy talks about protecting kids, which is a good sign.'
  },
  {
    key: 'cookies',
    re: /cookies?|web beacon|tracking pixel/i,
    severity: 'good',
    title: 'Discloses cookie and tracking use',
    description: 'The policy discloses the use of cookies or similar tracking technologies.',
    simpleDescription: 'The policy admits it uses cookies (small tracking files) and explains why.'
  }
];

export function analyzePolicyText(html, docLabel) {
  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < 200) {
    return {
      found: [docLabel],
      points: [
        {
          title: 'Policy page appears empty or very short',
          severity: 'warning',
          description: 'The linked policy page contains almost no readable text, which prevents any policy analysis.',
          simple_description: 'The privacy/terms page is basically empty, so it tells you nothing.'
        }
      ],
      summary: 'The policy page contained too little readable text to analyze.',
      simple_summary: 'The policy page was too short to check.'
    };
  }

  const points = [];
  const matched = [];
  for (const check of POLICY_CHECKS) {
    if (check.re.test(text)) {
      matched.push(check.title.toLowerCase());
      points.push({
        title: check.title,
        severity: check.severity,
        description: check.description,
        simple_description: check.simpleDescription
      });
    }
  }
  if (points.length === 0) {
    points.push({
      title: 'No standard policy clauses matched',
      severity: 'warning',
      description: 'The scanner did not find the usual disclosures (sharing, retention, deletion) in the readable text. The policy may use unusual wording, or it may genuinely omit them.',
      simple_description: 'The scan could not find the normal privacy promises in this text. It may just use odd wording.'
    });
  }

  const summary =
    `Automated keyword analysis of the ${docLabel} document found language about: ${matched.length ? matched.join('; ') : 'none of the standard clauses'}. ` +
    'This is a mechanical word-level review, not legal advice, and it can miss context.';
  const simple_summary =
    `We scanned the ${docLabel} text for common privacy phrases and found: ${matched.length ? matched.join('; ') : 'nothing standard'}. ` +
    'A computer cannot fully understand legal wording, so skim it yourself too.';

  return { found: [docLabel], points, summary, simple_summary };
}

export function mergeTermsPrivacy(termsAnalysis, privacyAnalysis) {
  if (!termsAnalysis && !privacyAnalysis) return null;
  const found = [];
  const points = [];
  const summaries = [];
  const simpleSummaries = [];
  for (const a of [termsAnalysis, privacyAnalysis]) {
    if (!a) continue;
    found.push(...a.found);
    points.push(...a.points);
    if (a.summary) summaries.push(a.summary);
    if (a.simple_summary) simpleSummaries.push(a.simple_summary);
  }
  return {
    found,
    points,
    summary: summaries.join(' '),
    simple_summary: simpleSummaries.join(' ')
  };
}

// The most important policy signals also feed the main score (capped).
export function policyMainFindings(termsPrivacy, foundAnyLinks) {
  const findings = [];
  if (!termsPrivacy) {
    if (foundAnyLinks === false) {
      pushFinding(findings, {
        title: 'No privacy policy or terms links found on the page',
        severity: 'warning',
        category: 'privacy',
        description: 'No same-site link to a privacy policy or terms document was found in the page HTML. Some sites keep these off the homepage, but their absence limits what the scanner can verify.',
        simpleDescription: 'The scan could not find any privacy policy or terms on this site, so their rules are unknown.'
      });
    }
    return findings;
  }
  const bad = termsPrivacy.points.filter((p) => p.severity === 'bad').slice(0, 1);
  const warn = termsPrivacy.points.filter((p) => p.severity === 'warning').slice(0, 1);
  for (const p of bad) {
    pushFinding(findings, {
      title: 'Privacy policy: ' + p.title.toLowerCase(),
      severity: 'bad',
      category: 'privacy',
      description: p.description,
      simpleDescription: p.simple_description
    });
  }
  for (const p of warn) {
    pushFinding(findings, {
      title: 'Privacy policy: ' + p.title.toLowerCase(),
      severity: 'warning',
      category: 'privacy',
      description: p.description,
      simpleDescription: p.simple_description
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Free-text / email analysis

const TEXT_PATTERNS = [
  {
    re: /urgent|immediately|act now|final notice|within (?:24|48|72)\s*hours/i,
    severity: 'warning',
    category: 'content',
    title: 'Urgency pressure',
    description: 'The text pushes for immediate action with time pressure, a standard social-engineering lever.',
    simpleDescription: 'The message rushes you to act fast, which is a classic scam move.'
  },
  {
    re: /verify your (?:account|identity|email)|confirm your (?:account|identity|details)|update your (?:payment|billing|card)/i,
    severity: 'bad',
    category: 'email',
    title: 'Asks you to verify or update account/payment details',
    description: 'The text asks the reader to verify or update account or payment information, the core of credential-harvesting and card-phishing lures.',
    simpleDescription: 'The message wants you to "confirm" your account or card details. Real companies do not ask this over a link.'
  },
  {
    re: /gift card|bitcoin|wire transfer|western union|crypto(?:currency)?\s*wallet/i,
    severity: 'bad',
    category: 'email',
    title: 'Requests hard-to-trace payment',
    description: 'The text mentions gift cards, cryptocurrency or wire transfers, payment channels with no buyer protection that are near-universal in fraud.',
    simpleDescription: 'It wants to be paid in gift cards or crypto, which you can never get back. Strong scam sign.'
  },
  {
    re: /you(?:'ve| have)?\s+(?:won|been selected)|prize|lottery|inherit(?:ance)?|claim your (?:reward|prize|winnings)/i,
    severity: 'bad',
    category: 'content',
    title: 'Too-good-to-be-true offer',
    description: 'The text claims a prize, lottery win or inheritance, a near-certain fraud pattern.',
    simpleDescription: 'It says you won something out of nowhere. That is a scam the vast majority of the time.'
  },
  {
    re: /dear (?:customer|user|client|sir\/madam|account holder)/i,
    severity: 'warning',
    category: 'email',
    title: 'Generic greeting',
    description: 'The greeting addresses a generic customer rather than a named person, typical of mass phishing.',
    simpleDescription: 'It says "Dear customer" instead of your name, which mass scam messages usually do.'
  },
  {
    re: /suspicious (?:activity|login|sign[- ]?in attempt)|unusual (?:activity|sign[- ]?in)|security alert|account (?:has been|will be) (?:locked|suspended|limited)/i,
    severity: 'warning',
    category: 'email',
    title: 'Security-alert framing',
    description: 'The text uses fear of account compromise to drive a click, a common phishing framing.',
    simpleDescription: 'It scares you with talk of account problems so you click without thinking.'
  },
  {
    re: /click (?:the|this) (?:link|button) below|log\s?in (?:below|here|using the link)/i,
    severity: 'warning',
    category: 'email',
    title: 'Pushes a click to resolve the situation',
    description: 'The text funnels the reader to one click to resolve the situation, bypassing normal navigation.',
    simpleDescription: 'It insists you click its link to fix things. Real sites let you go there yourself.'
  }
];

function linkFindings(content, list) {
  const linkRe = /https?:\/\/[^\s<>"')\]]+/gi;
  const links = [];
  let lm;
  while ((lm = linkRe.exec(content)) && links.length < 20) links.push(lm[0]);

  let sawHttpLink = false;
  for (const link of links) {
    let u;
    try {
      u = new URL(link);
    } catch {
      continue;
    }
    const host = u.hostname.toLowerCase();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.indexOf('xn--') !== -1) {
      pushFinding(list, {
        title: 'Contains a raw-IP or special-character link',
        severity: 'bad',
        category: 'email',
        description: `The text links to "${host}", an address with no real domain name. Legitimate businesses send links to named domains.`,
        simpleDescription: 'One of the links hides behind a number or scrambled name instead of a real website name.'
      });
      return;
    }
    for (const entry of BRANDS) {
      const token = entry[0];
      const official = entry[1];
      if (host.indexOf(token) !== -1 && !official.some((d) => host === d || host.endsWith('.' + d))) {
        pushFinding(list, {
          title: `Link pretends to be ${token}`,
          severity: 'bad',
          category: 'email',
          description: `The link points to "${host}", which contains "${token}" but is not an official ${token} domain.`,
          simpleDescription: `A link in this text fakes being ${token}'s website. Do not click it.`
        });
        return;
      }
    }
    if (u.protocol === 'http:') sawHttpLink = true;
  }
  if (sawHttpLink) {
    pushFinding(list, {
      title: 'Contains unencrypted http links',
      severity: 'warning',
      category: 'email',
      description: 'At least one link uses plain http, so anything sent through it travels unencrypted.',
      simpleDescription: 'At least one link is not properly secured.'
    });
  } else if (links.length > 0) {
    pushFinding(list, {
      title: 'Links use ordinary secure addresses',
      severity: 'good',
      category: 'email',
      description: `${links.length} link(s) were found and none matched the scanner's lookalike/IP/unencrypted patterns. No match does not prove the links are safe.`,
      simpleDescription: 'The links in this text look normal and secure.'
    });
  }
}

function emailHeaderFindings(content, list) {
  const fromMatch = /from:\s*(?:.*?<)?([a-z0-9.-]+@[a-z0-9.-]+)>?/i.exec(content);
  const replyMatch = /reply-to:\s*(?:.*?<)?([a-z0-9.-]+@[a-z0-9.-]+)>?/i.exec(content);
  if (fromMatch && replyMatch) {
    const fromDomain = fromMatch[1].split('@')[1].toLowerCase();
    const replyDomain = replyMatch[1].split('@')[1].toLowerCase();
    if (fromDomain && replyDomain && fromDomain !== replyDomain) {
      pushFinding(list, {
        title: 'Reply-to goes to a different domain than the sender',
        severity: 'warning',
        category: 'email',
        description: `The From domain (${fromDomain}) differs from the Reply-To domain (${replyDomain}), which is common in spoofed or manipulated mail.`,
        simpleDescription: 'If you answer this email, it secretly goes to a different company than the one it claims to be from.'
      });
    }
  }
}

export function analyzeTextContent(content, kind) {
  const findings = [];
  let matchedAny = false;
  for (const p of TEXT_PATTERNS) {
    if (p.re.test(content)) {
      matchedAny = true;
      pushFinding(findings, {
        title: p.title,
        severity: p.severity,
        category: p.category,
        description: p.description,
        simpleDescription: p.simpleDescription
      });
    }
  }
  linkFindings(content, findings);
  if (kind === 'email') emailHeaderFindings(content, findings);
  if (!matchedAny && findings.length === 0) {
    pushFinding(findings, {
      title: 'No common scam patterns matched',
      severity: 'good',
      category: 'content',
      description: 'None of the scanner pattern rules (urgency, credential lures, untraceable payment, prize claims, lookalike links) matched this text. Absence of matches does not prove it is safe.',
      simpleDescription: 'The scan found none of the usual scam phrases or tricks in this text.'
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Code analysis (static patterns, no execution)

export function analyzeCode(content) {
  const findings = [];
  const notes = [];

  const checks = [
    {
      re: /\beval\s*\(/,
      severity: 'warning',
      note: 'eval() usage',
      title: 'Uses eval() to execute dynamic code',
      description: 'The code calls eval(), executing dynamically built strings. High-risk in principle, sometimes justified (compilers, sandboxes).',
      simpleDescription: 'The code runs text as instructions on the fly, which can hide what it really does.'
    },
    {
      re: /document\.cookie\s*=[^;]*(?:fetch|xmlhttprequest|\.send\(|location)/i,
      severity: 'bad',
      note: 'cookie writing paired with network/redirect calls',
      title: 'Writes cookies and appears to send data or redirect',
      description: 'The code writes document.cookie in the same context as network or redirect calls, a pattern seen in session-hijacking scripts.',
      simpleDescription: 'The code tampers with login cookies and can send you or your data somewhere else.'
    },
    {
      re: /addEventListener\s*\(\s*['"]key(?:down|press|up)['"]/i,
      severity: 'warning',
      note: 'global keypress listener',
      title: 'Listens to every key pressed',
      description: 'The code attaches a global key listener. Legitimate for shortcuts; also the shape of keylogging. Context decides.',
      simpleDescription: 'The code watches every key you type. That is how keyloggers work, though some apps use it legally.'
    },
    {
      re: /(?:curl|wget)[^\n|]*\|\s*(?:ba)?sh/i,
      severity: 'bad',
      note: 'remote code piped straight into a shell',
      title: 'Downloads remote code and runs it immediately',
      description: 'The code pipes a remote download straight into a shell, executing whatever the server returns without inspection.',
      simpleDescription: 'This downloads a program from the internet and runs it instantly without checking it. Very dangerous.'
    },
    {
      re: /child_process|\bexec\s*\(|spawn\s*\(/,
      severity: 'warning',
      note: 'process/system execution calls',
      title: 'Spawns system processes',
      description: 'The code invokes system processes or shell commands. Legitimate in tooling, dangerous in scripts from untrusted sources.',
      simpleDescription: 'The code can run commands directly on the computer running it.'
    },
    {
      re: /[A-Za-z0-9+/]{200,}={0,2}/,
      severity: 'warning',
      note: 'large base64-like blob',
      title: 'Contains a large encoded blob',
      description: 'A long base64-like blob is embedded, which can conceal payloads or simply bundle assets. Cannot be verified without decoding.',
      simpleDescription: 'There is a big chunk of hidden encoded data in the code. Its purpose is unclear.'
    },
    {
      re: /document\.write\s*\(\s*(?:un)?escape\s*\(/i,
      severity: 'warning',
      note: 'document.write of escaped content',
      title: 'Writes escaped content directly into the page',
      description: 'document.write with escaped strings is an old pattern that can smuggle markup past a casual read.',
      simpleDescription: 'The code injects scrambled content straight into the page.'
    }
  ];

  for (const c of checks) {
    if (c.re.test(content)) {
      notes.push(c.note);
      pushFinding(findings, {
        title: c.title,
        severity: c.severity,
        category: 'code',
        description: c.description,
        simpleDescription: c.simpleDescription
      });
    }
  }

  if (findings.length === 0) {
    pushFinding(findings, {
      title: 'No dangerous static patterns matched',
      severity: 'good',
      category: 'code',
      description: 'None of the scanner static pattern rules matched. This is a limited no-execution review and does not prove the code is safe.',
      simpleDescription: 'The scan found none of the usual danger signs in this code, though it cannot see everything.'
    });
    notes.push('no pattern matches');
  } else {
    notes.push('static review only, nothing was executed');
  }

  const codeNotes = `Static (no-execution) review of ~${bytesOf(content)} KB of code. Pattern matches: ${notes.join(', ')}.`;
  const simpleCodeNotes = `We read the code without running it. Things worth noting: ${notes.join(', ')}.`;
  return { findings, codeNotes, simpleCodeNotes };
}

// ---------------------------------------------------------------------------
// Scoring and summaries

const BASE_SCORE = 85;
const WEIGHTS = { bad: 18, warning: 7 };
const GOOD_BONUS = 2;
const CAPS = { bad: 3, warning: 5, good: 4 };

export function scoreFindings(rawFindings) {
  const seen = new Set();
  const unique = [];
  for (const f of rawFindings || []) {
    if (!f || !f.title) continue;
    const key = f.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }
  const order = { bad: 0, warning: 1, good: 2 };
  unique.sort((a, b) => {
    const oa = order[a.severity] !== undefined ? order[a.severity] : 3;
    const ob = order[b.severity] !== undefined ? order[b.severity] : 3;
    return oa - ob;
  });

  const badCount = unique.filter((f) => f.severity === 'bad').length;
  const warnCount = unique.filter((f) => f.severity === 'warning').length;
  const goodCount = unique.filter((f) => f.severity === 'good').length;

  const penalty =
    WEIGHTS.bad * Math.min(badCount, CAPS.bad) +
    WEIGHTS.warning * Math.min(warnCount, CAPS.warning);
  const bonus = GOOD_BONUS * Math.min(goodCount, CAPS.good);
  const score = Math.max(0, Math.min(100, BASE_SCORE - penalty + bonus));
  const verdict = score >= 60 ? 'bus' : 'sus';

  const points = unique.map((f) => ({
    title: f.title,
    severity: f.severity,
    category: f.category,
    description: f.description,
    simple_description: f.simple_description
  }));
  const redFlags = unique.filter((f) => f.severity === 'bad').map((f) => f.title);
  const greenFlags = unique.filter((f) => f.severity === 'good').map((f) => f.title);

  return { score, verdict, points, redFlags, greenFlags };
}

// Deterministic variety: a stable string hash picks one phrase per slot from
// the ResultVariation pools, so the same input always reads the same, while
// different inputs get different wording. It reads like AI; it is a hash.

function stableHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickPhrase(phrases, category, seed, salt) {
  const pool = (phrases && phrases[category]) || [];
  if (pool.length === 0) return null;
  return pool[stableHash(seed + '|' + category + '|' + salt) % pool.length];
}

export function buildSummaries(points, verdict, seed, phrases, kind) {
  const bad = points.filter((p) => p.severity === 'bad');
  const warn = points.filter((p) => p.severity === 'warning');
  const good = points.filter((p) => p.severity === 'good');
  const leadPool = verdict === 'bus' ? [...good, ...warn, ...bad] : [...bad, ...warn, ...good];
  const lead = leadPool.slice(0, 3).map((p) => p.title.toLowerCase()).join('; ');
  const subject = kind || 'input';
  const seedStr = seed || 'scan';

  const fill = (t) =>
    String(t || '')
      .replace(/\{kind\}/g, subject)
      .replace(/\{lead\}/g, lead || 'none')
      .replace(/\{good\}/g, good.length)
      .replace(/\{warn\}/g, warn.length)
      .replace(/\{bad\}/g, bad.length);

  const hasPhrases = phrases && Object.keys(phrases).length > 0;

  let summary = '';
  let simpleSummary = '';

  if (hasPhrases) {
    const parts = [];
    const opener = pickPhrase(phrases, verdict === 'bus' ? 'bus_lead' : 'sus_lead', seedStr, 'lead');
    if (opener) parts.push(fill(opener));
    if (good.length > 0) {
      const g = pickPhrase(phrases, 'good_note', seedStr, 'good');
      if (g) parts.push(fill(g));
    }
    if (warn.length > 0) {
      const w = pickPhrase(phrases, 'caution_note', seedStr, 'caution');
      if (w) parts.push(fill(w));
    }
    if (bad.length > 0) {
      const r = pickPhrase(phrases, 'red_note', seedStr, 'red');
      if (r) parts.push(fill(r));
    }
    const close = pickPhrase(phrases, verdict === 'bus' ? 'close_bus' : 'close_sus', seedStr, 'close');
    if (close) parts.push(fill(close));
    const caveat = pickPhrase(phrases, 'caveat', seedStr, 'caveat');
    if (caveat) parts.push(fill(caveat));
    summary = parts.join(' ');

    const sOpener = pickPhrase(phrases, verdict === 'bus' ? 'simple_bus' : 'simple_sus', seedStr, 'simple');
    const sCaveat = pickPhrase(phrases, 'caveat', seedStr, 'simple-caveat');
    simpleSummary = [sOpener ? fill(sOpener) : '', sCaveat ? fill(sCaveat) : ''].filter(Boolean).join(' ');
  }

  // Fallback when the variation pools are unavailable
  if (!summary) {
    summary =
      verdict === 'bus'
        ? `Automated evidence scan: ${good.length} positive, ${warn.length} cautionary and ${bad.length} high-severity signals. ` +
          `Leading signals: ${lead || 'none'}. No match is a guarantee of safety.`
        : `Automated evidence scan flagged this ${subject} with ${bad.length} high-severity and ${warn.length} cautionary signals. ` +
          `Leading signals: ${lead || 'none'}.`;
  }
  if (!simpleSummary) {
    simpleSummary =
      verdict === 'bus'
        ? `The automatic checks mostly came back fine, with ${warn.length} thing${warn.length === 1 ? '' : 's'} worth knowing about. ` +
          'Computers cannot catch everything, so keep your wits about you.'
        : `The automatic checks found ${bad.length + warn.length} thing${bad.length + warn.length === 1 ? '' : 's'} that look unsafe, so it is best to stay away.`;
  }

  return { summary, simpleSummary };
}