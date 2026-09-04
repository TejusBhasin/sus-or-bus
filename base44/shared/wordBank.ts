// Sus or Bus — deterministic wording bank. The product's "voice" lives here:
// every phrase a report emits is picked from these banks with a seeded RNG
// (summaries are also stored in the WordingBank database and fetched by
// index), so every report feels hand-written while costing zero AI credits.

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
}

export function fillTemplate(t: string, v: Record<string, string | number>): string {
  return t.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined && v[k] !== '' ? String(v[k]) : m));
}

/* ---------- Point titles (several variants each, picked per report) ---------- */

export const TITLE_BANKS: Record<string, string[]> = {
  tls: ['Modern TLS encryption', 'HTTPS locked in', 'Encrypted connection', 'TLS across the board', 'Secure transport'],
  no_tls: ['No TLS encryption', 'Plain HTTP, no padlock', 'Unencrypted connection', 'Traffic sent in the clear'],
  csp: ['Content Security Policy found', 'CSP in place', 'Injection-hardened headers', 'CSP present'],
  trackers: ['Third-party trackers on board', 'Trackers detected', 'Analytics & ad trackers', 'Your visit is being measured', 'Trackers in the house'],
  no_trackers: ['No trackers detected', 'Tracker-free page', 'Nothing following you around', 'Zero trackers found'],
  phishing_form: ['Password form posts elsewhere', 'Cross-origin credential form', 'Login data beamed off-site', 'Credentials sent to a third party'],
  login_form: ['Login form present', 'A sign-in form lives here', 'Credential input detected'],
  lookalike: ['Brand lookalike domain', 'Impersonating {brand}', 'Suspicious brand mimicry', '{brand}-flavored domain'],
  obfuscation: ['Obfuscated script patterns', 'Deliberately hidden code', 'Encoded payload tricks', 'Obfuscation in the markup'],
  mining: ['Crypto-mining fingerprints', 'Mining scripts detected', 'Coin-mining code on the page'],
  hidden_iframe: ['Invisible iframe', 'Hidden external frame', 'Zero-size iframe found'],
  meta_refresh: ['Instant redirect on load', 'Meta-refresh hop', 'Auto-redirect away', 'Bait-and-switch redirect'],
  ext_scripts: ['{n} external script hosts', 'Scripts from {n} outside hosts', 'Wide third-party surface', 'Third-party script sprawl'],
  brand_title: ['{brand} in the title, wrong domain', 'Brand name bait', 'Title impersonates {brand}'],
  urgency: ['Pressure-tactic wording', 'Manufactured urgency', 'Clock-ticking language', 'Act-now manipulation'],
  credentials: ['Asks for sensitive details', 'Fishing for credentials', 'Sensitive data request', 'Wants your personal info'],
  scam_words: ['Classic scam phrasing', 'Too-good-to-be-true language', 'Scam bingo card', 'Promises that don\'t add up'],
  attachments: ['Risky attachment mention', 'Dangerous file type flagged', 'Executable attachment talk'],
  generic_greeting: ['Generic mass-mail greeting', 'Dear-customer opener', 'Bulk-mail fingerprints'],
  dangerous_code: ['High-risk code patterns', 'Dangerous calls in the code', 'The code bites hard', 'Knee-deep in risky calls'],
  exfil: ['Data beacon to external host', 'Outbound data exfiltration', 'Code phones home to {host}'],
  keylog: ['Keystroke harvesting', 'Keylogger behavior', 'Captures what you type'],
  secrets: ['Hardcoded secrets in code', 'Credentials baked into the code', 'Exposed key material'],
  susp_tld: ['Suspicious .{tld} domain', 'Risky .{tld} address', 'Red-flag TLD: .{tld}'],
  ip_host: ['Raw IP address as host', 'No domain name, just an IP', 'Bare-IP host'],
  punycode: ['Punycode host trickery', 'Homoglyph domain detected', 'xn-- encoding in the host'],
  at_trick: ['Userinfo @ trick in URL', 'Host-disguise with @', 'Classic URL con'],
  deep_subdomains: ['Cluttered host name', 'Subdomain stuffing', 'Kitchen-sink host'],
  platforms: ['Recognizable tech stack', 'Mainstream platform detected', 'Built on known technology', 'Reputable infrastructure'],
  privacy_policy: ['Privacy policy linked', 'Privacy statement on site', 'Discloses its data habits'],
  clean_text: ['No manipulative language', 'Text plays it straight', 'Content is hype-free', 'Nothing pushy in the wording'],
  unreadable: ['Content unreadable to us', 'Binary or locked-down document', 'Couldn\'t read the contents'],
  http_form: ['Form submits over HTTP', 'Unencrypted form post', 'Plaintext form transmission'],
  marketing: ['Bulk marketing markers', 'Newsletter / promo fingerprints', 'Direct-mail vibes'],
  susp_script_host: ['Scripts from a risky host', 'Third-party code from a red-flag host', 'Script host raises eyebrows'],
  site_error: ['Site didn\'t respond properly', 'Broken or unreachable site', 'Error on load', 'The site failed to answer']
};

/* ---------- Point descriptions: {n}, {names}, {host}, {brand} etc. get filled ---------- */

type DescPair = { tech: string[]; simple: string[] };

export const DESC_BANKS: Record<string, DescPair> = {
  tls: {
    tech: ['Content is served over TLS, so requests and responses resist in-transmit tampering or eavesdropping.', 'The origin uses HTTPS end to end, which closes the door on man-in-the-middle injection.', 'Transport encryption is in place — session traffic to {host} is confidential in transit.'],
    simple: ['The site uses the same protection your bank uses, so nobody can spy on your visit or change what you see.', 'Your connection to the site is scrambled and private, like a sealed letter.', 'Bad guys standing between you and the site can\'t read or mess with what\'s sent.']
  },
  no_tls: {
    tech: ['The page loads over plain HTTP: no TLS means anyone on the same network can read or rewrite the traffic.', 'Transport encryption is absent — the connection to {host} is fully visible on the wire and trivially spoofable.', 'No HTTPS here. Every byte, including anything you type, travels unencrypted and can be altered in transit.'],
    simple: ['The site doesn\'t use the padlock protection, so people on the same Wi-Fi could read or change what you send.', 'Anything you type here travels like a postcard anyone can read.', 'There\'s no protection on the connection — avoid typing anything private.']
  },
  csp: {
    tech: ['A Content Security Policy is present, restricting where scripts and frames can load from and blunting XSS payloads.', 'CSP headers constrain script sources, which meaningfully raises the bar for injection attacks.', 'The site ships a CSP, so rogue inline scripts and off-origin payloads are largely neutralized.'],
    simple: ['The site has a security guard that blocks unknown or dangerous add-ons from running.', 'Extra rules stop bad code from sneaking onto the page.', 'It has a built-in shield against a common website attack.']
  },
  trackers: {
    tech: ['{n} third-party trackers responded on load ({names}), building behavioral profiles of visitors.', 'The page wires in {n} analytics/ad endpoints ({names}), so your visit is measured and shared behind the scenes.', 'Tracker beacons fired to {n} services ({names}) — expect profiling and cross-site ad linkage.'],
    simple: ['{n} hidden helpers ({names}) watch what you do here and report it to other companies.', 'Little spies tag along when you visit — {n} of them — and share what you look at.', 'The site lets {n} other companies track your visit ({names}).']
  },
  no_trackers: {
    tech: ['No known analytics or ad-tech beacons fired on load — the page kept its requests to itself.', 'Zero third-party trackers responded during capture, which is increasingly rare.', 'The page made no calls to known tracking endpoints; your visit isn\'t being measured and resold.'],
    simple: ['No hidden followers here — nobody is watching what you click.', 'The site doesn\'t tag along trackers that spy on your visit.', 'Nothing here reports your visit to other companies.']
  },
  phishing_form: {
    tech: ['A password-bearing form posts its data to a different origin ({formHost}) than the page itself — the classic credential-harvesting pattern.', 'Login credentials entered here would be transmitted to {formHost}, which is unrelated to the page you\'re viewing. That\'s phishing architecture.', 'The credential form\'s action points off-site to {formHost}, so anything typed here leaves the site entirely.'],
    simple: ['The password box sends what you type to a completely different company\'s computer — the number-one sign of a fake login page.', 'If you type your password here, it goes straight to strangers, not the site you think.', 'The login form secretly hands your details to another site. Don\'t type anything.']
  },
  login_form: {
    tech: ['A sign-in form is present on this page; the action resolves to the same origin, so it behaves like a legitimate login flow.', 'Password inputs exist here, but they post back to the same site — an ordinary login pattern.', 'This page collects credentials into its own origin, which is standard for auth flows.'],
    simple: ['There\'s a login box here, and it sends your details back to the same site, which is normal.', 'A normal sign-in area — nothing sneaky about where your password goes.', 'The site asks you to log in, but in the regular, safe way.']
  },
  lookalike: {
    tech: ['The host embeds the brand name "{brand}" without belonging to {brand}\'s official domain — a textbook lookalike setup.', 'This domain impersonates {brand} by weaving its name into an unrelated host, a hallmark of phishing kits.', 'The "{brand}" branding in the address is cosmetic: this is not a {brand} property.'],
    simple: ['The web address pretends to be the real {brand} company, but it isn\'t — it\'s a copycat.', 'This is a fake {brand} address. The real {brand} would never use a name like this.', 'Scammers put "{brand}" in the address to trick you. It\'s not the real company.']
  },
  obfuscation: {
    tech: ['{n} obfuscation idioms ({sample}) appear in the code — layered decoding chains that legitimate pages rarely need.', 'The script runs through decoding tricks like {sample}; obfuscated payloads are how malvertising and skimmers hide.', 'Encoded payloads ({sample}) decode at runtime — the same trick-mixing kit malware uses to dodge review.'],
    simple: ['Parts of the code are deliberately scrambled so you can\'t tell what they really do — a trick bad sites use.', 'The code hides itself behind a secret decoder ring. Honest sites don\'t do that.', 'There\'s sneaky, scrambled code here that hides its true purpose.']
  },
  mining: {
    tech: ['Crypto-mining signatures are present (e.g. {sample}), meaning visitors\' CPUs can be hijacked to mine coins.', 'Mining-related calls ({sample}) indicate the page may silently use your device to mine cryptocurrency.', 'The page carries mining-kit fingerprints ({sample}); expect fan-spinning and battery drain if it runs.'],
    simple: ['The site can secretly use your computer to make money for someone else while slowing you down.', 'It tries to turn your device into a money machine for its owner.', 'This page can hijack your computer\'s power to mine digital coins.']
  },
  hidden_iframe: {
    tech: ['A zero-size iframe pulls content from {iframeHost} invisibly — a standard vehicle for drive-by downloads and silent redirects.', 'An invisible frame embeds {iframeHost} off-screen, letting hidden code run without any visual trace.', 'A hidden iframe connects to {iframeHost}; you\'d never see it, but it can act on the page.'],
    simple: ['There\'s an invisible window to another site hiding on this page — you can\'t see it, but it can do things.', 'The page secretly loads another website behind the scenes.', 'A hidden panel connects to another site without showing you anything.']
  },
  meta_refresh: {
    tech: ['The page auto-redirects almost immediately to {target} — a gateway pattern used to swap content after a safety snapshot.', 'A meta-refresh hops to {target} on load, meaning what you see seconds later may not be what was scanned.', 'Instant client-side redirect to {target}: bait pages use this to dodge static review.'],
    simple: ['The page instantly jumps to a different address, so what you get may not be what it promised.', 'It\'s a hop: this page flings you somewhere else right away.', 'The address switches on its own the moment you arrive.']
  },
  ext_scripts: {
    tech: ['Scripts load from {n} different external hosts ({hosts}), widening the attack surface — any one of them being compromised affects this page.', 'Third-party code streams in from {n} origins ({hosts}); each is a trust dependency this page silently inherits.', 'The page depends on {n} outside script hosts ({hosts}), so its safety is only as good as all of them combined.'],
    simple: ['The page borrows add-ons from {n} other companies, so its safety depends on all of them behaving.', 'Code from {n} outside sources runs here — the more helpers, the more that can go wrong.', 'Several outside companies\' code runs on this page.']
  },
  brand_title: {
    tech: ['The page title brands itself as {brand} while living on an unrelated domain ({host}) — the title is bait for search lures and typo-squats.', 'A "{brand}" title on {host} is a mismatch: the real {brand} doesn\'t publish here.', 'Brand-in-title, wrong-domain pattern detected: {brand} on {host}.'],
    simple: ['The page calls itself {brand} but lives at a totally different address — the real company would use its own site.', 'It claims to be {brand}, but the address says otherwise.', 'Fake {brand} branding on a stranger\'s website.']
  },
  urgency: {
    tech: ['Pressure language detected ({sample}, {n} hit total): manufactured urgency is the core lever of social engineering.', 'Engineered time pressure in the copy ({sample}; {n} hit total) — the classic trick to short-circuit judgment.', 'The text leans on countdown-style manipulation ({sample}); legitimate services rarely need to threaten timelines.'],
    simple: ['The page rushes you ({sample}) — real companies don\'t threaten you with timers to make you act fast.', 'It pushes you to hurry, which scammers do so you don\'t have time to think.', '{sample} — that\'s a scare tactic, not customer service.']
  },
  credentials: {
    tech: ['The message requests sensitive material ({sample}), a direct credential-harvest ask.', 'It solicits secrets like {sample} — no legitimate correspondent needs this over a link.', 'Phishing payload: it asks for {sample}, the exact bundle identity thieves shop for.'],
    simple: ['It asks for private things like {sample} — no real company asks for that over a message like this.', 'The message wants your secrets ({sample}). That\'s a huge red flag.', 'Never hand over {sample} because of a message like this.']
  },
  scam_words: {
    tech: ['Recurring scam-trope phrasing ({sample}, plus {n} more) — the classic reward/zero-risk vocabulary.', 'The copy leans on too-good-to-be-true tropes ({sample}); {n} hits in total. That vocabulary cluster is scam-native.', 'Reward-promise language detected ({sample}): {n} separate tropes, consistent with advance-fee and giveaway fraud.'],
    simple: ['It uses the magic words scammers love ({sample}) — free money vibes that never hold up.', 'Too good to be true? It is. ({sample})', 'The promises here ({sample}) are the stuff of scams, not reality.']
  },
  attachments: {
    tech: ['The message references dangerous attachment types ({sample}) — the primary ransomware/malware delivery vector.', 'Attachment bait detected: {sample}. Executable or archive payloads are the top malware delivery route.', 'It pushes you to open {sample} — one double-click from a bad day.'],
    simple: ['It wants you to open a risky file ({sample}) — that\'s the favorite way to sneak viruses onto computers.', 'Don\'t open the file it mentions ({sample}). That\'s how viruses get in.', 'Opening the attachment ({sample}) could infect your device.']
  },
  generic_greeting: {
    tech: ['A generic bulk greeting opens the message — mass-mailer fingerprints rather than a personal, legitimate exchange.', 'The salutation is the mass-mail standard, consistent with spray-and-pray phishing runs.', 'The generic greeting suggests the sender doesn\'t actually know you — a bulk-send marker.'],
    simple: ['It starts with a vague hello to "customer" instead of your name — a sign it was blasted to thousands of people.', 'Real mail for you uses your name; this one doesn\'t even try.', 'Dear-stranger openers are a bulk-spam giveaway.']
  },
  dangerous_code: {
    tech: ['High-risk constructs found: {list}. Each is a live footgun for command injection or arbitrary execution.', 'The code contains {list} — direct paths to arbitrary command execution if any input is attacker-controlled.', 'Dangerous primitives detected ({list}); combined with untrusted input these become full compromise chains.'],
    simple: ['This code includes commands that can take over a computer if anything goes wrong ({list}).', 'The code uses the programming equivalent of loaded weapons ({list}).', 'Risky, powerful commands are in here ({list}) — the kind malware is built from.']
  },
  exfil: {
    tech: ['Outbound webhook/exfil endpoint detected: the code ships data to {host}, a hallmark of info-stealers.', 'Silent data beacon: content is POSTed to {host} — typical of credential and clipboard theft.', 'The code quietly phones home to {host} with the data it collects.'],
    simple: ['The code secretly sends what it collects to another computer ({host}) — the behavior of spyware.', 'It smuggles your data out to {host} behind your back.', 'Your information gets quietly shipped off to {host}.']
  },
  keylog: {
    tech: ['Keystroke-capture APIs are in play — every key pressed while this runs can be recorded and relayed.', 'Keylogging constructs detected: global input hooks that transmit what you type.', 'The code installs the plumbing of a keylogger, harvesting keyboard input wholesale.'],
    simple: ['This code can record every single thing you type — passwords included.', 'It\'s wired to catch your keystrokes and send them elsewhere.', 'A spy that watches your keyboard lives in this code.']
  },
  secrets: {
    tech: ['Hardcoded secret material present ({sample}) — leaks become trivial once this ships anywhere.', 'Credential material is embedded in the code ({sample}); anyone who sees the code sees the key.', 'Exposed secrets detected ({sample}): the keys to the castle, in plain sight.'],
    simple: ['Passwords and keys are written right into the code ({sample}) where anyone can read them.', 'The code forgot to hide its master keys ({sample}).', 'Secrets are lying in plain view here ({sample}).']
  },
  susp_tld: {
    tech: ['The host sits on .{tld}, a TLD heavily abused for short-lived phishing and disposable scam infrastructure.', 'A .{tld} domain: cheap, throwaway, and statistically overrepresented in abuse feeds.', 'The .{tld} suffix carries outsized scam history — disposable-domain territory.'],
    simple: ['The address ends in .{tld} — an ending scammers love because it\'s cheap and disposable.', 'The web address uses .{tld}, a favorite for here-today-gone-tomorrow scam sites.', 'That .{tld} ending is a known bad neighborhood.']
  },
  ip_host: {
    tech: ['The host is a bare IP address ({host}) — no domain, no certificate identity, the signature of quick-throw infrastructure.', 'Serving straight from {host} with no hostname skips domain reputation entirely — typical of one-off attack hosts.', 'A raw-IP host ({host}) means anonymous, unaccountable infrastructure.'],
    simple: ['The site has no name at all, just a number ({host}) — like a van parked in an alley instead of a store.', 'It lives at a raw number address ({host}); real businesses use names.', 'No domain name, just a bare number. That\'s a hiding trick.']
  },
  punycode: {
    tech: ['Punycode (xn--) in the host encodes lookalike characters — the definitive homoglyph-attack marker.', 'The host uses punycode to render characters that mimic a legitimate name byte-for-byte visually.', 'xn-- encoding means the address contains letters from other alphabets dressed to look like ones you trust.'],
    simple: ['The address uses foreign characters disguised to look like a name you trust — a classic disguise trick.', 'It wears a mask: the web address pretends to spell something it doesn\'t.', 'Homoglyph trickery in the address: letters that look right but aren\'t.']
  },
  at_trick: {
    tech: ['The URL uses a userinfo "@" segment ({host}), so browsers render a decoy host while the true destination is elsewhere.', 'The @-in-URL trick: everything before the @ is a costume; the real host is {host}.', 'Userinfo-host spoofing detected — the displayed domain isn\'t the one that\'s contacted.'],
    simple: ['The link hides its real destination behind a fancy costume — where it says it goes isn\'t where it goes.', 'An old con in the link: the name you read isn\'t the place you\'ll land.', 'This address lies about where it\'s taking you.']
  },
  deep_subdomains: {
    tech: ['The host is a cluttered stack of labels with heavy hyphenation — statistically typical of generated phishing hosts.', 'Kitchen-sink subdomaining: the long, hyphen-stuffed host is a generated-lookalike pattern.', 'The overbuilt host name is a hallmark of algorithmically spun scam domains.'],
    simple: ['The address is a long messy pile of words and dashes — how fake sites are mass-produced.', 'The web address looks machine-generated: long, hyphen-stuffed, and strange.', 'That kitchen-sink address is a hallmark of churned-out scam pages.']
  },
  platforms: {
    tech: ['Recognizable mainstream technology detected ({tech}): established platforms with a real security track record.', 'Built on {tech} — mainstream infrastructure, not bespoke sketchware.', 'The stack ({tech}) matches widely deployed, routinely patched platforms.'],
    simple: ['It\'s built with well-known, trusted tools ({tech}) that big companies also use.', 'The site is on a mainstream platform ({tech}) — a good sign.', 'Recognizable, reputable tech ({tech}) is behind this page.']
  },
  privacy_policy: {
    tech: ['A privacy policy is linked, meaning the site formally discloses its data practices — an accountability anchor.', 'Privacy documentation is published, giving you a paper trail on what\'s collected.', 'The site discloses its data habits via a policy page — a small but real trust marker.'],
    simple: ['The site explains what it does with your info — honest sites do this.', 'It has a privacy page describing your data rights.', 'It publicly promises how it handles your information.']
  },
  clean_text: {
    tech: ['The text content contains no pressure tactics, scam tropes, or credential solicitation — it plays it straight.', 'Copy analysis came back clean: no manipulation patterns, no urgency framing.', 'No social-engineering fingerprints in the text; the language is unremarkable in the good way.'],
    simple: ['The words here are honest and calm — no tricks, no pressure, nothing fishy.', 'Nothing in the text tries to rush or scare you.', 'The wording checks out — totally normal.']
  },
  unreadable: {
    tech: ['The document\'s contents couldn\'t be extracted as text (binary or encrypted), so findings rest on structure alone.', 'No readable text layer was available; the scan could only judge the file wrapper.', 'The payload resisted text extraction — scan coverage was limited to what could be decoded.'],
    simple: ['We couldn\'t actually read what\'s inside this file, so treat it with extra care.', 'The document didn\'t let us peek inside — be extra cautious.', 'Its contents stayed locked, so we can\'t fully vouch for it.']
  },
  http_form: {
    tech: ['A form posts its data over plain HTTP — submitted values travel unencrypted.', 'Form submissions leave over HTTP, exposing whatever users type to on-path observers.', 'The form action is plaintext HTTP: entered data is readable in transit.'],
    simple: ['Whatever you type into the form is sent without protection — readable by snoops.', 'The form sends your answers like an open postcard.', 'No lock on the form — don\'t put anything private in it.']
  },
  marketing: {
    tech: ['Bulk-marketing markers (unsubscribe links, promo cadence) — commercial mail rather than fraud, but noisy.', 'Newsletter fingerprints: this reads as marketing mail, not a targeted attack.', 'Promo-mail markers present: mass commercial send rather than a personal scam attempt.'],
    simple: ['This is salesy mass marketing — annoying, not dangerous.', 'Just a marketing blast: trying to sell, not to steal.', 'Ads dressed as email. Harmless-ish, but nosey.']
  },
  susp_script_host: {
    tech: ['The page loads third-party code from a host on a red-flag TLD ({host}) — off-origin scripts from throwaway infrastructure.', 'Scripts stream in from {host}, a host pattern seen in malvertising chains.', 'External script origin {host} matches disposable-domain characteristics.'],
    simple: ['Some code on this page comes from a shady outside address ({host}).', 'The page borrows code from a sketchy source ({host}).', 'Risky outside code ({host}) runs on this page.']
  },
  site_error: {
    tech: ['The site failed to respond properly ({detail}) — scans of its live content are incomplete, so treat any verdict with extra caution.', 'An error was returned on load ({detail}); the analysis covers the address itself but not a working page.', 'The origin didn\'t serve a healthy page ({detail}), which limits how much could be verified.'],
    simple: ['The website wouldn\'t load properly ({detail}), so we could only judge the address itself.', 'The site is broken or unreachable right now ({detail}) — be extra careful.', 'It didn\'t answer correctly when we visited ({detail}).']
  }
};

/* ---------- Summary banks: 10 openers x 10 middles x 5 closers = 500 variants each ---------- */

const SUMMARY_PARTS: Record<string, string[][]> = {
  bus_tech: [
    ['Nothing here raises an eyebrow —', 'This one sits firmly on the safe side:', 'The scan came back quiet:', 'No meaningful attack surface found:', 'All safety probes came back green:', 'Clean bill of health:', 'This one bussin\':', 'No red flags survived the scan:', 'The coast is clear:', 'Checks out —'],
    ['{host} passed our structural checks without a whisper of trouble', '{host} looks like a normal, well-kept site rather than a trap', 'the request chain, markup and scripts of {host} behaved like a legitimate service', '{host} shows the fingerprints of a real, maintained product', 'nothing in the markup of {host} tried to hide, redirect or collect quietly', 'the configuration of {host} matches what healthy sites look like', '{host} kept its scripts, forms and connections consistent and transparent', 'every layer we inspected on {host} held up under scrutiny', '{host} gave us no obfuscation, no sneaky redirects and no odd hosts', 'the surface of {host} is exactly what it claims to be'],
    ['Safe to proceed.', 'Verdict: bussin\'.', 'We\'d click it.', 'Bus all the way.', 'Go on, it\'s fine.']
  ],
  sus_tech: [
    ['Something\'s off here —', 'This one smells sus:', 'Multiple tripwires fired:', 'We\'d think twice:', 'Red flags outweigh the green ones:', 'This one leans sketchy:', 'The scan found trouble:', 'Not trustworthy by our book:', 'Too many alarms went off:', 'Hard pass territory:'],
    ['{host} tripped our safety probes, the worst being {top}', 'the structure of {host} matches patterns we see in phishing and scam pages', '{host} combines {top} with other signals typical of untrustworthy sites', 'the markup of {host} tries harder to hide than a legit site ever would', '{host} exhibits {top}, which healthy sites simply don\'t have', 'we found {top} plus enough corroborating signals to fail the site', 'the setup of {host} is inconsistent with what it claims to be', '{host} shows the signature moves of a page built to deceive', 'from {top} to quieter irregularities, {host} doesn\'t hold up', '{host} carries the exact mix of tricks that burns users'],
    ['Steer clear.', 'Verdict: sus.', 'We\'d close this tab.', 'Not worth the risk.', 'Sus, through and through.']
  ],
  bus_simple: [
    ['Good news —', 'This one\'s safe:', 'You can relax:', 'We checked it over —', 'All clear:', 'No worries here:', 'This site\'s fine:', 'Looks totally normal:', 'Nothing scary found:', 'It passed —'],
    ['{host} didn\'t do anything sneaky while we watched it', 'everything we saw on {host} is what a normal website does', '{host} behaves like an ordinary, honest website', 'we looked under the hood of {host} and found nothing weird', 'no one at {host} is trying to trick you or grab your stuff', '{host} kept things simple and honest', 'the site doesn\'t try to hide anything from you', 'it\'s built the same way other trusted sites are', 'your info stays yours on {host}', 'there\'s nothing fishy about {host}'],
    ['Go ahead and use it.', 'You\'re good.', 'Bussin\'!', 'It gets our thumbs-up.', 'No red flags at all.']
  ],
  sus_simple: [
    ['Heads up —', 'Be careful:', 'Something\'s wrong:', 'We don\'t trust this one:', 'Stop before you click:', 'This looks like trouble:', 'Not safe:', 'Yikes:', 'Trust your gut and skip this:', 'Danger:'],
    ['{host} did things that scam websites usually do, like {top}', 'the people behind {host} seem to be after your info or money', '{host} is set up the same way fake websites are', 'we found {top}, and that\'s a big warning sign', 'instead of being honest, {host} hides what it\'s doing', '{top} showed up, and honest websites never do that', 'this page on {host} smells like a trick', '{host} acts like a wolf in sheep\'s clothing', '{host} breaks the rules safe websites follow', 'there are too many tricks here to call {host} safe'],
    ['Close this tab.', 'Don\'t put in your info.', 'Find a different site.', 'Better safe than sorry.', 'We\'d skip this one.']
  ],
  bus_error: [
    ['Conditional pass —', 'With one caveat:', 'A qualified yes:', 'Half the picture:', 'Verdict, with an asterisk:', 'Cleared with a footnote:', 'OK, but hear us out:', 'Passing, provisionally:', 'Mostly fine:', 'Checked what we could —'],
    ['{host} didn\'t load properly ({detail}), so this verdict covers the address, not a live page', 'we could only inspect the address of {host} because {detail}', '{host} was unreachable ({detail}); nothing suspicious was found in what we could see', 'the scan of {host} ran with a blind spot: {detail}', 'since {detail}, treat this as a partial check of {host}', 'we verified what we could of {host}, though {detail}', '{host} kept its record clean, but {detail}', 'the address of {host} raised nothing, while {detail}', 'coverage was limited because {detail}, but {host} looks ordinary', '{host} gets the benefit of the doubt — {detail}'],
    ['Proceed, but stay alert.', 'We\'d retry the site later.', 'Don\'t lower your guard.', 'Verdict: bus, barely.', 'If it loads later, scan it again.']
  ],
  bus_error_simple: [
    ['Sort of safe —', 'Safe, but…', 'Halfway checked:', 'Mostly good news —', 'We think it\'s fine —', 'Okay, with a "but":', 'Safe-ish:', 'A careful yes:', 'Good, with a catch:', 'Pass, barely —'],
    ['the website wouldn\'t load right ({detail}), so we could only check the address itself', 'we couldn\'t see the actual page ({detail}), only its name', '{host} stayed quiet, but it also stayed broken ({detail})', 'part of the site was a no-show ({detail})', 'we only got half a look because {detail}', 'the page behind the name didn\'t come up ({detail})', 'nothing bad turned up in what we saw, but {detail}', 'the address is fine; the site itself wouldn\'t open ({detail})', 'we had to judge {host} with one eye closed ({detail})', 'the site played hard to get ({detail}), but showed nothing scary'],
    ['Try it again later.', 'Keep your eyes open.', 'It\'s probably fine.', 'No red flags in what we could see.', 'If it opens later, check it again.']
  ]
};

export const SUMMARY_KEYS = ['bus_tech', 'sus_tech', 'bus_simple', 'sus_simple', 'bus_error', 'bus_error_simple'];
export const VARIANTS_PER_KEY = 500;

export function expandSummaryVariant(key: string, idx: number): string {
  const parts = SUMMARY_PARTS[key];
  if (!parts) return '';
  const i = ((idx % VARIANTS_PER_KEY) + VARIANTS_PER_KEY) % VARIANTS_PER_KEY;
  const [openers, mids, closers] = parts;
  return `${openers[i % 10]} ${mids[Math.floor(i / 10) % 10]}. ${closers[Math.floor(i / 100) % 5]}`;
}