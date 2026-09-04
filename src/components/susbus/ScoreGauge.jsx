import React from 'react';

export default function ScoreGauge({ score = 0, verdict }) {
  const radius = 72;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circ - (clamped / 100) * circ;
  const color = verdict === 'bus' ? '#34d399' : '#f87171';

  return (
    <div className="relative w-44 h-44 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="80" cy="80" r={radius} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out', filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black tabular-nums" style={{ color }}>{Math.round(clamped)}</span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">safety</span>
      </div>
    </div>
  );
}