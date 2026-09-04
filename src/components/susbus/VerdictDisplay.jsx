import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

export default function VerdictDisplay({ verdict }) {
  const { t } = useLanguage();
  const isBus = verdict === 'bus';
  return (
    <div className="flex flex-col items-center text-center select-none">
      <div
        className={cn(
          'text-7xl sm:text-8xl font-black tracking-tighter leading-none',
          isBus ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
        )}
        style={{ textShadow: isBus ? '0 0 40px rgba(16,185,129,0.35)' : '0 0 40px rgba(239,68,68,0.35)' }}
      >
        {isBus ? 'BUS' : 'SUS'}
      </div>
      <p className="mt-3 text-sm text-muted-foreground font-mono">
        {isBus ? t('v_bus') : t('v_sus')}
      </p>
      <p
        className={cn(
          'mt-2 text-sm font-semibold font-mono',
          isBus ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        )}
      >
        {t('final_verdict')}: {isBus ? t('verdict_valid') : t('verdict_not_valid')}
      </p>
    </div>
  );
}