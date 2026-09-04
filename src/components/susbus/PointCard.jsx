import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Lock, Eye, Code2, Mail, Globe, BadgeCheck, User, Brain } from 'lucide-react';

const severityStyles = {
  good: { ring: 'border-emerald-500/30 bg-emerald-500/5', icon: CheckCircle2, iconColor: 'text-emerald-500 dark:text-emerald-400' },
  warning: { ring: 'border-amber-500/30 bg-amber-500/5', icon: AlertTriangle, iconColor: 'text-amber-500 dark:text-amber-400' },
  bad: { ring: 'border-red-500/30 bg-red-500/5', icon: XCircle, iconColor: 'text-red-500 dark:text-red-400' }
};

const categoryIcons = {
  privacy: Eye,
  security: Lock,
  trackers: Eye,
  content: Globe,
  code: Code2,
  email: Mail,
  reputation: BadgeCheck
};

export default function PointCard({ point, mode = 'nerd' }) {
  const s = severityStyles[point.severity] || severityStyles.warning;
  const SevIcon = s.icon;
  const CatIcon = categoryIcons[point.category] || ShieldCheck;

  const tech = point.description;
  const simple = point.simple_description || point.description;

  const showSimple = mode === 'simple' || mode === 'both';
  const showTech = mode === 'nerd' || mode === 'both';

  return (
    <div className={cn('rounded-xl border p-4 flex gap-3', s.ring)}>
      <div className="mt-0.5 shrink-0">
        <SevIcon className={cn('w-5 h-5', s.iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-foreground text-sm">{point.title}</h4>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
            <CatIcon className="w-3 h-3" />
            {point.category}
          </span>
        </div>

        {showSimple && simple && (
          <div className={cn('mt-1 text-sm leading-relaxed', showTech ? 'text-foreground' : 'text-muted-foreground')}>
            {showTech && (
              <span className="inline-flex items-center gap-1 mr-2 text-[10px] uppercase tracking-wider font-mono text-emerald-600 dark:text-emerald-400/70 align-middle">
                <User className="w-3 h-3 inline" />simple
              </span>
            )}
            {simple}
          </div>
        )}

        {showTech && tech && tech !== simple && (
          <div className={cn('mt-1 text-sm leading-relaxed', showSimple ? 'text-muted-foreground' : 'text-muted-foreground')}>
            {showSimple && (
              <span className="inline-flex items-center gap-1 mr-2 text-[10px] uppercase tracking-wider font-mono text-indigo-600 dark:text-indigo-400/70 align-middle">
                <Brain className="w-3 h-3 inline" />nerd
              </span>
            )}
            {tech}
          </div>
        )}

        {!showTech && tech === simple && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{simple}</p>
        )}
      </div>
    </div>
  );
}