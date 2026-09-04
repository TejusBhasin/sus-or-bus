import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import TopNav from '@/components/susbus/TopNav';
import { useLanguage } from '@/lib/i18n';

export default function ReportSkeleton() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <TopNav />
      <div className="relative max-w-2xl mx-auto px-5 py-8 flex-1 w-full">
        <div className="flex items-center justify-between gap-3 mb-8">
          <Skeleton className="h-5 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-24 rounded-lg" />
            <Skeleton className="h-11 w-32 rounded-lg" />
            <Skeleton className="h-11 w-11 rounded-lg" />
            <Skeleton className="h-11 w-11 rounded-lg" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Skeleton className="w-28 h-28 rounded-full shrink-0" />
            <div className="flex-1 w-full text-center sm:text-left space-y-3">
              <Skeleton className="h-8 w-24 mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-2/3 mx-auto sm:mx-0" />
              <div className="flex gap-2 justify-center sm:justify-start">
                <Skeleton className="h-6 w-24 rounded" />
                <Skeleton className="h-6 w-32 rounded" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <Skeleton className="h-[74px] rounded-xl" />
          <Skeleton className="h-[74px] rounded-xl" />
          <Skeleton className="h-[74px] rounded-xl" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('analyzing')}
          </div>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-5 w-full pb-safe">
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}