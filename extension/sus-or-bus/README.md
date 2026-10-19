# Sus or Bus — Chrome Extension

Shows the SUS or BUS rating of a website before you open it. When you click a link
to another site, the extension pauses, checks the rating, and pops it up in the
corner with **Continue / Cancel**.

## Install (Load unpacked)

1. Copy the `sus-or-bus` folder to your computer, keeping the structure
   (`manifest.json`, `background.js`, `content.js`, `icons/`).
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (toggle, top right).
4. Click **Load unpacked** and select the `sus-or-bus` folder.
5. Done — browse to any site and click a link to a different website.

## How it works

- **Click interception:** links to a *different* site are paused; the popup shows
  the verdict with Continue / Cancel. Same-site links and Ctrl/Cmd-clicks pass
  straight through.
- **Full-screen takeover:** open a site directly — a pinned tab, bookmark, or
  typed address — and the full report covers the screen until you proceed.
  SUS sites get a smaller proceed button plus a "Find alternative websites"
  tool that suggests safe, well-known sites for the same job.
- **Cache + auto-scan:** sites scanned before show their rating instantly; new
  sites are scanned automatically in the background (takes a few seconds the
  first time). Ratings are cached for 7 days per site.
- **Mini findings:** the popup shows the verdict (Valid / Not Valid), the score,
  the top findings in plain language, and a link to the full report on
  susorbus.com.

## Files

- `manifest.json` — extension config (Manifest V3)
- `background.js` — service worker: rating cache + automatic scans
- `content.js` — link interception + rating popup UI
- `icons/` — extension icons

## Chrome Web Store (later)

Zip the folder's contents and submit at the
[Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole) —
no code changes needed.