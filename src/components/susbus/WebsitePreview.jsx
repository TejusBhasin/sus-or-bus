import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function WebsitePreview({ url }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          <Globe className="w-3.5 h-3.5" />
          {t('live_preview')}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-mono"
        >
          <ExternalLink className="w-3 h-3" />
          {t('open_site')}
        </a>
      </div>
      <div className="relative rounded-lg overflow-hidden border border-border bg-white h-96">
        <iframe
          src={url}
          className="w-full h-full"
          title="website preview"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground font-mono">{t('iframe_blocked')}</p>
    </div>
  );
}