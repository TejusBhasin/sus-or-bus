import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, languages } from '@/lib/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, changeLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const ref = useRef(null);
  const current = languages.find((l) => l.code === lang) || languages[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const triggerClasses = 'inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 backdrop-blur min-h-11 px-2.5 text-xs text-foreground hover:bg-secondary/70 transition-colors';

  const renderTriggerContent = () => (
    <>
      <Globe className="w-3.5 h-3.5" />
      <span className="font-mono max-w-[90px] truncate">{current.name}</span>
      <ChevronDown className="w-3 h-3 text-muted-foreground" />
    </>
  );

  const renderList = (onPick) =>
    languages.map((l) => (
      <button
        key={l.code}
        onClick={() => { changeLang(l.code); onPick(); }}
        className={`w-full text-left px-3 min-h-11 text-sm flex items-center justify-between hover:bg-secondary transition-colors ${
          l.code === lang ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {l.name}
        {l.code === lang && <Check className="w-3.5 h-3.5 text-emerald-500" />}
      </button>
    ));

  // Mobile: native bottom sheet
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button className={triggerClasses}>{renderTriggerContent()}</button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Language
            </DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[55vh] overflow-auto px-2 pb-safe-nav">
            {renderList(() => setOpen(false))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: dropdown
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button onClick={() => setOpen(!open)} className={triggerClasses}>
        {renderTriggerContent()}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 max-h-80 overflow-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-xl z-50 py-1">
          {renderList(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}