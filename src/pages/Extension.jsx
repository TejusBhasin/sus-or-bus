import React from 'react';
import { Chrome, Download, MousePointerClick, Zap, ListChecks, CheckCircle2, Puzzle, ShieldAlert, Maximize2, ShieldCheck, Compass } from 'lucide-react';
import TopNav from '@/components/susbus/TopNav';
import Footer from '@/components/susbus/Footer';

const features = [
  {
    icon: MousePointerClick,
    title: 'Click interception',
    text: 'When you click a link to another website, Sus or Bus steps in first and shows the site\u2019s rating before the page loads. Continue if it looks bus, cancel if it\u2019s sus.'
  },
  {
    icon: Zap,
    title: 'Cache + auto-scan',
    text: 'Sites you\u2019ve checked before show their rating instantly. New sites are scanned automatically in the background — a few seconds the first time. Ratings stay fresh for 7 days.'
  },
  {
    icon: ListChecks,
    title: 'Mini findings',
    text: 'The popup shows the verdict (Valid or Not Valid), the safety score, and the top findings in plain language — plus a link to the full report right here on the Sus or Bus site.'
  },
  {
    icon: Maximize2,
    title: 'Full-screen takeover',
    text: 'Open a site directly — a pinned tab, bookmark, or typed address — and the full report covers the screen before you browse it. Safe sites get one big Proceed button.'
  },
  {
    icon: ShieldCheck,
    title: 'Safer alternatives',
    text: 'If a site is rated SUS, the proceed button shrinks and a one-tap lookup suggests well-known, safe websites that do the same job — in the popup and on reports in the app.'
  }
];

const steps = [
  'Download the .zip file below and unzip it on your computer.',
  'Open Chrome and go to chrome://extensions.',
  'Turn on Developer mode (the toggle at the top right).',
  'Click "Load unpacked" and select the unzipped sus-or-bus folder.',
  'Browse as usual — click any link to another site and the rating pops up in the corner.'
];

const notes = [
  'Links within the site you\u2019re already on pass straight through — no popups.',
  'Ctrl/Cmd-click and middle-click open new tabs directly, without the check.',
  'Cached ratings live only on your device.',
  'A Chrome Web Store version is coming — the unpacked install takes under a minute.'
];

export default function Extension() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <div className="max-w-2xl mx-auto px-5 py-12 pb-safe">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">
          <Puzzle className="w-4 h-4" />
          browser extension
        </div>
        <h1 className="text-4xl font-black tracking-tighter">
          <span className="text-red-500 dark:text-red-400">Sus</span>
          <span className="text-muted-foreground/60 mx-2 font-normal lowercase">or</span>
          <span className="text-emerald-500 dark:text-emerald-400">Bus</span>{' '}
          for Chrome
        </h1>
        <p className="mt-3 text-lg text-muted-foreground font-mono">Know before you click.</p>

        {/* Download */}
        <div className="mt-8 rounded-2xl border border-border bg-card/60 backdrop-blur p-6 text-center">
          <Chrome className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Check any website's SUS or BUS rating before you open it — right in your browser.
          </p>
          <a
            href="/extension/sus-or-bus.zip"
            download
            className="mt-5 inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download the extension
          </a>
          <p className="mt-2 text-xs text-muted-foreground font-mono">sus-or-bus.zip · v1.1.0 · free</p>
        </div>

        {/* What it is */}
        <section className="mt-12">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-4">
            <ShieldAlert className="w-4 h-4" />
            what it is
          </div>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Sus or Bus for Chrome is a browser extension that checks the websites you're about to
            open — before you open them. Click a link to another site and the extension pauses for a
            moment, shows that site's SUS or BUS rating in the corner, and lets you decide:
            continue or cancel. Open a site directly — a pinned tab, bookmark, or typed address —
            and the full report covers the screen until you choose to proceed. It uses the same
            safety engine as this app, so the rating you see in the popup is the same analysis you
            get here — with the full report one tap away.
          </p>
        </section>

        {/* How it works */}
        <section className="mt-12">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-4">
            <Zap className="w-4 h-4" />
            how it works
          </div>
          <div className="grid gap-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-xl border border-border bg-card/60 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    <h3 className="font-semibold">{f.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Install */}
        <section className="mt-12">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-4">
            <Download className="w-4 h-4" />
            install in 5 steps
          </div>
          <ol className="rounded-2xl border border-border bg-card/60 divide-y divide-border">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-4 p-5">
                <span className="font-mono text-xs text-muted-foreground pt-1">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-sm text-foreground leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Good to know */}
        <section className="mt-12">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-4">
            <CheckCircle2 className="w-4 h-4" />
            good to know
          </div>
          <ul className="space-y-2">
            {notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                {n}
              </li>
            ))}
          </ul>
        </section>

        {/* Safari */}
        <section className="mt-12">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-4">
            <Compass className="w-4 h-4" />
            safari users
          </div>
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 text-center">
            <Compass className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              The same extension is available for Safari on macOS — Safari just needs a one-time
              conversion on your Mac (free, no App Store account needed).
            </p>
            <a
              href="/extension/sus-or-bus-safari.zip"
              download
              className="mt-5 inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download for Safari
            </a>
            <p className="mt-2 text-xs text-muted-foreground font-mono">sus-or-bus-safari.zip · v1.1.0 · macOS 12+</p>
          </div>
          <ol className="mt-4 rounded-2xl border border-border bg-card/60 divide-y divide-border">
            {[
              'Download the Safari .zip above and unzip it on your Mac.',
              'Install Xcode from the Mac App Store (free), then open Terminal.',
              'Run: xcrun safari-web-extension-converter /path/to/sus-or-bus-safari — this creates a Safari app project.',
              'Open the generated Xcode project and press Run.',
              'In Safari → Settings → Extensions, enable Sus or Bus and allow it on websites.'
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-4 p-5">
                <span className="font-mono text-xs text-muted-foreground pt-1">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-sm text-foreground leading-relaxed break-words">{s}</p>
              </li>
            ))}
          </ol>
        </section>

        <Footer />
      </div>
    </div>
  );
}