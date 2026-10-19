import React from 'react';

const ROWS = [
  { key: 'transport', label: 'Transport & TLS' },
  { key: 'content', label: 'Content & Scripts' },
  { key: 'telemetry', label: 'Telemetry Surface' },
  { key: 'governance', label: 'Legal Governance' }
];

function barColor(score) {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function RiskVectors({ vectors, confidence }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap justify-between gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <span>Risk vectors &amp; defense depth</span>
        <span>Confidence: {confidence}% · Zero-trust baseline</span>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
        {ROWS.map(({ key, label }) => {
          const v = vectors?.[key];
          if (!v) return null;
          return (
            <div key={key}>
              <div className="flex justify-between text-sm font-semibold text-muted-foreground">
                <span>{label}</span>
                <span className="text-foreground">{v.score}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className={`h-full ${barColor(v.score)}`} style={{ width: `${v.score}%` }} />
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{v.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}