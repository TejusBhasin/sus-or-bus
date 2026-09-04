import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Clock, Globe, Code2, FileText, Mail } from 'lucide-react';

const typeIcon = { url: Globe, html: Code2, code: Code2, email: Mail, text: FileText };

export default function RecentReports({ reports }) {
  if (!reports || reports.length === 0) return null;

  return (
    <div className="space-y-2">
      {reports.map((r) => {
        const isBus = r.verdict === 'bus';
        const Icon = typeIcon[r.input_type] || FileText;
        const label = r.url || r.input_content?.slice(0, 48) || 'Untitled';
        return (
          <Link
            key={r.id}
            to={`/report/${r.id}`}
            className="group flex items-center gap-3 rounded-lg border border-border bg-card/50 hover:bg-secondary/60 hover:border-muted-foreground/30 transition-colors p-3"
          >
            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', isBus ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-red-400')} />
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">{label}</span>
            <span className={cn('text-sm font-mono font-semibold', isBus ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
              {Math.round(r.score)}
            </span>
            <Clock className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}