import React from 'react';
import { cn } from '@/lib/utils';
import { Brain, User, Layers } from 'lucide-react';

const MODES = [
  { id: 'simple', label: 'Simple', icon: User },
  { id: 'both', label: 'Both', icon: Layers },
  { id: 'nerd', label: 'Nerd', icon: Brain }
];

export default function NerdModeToggle({ mode, onChange }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900/60 p-0.5">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            )}
            aria-pressed={active}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}