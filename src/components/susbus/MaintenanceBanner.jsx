import React from 'react';
import { Wrench } from 'lucide-react';

export default function MaintenanceBanner() {
  return (
    <div className="mb-6 flex items-center justify-center sm:justify-end">
      <div className="inline-flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        <Wrench className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <span className="font-semibold">Website under maintenance.</span>{' '}
          May not function until October 9th, 2026, at 12:01 AM.
        </span>
      </div>
    </div>
  );
}