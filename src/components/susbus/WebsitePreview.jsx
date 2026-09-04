import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function WebsitePreview({ url }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-slate-500">
          <Globe className="w-3.5 h-3.5" />
          {t('live_preview')}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-mono"
        >
          <ExternalLink className="w-3 h-3" />
          {t('open_site')}
        </a>
      </div>
      <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-white h-96">
        <iframe
          src={url}
          className="w-full h-full"
          title="website preview"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-600 font-mono">{t('iframe_blocked')}</p>
    </div>
  );
}