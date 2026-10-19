import React from 'react';

const CATEGORY = {
  security: 'Security',
  reputation: 'Reputation & Domain',
  content: 'Content',
  policy: 'Policies & Terms',
  privacy: 'Privacy'
};

const LEVEL = {
  good: { text: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500' },
  warning: { text: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500' },
  bad: { text: 'text-red-600 dark:text-red-400', border: 'border-l-red-500' }
};

export default function FindingCard({ level, category, title, summary, impact, evidence, whyItMatters, recommendation, source }) {
  const style = LEVEL[level] || LEVEL.good;
  const pts = impact > 0 ? `-${impact} pts` : '0 pts';
  return (
    <div className={`rounded-lg border border-border border-l-4 ${style.border} bg-card p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>{level}</span>
          <span className="rounded border border-border px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            {CATEGORY[category] || category}
          </span>
          {source && <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">· {source}</span>}
        </div>
        <span className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${impact > 0 ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
          {pts}
        </span>
      </div>
      <h3 className="mt-2 font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-foreground/90">{summary}</p>
      {evidence && <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground break-words">{evidence}</p>}
      {whyItMatters && (
        <p className="mt-2 text-xs leading-relaxed text-foreground/70">
          <span className="font-bold text-foreground">Why it matters:</span> {whyItMatters}
        </p>
      )}
      {recommendation && (
        <p className="mt-1.5 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
          <span className="font-bold">Fix:</span> {recommendation}
        </p>
      )}
    </div>
  );
}