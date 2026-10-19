import React from 'react';

const TONE = {
  good: 'bg-emerald-500/15 text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-400',
  bad: 'bg-red-500/15 text-red-400'
};

export default function KeyObservations({ observations = [], actions = [] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
        Key security observations
      </h2>
      <div className="mt-3 space-y-2">
        {observations.map((o) => (
          <div key={o.label} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2.5">
            <span className={`rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${TONE[o.tone] || TONE.good}`}>
              {o.label}
            </span>
            <span className="text-sm text-foreground">{o.text}</span>
          </div>
        ))}
      </div>
      {actions.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-bold uppercase tracking-widest text-foreground">Actions that would improve score</h3>
          <div className="mt-2 space-y-2">
            {actions.map((a) => (
              <div key={a.action} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2 text-sm">
                <span className="text-foreground">{a.action}</span>
                <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">{a.points}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}