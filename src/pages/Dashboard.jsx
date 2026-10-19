import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '@/components/susbus/TopNav';
import Footer from '@/components/susbus/Footer';
import NerdModeToggle from '@/components/susbus/NerdModeToggle';
import ThreatLandscape from '@/components/dashboard/ThreatLandscape';
import { loadScanStats } from '@/lib/scanStats';
import { buildTakeaway } from '@/lib/takeaway';
import { getSavedAccount } from '@/pages/Account';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, ShieldAlert } from 'lucide-react';

export default function Dashboard() {
  const [session] = useState(() => getSavedAccount());
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(() => localStorage.getItem('susbus_nerd_mode') || 'simple');
  const { theme } = useTheme();

  useEffect(() => {
    localStorage.setItem('susbus_nerd_mode', mode);
  }, [mode]);

  useEffect(() => {
    if (!session?.token) return;
    loadScanStats()
      .then(setStats)
      .catch(() => setError('Your scan history could not be loaded right now — please try again.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const colors =
    theme === 'dark'
      ? { bus: '#34d399', sus: '#f87171', axis: '#94a3b8', grid: '#1e293b', avg: '#60a5fa' }
      : { bus: '#059669', sus: '#dc2626', axis: '#64748b', grid: '#e2e8f0', avg: '#2563eb' };

  return (
    <div className="min-h-screen bg-background text-foreground pt-safe">
      <div className="print:hidden">
        <TopNav />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 pb-safe">
        {!session?.token ? (
          <div className="mt-16 max-w-md mx-auto rounded-2xl border border-border bg-card p-6 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-amber-500" />
            <h1 className="mt-4 text-xl font-bold">Sign in to view your threat landscape</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              The dashboard is for accounts only. Checks themselves never need an account — your
              history charts do.
            </p>
            <Button asChild className="mt-5">
              <Link to="/account">Go to account</Link>
            </Button>
          </div>
        ) : loading ? (
          <div className="mt-24 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="mt-16 text-center text-sm text-red-500 dark:text-red-400">{error}</p>
        ) : stats && stats.totals.total === 0 ? (
          <div className="mt-16 max-w-md mx-auto rounded-2xl border border-border bg-card p-6 text-center">
            <h1 className="text-xl font-bold">No scans recorded yet</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Run a check from the home page first — your landscape fills in as you scan.
            </p>
          </div>
        ) : stats ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
              <h1 className="text-3xl font-black tracking-tighter">Threat landscape</h1>
              <div className="flex items-center gap-3">
                <NerdModeToggle mode={mode} onChange={setMode} />
                <Button variant="outline" onClick={() => window.print()} className="bg-card/60">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
            <div className="mt-5">
              <ThreatLandscape stats={stats} colors={colors} mode={mode} takeaway={buildTakeaway(stats)} />
            </div>
          </>
        ) : null}

        <div className="print:hidden">
          <Footer />
        </div>
      </div>
    </div>
  );
}