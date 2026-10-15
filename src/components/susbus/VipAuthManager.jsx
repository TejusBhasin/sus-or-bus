import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, ShieldCheck, X } from 'lucide-react';

function normalizeOrigin(value) {
  let v = (value || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try {
    const u = new URL(v);
    return /^https?:$/.test(u.protocol) ? u.origin : '';
  } catch {
    return '';
  }
}

export default function VipAuthManager() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sites, setSites] = useState(null);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44
      .auth.me()
      .then((user) => {
        if (user && user.role === 'admin') {
          setIsAdmin(true);
          return base44.entities.VIPAuth.filter({}, { sort: '-created_date', limit: 100 });
        }
        return null;
      })
      .then((page) => {
        if (page) setSites(page.items);
      })
      .catch(() => {});
  }, []);

  // Only the app owner (admin) ever sees this panel
  if (!isAdmin) return null;

  const add = async () => {
    const origin = normalizeOrigin(input);
    if (!origin) {
      setError('Enter a valid website address, like example.com');
      return;
    }
    if ((sites || []).some((s) => s.url === origin)) {
      setError('That site is already on the list');
      return;
    }
    setAdding(true);
    setError('');
    try {
      const record = await base44.entities.VIPAuth.create({ url: origin });
      setSites((prev) => [record, ...(prev || [])]);
      setInput('');
    } catch {
      setError('Could not add the site right now');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      await base44.entities.VIPAuth.delete(id);
      setSites((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        VIPAUTH verified sites
      </div>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
        Websites on this list always come back BUS with a 96 score and all-good findings — no scan or
        AI credits needed. Enter a website to verify it.
      </p>
      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="example.com"
          className="bg-card/60"
        />
        <Button onClick={add} disabled={adding}>
          {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Verify
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {sites === null ? (
        <div className="mt-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : sites.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">No verified sites yet.</p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {sites.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <span className="text-sm font-mono truncate">{s.url}</span>
              <button
                onClick={() => remove(s.id)}
                aria-label={'Remove ' + s.url}
                className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}