import React from 'react';

const BOXES = [
  ['good', 'Good', 'text-emerald-400'],
  ['warning', 'Warning', 'text-amber-400'],
  ['bad', 'Bad', 'text-red-400']
];

export default function CountBoxes({ counts = {}, score }) {
  const filled = Math.round(score / 2);
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {BOXES.map(([key, label, color]) => (
          <div key={key} className="rounded-lg border border-border bg-card py-4 text-center">
            <div className={`font-mono text-3xl font-bold ${color}`}>{counts[key] || 0}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        good = verified safety indicator · warning = requires attention · bad = serious risk flag
      </p>
      <div className="mt-3 flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: 50 }).map((_, i) => (
          <span key={i} className={`h-3 flex-1 rounded-sm ${i < filled ? 'bg-emerald-500' : 'bg-secondary'}`} />
        ))}
      </div>
    </div>
  );
}