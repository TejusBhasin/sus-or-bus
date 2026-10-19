import React from 'react';
import { Link } from 'react-router-dom';

const CHIPS = [
  ['staticHtml', 'Static HTML'],
  ['securityHeaders', 'Security Headers'],
  ['redirects', 'Redirect Inspection'],
  ['trackers', 'Tracker Detection'],
  ['privacyPolicy', 'Privacy Policy'],
  ['termsOfService', 'Terms of Service'],
  ['browserBehavior', 'browserBehavior']
];

function chipStyle(state) {
  if (state === 'completed') return ['border-emerald-500/60 text-emerald-400', '✓', 'completed'];
  if (state === 'not_found') return ['border-amber-500/60 text-amber-400', '⚠', 'not found'];
  if (state === 'unreachable') return ['border-amber-500/60 text-amber-400', '⚠', 'unreachable'];
  return ['border-border text-muted-foreground', '○', state || 'unavailable'];
}

export default function ScanHeader({ report, scan, onCopy }) {
  const isBus = report.verdict === 'bus';
  const checked = scan.checkedAt ? new Date(scan.checkedAt).toLocaleString() : '';
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Evidence-based assessment</p>
          <p className={`text-5xl sm:text-6xl font-black ${isBus ? 'text-emerald-400' : 'text-red-400'}`}>
            {isBus ? 'BUS' : 'SUS'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-6xl sm:text-7xl font-black leading-none ${isBus ? 'text-emerald-400' : 'text-red-400'}`}>
            {Math.round(report.score)}
          </span>
          <div className="flex flex-col gap-2">
            <button onClick={onCopy} className="rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
              copy result
            </button>
            <Link to="/" className="rounded-md border border-border bg-card px-3 py-2 text-center text-sm font-semibold text-foreground hover:bg-secondary">
              new scan
            </Link>
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">automated heuristic scan — absence of findings never guarantees safety</p>
      <p className="mt-1 text-sm text-muted-foreground break-all">
        {scan.url} • {checked} • HTTP {scan.status}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {CHIPS.map(([key, label]) => {
          const [cls, icon, text] = chipStyle(scan.coverage?.[key]);
          return (
            <span key={key} className={`rounded-md border px-2.5 py-1 text-xs font-bold ${cls}`}>
              {icon} {label}: {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}