export const faqCategories = [
  {
    id: 'general',
    title: 'General',
    items: [
      { q: 'What is Sus or Bus?', a: 'Sus or Bus is a web-safety analyzer. Paste a link, HTML, code, an email, or any text and it checks the content for threats, scams, and red flags, then gives you an instant verdict: "bus" (looks legit) or "sus" (proceed with caution).' },
      { q: 'Is Sus or Bus free to use?', a: 'Yes. Every check — URL, email, code, or text — is completely free with no paywalls or usage limits.' },
      { q: 'Do I need to create an account?', a: 'No. Sus or Bus is fully anonymous: no sign-up, no login, no personal information required.' },
      { q: 'What does "sus" mean?', a: '"Sus" is slang for suspicious. A sus verdict means the analysis found warning signs — treat the content with caution.' },
      { q: 'What does "bus" or "bussin" mean?', a: '"Bussin" is slang for excellent. A bus verdict means the content checked out — it looks safe and legitimate.' },
      { q: 'How accurate is the analysis?', a: 'Checks combine automated heuristics with AI analysis of well-known threat patterns. It is highly effective at catching common scams and phishing, but it is advisory — no tool can guarantee 100% accuracy.' },
      { q: 'Who is Sus or Bus for?', a: 'Anyone who receives a sketchy link, a suspicious email, a script they found online, or a message that feels off — and wants a quick second opinion before trusting it.' },
      { q: 'Are my analyses saved?', a: 'Yes — each check is saved as a report so you can revisit it later or share the result with someone else via a link.' },
      { q: 'Can I share my results?', a: 'Yes. Every report has Share (copies a link), Copy verdict (copies the summary), and Export PDF options.' },
      { q: 'Does Sus or Bus replace my antivirus?', a: 'No. Sus or Bus is a quick vetting tool for things you are about to click, open, or trust. Keep your antivirus and browser protection enabled alongside it.' },
      { q: 'What devices does it work on?', a: 'It is a mobile-first web app that works in any modern browser on phones, tablets, and desktops.' },
      { q: 'How is Sus or Bus different from other scanners?', a: 'Beyond URLs, it analyzes raw HTML, source code, full emails, and plain text — and explains every finding in plain language, with optional technical detail in Nerd Mode.' }
    ]
  },
  {
    id: 'inputs',
    title: 'Supported inputs',
    items: [
      { q: 'What types of content can I analyze?', a: 'Six kinds: a website URL, raw HTML, source code (any language), an email (including headers), plain text like chat messages, and uploaded documents such as PDFs or Word files.' },
      { q: 'Can I paste more than one link at a time?', a: 'Currently one item per check. If you have several links, run each one as its own check — it only takes a few seconds.' },
      { q: 'Is there a size limit on pastes?', a: 'Very large pastes may be trimmed for analysis. For best results, paste the most relevant part of the content.' },
      { q: 'Can it analyze files or documents?', a: 'Yes — switch to the Document tab and upload the file directly. You can also still copy and paste a file\'s contents as text if you prefer.' },
      { q: 'Can it check images or screenshots?', a: 'No — analysis is text-based. If a screenshot contains a message, type or paste the text content instead.' },
      { q: 'How do I analyze a document?', a: 'Open the Document tab on the home screen, tap the upload area, pick a file, and run the check. The document is uploaded and analyzed like any other input.' },
      { q: 'What document formats are supported?', a: 'PDF, TXT, Markdown, DOC/DOCX, RTF, CSV, JSON, and HTML files are supported.' },
      { q: 'Can I upload more than one document at a time?', a: 'No — one document per check, by design. Upload the next document after the first analysis finishes.' },
      { q: 'Is there a size limit for documents?', a: 'Keep documents under 25 MB. For very large files, paste the most relevant sections as text instead.' },
      { q: 'Are my uploaded documents stored?', a: 'The document link is saved with its report so you can revisit or share the result. Don\'t upload confidential or sensitive documents.' },
      { q: 'Does it work with shortened links (bit.ly, tinyurl)?', a: 'Yes. Shortened links are resolved and the destination page is analyzed.' },
      { q: 'Can I analyze content written in other languages?', a: 'Yes. The analyzer handles content in many languages, and the interface itself is available in 16 languages.' },
      { q: 'What input type should I pick?', a: 'You don\'t have to pick — the app auto-detects the type as you paste. You can also switch tabs manually before running the check.' }
    ]
  },
  {
    id: 'results',
    title: 'Understanding the results',
    items: [
      { q: 'What is the safety score?', a: 'A number from 0 to 100 summarizing how the content scored across all checks — the higher, the safer it looks.' },
      { q: 'What score counts as "bus"?', a: 'Content generally needs a score of 75 or higher to earn a bus verdict, but the verdict also weighs the severity of individual findings — one critical red flag can outweigh several positives.' },
      { q: 'What do good, warning, and bad findings mean?', a: 'Good = a positive trust signal (e.g. HTTPS, known technologies). Warning = something to be aware of (e.g. trackers). Bad = a strong danger signal (e.g. credential harvesting patterns).' },
      { q: 'What is the difference between the Score and Detailed report tabs?', a: 'The Score tab is the quick read: verdict, score, and the key findings. The Detailed report adds the full technical breakdown — flags, trackers, data collected, technologies, code notes, and your original input.' },
      { q: 'Why did a legitimate site come out "sus"?', a: 'False positives happen — new sites, unusual technologies, or aggressive marketing scripts can look risky. Read the individual findings to see exactly what triggered the verdict.' },
      { q: 'Can a verdict change over time?', a: 'Yes. Every check is a point-in-time snapshot. Sites get hacked, content changes, and a link that is bus today could be sus next week.' },
      { q: 'What are red flags and green flags?', a: 'Red flags are danger signals found in the content; green flags are trust signals. Both are listed in the Detailed report tab.' },
      { q: 'What does "data collected" mean?', a: 'The kinds of information a page or message appears to request or harvest — names, emails, card numbers, location, and so on.' },
      { q: 'What does "trackers detected" mean?', a: 'Third-party tracking scripts (analytics, ads, fingerprinting) found in the page. Trackers are extremely common and are a privacy note, not proof of a scam.' },
      { q: 'What should I do with a "sus" verdict?', a: 'Do not click, reply, pay, or enter any personal information. If it claims to be from a company you use, contact them through their official website or app instead.' }
    ]
  },
  {
    id: 'url',
    title: 'Website & URL checks',
    items: [
      { q: 'What happens when I submit a URL?', a: 'The page is fetched and inspected: its code, forms, redirects, trackers, technologies, and content patterns are analyzed for phishing, malware distribution, and scam signals.' },
      { q: 'Why is the live preview blank?', a: 'Some websites block embedding in iframes (banks and social networks often do). The analysis still works — use the "Open site" link if you need to view it.' },
      { q: 'Can it detect phishing sites?', a: 'Yes — fake login pages, lookalike domains, and credential-harvesting forms are among the strongest signals it looks for.' },
      { q: 'Does it detect malicious downloads?', a: 'It flags pages that push suspicious downloads or drive-by install prompts. It does not sandbox and execute files, so treat download links with their own caution.' },
      { q: 'Can it analyze pages behind a login?', a: 'No — only publicly accessible pages can be fetched and analyzed.' },
      { q: 'A safe site shows trackers — should I worry?', a: 'Trackers are a privacy observation. Most mainstream sites use analytics and ad trackers; it does not mean the site is malicious.' },
      { q: 'What is the source code view?', a: 'For transparency, URL and HTML checks include the fetched source code so you can see exactly what was analyzed.' },
      { q: 'Is it safe to submit a suspicious URL here?', a: 'Yes. The page is fetched server-side — your browser never loads the page you are checking.' }
    ]
  },
  {
    id: 'email',
    title: 'Email checks',
    items: [
      { q: 'What should I paste for an email check?', a: 'The full email content — ideally including headers (From, Reply-To, Subject). More context means a more accurate verdict.' },
      { q: 'Can it detect phishing emails?', a: 'Yes. Fake urgency, mismatched links, lookalike domains, and credential requests are classic phishing patterns it recognizes.' },
      { q: 'Does it check for sender spoofing?', a: 'It inspects From/Reply-To mismatches and header oddities when headers are included in the paste.' },
      { q: 'Can it analyze attachments?', a: 'No. Paste the body text of the email; if an attachment looks important, describe or paste its text content separately.' },
      { q: 'Can it spot scam emails (lotteries, inheritance, crypto)?', a: 'Yes — advance-fee scams, fake prizes, investment schemes, and impersonation attempts are well-covered patterns.' },
      { q: 'My email contains personal info — is that safe to paste?', a: 'Remove names, addresses, account numbers, and other personal details before pasting. You do not need them for an accurate check.' },
      { q: 'Can it detect business email compromise (BEC)?', a: 'It flags many BEC patterns such as urgent payment requests and executive impersonation, but always verify money-related requests through a second channel.' }
    ]
  },
  {
    id: 'code',
    title: 'Code checks',
    items: [
      { q: 'What programming languages are supported?', a: 'Any text-based code — JavaScript, Python, PHP, shell scripts, and more. If you can paste it, it can be analyzed.' },
      { q: 'What does it look for in code?', a: 'Obfuscation, shell commands, data exfiltration, credential access, crypto-mining, backdoors, and other malicious or risky patterns.' },
      { q: 'Can it review code for bugs and vulnerabilities?', a: 'It focuses on suspicious and security-relevant patterns. It is not a full code audit or a replacement for professional security review.' },
      { q: 'Can it detect obfuscated or packed scripts?', a: 'Yes — characteristic obfuscation signatures (encoded blobs, packed evals, minimized hex strings) are among the strongest red flags it looks for.' },
      { q: 'What are "code notes"?', a: 'A summary of what the code actually does and why it was flagged — available in both plain and technical (nerd) versions.' },
      { q: 'Is it a replacement for SAST tools?', a: 'No. Use it for a fast first opinion on unfamiliar scripts; use dedicated static analysis tooling for anything you intend to run or ship.' },
      { q: 'Can I analyze config files like .env or docker-compose?', a: 'Yes — paste as text or code. Never paste real secrets, keys, or passwords; replace them with placeholders first.' },
      { q: 'Why did benign code get flagged?', a: 'Calls like eval(), exec(), or network requests are genuinely risky patterns even when used legitimately. The findings explain what was flagged so you can judge the context.' }
    ]
  },
  {
    id: 'text',
    title: 'Text checks',
    items: [
      { q: 'What can text analysis catch?', a: 'Scam messages, social engineering, fake job offers, romance-scam scripts, urgent payment requests, and other manipulative content.' },
      { q: 'Can it check SMS or WhatsApp messages?', a: 'Yes — paste the message text. If it is in a screenshot, type out the text first.' },
      { q: 'Can it detect romance scams?', a: 'It recognizes common romance-scam wording and escalation patterns. Be especially careful with anyone you have only met online who asks for money.' },
      { q: 'Can it fact-check news or claims?', a: 'No. It evaluates safety signals — scam and manipulation patterns — not whether a factual claim is true.' },
      { q: 'Does bad grammar affect the verdict?', a: 'Poor grammar is a weak scam signal and is never the sole basis for a verdict. Many legitimate people write imperfect English.' },
      { q: 'Does the text language matter?', a: 'Scam and manipulation patterns are detected across many languages.' }
    ]
  },
  {
    id: 'nerd',
    title: 'Nerd Mode',
    items: [
      { q: 'What is Nerd Mode?', a: 'A three-state toggle that controls how findings are explained: Simple (plain language only), Both (side-by-side), or Nerd (technical detail only).' },
      { q: 'What is the difference between simple and nerd explanations?', a: 'Simple explanations tell you what it means for you in everyday words. Nerd explanations include the technical specifics — headers, code patterns, technologies, and mechanisms.' },
      { q: 'Does Nerd Mode change the verdict or score?', a: 'No. It only changes the depth of the explanations — the analysis itself is identical.' },
      { q: 'Where is my Nerd Mode setting saved?', a: 'On your device. It persists between visits and can be reset from the Settings page.' },
      { q: 'Can I switch modes mid-report?', a: 'Yes — toggle it at the top of any report and the explanations update instantly.' }
    ]
  },
  {
    id: 'reports',
    title: 'Reports & sharing',
    items: [
      { q: 'How long are reports kept?', a: 'Reports are stored so you and anyone you share them with can revisit the result. Old reports may be cleaned up periodically.' },
      { q: 'How do I share a report?', a: 'Tap Share on any report — a link is copied to your clipboard that opens the same report for anyone.' },
      { q: 'What does Export PDF include?', a: 'The verdict, safety score, summary, and the full findings list — handy for forwarding to a colleague or IT team.' },
      { q: 'Can anyone open my report link?', a: 'Anyone with the link can view the report. Reports contain the content you analyzed, so only share what you are comfortable showing.' },
      { q: 'Can I start a new check from a report?', a: 'Yes — use the "New check" link at the top of any report page.' },
      { q: 'Why does my old report say "not found"?', a: 'The report may have been cleaned up, or the link was mistyped. Simply run the check again.' },
      { q: 'Do reports update automatically?', a: 'No. A report is a snapshot of the moment it was created. Re-run the check to get a fresh analysis.' }
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy & data',
    items: [
      { q: 'Is my content stored?', a: 'The content you submit is saved together with its report — that is what makes reports revisitable and shareable via links.' },
      { q: 'Do you sell my data?', a: 'No. Sus or Bus does not sell data, run ads, or share your content with third parties for marketing.' },
      { q: 'Do you use cookies?', a: 'Only local storage on your device for preferences like language, theme, and Nerd Mode — no tracking cookies.' },
      { q: 'Is it really anonymous?', a: 'Yes. No account, no login, no name or email required at any point.' },
      { q: 'What should I never paste into the analyzer?', a: 'Passwords, API keys, real secrets, and full financial or identity details. You never need them for an accurate safety check.' },
      { q: 'How is my data protected?', a: 'Data is handled under the protections described in the Privacy Policy, with platform-level security controls.' },
      { q: 'Can I use Sus or Bus under GDPR?', a: 'Yes. The Privacy Policy explains your rights and how data is processed.' },
      { q: 'Where can I read the full Privacy Policy?', a: 'Use the Privacy link in the footer of every page.' }
    ]
  },
  {
    id: 'language',
    title: 'Languages & accessibility',
    items: [
      { q: 'How many languages does Sus or Bus support?', a: 'The interface is available in 16 languages, including English, Spanish, French, German, Arabic, Chinese, Japanese, and Hindi.' },
      { q: 'How do I change the language?', a: 'Tap the globe button at the top of any page — on mobile it opens a bottom sheet, on desktop a dropdown.' },
      { q: 'Is right-to-left layout supported?', a: 'Yes — selecting Arabic switches the entire interface to an RTL layout automatically.' },
      { q: 'Are report explanations translated too?', a: 'Report findings are written to be clear in the language you use; the interface around them is fully localized in all 16 languages.' },
      { q: 'Does it work with screen readers?', a: 'Interactive controls use proper accessibility roles and labels, and findings are structured text that reads cleanly with assistive technology.' }
    ]
  },
  {
    id: 'mobile',
    title: 'Mobile experience',
    items: [
      { q: 'Is there a mobile app?', a: 'Sus or Bus is a mobile-first web app — it is designed to feel native on your phone with no install required.' },
      { q: 'How do I pull to refresh?', a: 'On the home screen, swipe down and release — the input clears and the page refreshes.' },
      { q: 'What is the bar at the bottom of the screen?', a: 'That is the tab bar — quick access to Home and Settings from anywhere in the app.' },
      { q: 'Does it support dark mode?', a: 'Yes. It follows your system theme by default, and you can toggle manually with the sun/moon button.' },
      { q: 'Can I add Sus or Bus to my home screen?', a: 'Yes — use your browser\'s "Add to Home Screen" option and it will launch like an app.' },
      { q: 'Does it work offline?', a: 'No — analysis requires an internet connection to fetch and check content.' }
    ]
  },
  {
    id: 'security',
    title: 'Security & accuracy',
    items: [
      { q: 'Could submitting a suspicious URL harm my device?', a: 'No. The page is fetched and analyzed on the server — your device never loads the page you are checking.' },
      { q: 'What if a site blocks the analyzer?', a: 'Occasionally a site refuses automated requests. In that case the verdict relies on the patterns visible in the URL and any partial content.' },
      { q: 'Why do results differ from other scanners?', a: 'Different tools use different heuristics, databases, and check timing. A second opinion is useful — treat any "sus" from any reputable scanner as a reason for caution.' },
      { q: 'Is my content sent to AI models?', a: 'Analysis uses AI to understand content and write explanations. That is one more reason not to paste secrets or sensitive personal data.' },
      { q: 'Can scammers game the results?', a: 'A determined attacker can sometimes evade automated checks. The verdict is strong evidence, not proof — always combine it with common sense.' },
      { q: 'What if I disagree with a verdict?', a: 'Read the individual findings — they show exactly what was flagged. You make the final call; Sus or Bus gives you the evidence.' }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    items: [
      { q: 'The check is stuck on "Analyzing..."', a: 'Wait a few seconds — complex pages can take longer. If it does not finish, go back and run the check again, and check your connection.' },
      { q: 'I got "Something went wrong"', a: 'Try the check again. If it keeps failing, email support@susorbus.com with a description and we will look into it.' },
      { q: 'My URL will not analyze', a: 'Make sure it is a full address including https:// (or at least a clear domain). Pages that require a login or that block automated access may not analyze fully.' },
      { q: 'My report link shows "not found"', a: 'The report may have been removed or the link is incomplete. Re-run the check to generate a fresh report.' },
      { q: 'The live preview will not load', a: 'That is expected for sites that block embedding — the embed is moved to the bottom of the report, and you can open the site in a new tab if you believe it is safe.' },
      { q: 'My document will not upload', a: 'Check the format (PDF, TXT, DOCX and similar are supported), keep the file under 25 MB, and try again. One document at a time.' },
      { q: 'The language will not switch', a: 'Open Settings and clear local data, then pick your language again. This resets preferences to defaults.' },
      { q: 'The theme does not follow my system setting', a: 'Use the sun/moon toggle to set your preferred theme manually — it is remembered on your device.' }
    ]
  },
  {
    id: 'support',
    title: 'Support & legal',
    items: [
      { q: 'How do I contact support?', a: 'Email support@susorbus.com — we read everything.' },
      { q: 'Can I suggest a feature or report a false verdict?', a: 'Yes, please do. Email support@susorbus.com with the details; false positives and negatives help improve the checks.' },
      { q: 'What are the Terms of Service?', a: 'The terms that govern your use of Sus or Bus — linked in the footer of every page.' },
      { q: 'Is Sus or Bus affiliated with the sites it analyzes?', a: 'No. It is an independent analyzer with no relationship to the websites, senders, or code it checks.' },
      { q: 'How often is Sus or Bus updated?', a: 'The detection patterns and explanations are improved continuously based on new scam techniques and user feedback.' },
      { q: 'Can I use Sus or Bus at my company?', a: 'Yes — it is a fast first-line triage tool for employees vetting links, emails, and scripts. It complements, but does not replace, your security team and tooling.' }
    ]
  }
];

export const totalFaqs = faqCategories.reduce((sum, cat) => sum + cat.items.length, 0);