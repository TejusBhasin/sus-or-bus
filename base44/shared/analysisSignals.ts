// Sus or Bus — deterministic safety analysis engine. Pure signal detection and
// weighted scoring. No AI, no integration calls, no credits.

export interface Finding {
  id: string;
  severity: 'good' | 'warning' | 'bad';
  category: string;
  weight: number;
  values: Record<string, string | number>;
}

export interface AnalysisResult {
  score: number;
  verdict: 'bus' | 'sus';
  findings: Finding[];
  trackers: string[];
  technologies: string[];
  dataCollected: string[];
  redFlags: string[];
  greenFlags: string[];
  codeNotes: string;
  simpleCodeNotes: string;
}

const SUSPICIOUS_TLDS = ['zip', 'mov', 'top', 'xyz', 'click', 'cam', 'rest', 'gq', 'tk', 'ml', 'cf', 'ga', 'work', 'country', 'kim', 'loan', 'men', 'mom', 'party', 'quest', 'royal', 'run', 'sbs', 'cyou', 'fit', 'surf', 'buzz', 'monster', 'link', 'live'];

const TRACKER_DOMAINS: Array<[string, string]> = [
  ['google-analytics.com', 'Google Analytics'], ['googletagmanager.com', 'Google Tag Manager'], ['doubleclick.net', 'DoubleClick'],
  ['connect.facebook.net', 'Facebook Pixel'], ['facebook.com/tr', 'Facebook Pixel'], ['hotjar.com', 'Hotjar'],
  ['mixpanel.com', 'Mixpanel'], ['segment.com', 'Segment'], ['clarity.ms', 'Microsoft Clarity'],
  ['scorecardresearch.com', 'ScoreCard Research'], ['quantserve.com', 'Quantcast'], ['criteo.com', 'Criteo'],
  ['taboola.com', 'Taboola'], ['outbrain.com', 'Outbrain'], ['adnxs.com', 'Xandr'],
  ['mc.yandex.ru', 'Yandex Metrica'], ['fullstory.com', 'FullStory'], ['amplitude.com', 'Amplitude'],
  ['branch.io', 'Branch'], ['onesignal.com', 'OneSignal'], ['intercom.io', 'Intercom'],
  ['matomo.cloud', 'Matomo'], ['adservice.google.com', 'Google Ads'], ['adsystem.com', 'Microsoft Ads']
];

const BRANDS: Record<string, string> = {
  paypal: 'paypal.com', apple: 'apple.com', microsoft: 'microsoft.com', amazon: 'amazon.com',
  netflix: 'netflix.com', coinbase: 'coinbase.com', google: 'google.com', facebook: 'facebook.com',
  instagram: 'instagram.com', whatsapp: 'whatsapp.com', binance: 'binance.com', chase: 'chase.com',
  wellsfargo: 'wellsfargo.com', bankofamerica: 'bankofamerica.com', 'bank of america': 'bankofamerica.com',
  dhl: 'dhl.com', fedex: 'fedex.com', usps: 'usps.com', irs: 'irs.gov', netflix: 'netflix.com',
  dropbox: 'dropbox.com', linkedin: 'linkedin.com', icloud: 'icloud.com', office365: 'microsoft.com'
};

const STRONG_URGENCY = ['act now', 'account suspended', 'account will be closed', 'within 24 hours', 'final notice', 'last warning', 'verify your account', 'confirm your identity', 'don\'t delay', 'act today', 'immediate action required', 'expires today'];
const WEAK_URGENCY = ['immediately', 'urgent', 'limited time', 'expires in', 'hurry', 'right away'];

const CREDENTIAL_PHRASES = ['password', 'social security', 'ssn', 'bank account number', 'credit card number', 'verify your identity', 'confirm your account', 'login credentials', 'routing number', 'mother\'s maiden name', 'pin code', 'one-time code', 'otp code'];

const SCAM_PHRASES = ['congratulations', 'you have won', 'you\'ve won', 'claim your prize', 'free money', 'double your', 'guaranteed profit', 'risk-free', '100% free', 'no credit card required', 'click here to claim', 'inheritance', 'millionaire', 'get rich', 'investment opportunity', 'forex signals', 'crypto doubling', 'wire the funds', 'gift card'];

const PAYMENT_PHRASES = ['wire transfer', 'western union', 'moneygram', 'bitcoin', 'gift card', 'crypto wallet', 'usdt', 'ethereum'];

const DANGEROUS_ATTACHMENT = ['.exe', '.scr', '.vbs', '.bat', '.cmd', '.msi', '.js ', '.jar', '.apk'];

const CODE_DANGER: Array<[RegExp, string]> = [
  [/eval\s*\(/, 'eval()'], [/new\s+Function\s*\(/, 'new Function()'], [/exec\s*\(/, 'exec()'],
  [/os\.system\s*\(/, 'os.system()'], [/subprocess\./, 'subprocess'], [/child_process/, 'child_process'],
  [/Runtime\.getRuntime/, 'Runtime.getRuntime()'], [/rm\s+-rf\s+\//, 'rm -rf /'], [/chmod\s+777/, 'chmod 777'],
  [/curl[^|]*\|\s*(ba)?sh/, 'curl | shell'], [/wget[^|]*\|\s*(ba)?sh/, 'wget | shell'],
  [/Invoke-Expression/, 'Invoke-Expression'], [/pickle\.loads/, 'pickle.loads()'], [/base64\s+-d[^|]*\|/, 'base64 -d | shell'],
  [/document\.cookie/, 'cookie scraping'], [/localStorage.*fetch\(/i, 'storage export + fetch']
];

const EXFIL_TARGETS: Array<[RegExp, string]> = [
  [/discord(?:app)?\.com\/api\/webhooks/, 'discord.com'], [/hooks\.slack\.com\/services/, 'slack.com'],
  [/api\.telegram\.org\/bot/, 'telegram.org'], [/pastebin\.com\/api/, 'pastebin.com'],
  [/webhook\.site/, 'webhook.site'], [/requestbin/, 'requestbin'], [/ngrok\.(io|com)/, 'ngrok']
];

const KEYLOG_MARKERS = ['getasynckeystate', 'setwindowshookex', 'onkeyboard', 'pynput', 'keylogger', 'getforegroundwindow'];

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/AKIA[0-9A-Z]{16}/, 'AWS key'], [/sk-[A-Za-z0-9]{20,}/, 'API key'], [/ghp_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/sk_live_[A-Za-z0-9]{16,}/, 'Stripe live key'], [/-----BEGIN[A-Z ]*PRIVATE KEY-----/, 'private key']
];

const OBFUSCATION_MARKERS: Array<[RegExp, string]> = [
  [/atob\s*\(/, 'atob()'], [/eval\s*\(\s*atob/, 'eval(atob())'], [/unescape\s*\(\s*%/, 'unescape(%..)'],
  [/String\.fromCharCode/, 'String.fromCharCode()'], [/\\x[0-9a-f]{2}(\\x[0-9a-f]{2}){5,}/, 'hex-escape blobs'],
  [/document\.write\s*\(\s*unescape/, 'document.write(unescape())'], [/[A-Za-z0-9+/]{120,}={0,2}/, 'base64 blobs']
];

const MINING_MARKERS: Array<[string, string]> = [['coinhive', 'Coinhive'], ['cryptonight', 'CryptoNight'], ['stratum+tcp', 'stratum+tcp'], ['miner', 'mining kit'], ['deepminr', 'deepMinr']];

const TECH_SIGNATURES: Array<[string, string]> = [
  ['wp-content', 'WordPress'], ['data-reactroot', 'React'], ['__next', 'Next.js'], ['data-v-', 'Vue'],
  ['ng-version', 'Angular'], ['jquery', 'jQuery'], ['bootstrap', 'Bootstrap'], ['cdn.shopify', 'Shopify'],
  ['js.stripe.com', 'Stripe'], ['cdn-cgi', 'Cloudflare'], ['fonts.googleapis', 'Google Fonts'],
  ['squarespace', 'Squarespace'], ['static.wixstatic', 'Wix'], ['hs-scripts', 'HubSpot'], ['tailwind', 'Tailwind CSS']
];

const CRITICAL_IDS = new Set(['phishing_form', 'lookalike', 'mining', 'keylog', 'exfil', 'punycode', 'ip_host']);

/* ---------------- helpers ---------------- */

function hostOf(u: string): string {
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return '';
  }
}

function tldOf(host: string): string {
  const parts = host.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .toLowerCase();
}

function extractUrls(text: string): string[] {
  const out = new Set<string>();
  const re = /https?:\/\/[^\s<>"')\]]+/gi;
  let m;
  while ((m = re.exec(text))) out.add(m[0]);
  const wwwRe = /(^|[\s(])((?:www\.)[a-z0-9][a-z0-9.-]*\.[a-z]{2,})(?=[$\s.,;:!?)]|$)/gi;
  while ((m = wwwRe.exec(text))) out.add('https://' + m[2]);
  return [...out].slice(0, 8);
}

function printableRuns(raw: string): string {
  const runs = raw.match(/[\x20-\x7E]{6,}/g) || [];
  return runs.join(' ').slice(0, 100000);
}

function hitPhrases(text: string, phrases: string[]): string[] {
  const found: string[] = [];
  for (const p of phrases) if (text.includes(p)) found.push(p);
  return found;
}

/* ---------------- URL signals ---------------- */

export function urlFindings(url: string, includeHttpCheck = true): Finding[] {
  const f: Finding[] = [];
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url);
  } catch {
    return f;
  }
  const host = (u.host || '').toLowerCase();
  const values: Record<string, string | number> = { host };
  if (!host) return f;

  if (includeHttpCheck && u.protocol === 'http:') {
    f.push({ id: 'no_tls', severity: 'bad', category: 'security', weight: -10, values: { host } });
  }

  const tld = tldOf(host);
  if (SUSPICIOUS_TLDS.includes(tld)) {
    f.push({ id: 'susp_tld', severity: 'bad', category: 'security', weight: -15, values: { tld, host } });
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(u.host)) {
    f.push({ id: 'ip_host', severity: 'bad', category: 'security', weight: -25, values: { host } });
  }

  if (host.startsWith('xn--') || host.includes('.xn--')) {
    f.push({ id: 'punycode', severity: 'bad', category: 'security', weight: -28, values: { host } });
  }

  if ((u.username || '').length > 0) {
    f.push({ id: 'at_trick', severity: 'bad', category: 'security', weight: -18, values: { host } });
  }

  // Digit/homoglyph-swapped lookalikes: paypa1 -> paypal
  const normHost = host.replace(/1/g, 'l').replace(/0/g, 'o').replace(/3/g, 'e').replace(/5/g, 's').replace(/\$/g, 's').replace(/rn/g, 'm');
  for (const [brand, official] of Object.entries(BRANDS)) {
    if ((host.includes(brand) || normHost.includes(brand)) && !host.endsWith(official) && !host.endsWith('.' + official)) {
      f.push({ id: 'lookalike', severity: 'bad', category: 'reputation', weight: -28, values: { brand, host } });
      break;
    }
  }

  const labels = host.split('.');
  const subLabels = labels.slice(0, -2).join('.');
  const hyphens = (host.match(/-/g) || []).length;
  if (subLabels.split('.').length >= 3 || hyphens >= 3 || host.length > 34) {
    f.push({ id: 'deep_subdomains', severity: 'warning', category: 'security', weight: -5, values: { host } });
  }

  return f;
}

/* ---------------- HTML signals ---------------- */

export function htmlFindings(html: string, pageUrl: string) {
  const f: Finding[] = [];
  const trackers: string[] = [];
  const technologies: string[] = [];
  const lower = html.toLowerCase();
  const pageHost = pageUrl ? hostOf(pageUrl) : '';

  // Trackers
  for (const [domain, name] of TRACKER_DOMAINS) {
    if (lower.includes(domain)) trackers.push(name);
  }
  if (trackers.length > 0) {
    f.push({
      id: 'trackers', severity: 'warning', category: 'trackers',
      weight: -Math.min(12, trackers.length * 2),
      values: { n: trackers.length, names: trackers.slice(0, 4).join(', ') }
    });
  } else {
    f.push({ id: 'no_trackers', severity: 'good', category: 'trackers', weight: 2, values: {} });
  }

  // Technology fingerprint
  for (const [sig, name] of TECH_SIGNATURES) {
    if (lower.includes(sig) && !technologies.includes(name)) technologies.push(name);
  }
  if (technologies.length > 0) {
    f.push({ id: 'platforms', severity: 'good', category: 'reputation', weight: 3, values: { tech: technologies.slice(0, 4).join(', ') } });
  }

  // Password forms
  const formRe = /<form[^>]*action=["']([^"']*)["'][^>]*>([\s\S]*?)<\/form>/gi;
  let fm;
  let hasPassword = false;
  while ((fm = formRe.exec(html))) {
    if (fm[2].toLowerCase().includes('password')) {
      hasPassword = true;
      const action = fm[1];
      if (action && /^https?:\/\//i.test(action)) {
        const actionHost = hostOf(action);
        const actionIsRisky = urlFindings(action, false).some((x) => ['susp_tld', 'ip_host', 'punycode', 'lookalike', 'at_trick'].includes(x.id));
        if ((pageHost && actionHost && actionHost !== pageHost) || (!pageHost && actionIsRisky)) {
          f.push({ id: 'phishing_form', severity: 'bad', category: 'security', weight: -30, values: { host: pageHost || 'this page', formHost: actionHost || action } });
        } else if (action.toLowerCase().startsWith('http://')) {
          f.push({ id: 'http_form', severity: 'bad', category: 'security', weight: -10, values: {} });
        } else {
          f.push({ id: 'login_form', severity: 'warning', category: 'security', weight: 0, values: { host: pageHost } });
        }
      } else {
        f.push({ id: 'login_form', severity: 'warning', category: 'security', weight: 0, values: { host: pageHost } });
      }
    }
  }
  if (!hasPassword && /type=["']password["']/i.test(html)) {
    f.push({ id: 'login_form', severity: 'warning', category: 'security', weight: 0, values: { host: pageHost } });
  }

  // Meta refresh redirect
  const mr = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\s*(\d+)\s*;\s*url=([^"']+)["']/i);
  if (mr) {
    const delay = parseInt(mr[1], 10);
    const target = mr[2].trim();
    const targetHost = hostOf(target);
    if (delay <= 2 && target && (!pageHost || !targetHost || targetHost !== pageHost)) {
      f.push({ id: 'meta_refresh', severity: 'warning', category: 'security', weight: -8, values: { target: targetHost || target } });
    }
  }

  // Hidden iframes (markers can appear before or after src)
  const iframeTags = html.match(/<iframe[^>]*>/gi) || [];
  for (const tag of iframeTags) {
    if (/display\s*:\s*none|visibility\s*:\s*hidden|width=["']0|height=["']0|\shidden/.test(tag)) {
      const src = tag.match(/src=["']([^"']+)["']/i);
      if (src) f.push({ id: 'hidden_iframe', severity: 'bad', category: 'security', weight: -14, values: { iframeHost: hostOf(src[1]) || src[1] } });
    }
  }

  // External script hosts
  const scriptHosts = new Set<string>();
  const srcRe = /<script[^>]*src=["'](https?:\/\/[^"']+)["']/gi;
  let sm;
  while ((sm = srcRe.exec(html))) {
    const h = hostOf(sm[1]);
    if (h && h !== pageHost) scriptHosts.add(h);
  }
  if (scriptHosts.size > 0) {
    const hostsArr = [...scriptHosts];
    f.push({
      id: 'ext_scripts', severity: 'warning', category: 'content',
      weight: -Math.min(6, Math.max(0, hostsArr.length - 3)),
      values: { n: hostsArr.length, hosts: hostsArr.slice(0, 3).join(', ') }
    });
    for (const h of hostsArr) {
      const tld = tldOf(h);
      if (SUSPICIOUS_TLDS.includes(tld)) {
        f.push({ id: 'susp_script_host', severity: 'bad', category: 'security', weight: -12, values: { host: h } });
        break;
      }
    }
  }

  // Obfuscation in page scripts
  const obfHits: string[] = [];
  for (const [re, label] of OBFUSCATION_MARKERS) {
    if (re.test(html)) obfHits.push(label);
    re.lastIndex = 0;
  }
  if (obfHits.length > 0) {
    f.push({
      id: 'obfuscation', severity: 'bad', category: 'code',
      weight: -Math.min(22, 8 + obfHits.length * 4),
      values: { n: obfHits.length, sample: obfHits.slice(0, 2).join(', ') }
    });
  }

  // Crypto mining
  for (const [marker, label] of MINING_MARKERS) {
    if (lower.includes(marker)) {
      f.push({ id: 'mining', severity: 'bad', category: 'security', weight: -35, values: { sample: label } });
      break;
    }
  }

  // CSP + privacy policy
  if (/http-equiv=["']content-security-policy/i.test(html)) {
    f.push({ id: 'csp', severity: 'good', category: 'security', weight: 4, values: {} });
  }
  if (/<a[^>]+href=["'][^"']*privacy/i.test(html)) {
    f.push({ id: 'privacy_policy', severity: 'good', category: 'privacy', weight: 3, values: {} });
  }

  // Brand bait in title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch && pageHost) {
    const title = titleMatch[1].toLowerCase();
    for (const [brand, official] of Object.entries(BRANDS)) {
      if (title.includes(brand) && !pageHost.endsWith(official) && !pageHost.endsWith('.' + official)) {
        f.push({ id: 'brand_title', severity: 'bad', category: 'content', weight: -16, values: { brand, host: pageHost } });
        break;
      }
    }
  }

  // Text content signals
  const text = visibleText(html);
  f.push(...textFindings(text, false));

  return { f, trackers, technologies };
}

/* ---------------- Text / email signals ---------------- */

export function textFindings(text: string, isEmail: boolean): Finding[] {
  const f: Finding[] = [];
  const lower = (text || '').toLowerCase();

  // Urgency only counts when it's a real pressure tactic: one strong phrase,
  // or several weak ones stacking up (a lone "immediately" is just a word).
  const strongUrgency = hitPhrases(lower, STRONG_URGENCY);
  const weakUrgency = hitPhrases(lower, WEAK_URGENCY);
  if (strongUrgency.length > 0 || weakUrgency.length >= 3) {
    const strong = strongUrgency.length > 0;
    const hits = strong ? strongUrgency : weakUrgency;
    f.push({
      id: 'urgency', severity: strong ? 'bad' : 'warning', category: isEmail ? 'email' : 'content',
      weight: strong ? -Math.min(16, strongUrgency.length * 8) : -5,
      values: { n: hits.length, sample: `“${hits[0]}”` }
    });
  }

  const scam = hitPhrases(lower, SCAM_PHRASES);
  if (scam.length > 0) {
    f.push({
      id: 'scam_words', severity: 'bad', category: 'content',
      weight: -Math.min(16, scam.length * 5),
      values: { n: scam.length, sample: `“${scam[0]}”` }
    });
  }

  if (isEmail) {
    const creds = hitPhrases(lower, CREDENTIAL_PHRASES);
    if (creds.length > 0) {
      f.push({
        id: 'credentials', severity: 'bad', category: 'email',
        weight: -Math.min(26, creds.length * 12),
        values: { sample: creds.slice(0, 2).join(', ') }
      });
    }
    const pay = hitPhrases(lower, PAYMENT_PHRASES);
    if (pay.length > 0) {
      f.push({
        id: 'credentials', severity: 'bad', category: 'email',
        weight: -Math.min(18, pay.length * 8),
        values: { sample: pay.slice(0, 2).join(', ') }
      });
    }
    const attach = DANGEROUS_ATTACHMENT.filter((a) => lower.includes(a.trim()));
    if (attach.length > 0) {
      f.push({ id: 'attachments', severity: 'bad', category: 'email', weight: -20, values: { sample: attach.slice(0, 2).map((a) => a.trim()).join(', ') } });
    }
    if (/dear (customer|user|client|sir|madam)|attention (customer|user|client)/.test(lower)) {
      f.push({ id: 'generic_greeting', severity: 'warning', category: 'email', weight: -6, values: {} });
    }
    if (lower.includes('unsubscribe') && urgency.length === 0 && scam.length === 0) {
      f.push({ id: 'marketing', severity: 'warning', category: 'content', weight: -2, values: {} });
    }
  }

  // URLs found inside the content
  const urls = extractUrls(text);
  const urlFindingsFlat: Finding[] = [];
  for (const u of urls) {
    urlFindingsFlat.push(...urlFindings(u, true));
  }
  if (urlFindingsFlat.length > 0 && urlFindingsFlat.some((x) => x.weight <= -15)) {
    f.push(...urlFindingsFlat.filter((x) => ['lookalike', 'susp_tld', 'ip_host', 'punycode', 'at_trick'].includes(x.id)).slice(0, 3));
  } else if (urlFindingsFlat.some((x) => x.id === 'no_tls')) {
    f.push({ id: 'no_tls', severity: 'bad', category: 'security', weight: -8, values: { host: hostOf(urls[0]) || '' } });
  }

  if (f.length === 0) {
    f.push({ id: 'clean_text', severity: 'good', category: 'content', weight: 2, values: {} });
  }

  return f;
}

/* ---------------- Code signals ---------------- */

export function codeFindings(content: string): Finding[] {
  const f: Finding[] = [];
  const lower = content.toLowerCase();

  const danger: string[] = [];
  for (const [re, label] of CODE_DANGER) {
    if (re.test(content)) danger.push(label);
    re.lastIndex = 0;
  }
  if (danger.length > 0) {
    f.push({
      id: 'dangerous_code', severity: 'bad', category: 'code',
      weight: -Math.min(38, danger.length * 10),
      values: { list: danger.slice(0, 4).join(', ') }
    });
  }

  for (const [re, label] of EXFIL_TARGETS) {
    if (re.test(content)) {
      f.push({ id: 'exfil', severity: 'bad', category: 'code', weight: -30, values: { host: label } });
      break;
    }
  }

  if (KEYLOG_MARKERS.some((k) => lower.includes(k))) {
    f.push({ id: 'keylog', severity: 'bad', category: 'code', weight: -35, values: {} });
  }

  const secrets: string[] = [];
  for (const [re, label] of SECRET_PATTERNS) {
    if (re.test(content)) secrets.push(label);
    re.lastIndex = 0;
  }
  if (secrets.length > 0) {
    f.push({ id: 'secrets', severity: 'warning', category: 'code', weight: -8, values: { sample: secrets.slice(0, 2).join(', ') } });
  }

  const obf: string[] = [];
  for (const [re, label] of OBFUSCATION_MARKERS) {
    if (re.test(content)) obf.push(label);
    re.lastIndex = 0;
  }
  if (obf.length > 0) {
    f.push({
      id: 'obfuscation', severity: 'bad', category: 'code',
      weight: -Math.min(20, obf.length * 5),
      values: { n: obf.length, sample: obf.slice(0, 2).join(', ') }
    });
  }

  if (f.length === 0) {
    f.push({ id: 'clean_text', severity: 'good', category: 'code', weight: 2, values: {} });
  }

  return f;
}

/* ---------------- Orchestration ---------------- */

function dedupe(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();
  for (const f of findings) {
    const prev = seen.get(f.id);
    if (!prev || Math.abs(f.weight) > Math.abs(prev.weight)) seen.set(f.id, f);
  }
  return [...seen.values()];
}

const FLAG_TEXT: Record<string, { red?: string; green?: string }> = {
  no_tls: { red: 'No TLS: traffic is unencrypted and tamperable' },
  susp_tld: { red: 'Domain uses a high-abuse TLD' },
  ip_host: { red: 'Host is a bare IP address' },
  punycode: { red: 'Homoglyph/punycode host' },
  lookalike: { red: 'Impersonates a known brand' },
  at_trick: { red: 'Userinfo @ spoofing in URL' },
  phishing_form: { red: 'Credential form posts to a third-party host' },
  http_form: { red: 'Form submits over plain HTTP' },
  hidden_iframe: { red: 'Invisible iframe pulls external content' },
  meta_refresh: { red: 'Instant auto-redirect' },
  obfuscation: { red: 'Obfuscated/encoded script patterns' },
  mining: { red: 'Crypto-mining fingerprints' },
  brand_title: { red: 'Brand name in title on an unrelated domain' },
  susp_script_host: { red: 'Third-party scripts from a red-flag host' },
  urgency: { red: 'Pressure/urgency language' },
  credentials: { red: 'Requests sensitive personal data or payment' },
  scam_words: { red: 'Scam-trope phrasing' },
  attachments: { red: 'Dangerous attachment types mentioned' },
  generic_greeting: { red: 'Generic bulk-mail greeting' },
  dangerous_code: { red: 'High-risk code constructs' },
  exfil: { red: 'Outbound data exfiltration endpoint' },
  keylog: { red: 'Keystroke-capture behavior' },
  secrets: { red: 'Hardcoded secrets' },
  deep_subdomains: { red: 'Cluttered, generated-looking host' },
  trackers: { red: 'Third-party trackers present' },
  login_form: { green: 'Login form posts to its own origin' },
  marketing: { red: 'Bulk marketing markers' },
  site_error: { red: 'Site failed to respond properly' },
  unreadable: { red: 'Contents could not be extracted for review' },
  tls: { green: 'Serves over HTTPS' },
  csp: { green: 'Content Security Policy present' },
  no_trackers: { green: 'No known trackers detected' },
  platforms: { green: 'Recognizable mainstream technology' },
  privacy_policy: { green: 'Privacy policy published' },
  clean_text: { green: 'No manipulative language patterns' },
  ext_scripts: { green: 'Third-party scripts are mainstream and disclosed' }
};

export function runAnalysis(inputType: string, content: string, html: string, fileName: string, docText: string, siteProblem = ''): AnalysisResult {
  let findings: Finding[] = [];
  const trackers: string[] = [];
  const technologies: string[] = [];

  if (inputType === 'url') {
    findings.push(...urlFindings(content, false));
    if (siteProblem) {
      findings.push({ id: 'site_error', severity: 'warning', category: 'content', weight: -8, values: { detail: siteProblem } });
    }
    if (html && html.trim().length > 0) {
      const res = htmlFindings(html, content);
      findings.push(...res.f);
      trackers.push(...res.trackers);
      technologies.push(...res.technologies);
    }
    if (/^https:\/\//i.test(content)) {
      findings.push({ id: 'tls', severity: 'good', category: 'security', weight: 5, values: { host: hostOf(content) } });
    }
  } else if (inputType === 'html') {
    const res = htmlFindings(content, '');
    findings.push(...res.f);
    trackers.push(...res.trackers);
    technologies.push(...res.technologies);
  } else if (inputType === 'code') {
    findings.push(...codeFindings(content));
  } else if (inputType === 'email') {
    findings.push(...textFindings(content, true));
  } else if (inputType === 'text') {
    findings.push(...textFindings(content, false));
  } else if (inputType === 'document') {
    const extracted = printableRuns(docText);
    if (extracted.trim().length < 200) {
      findings.push({ id: 'unreadable', severity: 'warning', category: 'content', weight: -33, values: {} });
    }
    findings.push(...textFindings(extracted, /from:|subject:|dear /i.test(extracted)));
  }

  findings = dedupe(findings);

  const base = 88;
  let score = base;
  for (const f of findings) score += f.weight;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const critical = findings.some((f) => CRITICAL_IDS.has(f.id));
  if (critical) {
    score = Math.min(score, 55);
  }
  const verdict: 'bus' | 'sus' = critical || score < 60 ? 'sus' : 'bus';

  const redFlags: string[] = [];
  const greenFlags: string[] = [];
  for (const f of findings) {
    const flags = FLAG_TEXT[f.id];
    if (flags?.red) redFlags.push(flags.red);
    if (flags?.green) greenFlags.push(flags.green);
  }

  const dataCollected: string[] = [];
  if (findings.some((f) => f.id === 'phishing_form' || f.id === 'login_form')) dataCollected.push('credentials entered into sign-in forms');
  if (findings.some((f) => f.id === 'trackers')) dataCollected.push('browsing behavior shared with tracker networks');
  if (/<form/i.test(html) && inputType === 'url') dataCollected.push('anything submitted through site forms');
  if (dataCollected.length === 0) dataCollected.push('none observed');

  const codeNoteIds = findings.filter((f) => f.category === 'code' || ['obfuscation', 'mining', 'hidden_iframe', 'meta_refresh', 'susp_script_host'].includes(f.id));
  const codeNotes = codeNoteIds.length > 0
    ? codeNoteIds.map((f) => FLAG_TEXT[f.id]?.red || f.id).join('; ')
    : 'No dangerous or obfuscated code patterns detected.';
  const simpleCodeNotes = codeNoteIds.length > 0
    ? 'The code hides things or does risky stuff we flagged above — the details are in the findings.'
    : 'The code didn\'t do anything sneaky — no hidden tricks found.';

  return { score, verdict, findings, trackers, technologies, dataCollected, redFlags, greenFlags, codeNotes, simpleCodeNotes };
}