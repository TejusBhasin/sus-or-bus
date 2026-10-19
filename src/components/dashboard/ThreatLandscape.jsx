import React from 'react';
import { Brain } from 'lucide-react';
import TrendChart from './TrendChart';

function Section({ title, children }) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-2 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Chip({ children }) {
  return (
    <span className="rounded-md border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
      {children}
    </span>
  );
}

function fmt(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function ThreatLandscape({ stats, colors, mode, takeaway }) {
  const { days, totals, range } = stats;
  const nerd = mode === 'nerd';
  const showTech = mode !== 'simple';
  const share = totals.total > 0 ? Math.round((totals.bus / totals.total) * 100) : 0;

  const boxes = [
    { key: 'bus', label: nerd ? 'BUS verdicts' : 'Safe links', value: totals.bus, cls: 'text-emerald-500 dark:text-emerald-400' },
    { key: 'sus', label: nerd ? 'SUS verdicts' : 'Suspicious links', value: totals.sus, cls: 'text-red-500 dark:text-red-400' },
    { key: 'total', label: nerd ? 'Total scans' : 'All checks', value: totals.total, cls: 'text-foreground' }
  ];

  return (
    <div className="rounded-2xl border border-border bg-background text-foreground p-5 sm:p-8 select-text print-exact">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-black">
          <span className="text-red-500 dark:text-red-400">SUS</span> or{' '}
          <span className="text-emerald-500 dark:text-emerald-400">BUS</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Your personal threat landscape</p>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <span className="truncate text-muted-foreground">
          {range ? `${fmt(range.from)} — ${fmt(range.to)}` : 'no history yet'}
        </span>
        <span className="font-bold shrink-0">
          {totals.total} scans · {share}% BUS
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip>✓ period covered: {days.length} day{days.length === 1 ? '' : 's'}</Chip>
        <Chip>✓ verdicts recorded: {totals.total}</Chip>
        <Chip>✓ bus share: {share}%</Chip>
        <Chip>✓ sus flags: {totals.sus}</Chip>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {boxes.map((b) => (
          <div key={b.key} className="rounded-lg border border-border bg-card py-4 text-center">
            <div className={`font-mono text-3xl font-bold ${b.cls}`}>{b.value}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {b.label}
            </div>
            {showTech && b.key !== 'total' && (
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {b.key === 'bus' ? share : 100 - share}% of history
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-secondary">
        <div className="bg-emerald-500" style={{ width: `${share}%` }} />
        <div className="flex-1 bg-red-500" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {nerd
          ? 'ratio bar: emerald = BUS share, red = SUS share of all recorded verdicts'
          : 'green shows how many of your checks were safe; red shows the suspicious ones'}
      </p>

      <Section title="BUS vs SUS over time">
        <TrendChart days={days} colors={colors} mode={mode} />
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
            {nerd ? 'BUS count (stacked daily)' : 'Safe verdicts per day'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-500" />
            {nerd ? 'SUS count (stacked daily)' : 'Suspicious verdicts per day'}
          </span>
          {showTech && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5" style={{ background: colors.avg }} />
              average score
            </span>
          )}
        </div>
      </Section>

      <Section title="What this says about your threat landscape">
        {(mode === 'simple' || mode === 'both') && (
          <p className="text-sm text-foreground leading-relaxed">{takeaway.simple}</p>
        )}
        {(nerd || mode === 'both') && (
          <div className="mt-2 text-sm leading-relaxed">
            {mode === 'both' && (
              <span className="text-xs uppercase font-mono text-indigo-600 dark:text-indigo-400/70 mr-2">
                <Brain className="w-3 h-3 inline" /> nerd
              </span>
            )}
            <span className={mode === 'both' ? 'text-muted-foreground' : 'text-foreground'}>
              {takeaway.nerd}
            </span>
          </div>
        )}
      </Section>

      <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
        This dashboard summarizes the verdicts saved by your checks. It describes patterns, not
        intentions, and an empty day means no scans were run — not that everything was safe.
      </p>
    </div>
  );
}