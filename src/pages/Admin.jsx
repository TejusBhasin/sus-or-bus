import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '@/components/susbus/TopNav';
import Footer from '@/components/susbus/Footer';
import ExtensionConfigForm from '@/components/susbus/ExtensionConfigForm';
import { base44 } from '@/api/base44Client';
import { Loader2, ShieldCheck } from 'lucide-react';

// Owner-only page: edit the live extension configuration (the data the
// published extension fetches — no store republish needed for it).
export default function Admin() {
  const [state, setState] = useState('loading'); // loading | ready | denied

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => setState(u?.role === 'admin' ? 'ready' : 'denied'))
      .catch(() => setState('denied'));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col pt-safe">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[600px] rounded-full bg-indigo-600/10 blur-[130px]" />
      </div>

      <TopNav />

      <div className="relative max-w-2xl mx-auto px-5 py-8 flex-1 w-full">
        {state === 'loading' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {state === 'denied' && (
          <>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">
              <ShieldCheck className="w-4 h-4" />
              admin
            </div>
            <h1 className="text-2xl font-black tracking-tighter">Owner access only</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
              This page manages the live extension configuration.{' '}
              <Link to="/login" className="font-semibold text-foreground hover:underline">
                Sign in
              </Link>{' '}
              with the owner account to edit it.
            </p>
          </>
        )}
        {state === 'ready' && <ExtensionConfigForm />}
      </div>

      <div className="relative max-w-2xl mx-auto px-5 w-full pb-safe">
        <Footer />
      </div>
    </div>
  );
}