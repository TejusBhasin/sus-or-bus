import React from 'react';
import RiskVectors from './RiskVectors';
import KeyObservations from './KeyObservations';
import FindingCard from './FindingCard';
import TechnicalDetails from './TechnicalDetails';

const CHIPS = [
  ['staticHtml', 'Static HTML'],
  ['securityHeaders', 'Security Headers'],
  ['redirects', 'Redirect Inspection'],
  ['trackers', 'Tracker Detection'],
  ['privacyPolicy', 'Privacy Policy'],
  ['termsOfService', 'Terms of Service'],
  ['browserBehavior', 'Browser Behavior']
];

function chip(state) {
  if (state === 'completed') return ['border-emerald-500/40 text-emerald-600 dark:text-emerald-400', '✓', 'completed'];
  if (state === 'not_found' || state === 'unreachable') return ['border-amber-500/40 text-amber-600 dark:text-amber-400', '⚠', state.replace('_', ' ')];
  return ['border-border text-muted-foreground', '○', state || 'unavailable'];
}

const card = 'rounded-2xl border border-border bg-card/60 p-5';

export default function ScanExtras({ scan }) {
  const checked = scan.checkedAt ? new Date(scan.checkedAt).toLocaleString() : '';
  return (
    <div className="space-y-6 mb-6">
      <div className={card}>
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Scan coverage</p>
        <p className="mt-2 text-sm text-muted-foreground break-all">{scan.url} • {checked} • HTTP {scan.status}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map(([key, label]) => {
            const [cls, icon, text] = chip(scan.coverage?.[key]);
            return <span key={key} className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${cls}`}>{icon} {label}: {text}</span>;
          })}
        </div>
      </div>
      <RiskVectors vectors={scan.vectors} confidence={scan.confidence} />
      <KeyObservations observations={scan.observations} actions={scan.actions} />
      {scan.findings?.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Point impact</p>
          {scan.findings.map((f, i) => (
            <FindingCard key={i} level={f.level} category={f.category} title={f.title} summary={f.summary} impact={f.impact}
              evidence={f.evidence} whyItMatters={f.whyItMatters} recommendation={f.recommendation} source={f.source} />
          ))}
        </div>
      )}
      <TechnicalDetails headers={scan.headers} chain={scan.chain} />
    </div>
  );
}