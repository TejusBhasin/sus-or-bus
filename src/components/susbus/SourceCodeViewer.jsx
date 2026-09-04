import React, { useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function SourceCodeViewer({ code }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-background/60">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          <Code2 className="w-3.5 h-3.5" />
          {t('source_code')}
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          {copied ? t('code_copied') : t('copy_code')}
        </button>
      </div>
      <pre className="p-4 text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all max-h-96 overflow-auto">
        {code}
      </pre>
    </div>
  );
}