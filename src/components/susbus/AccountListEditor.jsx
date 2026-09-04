import React, { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AccountListEditor({ title, hint, items, onAdd, onRemove, saving }) {
  const [value, setValue] = useState('');

  const submit = () => {
    if (!value.trim()) return;
    onAdd(value);
    setValue('');
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="font-semibold">{title}</h3>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{hint}</p>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="example.com"
          className="bg-background/60 border-border font-mono text-sm"
        />
        <Button onClick={submit} size="icon" aria-label="Add" className="min-h-11 min-w-11 shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <ul className="mt-4 space-y-2">
        {items.length === 0 && (
          <li className="text-xs text-muted-foreground font-mono">Nothing here yet.</li>
        )}
        {items.map((origin) => (
          <li
            key={origin}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2"
          >
            <span className="font-mono text-xs break-all select-text">{origin}</span>
            <button
              onClick={() => onRemove(origin)}
              aria-label={`Remove ${origin}`}
              className="text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}