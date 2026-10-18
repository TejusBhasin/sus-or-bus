// ============================================================================
// CENTRAL KNOWLEDGE BASE for the Sus or Bus deterministic scan engine.
//
// This module is the single authoritative source for:
//   - every user-visible error and status message (ERRORS, STATUS_MESSAGES)
//   - every finding definition (FINDING_DEFS): stable IDs, severity,
//     category, and text templates with {placeholder} variables
//   - the scoring model (SCORING)
//   - the known domain/service database (SERVICES)
//   - the brand impersonation reference list (BRANDS)
//   - risky TLDs, technology fingerprints
//   - declarative policy / text / code rule patterns
//   - the deterministic template renderer and domain-matching helpers
//
// No AI, no LLMs, no external calls. Everything here is bundled and works
// offline. Adding coverage means adding records here — never scattering
// new hardcoded strings through the scanner code.
//
// Versioning: bump KB_VERSION when any record set changes in a way that
// can change scan output. The version is returned with every report.
// ============================================================================

export const KB_VERSION = '1.1.0';

// ---------------------------------------------------------------------------
// 1. Error messages (stable IDs; every user-visible failure resolves here)

export const ERRORS = {
  URL_REQUIRED: 'A URL is required',
  URL_TOO_LONG: 'The URL is too long',
  URL_INVALID: 'That does not look like a valid web address',
  SCHEME: 'Only http and https addresses can be scanned',
  CREDENTIALS: 'Addresses with embedded usernames or passwords are not supported',
  PORT: 'Only standard web ports are supported',
  NO_HOST: 'The address is missing a host name',
  LOCAL_HOST: 'Local and internal addresses are not scanned',
  PRIVATE_IP: 'Private and reserved IP addresses are not scanned',
  FETCH_TIMEOUT: 'The site took too long to respond',
  FETCH_DNS: 'The address could not be found (DNS lookup failed)',
  FETCH_REFUSED: 'The site refused the connection',
  FETCH_UNREACHABLE: 'The site could not be reached',
  REDIRECT_EMPTY: 'The site redirected without a destination',
  REDIRECT_UNSAFE: 'The site redirected to an invalid or unsafe address',
  REDIRECT_LIMIT: 'Too many redirects'
};

// ---------------------------------------------------------------------------
// 2. Status / summary messages (stable IDs, {placeholder} variables)

export const STATUS_MESSAGES = {
  SUMMARY_BUS:
    'Automated evidence scan: {goodCount} positive, {warnCount} cautionary and {badCount} high-severity signals. Leading signals: {lead}. No match is a guarantee of safety.',
  SUMMARY_SUS:
    'Automated evidence scan flagged this input with {badCount} high-severity and {warnCount} cautionary signals. Leading signals: {lead}.',
  SUMMARY_SIMPLE_BUS:
    'The automatic checks mostly came back fine, with {warnCount} thing{warnPlural} worth knowing about. Computers cannot catch everything, so keep your wits about you.',
  SUMMARY_SIMPLE_SUS:
    'The automatic checks found {issueCount} thing{issuePlural} that look unsafe, so it is best to stay away.',
  POLICY_SUMMARY:
    'Automated keyword analysis of the {docs} document(s) found language about: {matched}. This is a mechanical word-level review, not legal advice, and it can miss context.',
  POLICY_SUMMARY_SIMPLE:
    'We scanned the {docs} text for common privacy phrases and found: {matched}. A computer cannot fully understand legal wording, so skim it yourself too.'
};

// ---------------------------------------------------------------------------
// 3. Finding definitions
//
// Stable IDs. `title`, `description` and `simpleDescription` are templates:
// {var} placeholders are filled by renderTemplate, which throws on a missing
// variable so a broken rule fails loudly instead of shipping broken text.
// `recommendation` is appended to the description for non-good findings.
// Every definition states what it does NOT prove.

export const FINDING_DEFS = [
  // ---- domain / address ----
  {
    id: 'DOMAIN_BARE_IP',
    severity: 'bad',
    category: 'security',
    title: 'Bare IP address instead of a domain name',
    description: 'The site is served directly from an IP address with no domain name, which is common with disposable or throwaway hosting and skips normal domain oversight.',
    simpleDescription: 'The site has no name, just a number. Legitimate sites almost always have a real name.',
    recommendation: 'Avoid entering any personal information on a site reached by raw IP address.'
  },
  {
    id: 'DOMAIN_PUNYCODE',
    severity: 'warning',
    category: 'security',
    title: 'Non-latin characters in the address',
    description: 'The address uses internationalized (punycode) characters. These are legitimate, but they can also be used to create convincing lookalikes of well-known domains.',
    simpleDescription: 'The address contains special letters. That is allowed, but it is also a trick scammers use to fake well-known names, so double-check the spelling.'
  },
  {
    id: 'DOMAIN_BRAND_LOOKALIKE',
    severity: 'bad',
    category: 'reputation',
    title: 'Address imitates a well-known brand',
    description: 'The address contains "{brand}" but is not one of the official {brand} domains ({official}), a classic lookalike pattern.',
    simpleDescription: 'This address pretends to be {brand} but is not the real one. That is a common scam trick.',
    placeholders: ['brand', 'official'],
    recommendation: 'If you need {brand}, type the official address yourself instead of following this link.'
  },
  {
    id: 'DOMAIN_RISKY_TLD',
    severity: 'warning',
    category: 'reputation',
    title: 'Unusual address ending (.{tld})',
    description: 'The address ends in .{tld}, a domain space with low registration cost and a track record of abuse. This is a context signal, not proof of anything.',
    simpleDescription: 'The address ends in ".{tld}", which is popular with scam sites. It is not proof of a scam, but stay careful.',
    placeholders: ['tld']
  },
  {
    id: 'DOMAIN_ODD_SHAPE',
    severity: 'warning',
    category: 'reputation',
    title: 'Unusually shaped address',
    description: 'The address has {labels} parts and {hyphens} dashes, which is a common shape for generated or deceptive hostnames. Context signal only.',
    simpleDescription: 'The address looks long, chopped-up, and unnatural, which is often a bad sign.',
    placeholders: ['labels', 'hyphens']
  },
  {
    id: 'DOMAIN_HTTPS',
    severity: 'good',
    category: 'security',
    title: 'HTTPS encryption in use',
    description: 'The page loaded over HTTPS with TLS, protecting data in transit. This says nothing about the honesty of the site operator.',
    simpleDescription: 'The connection to the site is encrypted, which is a good basic sign.'
  },
  {
    id: 'DOMAIN_NO_HTTPS',
    severity: 'warning',
    category: 'security',
    title: 'No HTTPS encryption',
    description: 'The page loaded over plain HTTP, so traffic between the visitor and the site is not encrypted or authenticated in transit.',
    simpleDescription: 'Data sent to this site travels unencrypted, so others on the network could read or change it.',
    recommendation: 'Never enter passwords or payment details on a page that shows plain http in the address bar.'
  },

  // ---- security headers ----
  {
    id: 'SEC_HEADERS_PRESENT',
    severity: 'good',
    category: 'security',
    title: 'Security headers present: {count} found',
    description: 'The response includes {list}. These are hardening measures, not a guarantee the site is honest.',
    simpleDescription: 'The site has extra safety settings switched on, which shows some care went into building it.',
    placeholders: ['count', 'list']
  },
  {
    id: 'SEC_NO_HEADERS',
    severity: 'warning',
    category: 'security',
    title: 'None of the common security headers were present',
    description: 'The response carried no HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy or Permissions-Policy. Their absence is common and is a hardening gap, not evidence of malice.',
    simpleDescription: 'The site is missing the usual safety settings that protect visitors. Not a scam sign on its own, but careless.'
  },

  // ---- trackers and third parties ----
  {
    id: 'TRACKERS_FOUND',
    severity: 'warning',
    category: 'trackers',
    title: 'Connects to known analytics/advertising services: {count} matched',
    description: 'The page references: {list}. These domains are matched against the scanner built-in list; a match means the service is referenced, which is common and not automatically harmful.',
    simpleDescription: 'The site uses tools that watch what visitors do ({list}). Many normal sites do this too.',
    placeholders: ['count', 'list']
  },
  {
    id: 'NO_TRACKER_MATCH',
    severity: 'good',
    category: 'trackers',
    title: 'No known analytics or advertising trackers matched',
    description: 'No domain in the scanner built-in list of known analytics/advertising endpoints was referenced. Absence of a match does not prove there is no tracking.',
    simpleDescription: 'The scan found none of the usual tracking tools. A good sign, though it cannot see everything.'
  },
  {
    id: 'MANY_THIRD_PARTY',
    severity: 'warning',
    category: 'trackers',
    title: 'Loads scripts from many third-party sites: {count} origins',
    description: 'The page loads external scripts from {count} distinct origins. Complex sites do this legitimately, but every origin is a dependency and a potential data flow.',
    simpleDescription: 'The site pulls code from {count} different companies, which is a lot of moving parts.',
    placeholders: ['count']
  },

  // ---- forms ----
  {
    id: 'LOGIN_HTTP_ACTION',
    severity: 'bad',
    category: 'security',
    title: 'Password field sent to an unencrypted (http) address',
    description: 'A form containing a password field submits to "{action}" over plain HTTP, so the password would travel unencrypted.',
    simpleDescription: 'There is a sign-in box on this page, and the password would be sent without encryption. Never enter a password here.',
    placeholders: ['action'],
    recommendation: 'Never enter a password on this form.'
  },
  {
    id: 'LOGIN_CROSS_ORIGIN',
    severity: 'bad',
    category: 'security',
    title: 'Login form sends the password to a different site',
    description: 'The password form on this page submits to {origin}, a different origin from the page itself, a classic credential-harvesting pattern.',
    simpleDescription: 'The password box on this page secretly sends your password to a different website. Do not use it.',
    placeholders: ['origin'],
    recommendation: 'Do not sign in here; go to the service directly instead.'
  },
  {
    id: 'LOGIN_SAME_ORIGIN',
    severity: 'good',
    category: 'security',
    title: 'Login form keeps data on the same encrypted site',
    description: 'A password form is present and submits to the same origin over HTTPS.',
    simpleDescription: 'The sign-in box sends your password only to this same site, encrypted. That is how it should work.'
  },
  {
    id: 'LOGIN_ON_HTTP_PAGE',
    severity: 'bad',
    category: 'security',
    title: 'Login form on an unencrypted page',
    description: 'The page contains a password form but loaded over plain HTTP, so anything typed into it travels unencrypted.',
    simpleDescription: 'This page asks for a password but is not properly secured. Do not sign in here.',
    recommendation: 'Do not enter credentials on a plain-http page.'
  },
  {
    id: 'FORM_CROSS_ORIGIN',
    severity: 'warning',
    category: 'privacy',
    title: 'Form submits to a different site',
    description: 'A form on this page sends its data to {origin} instead of this site. Sometimes legitimate (e.g. payment processors), sometimes not.',
    simpleDescription: 'The form on this page sends what you type to a different website. That can be fine (like a payment company) or a trick.',
    placeholders: ['origin']
  },

  // ---- scripts and content ----
  {
    id: 'OBFUSCATION_HEAVY',
    severity: 'bad',
    category: 'code',
    title: 'Heavily obfuscated script that touches cookies or redirects',
    description: 'An inline script uses multiple encoding techniques ({techniques}) and also writes cookies or the redirect location. Deliberate obfuscation combined with those actions is a strong phishing/malware indicator.',
    simpleDescription: 'The page contains a hidden, scrambled script that can change cookies or send you elsewhere. This is a serious red flag.',
    placeholders: ['techniques'],
    recommendation: 'Do not enter personal information on this page.'
  },
  {
    id: 'OBFUSCATION',
    severity: 'warning',
    category: 'code',
    title: 'Encoded or obfuscated inline script',
    description: 'An inline script uses encoding techniques ({techniques}). Minification is normal, but deliberate obfuscation hides what code really does.',
    simpleDescription: 'Part of the page code is deliberately scrambled so you cannot read what it does. Sometimes innocent, but worth avoiding.',
    placeholders: ['techniques']
  },
  {
    id: 'META_REFRESH',
    severity: 'warning',
    category: 'content',
    title: 'Page auto-forwards to another address',
    description: 'A meta-refresh tag forwards visitors to a different URL, a technique sometimes used to slip past a quick glance at the address bar.',
    simpleDescription: 'The page immediately bounces you to another address before you can look at it.'
  },
  {
    id: 'MIXED_CONTENT',
    severity: 'warning',
    category: 'security',
    title: 'Mixed content: {count} unencrypted http reference(s)',
    description: 'The page loads over HTTPS but references {count} plain-http resources, which browsers may block or warn about.',
    simpleDescription: 'Some parts of the page load without encryption even though the page itself looks secure.',
    placeholders: ['count']
  },

  // ---- fetch / coverage ----
  {
    id: 'FETCH_FAILED',
    severity: 'warning',
    category: 'security',
    title: 'The page itself could not be loaded',
    description: 'The scanner could not load this page ({reason}), so the verdict is based only on the address itself, not on the site content.',
    simpleDescription: 'The scan could not open this site ({reason}), so it only checked the address, not what is on the page.',
    placeholders: ['reason']
  },
  {
    id: 'FETCH_NOT_HTML',
    severity: 'warning',
    category: 'content',
    title: 'The address does not return a web page',
    description: 'The address returned "{type}" instead of an HTML page, so its content could not be analyzed. The verdict rests only on the address and response headers.',
    simpleDescription: 'This address points to a file, not a normal web page, so the scan could only check the address itself.',
    placeholders: ['type']
  },

  // ---- documents ----
  {
    id: 'DOC_UNREADABLE',
    severity: 'bad',
    category: 'content',
    title: 'No automated checks could run on this document',
    description: 'The uploaded document ("{name}") is in a binary format ({reason}) the scanner cannot read without an AI reader. Nothing inside it was verified, so treat it as untrusted until a person reviews it.',
    simpleDescription: 'The scan cannot read this kind of file, so nothing inside it was checked. It is not flagged as dangerous, it is simply unverified.',
    placeholders: ['name', 'reason']
  },
  {
    id: 'DOC_UNVERIFIED',
    severity: 'warning',
    category: 'content',
    title: 'Document content unavailable to the checks',
    description: 'Because the document could not be read, no links, payment requests, or instructions inside it were analyzed.',
    simpleDescription: 'Because the scan could not open the file, it could not look for links or tricks inside it.'
  },

  // ---- privacy policy / terms ----
  {
    id: 'POLICY_SELL',
    severity: 'bad',
    category: 'privacy',
    title: 'Language about selling personal information',
    description: 'The policy contains wording about selling personal information. Read the exact context yourself before trusting the service.',
    simpleDescription: 'The policy says they may sell information about you. That is a big deal for your privacy.'
  },
  {
    id: 'POLICY_NO_SELL',
    severity: 'good',
    category: 'privacy',
    title: 'Explicitly states it does not sell personal information',
    description: 'The policy contains an explicit statement that personal information is not sold. Verify the exact wording yourself.',
    simpleDescription: 'The policy promises it does not sell your information. That is a good sign.'
  },
  {
    id: 'POLICY_SHARE',
    severity: 'warning',
    category: 'privacy',
    title: 'Discloses sharing with third parties',
    description: 'The policy says data is shared with third parties. This is common practice, but it means other companies can receive information about you.',
    simpleDescription: 'The policy says other companies can get information about you. Normal, but worth knowing.'
  },
  {
    id: 'POLICY_ARBITRATION',
    severity: 'warning',
    category: 'privacy',
    title: 'Arbitration or class-action language',
    description: 'The policy contains arbitration or class-action language, which can limit your ability to take disputes to court.',
    simpleDescription: 'The fine print may stop you from suing them in court if something goes wrong.'
  },
  {
    id: 'POLICY_UNILATERAL_CHANGE',
    severity: 'warning',
    category: 'privacy',
    title: 'Terms can change at any time',
    description: 'The policy says the terms can be changed at any time, potentially without notice.',
    simpleDescription: 'They can change the rules whenever they want.'
  },
  {
    id: 'POLICY_RETENTION',
    severity: 'good',
    category: 'privacy',
    title: 'Explains how long data is kept',
    description: 'The policy describes a data retention approach, which is a transparency positive.',
    simpleDescription: 'The policy explains how long they keep your information.'
  },
  {
    id: 'POLICY_DELETION',
    severity: 'good',
    category: 'privacy',
    title: 'Mentions deletion rights',
    description: 'The policy mentions deleting your data or account, a user-friendly signal.',
    simpleDescription: 'They say you can ask them to delete your information.'
  },
  {
    id: 'POLICY_CHILDREN',
    severity: 'good',
    category: 'privacy',
    title: "Addresses children's privacy",
    description: "The policy addresses children's data, which shows awareness of privacy obligations.",
    simpleDescription: 'The policy talks about protecting kids, which is a good sign.'
  },
  {
    id: 'POLICY_COOKIES',
    severity: 'good',
    category: 'privacy',
    title: 'Discloses cookie and tracking use',
    description: 'The policy discloses the use of cookies or similar tracking technologies.',
    simpleDescription: 'The policy admits it uses cookies (small tracking files) and explains why.'
  },
  {
    id: 'POLICY_ACCESS',
    severity: 'good',
    category: 'privacy',
    title: 'Mentions access to your data',
    description: 'The policy describes how you can request a copy of the data held about you.',
    simpleDescription: 'You can ask them for a copy of the information they hold about you.'
  },
  {
    id: 'POLICY_OPTOUT',
    severity: 'good',
    category: 'privacy',
    title: 'Mentions opt-out mechanisms',
    description: 'The policy describes opt-out or unsubscribe mechanisms.',
    simpleDescription: 'You can opt out of some of their practices.'
  },
  {
    id: 'POLICY_TRANSFERS',
    severity: 'warning',
    category: 'privacy',
    title: 'Describes international data transfers',
    description: 'The policy describes transferring data to other countries. This is common but can change which privacy laws apply.',
    simpleDescription: 'Your information may be sent to other countries, where different rules apply.'
  },
  {
    id: 'POLICY_EMPTY',
    severity: 'warning',
    category: 'privacy',
    title: 'Policy page appears empty or very short',
    description: 'The linked policy page contains almost no readable text, which prevents any policy analysis.',
    simpleDescription: 'The privacy/terms page is basically empty, so it tells you nothing.'
  },
  {
    id: 'POLICY_NO_CLAUSES',
    severity: 'warning',
    category: 'privacy',
    title: 'No standard policy clauses matched',
    description: 'The scanner did not find the usual disclosures (sharing, retention, deletion) in the readable text. The policy may use unusual wording, or it may genuinely omit them.',
    simpleDescription: 'The scan could not find the normal privacy promises in this text. It may just use odd wording.'
  },
  {
    id: 'POLICY_MISSING',
    severity: 'warning',
    category: 'privacy',
    title: 'No privacy policy or terms links found on the page',
    description: 'No same-site link to a privacy policy or terms document was found in the page HTML. Some sites keep these off the homepage, but their absence limits what the scanner can verify.',
    simpleDescription: 'The scan could not find any privacy policy or terms on this site, so their rules are unknown.'
  },

  // ---- free text / email ----
  {
    id: 'TEXT_URGENCY',
    severity: 'warning',
    category: 'content',
    title: 'Urgency pressure',
    description: 'The text pushes for immediate action with time pressure, a standard social-engineering lever.',
    simpleDescription: 'The message rushes you to act fast, which is a classic scam move.'
  },
  {
    id: 'TEXT_CREDENTIAL_LURE',
    severity: 'bad',
    category: 'email',
    title: 'Asks you to verify or update account/payment details',
    description: 'The text asks the reader to verify or update account or payment information, the core of credential-harvesting and card-phishing lures.',
    simpleDescription: 'The message wants you to "confirm" your account or card details. Real companies do not ask this over a link.',
    recommendation: 'Do not click; open the service directly in a new tab instead.'
  },
  {
    id: 'TEXT_UNTRACEABLE_PAYMENT',
    severity: 'bad',
    category: 'email',
    title: 'Requests hard-to-trace payment',
    description: 'The text mentions gift cards, cryptocurrency or wire transfers, payment channels with no buyer protection that are near-universal in fraud.',
    simpleDescription: 'It wants to be paid in gift cards or crypto, which you can never get back. Strong scam sign.'
  },
  {
    id: 'TEXT_PRIZE',
    severity: 'bad',
    category: 'content',
    title: 'Too-good-to-be-true offer',
    description: 'The text claims a prize, lottery win or inheritance, a near-certain fraud pattern.',
    simpleDescription: 'It says you won something out of nowhere. That is a scam the vast majority of the time.'
  },
  {
    id: 'TEXT_GENERIC_GREETING',
    severity: 'warning',
    category: 'email',
    title: 'Generic greeting',
    description: 'The greeting addresses a generic customer rather than a named person, typical of mass phishing.',
    simpleDescription: 'It says "Dear customer" instead of your name, which mass scam messages usually do.'
  },
  {
    id: 'TEXT_SECURITY_FRAMING',
    severity: 'warning',
    category: 'email',
    title: 'Security-alert framing',
    description: 'The text uses fear of account compromise to drive a click, a common phishing framing.',
    simpleDescription: 'It scares you with talk of account problems so you click without thinking.'
  },
  {
    id: 'TEXT_CLICK_PUSH',
    severity: 'warning',
    category: 'email',
    title: 'Pushes a click to resolve the situation',
    description: 'The text funnels the reader to one click to resolve the situation, bypassing normal navigation.',
    simpleDescription: 'It insists you click its link to fix things. Real sites let you go there yourself.'
  },
  {
    id: 'TEXT_LINK_IP',
    severity: 'bad',
    category: 'email',
    title: 'Contains a raw-IP or special-character link',
    description: 'The text links to "{host}", an address with no real domain name. Legitimate businesses send links to named domains.',
    simpleDescription: 'One of the links hides behind a number or scrambled name instead of a real website name.',
    placeholders: ['host']
  },
  {
    id: 'TEXT_LINK_BRAND',
    severity: 'bad',
    category: 'email',
    title: 'Link pretends to be {brand}',
    description: 'The link points to "{host}", which contains "{brand}" but is not an official {brand} domain.',
    simpleDescription: 'A link in this text fakes being {brand}. Do not click it.',
    placeholders: ['brand', 'host'],
    recommendation: 'Go to {brand} by typing its official address yourself.'
  },
  {
    id: 'TEXT_LINK_HTTP',
    severity: 'warning',
    category: 'email',
    title: 'Contains unencrypted http links',
    description: 'At least one link uses plain http, so anything sent through it travels unencrypted.',
    simpleDescription: 'At least one link is not properly secured.'
  },
  {
    id: 'TEXT_LINKS_SECURE',
    severity: 'good',
    category: 'email',
    title: 'Links use ordinary secure addresses',
    description: '{count} link(s) were found and none matched the scanner lookalike/IP/unencrypted patterns. No match does not prove the links are safe.',
    simpleDescription: 'The links in this text look normal and secure.',
    placeholders: ['count']
  },
  {
    id: 'TEXT_NO_SCAM_PATTERNS',
    severity: 'good',
    category: 'content',
    title: 'No common scam patterns matched',
    description: 'None of the scanner pattern rules (urgency, credential lures, untraceable payment, prize claims, lookalike links) matched this text. Absence of matches does not prove it is safe.',
    simpleDescription: 'The scan found none of the usual scam phrases or tricks in this text.'
  },
  {
    id: 'EMAIL_REPLYTO_MISMATCH',
    severity: 'warning',
    category: 'email',
    title: 'Reply-to goes to a different domain than the sender',
    description: 'The From domain ({fromDomain}) differs from the Reply-To domain ({toDomain}), which is common in spoofed or manipulated mail.',
    simpleDescription: 'If you answer this email, it secretly goes to a different company than the one it claims to be from.',
    placeholders: ['fromDomain', 'toDomain']
  },

  // ---- code ----
  {
    id: 'CODE_EVAL',
    severity: 'warning',
    category: 'code',
    title: 'Uses eval() to execute dynamic code',
    description: 'The code calls eval(), executing dynamically built strings. High-risk in principle, sometimes justified (compilers, sandboxes).',
    simpleDescription: 'The code runs text as instructions on the fly, which can hide what it really does.'
  },
  {
    id: 'CODE_COOKIE_EXFIL',
    severity: 'bad',
    category: 'code',
    title: 'Writes cookies and appears to send data or redirect',
    description: 'The code writes document.cookie in the same context as network or redirect calls, a pattern seen in session-hijacking scripts.',
    simpleDescription: 'The code tampers with login cookies and can send you or your data somewhere else.'
  },
  {
    id: 'CODE_KEYLOGGER',
    severity: 'warning',
    category: 'code',
    title: 'Listens to every key pressed',
    description: 'The code attaches a global key listener. Legitimate for shortcuts; also the shape of keylogging. Context decides.',
    simpleDescription: 'The code watches every key you type. That is how keyloggers work, though some apps use it legally.'
  },
  {
    id: 'CODE_CURL_PIPE',
    severity: 'bad',
    category: 'code',
    title: 'Downloads remote code and runs it immediately',
    description: 'The code pipes a remote download straight into a shell, executing whatever the server returns without inspection.',
    simpleDescription: 'This downloads a program from the internet and runs it instantly without checking it. Very dangerous.'
  },
  {
    id: 'CODE_EXEC',
    severity: 'warning',
    category: 'code',
    title: 'Spawns system processes',
    description: 'The code invokes system processes or shell commands. Legitimate in tooling, dangerous in scripts from untrusted sources.',
    simpleDescription: 'The code can run commands directly on the computer running it.'
  },
  {
    id: 'CODE_BLOB',
    severity: 'warning',
    category: 'code',
    title: 'Contains a large encoded blob',
    description: 'A long base64-like blob is embedded, which can conceal payloads or simply bundle assets. Cannot be verified without decoding.',
    simpleDescription: 'There is a big chunk of hidden encoded data in the code. Its purpose is unclear.'
  },
  {
    id: 'CODE_DOCWRITE',
    severity: 'warning',
    category: 'code',
    title: 'Writes escaped content directly into the page',
    description: 'document.write with escaped strings is an old pattern that can smuggle markup past a casual read.',
    simpleDescription: 'The code injects scrambled content straight into the page.'
  },
  {
    id: 'CODE_CLEAN',
    severity: 'good',
    category: 'code',
    title: 'No dangerous static patterns matched',
    description: 'None of the scanner static pattern rules matched. This is a limited no-execution review and does not prove the code is safe.',
    simpleDescription: 'The scan found none of the usual danger signs in this code, though it cannot see everything.'
  }
];

// ---------------------------------------------------------------------------
// 4. Scoring model (documented, deterministic, versioned)

export const SCORING = {
  modelVersion: '1.0.0',
  base: 85,
  weights: { bad: 18, warning: 7 },
  goodBonus: 2,
  caps: { bad: 3, warning: 5, good: 4 },
  busThreshold: 60
};

// ---------------------------------------------------------------------------
// 5. Known domain / service database.
//
// Matching is suffix-based on parsed hostnames (host === domain or
// host ends with "." + domain) — never a raw substring of the HTML.
// `tracking: true` marks services whose purpose is analytics/advertising/
// session-replay/attribution; other classifications are service types,
// not accusations. Source: compiled by the project maintainers from
// public documentation of each provider. Update by editing this list and
// bumping KB_VERSION; changes are reviewable in version control.

export const SERVICES = [
  { domain: 'google-analytics.com', provider: 'Google Analytics', classification: 'analytics', tracking: true },
  { domain: 'googletagmanager.com', provider: 'Google Tag Manager', classification: 'tag-management', tracking: false, note: 'Container loader; may load tracking services' },
  { domain: 'doubleclick.net', provider: 'Google DoubleClick', classification: 'advertising', tracking: true },
  { domain: 'googlesyndication.com', provider: 'Google AdSense', classification: 'advertising', tracking: true },
  { domain: 'googleadservices.com', provider: 'Google Ads', classification: 'advertising', tracking: true },
  { domain: 'amazon-adsystem.com', provider: 'Amazon Ads', classification: 'advertising', tracking: true },
  { domain: 'facebook.net', provider: 'Facebook', classification: 'social', tracking: true, note: 'Pixel and SDK endpoints' },
  { domain: 'hotjar.com', provider: 'Hotjar', classification: 'session-replay', tracking: true },
  { domain: 'fullstory.com', provider: 'FullStory', classification: 'session-replay', tracking: true },
  { domain: 'clarity.ms', provider: 'Microsoft Clarity', classification: 'analytics', tracking: true },
  { domain: 'mixpanel.com', provider: 'Mixpanel', classification: 'analytics', tracking: true },
  { domain: 'segment.com', provider: 'Segment', classification: 'analytics', tracking: true },
  { domain: 'segment.io', provider: 'Segment', classification: 'analytics', tracking: true },
  { domain: 'amplitude.com', provider: 'Amplitude', classification: 'analytics', tracking: true },
  { domain: 'heap.io', provider: 'Heap', classification: 'analytics', tracking: true },
  { domain: 'quantserve.com', provider: 'Quantcast', classification: 'advertising', tracking: true },
  { domain: 'scorecardresearch.com', provider: 'Comscore', classification: 'analytics', tracking: true },
  { domain: 'criteo.com', provider: 'Criteo', classification: 'advertising', tracking: true },
  { domain: 'taboola.com', provider: 'Taboola', classification: 'advertising', tracking: true },
  { domain: 'outbrain.com', provider: 'Outbrain', classification: 'advertising', tracking: true },
  { domain: 'adnxs.com', provider: 'Xandr (AppNexus)', classification: 'advertising', tracking: true },
  { domain: 'pubmatic.com', provider: 'PubMatic', classification: 'advertising', tracking: true },
  { domain: 'rubiconproject.com', provider: 'Magnite', classification: 'advertising', tracking: true },
  { domain: 'smartadserver.com', provider: 'Smart AdServer', classification: 'advertising', tracking: true },
  { domain: 'sharethrough.com', provider: 'Sharethrough', classification: 'advertising', tracking: true },
  { domain: 'moatads.com', provider: 'Oracle Moat', classification: 'advertising-measurement', tracking: true },
  { domain: 'matomo.cloud', provider: 'Matomo', classification: 'analytics', tracking: true },
  { domain: 'plausible.io', provider: 'Plausible', classification: 'analytics', tracking: false, note: 'Cookieless analytics' },
  { domain: 'klaviyo.com', provider: 'Klaviyo', classification: 'marketing-automation', tracking: true },
  { domain: 'mailchimp.com', provider: 'Mailchimp', classification: 'email-delivery', tracking: false },
  { domain: 'branch.io', provider: 'Branch', classification: 'attribution', tracking: true },
  { domain: 'appsflyer.com', provider: 'AppsFlyer', classification: 'attribution', tracking: true },
  { domain: 'optimizely.com', provider: 'Optimizely', classification: 'ab-testing', tracking: false },
  { domain: 'onetrust.com', provider: 'OneTrust', classification: 'consent-management', tracking: false },
  { domain: 'cookiebot.com', provider: 'Cookiebot', classification: 'consent-management', tracking: false },
  { domain: 'sentry.io', provider: 'Sentry', classification: 'error-monitoring', tracking: false },
  { domain: 'bugsnag.com', provider: 'Bugsnag', classification: 'error-monitoring', tracking: false },
  { domain: 'intercom.com', provider: 'Intercom', classification: 'customer-support', tracking: false },
  { domain: 'zendesk.com', provider: 'Zendesk', classification: 'customer-support', tracking: false },
  { domain: 'crisp.chat', provider: 'Crisp', classification: 'customer-support', tracking: false },
  { domain: 'js.stripe.com', provider: 'Stripe', classification: 'payments', tracking: false },
  { domain: 'recaptcha.net', provider: 'reCAPTCHA', classification: 'bot-protection', tracking: false },
  { domain: 'fonts.googleapis.com', provider: 'Google Fonts', classification: 'fonts', tracking: false },
  { domain: 'fonts.gstatic.com', provider: 'Google Fonts', classification: 'fonts', tracking: false },
  { domain: 'cdnjs.cloudflare.com', provider: 'cdnjs', classification: 'cdn', tracking: false },
  { domain: 'unpkg.com', provider: 'unpkg', classification: 'cdn', tracking: false },
  { domain: 'jsdelivr.net', provider: 'jsDelivr', classification: 'cdn', tracking: false },
  { domain: 'cdn.jsdelivr.net', provider: 'jsDelivr', classification: 'cdn', tracking: false }
];

// ---------------------------------------------------------------------------
// 6. Brand impersonation reference list.
//
// A host is a lookalike when a label (dot-separated part) STARTS with the
// brand token (e.g. "paypal-secure-login") while the host is not an
// official domain. Containment alone (e.g. "notpaypal.com") is NOT a match,
// which avoids naive-substring false positives.

export const BRANDS = [
  { token: 'paypal', official: ['paypal.com'] },
  { token: 'apple', official: ['apple.com', 'icloud.com'] },
  { token: 'microsoft', official: ['microsoft.com', 'office.com', 'live.com', 'outlook.com'] },
  { token: 'amazon', official: ['amazon.com', 'amzn.to'] },
  { token: 'netflix', official: ['netflix.com'] },
  { token: 'google', official: ['google.com', 'googleapis.com', 'gstatic.com', 'googleusercontent.com', 'youtube.com', 'blogger.com'] },
  { token: 'facebook', official: ['facebook.com', 'fb.com', 'instagram.com', 'whatsapp.com'] },
  { token: 'chase', official: ['chase.com'] },
  { token: 'wellsfargo', official: ['wellsfargo.com'] },
  { token: 'coinbase', official: ['coinbase.com'] },
  { token: 'binance', official: ['binance.com'] },
  { token: 'dhl', official: ['dhl.com'] },
  { token: 'usps', official: ['usps.com'] }
];

// Cheap or abuse-prone top-level domains (context signal only).
export const RISKY_TLDS = ['zip', 'mov', 'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'click', 'cam', 'rest', 'country', 'stream', 'loan', 'work', 'review', 'download', 'racing'];

// Technology fingerprints in page HTML.
export const TECH_SIGNATURES = [
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
// 7. Declarative rule patterns (regex datasets).
//
// `negation: true` means a nearby same-sentence negation ("do not sell")
// suppresses the match; `denialRe` recognizes an explicit denial which is
// reported as its own (positive) finding instead of a false positive.

export const POLICY_RULES = [
  {
    id: 'PR_SELL',
    findingId: 'POLICY_SELL',
    re: /\bsell(?:ing|s)?\b[^.]{0,80}(?:personal|user|customer)?\s*(?:data|information)/i,
    negation: true,
    denialFindingId: 'POLICY_NO_SELL',
    denialRe: /\b(?:do(?:es)?\s+not|don'?t|never|will\s+not|won'?t|nor)\s+sell[^.]{0,60}/i
  },
  { id: 'PR_SHARE', findingId: 'POLICY_SHARE', re: /third[- ]part(?:y|ies)/i, negation: false },
  { id: 'PR_ARBITRATION', findingId: 'POLICY_ARBITRATION', re: /arbitration|class[- ]action/i, negation: false },
  { id: 'PR_CHANGE', findingId: 'POLICY_UNILATERAL_CHANGE', re: /(?:change|modif\w*|updat\w*)[^.]{0,60}at any time/i, negation: true },
  { id: 'PR_RETENTION', findingId: 'POLICY_RETENTION', re: /retent(?:ion|ive)|\bretain\b|how long we (?:keep|store)/i, negation: true },
  { id: 'PR_DELETION', findingId: 'POLICY_DELETION', re: /delet\w*\s+(?:your|data|account)|right to (?:be forgotten|delet)/i, negation: true },
  { id: 'PR_CHILDREN', findingId: 'POLICY_CHILDREN', re: /child(?:ren)?|\bminor\b|coppa|under (?:13|16|18)/i, negation: false },
  { id: 'PR_COOKIES', findingId: 'POLICY_COOKIES', re: /cookies?|web beacon|tracking pixel/i, negation: false },
  {
    id: 'PR_ACCESS',
    findingId: 'POLICY_ACCESS',
    re: /(?:access|obtain|request)\s+(?:a\s+)?copy\s+of\s+(?:your|the|any)\s+(?:personal\s+)?(?:data|information)|data subject access/i,
    negation: false
  },
  { id: 'PR_OPTOUT', findingId: 'POLICY_OPTOUT', re: /opt[- ]?out|unsubscribe|do not track/i, negation: false },
  {
    id: 'PR_TRANSFERS',
    findingId: 'POLICY_TRANSFERS',
    re: /(?:international|cross[- ]border)\s+transfer|transfer\w*[^.]{0,40}(?:outside|other countries|abroad)/i,
    negation: true
  }
];

export const TEXT_RULES = [
  { id: 'TR_URGENCY', findingId: 'TEXT_URGENCY', re: /urgent|immediately|act now|final notice|within (?:24|48|72)\s*hours/i },
  {
    id: 'TR_CREDENTIAL',
    findingId: 'TEXT_CREDENTIAL_LURE',
    re: /verify your (?:account|identity|email)|confirm your (?:account|identity|details)|update your (?:payment|billing|card)/i
  },
  { id: 'TR_PAYMENT', findingId: 'TEXT_UNTRACEABLE_PAYMENT', re: /gift card|bitcoin|wire transfer|western union|crypto(?:currency)?\s*wallet/i },
  { id: 'TR_PRIZE', findingId: 'TEXT_PRIZE', re: /you(?:'ve| have)?\s+(?:won|been selected)|\bprize\b|lottery|inherit(?:ance)?|claim your (?:reward|prize|winnings)/i },
  { id: 'TR_GREETING', findingId: 'TEXT_GENERIC_GREETING', re: /dear (?:customer|user|client|sir\/madam|account holder)/i },
  {
    id: 'TR_SECURITY',
    findingId: 'TEXT_SECURITY_FRAMING',
    re: /suspicious (?:activity|login|sign[- ]?in attempt)|unusual (?:activity|sign[- ]?in)|security alert|account (?:has been|will be) (?:locked|suspended|limited)/i
  },
  { id: 'TR_CLICK', findingId: 'TEXT_CLICK_PUSH', re: /click (?:the|this) (?:link|button) below|log\s?in (?:below|here|using the link)/i }
];

export const CODE_RULES = [
  { id: 'CR_EVAL', findingId: 'CODE_EVAL', re: /\beval\s*\(/ },
  { id: 'CR_COOKIE_EXFIL', findingId: 'CODE_COOKIE_EXFIL', re: /document\.cookie\s*=[^;]*(?:fetch|xmlhttprequest|\.send\(|location)/i },
  { id: 'CR_KEYLOGGER', findingId: 'CODE_KEYLOGGER', re: /addEventListener\s*\(\s*['"]key(?:down|press|up)['"]/i },
  { id: 'CR_CURL_PIPE', findingId: 'CODE_CURL_PIPE', re: /(?:curl|wget)[^\n|]*\|\s*(?:ba)?sh/i },
  { id: 'CR_EXEC', findingId: 'CODE_EXEC', re: /child_process|\bexec\s*\(|spawn\s*\(/ },
  { id: 'CR_BLOB', findingId: 'CODE_BLOB', re: /[A-Za-z0-9+/]{200,}={0,2}/ },
  { id: 'CR_DOCWRITE', findingId: 'CODE_DOCWRITE', re: /document\.write\s*\(\s*(?:un)?escape\s*\(/i }
];

// ---------------------------------------------------------------------------
// 8. Template renderer and matching helpers

// Deterministic template renderer. Fills {name} placeholders from `vars`.
// Throws on a missing required variable so a broken rule fails loudly.
// Never executes template content; output is plain text (the frontend
// framework escapes it for HTML contexts).
export function renderTemplate(template, vars) {
  const filled = String(template).replace(/\{(\w+)\}/g, (whole, key) => {
    if (!vars || !(key in vars) || vars[key] === undefined || vars[key] === null) {
      throw new Error('Template variable missing: ' + key);
    }
    return String(vars[key]);
  });
  return filled;
}

// Suffix match on parsed hostnames: exact domain or a true subdomain.
// "notgoogle-analytics.com.evil.io" does NOT match "google-analytics.com".
export function hostMatchesDomain(host, domain) {
  const h = String(host || '').toLowerCase();
  const d = String(domain || '').toLowerCase();
  return h === d || h.endsWith('.' + d);
}

// Returns the first matching service record for a host, or null.
export function findServiceMatch(host) {
  for (const s of SERVICES) {
    if (hostMatchesDomain(host, s.domain)) return s;
  }
  return null;
}

// Returns { brand, official } when the host lookalike-matches a known
// brand, or null. The brand token must START a hostname label.
export function findBrandLookalike(host) {
  const h = String(host || '').toLowerCase();
  const labels = h.split('.');
  for (const b of BRANDS) {
    if (b.official.some((d) => hostMatchesDomain(h, d))) continue;
    if (labels.some((l) => l === b.token || l.startsWith(b.token))) {
      return { brand: b.token, official: b.official.join(', ') };
    }
  }
  return null;
}

// Fast lookup map built once from the finding definitions.
export const FINDING_BY_ID = FINDING_DEFS.reduce((map, def) => {
  map[def.id] = def;
  return map;
}, {});