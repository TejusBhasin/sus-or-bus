# Sus or Bus

**Is it bussin, or is it sus?**

Sus or Bus is a web-safety verification platform that analyzes links, emails, code, and text for potential threats and gives you a simple, honest verdict: **BUS** (safe, legit, bussin) or **SUS** (suspicious, sketchy, unsafe).

## What it does

Paste in any of these and get an instant safety report:

- 🔗 **Links** — live site analysis with a safety score, trackers, data collection, and red/green flags
- 🧬 **HTML & code** — static analysis of source code for malicious patterns
- 📧 **Emails** — phishing, spoofing, and social-engineering detection
- 📝 **Text** — scam pattern and misleading-content checks
- 📄 **Documents** — uploaded files checked for suspicious links, payment requests, and scam instructions

Every report includes:

- A **0–100 safety score** with a binary BUS/SUS verdict
- **Two explanations per finding** — plain language for everyone ("simple" mode) and technical detail for security-savvy users ("nerd" mode)
- Trackers, data-collection practices, and detected technologies
- Source-code viewer for analyzed HTML/code
- **Safer alternatives** — 3–5 reputable alternatives suggested when a site is rated SUS
- Shareable report links, PDF export, and one-click re-scan

Smart efficiency features keep it fast and cheap:

- **7-day shared report cache** — recently scanned URLs return instantly
- **Trusted-domain bypass** — well-known safe domains skip scanning entirely
- **30-day alternatives cache** — safer-alternative lookups are cached per site

## Browser extension

The Sus or Bus browser extension brings real-time protection to your browsing:

- Intercepts risky link clicks and scans them before you land
- Full-screen takeover on direct navigation to flagged sites
- "Don't ask again" whitelisting for sites you trust
- Optional account to sync your whitelist/blacklist across devices
- Available for **Chrome** and **Safari** (see the in-app Extension page for install instructions)

## Tech stack

- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, lucide-react
- **Backend:** serverless functions for content analysis and account sync
- **AI:** LLM-powered analysis with structured, dual-audience output
- **i18n:** 16 languages, light/dark themes, mobile-first design

## Project structure

```
src/
  pages/          # App screens (Home, Report, Settings, Account, FAQ, legal pages)
  components/
    susbus/       # Feature components (verdicts, score gauge, lists, etc.)
    ui/           # shadcn/ui primitives
  lib/            # i18n, theming, auth, utilities
base44/           # Backend: entities, functions, config
extension/
  sus-or-bus/          # Chrome extension (Manifest V3)
  sus-or-bus-safari/   # Safari variant
```

## Getting involved

Found a bug or a site that gets the wrong verdict? Open an issue or reach out at [tejusbhasin17@gmail.com](mailto:tejusbhasin17@gmail.com).

## License

All rights reserved © Sus or Bus
