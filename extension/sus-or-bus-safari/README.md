# Sus or Bus — Safari Web Extension

Same extension as the Chrome build: it checks the SUS or BUS rating of a website
before you browse it — a corner popup when you click a link to another site, a
full-screen report when a site is opened directly (typed address, bookmark,
pinned tab), and a "Find alternative websites" tool for SUS sites.

## Install (Safari, macOS)

Safari cannot load unpacked extensions directly — the folder must be converted
into a small Safari app once (free, no App Store account needed):

1. Download and unzip this folder on your Mac.
2. Install Xcode from the Mac App Store (free) if you don't have it.
3. In Terminal, run:
   `xcrun safari-web-extension-converter /path/to/sus-or-bus-safari`
   (drag the unzipped folder into Terminal to fill in its path)
4. Open the generated Xcode project and press Run.
5. Safari opens automatically. In Safari → Settings → Extensions, turn on
   **Sus or Bus** and allow it on websites (Allow on All Websites, or per-site).
6. Done — try opening a website from a bookmark or a pinned tab.

## Requirements

- macOS 12+ with Safari 16.4+ (Manifest V3 support)
- Xcode 14+ (free) for the one-time conversion

## Files

- `manifest.json` — extension config (Manifest V3, same as the Chrome build)
- `background.js` — service worker: rating cache, auto-scan, navigation gate
- `content.js` — link interception, full-screen report, alternatives UI
- `icons/` — extension icons