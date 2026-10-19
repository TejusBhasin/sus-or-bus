import React from 'react';
import FindingCard from './FindingCard';
import { buildLedger } from '@/lib/scoreLedger';

export default function ScoreLedger({ findings, score, verdict }) {
  const { baseline, rows, final, gained, lost } = buildLedger(findings, score);
  return (
    <div className="space-y-3">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">How the score was calculated</p>
      <div className="rounded-2xl border border-border bg-card/60 p-5 font-mono text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Baseline</span><span>{baseline}</span></div>
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Good findings ({rows.filter((r) => r.level === 'good').length})</span><span>+{gained}</span></div>
        <div className="flex justify-between text-red-600 dark:text-red-400"><span>Warnings & issues ({rows.filter((r) => r.level !== 'good').length})</span><span>-{lost}</span></div>
        <div className="mt-2 pt-2 border-t border-border flex justify-between font-bold">
          <span>Final score</span><span>{final}/100 · {verdict === 'bus' ? 'BUS' : 'SUS'}</span>
        </div>
      </div>
      {rows.map((f, i) => (
        <FindingCard key={i} level={f.level} category={f.category} title={f.title} summary={f.summary} delta={f.delta} running={f.running}
          evidence={f.evidence} whyItMatters={f.whyItMatters} recommendation={f.recommendation} source={f.source} />
      ))}
    </div>
  );
}