## Sus or Bus

**Is it bussin, or is it sus?**

Sus or Bus checks links, emails, code, documents, attachments, and plain text for scams, phishing, and other sketchy behavior — then gives you one honest verdict: **BUS** (safe, legit) or **SUS** (suspicious, unsafe).

Try it live at **https://susorbus.com**

Sus or Bus is following the MIT license for the Congressional App Challenge and US Government + affiliates, but custom sourced for everone else. No keys, credentials, or secrets are committed to this repository; everything sensitive is managed on the hosting platform.

<img width="1470" height="800" alt="Screenshot 2026-09-28 at 9 05 27 PM" src="https://github.com/user-attachments/assets/4303d81a-777e-428b-b018-8ff14b9d8316" />


## What it does

Paste any of these in and get an instant safety report:

- **Links** — the site is fetched and analyzed: safety score, trackers, data collection, red/green flags
- **HTML / code** — static analysis of the source for malicious patterns
- **Emails** — phishing, spoofing, and social-engineering detection
- **Text** — scam-pattern and misleading-content checks
- **Documents** — uploaded files checked for suspicious links, payment requests, and scam instructions

Every report gives you:

- a **0–100 safety score** with the BUS/SUS verdict
- findings written two ways — plain language in **simple** mode, security-savvy detail in **nerd** mode
- trackers, data-collection practices, and detected technologies
- a source-code viewer for analyzed HTML/code
- **safer alternatives** — 3–5 reputable sites suggested when a site is rated SUS
- shareable links, PDF export, and one-click re-scan

Every scan does NOT cost money because it uses a weighted algorithm (Instead of an AI)

## The browser extension

The extension (Chrome + Safari, in `extension/`) brings the same checks to your browsing:

- clicks on links to other sites get scanned before you land; a corner popup shows the verdict with Continue / Cancel
- opening a SUS site directly (typed address, bookmark, pinned tab) triggers a full-screen report
- "Don't ask again" whitelisting for sites you trust
- an optional account that syncs your whitelist/blacklist between the extension and the website
- It works on the same backend, with the extension and website communicating with eachother


## How a scan works

1. The frontend (`src/pages/Home.jsx`) sends the input to the `analyzeContent` backend function
2. URLs are normalized, then checked against the shared cache — a fresh hit is returned without spending anything
3. Otherwise the page is fetched and its HTML is sent to an LLM, which returns a structured verdict (score, findings, details) as JSON
4. The result is saved as a `Report` record and the frontend renders it (`src/pages/Report.jsx`)

Account sync is its own little system: the website and the extension each hold the user's whitelist/blacklist, and the `accountLists` function merges the two sides without losing changes from either one.

## License
Custom Sourced for all (See (`license`)
[MIT](LICENSE) for the Congressional App Challenge, as well as the US Government + Affiliates © 2026 Tejus Bhasin
