import React, { useRef } from 'react';
import { FileUp, FileText, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function DocumentUpload({ file, onSelect, onClear }) {
  const inputRef = useRef(null);
  const { t } = useLanguage();

  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) onSelect(f);
    e.target.value = '';
  };

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-4 min-h-[140px]">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-5 h-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {(file.size / 1024).toFixed(0)} KB · {t('doc_one_limit')}
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          aria-label="Remove document"
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.txt,.md,.doc,.docx,.rtf,.html,.csv,.json"
        onChange={pick}
      />
      <button
        onClick={() => inputRef.current.click()}
        className="w-full flex flex-col items-center justify-center gap-2 min-h-[140px] rounded-lg border border-dashed border-border bg-background/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
      >
        <FileUp className="w-6 h-6" />
        <span className="text-sm">{t('upload_doc')}</span>
        <span className="text-xs font-mono">{t('doc_types')}</span>
      </button>
    </div>
  );
}