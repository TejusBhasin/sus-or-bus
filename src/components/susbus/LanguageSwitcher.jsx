import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, languages } from '@/lib/i18n';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, changeLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = languages.find((l) => l.code === lang) || languages[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 backdrop-blur min-h-11 px-2.5 text-xs text-foreground hover:bg-secondary/70 transition-colors"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="font-mono max-w-[90px] truncate">{current.name}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 max-h-80 overflow-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-xl z-50 py-1">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => { changeLang(l.code); setOpen(false); }}
              className={`w-full text-left px-3 min-h-11 text-sm flex items-center justify-between hover:bg-secondary transition-colors ${
                l.code === lang ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {l.name}
              {l.code === lang && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}