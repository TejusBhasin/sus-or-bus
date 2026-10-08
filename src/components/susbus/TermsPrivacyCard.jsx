import React from 'react';
import { Scale, CheckCircle2, AlertTriangle, XCircle, User, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

const sevStyles = {
  good: { Icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400', ring: 'border-emerald-500/30 bg-emerald-500/5' },
  warning: { Icon: AlertTriangle, color: 'text-amber-500 dark:text-amber-400', ring: 'border-amber-500/30 bg-amber-500/5' },
  bad: { Icon: XCircle, color: 'text-red-500 dark:text-red-400', ring: 'border-red-500/30 bg-red-500/5' }
};

// Shows what the site's own terms & conditions / privacy policy actually say —
// warnings or green lights, in simple and/or technical language.
export default function TermsPrivacyCard({ tp, mode = 'simple' }) {
  if (!tp) return null;
  const points = tp.points || [];
  const found = (tp.found || []).filter((f) => f === 'terms' || f === 'privacy');
  if (!tp.summary && !tp.simple_summary && points.length === 0) return null;

  const showSimple = mode === 'simple' || mode === 'both';
  const showTech = mode === 'nerd' || mode === 'both';

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          <Scale className="w-3.5 h-3.5" />
          terms & privacy check
        </div>
        {found.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
            <Scale className="w-3 h-3" />
            {found.join(' + ')}
          </span>
        )}
      </div>

      {showSimple && tp.simple_summary && (
        <p className={cn('text-sm leading-relaxed', showTech ? 'text-foreground' : 'text-muted-foreground')}>
          {showTech && (
            <span className="inline-flex items-center gap-1 mr-2 text-xs uppercase tracking-wider font-mono text-emerald-600 dark:text-emerald-400/70 align-middle">
              <User className="w-3 h-3 inline" />simple
            </span>
          )}
          {tp.simple_summary}
        </p>
      )}
      {showTech && tp.summary && tp.summary !== tp.simple_summary && (
        <p className={cn('text-sm leading-relaxed', showSimple ? 'mt-2 text-muted-foreground' : 'text-foreground')}>
          {showSimple && (
            <span className="inline-flex items-center gap-1 mr-2 text-xs uppercase tracking-wider font-mono text-indigo-600 dark:text-indigo-400/70 align-middle">
              <Brain className="w-3 h-3 inline" />nerd
            </span>
          )}
          {tp.summary}
        </p>
      )}

      {points.length > 0 && (
        <div className="mt-4 space-y-2">
          {points.map((p, i) => {
            const s = sevStyles[p.severity] || sevStyles.warning;
            return (
              <div key={i} className={cn('rounded-xl border p-3 flex gap-3', s.ring)}>
                <s.Icon className={cn('w-4 h-4 mt-0.5 shrink-0', s.color)} />
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-foreground text-sm">{p.title}</h4>
                  {(mode === 'simple' || mode === 'both') && p.simple_description && (
                    <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{p.simple_description}</p>
                  )}
                  {(mode === 'nerd' || mode === 'both') && p.description && p.description !== p.simple_description && (
                    <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}