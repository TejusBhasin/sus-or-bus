import React from 'react';
import { Link } from 'react-router-dom';
import {
  Info,
  ListChecks,
  Scale,
  BookOpen,
  Chrome,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

// Marketing-style sections that sit below the analyzer on the home page:
// about, how to use, how to interpret a report, our story, and a closing CTA.

const steps = [
  {
    title: 'Paste what you want checked',
    text: 'A link, an email, HTML, code, plain text — or upload a document. The right mode is picked automatically.'
  },
  {
    title: 'Hit "Run the check"',
    text: 'Fresh scans take a few seconds. Links someone checked in the last week come back instantly from the shared cache.'
  },
  {
    title: 'Read the verdict',
    text: 'BUS or SUS at a glance — then open the full report for the score, every finding, and safer alternatives.'
  },
  {
    title: 'Take it into your browser',
    text: 'Optional: install the extension so every link you click gets checked before the page even loads.'
  }
];

const verdicts = [
  {
    icon: CheckCircle2,
    tone: 'text-emerald-500 dark:text-emerald-400',
    title: 'BUS — looks legit',
    text: 'No red flags found. Safe to use — but keep your wits about you when logging in or paying anywhere.'
  },
  {
    icon: AlertTriangle,
    tone: 'text-red-500 dark:text-red-400',
    title: 'SUS — proceed with caution',
    text: 'Red flags found. Stop and reconsider — or jump to one of the suggested safer alternatives on the report.'
  }
];

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-4">
      <Icon className="w-4 h-4" />
      {children}
    </div>
  );
}

export default function HomeSections() {
  return (
    <div className="pt-10 space-y-14">
      {/* About */}
      <section>
        <SectionLabel icon={Info}>about</SectionLabel>
        <h2 className="text-2xl font-black tracking-tight mb-3">One question: is it safe?</h2>
        <p className="text-muted-foreground leading-relaxed text-[15px]">
          Sus or Bus is a free web-safety analyzer. Paste in a link, an email, code, a document, or any
          text, and it looks for scams, phishing, trackers, and other sketchy behavior — then gives you
          one honest verdict: <span className="text-emerald-500 dark:text-emerald-400 font-semibold">BUS</span>{' '}
          (looks legit) or <span className="text-red-500 dark:text-red-400 font-semibold">SUS</span>{' '}
          (proceed with caution). No account needed, and every report works in plain language — with a
          nerd mode for the technical version of every finding.
        </p>
      </section>

      {/* How to use */}
      <section>
        <SectionLabel icon={ListChecks}>how to use</SectionLabel>
        <h2 className="text-2xl font-black tracking-tight mb-5">From sketchy link to verdict in seconds</h2>
        <ol className="grid gap-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-border bg-card/60 p-5">
              <div className="flex items-start gap-4">
                <span className="font-mono text-xs text-muted-foreground pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* How to interpret */}
      <section>
        <SectionLabel icon={Scale}>how to interpret</SectionLabel>
        <h2 className="text-2xl font-black tracking-tight mb-5">What the verdict means</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {verdicts.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${v.tone}`} />
                  <h3 className="font-semibold">{v.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.text}</p>
              </div>
            );
          })}
          <div className="rounded-xl border border-border bg-card/60 p-5 sm:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h3 className="font-semibold">The score and the findings</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every report carries a 0–100 safety score — the higher, the safer — plus findings marked
              good, warning, or bad. Green flags are the reassuring parts; red flags are the reasons a
              site earned its SUS. Flip on nerd mode in settings to see the technical version of each one.
            </p>
          </div>
        </div>
      </section>

      {/* Our story */}
      <section>
        <SectionLabel icon={BookOpen}>our story</SectionLabel>
        <h2 className="text-2xl font-black tracking-tight mb-3">Built in the open</h2>
        <p className="text-muted-foreground leading-relaxed text-[15px]">
          Sus or Bus started as a small tool to answer one question friends kept asking:{" "}
          &ldquo;is this link safe?&rdquo; It grew into a full safety engine — this website, a Chrome and
          Safari extension, and an iOS app — all built by a student developer, in the open. The whole
          project is open source under MIT, so anyone can read exactly how a verdict gets made.
        </p>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 text-center">
        <h2 className="text-xl font-black tracking-tight mb-2">Take Sus or Bus with you</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-5">
          Check sites before you even open them — in your browser or right on your phone.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/extension"
            className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors"
          >
            <Chrome className="w-4 h-4" />
            Get the extension
          </Link>
          <a
            href="https://apps.apple.com/nz/app/sus-or-bus/id6808757038"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl border border-border bg-secondary/60 text-foreground font-semibold text-base hover:bg-secondary transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Download on the App Store
          </a>
        </div>
      </section>
    </div>
  );
}