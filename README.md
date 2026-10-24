# Sus or Bus

**Is it bussin, or is it sus?**

Sus or Bus checks links, emails, code, documents, and plain text for scams, phishing, and other sketchy behavior — then gives you one honest verdict: **BUS** (safe, legit) or **SUS** (suspicious, unsafe).

Try it live at **https://susorbus.com**

Sus or Bus is open source — the full code lives at **https://github.com/TejusBhasin/sus-or-bus** (MIT). No keys, credentials, or secrets are committed to this repository; everything sensitive is managed on the hosting platform.

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

Every scan costs money (it sends the content to an AI model), so a few things keep it fast and cheap:

- **7-day shared cache** — a URL scanned by anyone in the last week returns instantly for everyone
- **trusted domains** — well-known sites like Google or Wikipedia are never scanned at all
- **30-day alternatives cache** — repeated "find a safer site" lookups are free

## The browser extension

The extension (Chrome + Safari, in `extension/`) brings the same checks to your browsing:

- clicks on links to other sites get scanned before you land; a corner popup shows the verdict with Continue / Cancel
- opening a SUS site directly (typed address, bookmark, pinned tab) triggers a full-screen report
- "Don't ask again" whitelisting for sites you trust
- an optional account that syncs your whitelist/blacklist between the extension and the website

## How a scan works

1. The frontend (`src/pages/Home.jsx`) sends the input to the `analyzeContent` backend function
2. URLs are normalized, then checked against the shared cache — a fresh hit is returned without spending anything
3. Otherwise the page is fetched and its HTML is sent to an LLM, which returns a structured verdict (score, findings, details) as JSON
4. The result is saved as a `Report` record and the frontend renders it (`src/pages/Report.jsx`)

Account sync is its own little system: the website and the extension each hold the user's whitelist/blacklist, and the `accountLists` function merges the two sides without losing changes from either one (see the comments in `base44/functions/accountLists/entry.ts`).

## Run it locally

You need Node 18 or newer.

```bash
git clone https://github.com/TejusBhasin/sus-or-bus.git
cd sus-or-bus
npm install
npm run dev
```

The frontend runs on the localhost URL Vite prints. The safety-analysis functions live on the app's hosted backend, so scans work out of the box — no API keys or setup needed.

To try the browser extension:

1. Open `chrome://extensions` and turn on **Developer mode**
2. Click **Load unpacked** and pick the `extension/sus-or-bus` folder
3. Click a link to another site — the corner popup should appear

## Tech stack

- React 18, Vite, Tailwind CSS, shadcn/ui, lucide-react
- Serverless backend functions (`base44/functions/`) for analysis, accounts, and list sync
- LLM-powered analysis with structured, dual-audience output
- 16 languages, light/dark theme, mobile-first design

## Project structure

```
src/
  pages/           app screens (Home, Report, Settings, Account, FAQ, legal pages)
  components/
    susbus/        feature components (verdict display, score gauge, banners...)
    ui/            shadcn/ui primitives
  lib/             i18n, theming, utilities
base44/
  entities/        data schemas (Report, ExtensionAccount)
  functions/       backend: analyzeContent, findAlternatives, account auth + sync
extension/
  sus-or-bus/          Chrome extension (Manifest V3)
  sus-or-bus-safari/   Safari variant
```

## What's next

- publish the Chrome extension to the Web Store
- email-header checks (SPF/DKIM) for the email analyzer
- community verdicts — let users flag wrong ratings and feed corrections back in

## License

[MIT](LICENSE) © 2026 Tejus Bhasin