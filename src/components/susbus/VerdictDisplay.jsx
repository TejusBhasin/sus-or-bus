import React from 'react';
import { cn } from '@/lib/utils';

export default function VerdictDisplay({ verdict }) {
  const isBus = verdict === 'bus';
  return (
    <div className="flex flex-col items-center text-center select-none">
      <div
        className={cn(
          'text-7xl sm:text-8xl font-black tracking-tighter leading-none',
          isBus ? 'text-emerald-400' : 'text-red-400'
        )}
        style={{ textShadow: isBus ? '0 0 40px rgba(52,211,153,0.35)' : '0 0 40px rgba(248,113,113,0.35)' }}
      >
        {isBus ? 'BUS' : 'SUS'}
      </div>
      <p className="mt-3 text-sm text-slate-400 font-mono">
        {isBus ? 'this is bussin — looks legit' : 'this is sus — proceed with caution'}
      </p>
    </div>
  );
}