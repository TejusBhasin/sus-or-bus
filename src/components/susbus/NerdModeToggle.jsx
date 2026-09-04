import React from 'react';
import { Brain, Check } from 'lucide-react';

const modes = [
  { id: 'simple', label: 'Simple', desc: 'Plain-language results' },
  { id: 'both', label: 'Both', desc: 'Simple + technical' },
  { id: 'nerd', label: 'Nerd', desc: 'Full technical detail' }
];

export default function NerdModeToggle({ mode, onChange }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card/60 backdrop-blur overflow-hidden">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          title={m.desc}
          aria-label={`Explanation mode: ${m.label}`}
          className={`inline-flex items-center justify-center min-h-11 px-2.5 text-xs font-mono transition-colors ${
            m.id === mode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
          }`}
        >
          {m.id === 'nerd' && <Brain className="w-3.5 h-3.5 mr-1" />}
          {m.label}
        </button>
      ))}
    </div>
  );
}