import React from 'react';

export default function TechnicalDetails({ headers, chain }) {
  const headerEntries = Object.entries(headers || {});
  const hops = (Array.isArray(chain) ? chain : [])
    .map((c) => (typeof c === 'string' ? c : c?.url || c?.href || ''))
    .filter(Boolean);
  if (headerEntries.length === 0 && hops.length <= 1) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-2 mb-3">
        Technical appendix
      </h2>
      {headerEntries.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Security response headers</h3>
          <div className="mt-2 space-y-1.5">
            {headerEntries.map(([h, v]) => (
              <div key={h} className="text-xs">
                <span className="font-mono font-bold text-foreground">{h}:</span>{' '}
                <span className="font-mono text-muted-foreground break-all">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {hops.length > 1 && (
        <div className="mt-3 rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Redirect chain</h3>
          <ol className="mt-2 space-y-1 text-xs font-mono text-muted-foreground break-all">
            {hops.map((u, i) => <li key={i}>{i + 1}. {u}</li>)}
          </ol>
        </div>
      )}
    </section>
  );
}