import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Lock, Eye, Code2, Mail, Globe, BadgeCheck } from 'lucide-react';

const severityStyles = {
  good: { ring: 'border-emerald-500/30 bg-emerald-500/5', icon: CheckCircle2, iconColor: 'text-emerald-400', label: 'good' },
  warning: { ring: 'border-amber-500/30 bg-amber-500/5', icon: AlertTriangle, iconColor: 'text-amber-400', label: 'warning' },
  bad: { ring: 'border-red-500/30 bg-red-500/5', icon: XCircle, iconColor: 'text-red-400', label: 'bad' }
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

export default function PointCard({ point }) {
  const s = severityStyles[point.severity] || severityStyles.warning;
  const SevIcon = s.icon;
  const CatIcon = categoryIcons[point.category] || ShieldCheck;

  return (
    <div className={cn('rounded-xl border p-4 flex gap-3', s.ring)}>
      <div className="mt-0.5 shrink-0">
        <SevIcon className={cn('w-5 h-5', s.iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-slate-100 text-sm">{point.title}</h4>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-slate-400 border border-slate-700 rounded px-1.5 py-0.5">
            <CatIcon className="w-3 h-3" />
            {point.category}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400 leading-relaxed">{point.description}</p>
      </div>
    </div>
  );
}