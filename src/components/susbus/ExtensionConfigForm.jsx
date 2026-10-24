import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, CheckCircle2 } from 'lucide-react';
import { extensionConfig } from '@/functions/extensionConfig';
import { saveExtensionConfig } from '@/functions/saveExtensionConfig';

// Owner form for the live extension configuration. Saved values are fetched
// by the published extension as data within a day — no Chrome Web Store
// republish needed for these changes.
export default function ExtensionConfigForm() {
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState('');
  const [cacheDays, setCacheDays] = useState('7');
  const [maxEntries, setMaxEntries] = useState('500');
  const [announcement, setAnnouncement] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    extensionConfig({})
      .then((res) => {
        const c = res.data?.config || {};
        if (Array.isArray(c.trusted_domains) && c.trusted_domains.length) setDomains(c.trusted_domains.join('\n'));
        if (c.cache_days) setCacheDays(String(c.cache_days));
        if (c.max_cache_entries) setMaxEntries(String(c.max_cache_entries));
        setAnnouncement(c.announcement || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (saving) return;
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const res = await saveExtensionConfig({
        trusted_domains: domains.split('\n').map((s) => s.trim()).filter(Boolean),
        cache_days: Number(cacheDays),
        max_cache_entries: Number(maxEntries),
        announcement
      });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setSaved(true);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not save — try again.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">live settings</div>
      <h1 className="text-2xl font-black tracking-tighter">Extension configuration</h1>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
        Saved changes reach the published extension within a day — no Chrome Web Store update needed.
        The extension only ever fetches this data, never code, which keeps it compliant with store policy.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card/60 backdrop-blur p-6 space-y-5 max-w-md">
        <div>
          <label className="text-xs font-mono text-muted-foreground">Trusted domains (never scanned)</label>
          <Textarea
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder={'wikipedia.org\nopenai.com'}
            className="mt-1 bg-background/60 border-border font-mono text-xs min-h-[140px]"
          />
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            One domain per line, like wikipedia.org — subdomains are included. Leave empty to keep the
            extension's built-in list.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-muted-foreground">Scan cache (days)</label>
            <Input
              type="number"
              min="1"
              max="90"
              value={cacheDays}
              onChange={(e) => setCacheDays(e.target.value)}
              className="mt-1 bg-background/60 border-border font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground">Max cached sites</label>
            <Input
              type="number"
              min="50"
              max="5000"
              value={maxEntries}
              onChange={(e) => setMaxEntries(e.target.value)}
              className="mt-1 bg-background/60 border-border font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-muted-foreground">Popup announcement</label>
          <Textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="A short note shown at the top of the extension popup."
            className="mt-1 bg-background/60 border-border text-sm min-h-[80px]"
          />
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Shown to every extension user until they dismiss it. Leave empty for none.
          </p>
        </div>

        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
        {saved && (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Saved — the extension picks it up within a day.
          </p>
        )}

        <Button onClick={save} disabled={saving} className="w-full h-11 font-semibold">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save configuration
            </>
          )}
        </Button>
      </div>
    </>
  );
}