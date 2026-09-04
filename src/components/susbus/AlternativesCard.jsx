import React, { useState } from 'react';
import { Loader2, ExternalLink, ShieldCheck, Search } from 'lucide-react';
import { findAlternatives } from '@/functions/findAlternatives';

export default function AlternativesCard({ url }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [alts, setAlts] = useState([]);

  const lookup = async () => {
    setState('loading');
    try {
      const res = await findAlternatives({ url });
      if (res.data?.error) throw new Error(res.data.error);
      setAlts(res.data?.alternatives || []);
      setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
        <ShieldCheck className="w-3.5 h-3.5" />
        safer alternatives
      </div>

      {state === 'idle' && (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This site was rated SUS. Let Sus or Bus find well-known, safe websites that do the same job.
          </p>
          <button
            onClick={lookup}
            className="mt-4 inline-flex items-center gap-2 min-h-11 px-5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors"
          >
            <Search className="w-4 h-4" />
            Find alternative websites
          </button>
        </>
      )}

      {state === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Looking for safer alternatives…
        </div>
      )}

      {state === 'error' && (
        <>
          <p className="text-sm text-muted-foreground">Couldn't look up alternatives right now.</p>
          <button onClick={lookup} className="mt-3 text-sm text-indigo-500 dark:text-indigo-400 hover:underline">
            Try again
          </button>
        </>
      )}

      {state === 'done' &&
        (alts.length ? (
          <div className="space-y-2.5">
            {alts.map((a, i) => (
              <a
                key={i}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-border bg-card/60 p-4 hover:bg-card transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{a.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </div>
                <span className="block text-xs font-mono text-muted-foreground break-all">{a.url}</span>
                {a.reason && <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{a.reason}</p>}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No safer alternatives were found for this site.</p>
        ))}
    </div>
  );
}