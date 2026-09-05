import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

// "Don't check me" snooze — set from the website, honored by the Sus or Bus
// extension in the same browser. The value is published to the extension's
// content script through the 'sb-snooze-update' event; changes made in the
// extension come back the same way so both sides stay in sync.
const KEY = 'sb_snooze_until';
const HOURS = [0.5, 1, 2, 4, 8, 12, 24];

function remaining(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} hr ${m % 60} min`;
}

function publish(until) {
  window.dispatchEvent(new CustomEvent('sb-snooze-update', { detail: { until } }));
}

export default function SnoozeTimer() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let stored = 0;
    try {
      stored = Number(localStorage.getItem(KEY)) || 0;
    } catch {}
    if (stored && stored <= Date.now()) {
      try {
        localStorage.removeItem(KEY);
      } catch {}
      publish(0);
    } else if (stored) {
      publish(stored); // re-announce on load so a just-installed extension picks it up
    }
    setUntil(stored);

    const onSnoozeUpdate = (e) => setUntil(Math.max(0, Number((e.detail && e.detail.until) || 0)));
    window.addEventListener('sb-snooze-update', onSnoozeUpdate);
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.removeEventListener('sb-snooze-update', onSnoozeUpdate);
      clearInterval(iv);
    };
  }, []);

  const active = until > now;

  const start = (h) => {
    const v = Date.now() + h * 60 * 60 * 1000;
    try {
      localStorage.setItem(KEY, String(v));
    } catch {}
    setUntil(v);
    publish(v);
  };

  const stop = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setUntil(0);
    publish(0);
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/60 p-6">
      <p className="text-sm font-semibold text-foreground">Don&rsquo;t check me</p>
      {active ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Safety checks are paused in this browser — they resume in {remaining(until - now)}.
          </p>
          <Button
            variant="outline"
            onClick={stop}
            className="mt-4 bg-card/60 border-border text-foreground hover:bg-secondary"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Resume checks now
          </Button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Pause Sus or Bus safety checks for a while. The extension in this browser stops
            checking sites until the timer runs out.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {HOURS.map((h) => (
              <Button
                key={h}
                variant="outline"
                onClick={() => start(h)}
                className="h-10 px-3 font-mono bg-card/60 border-border text-foreground hover:bg-secondary"
              >
                {h === 0.5 ? '½' : h} hr{h === 0.5 || h === 1 ? '' : 's'}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}