import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import TopNav from '@/components/susbus/TopNav';
import Footer from '@/components/susbus/Footer';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [localCleared, setLocalCleared] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.auth.isAuthenticated()
      .then(async (authed) => {
        if (authed) {
          try { setUser(await base44.auth.me()); } catch {}
        }
      })
      .finally(() => setChecking(false));
  }, []);

  const handleDeleteAccount = async () => {
    try {
      await base44.auth.logout('/');
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    }
  };

  const handleClearLocalData = () => {
    try {
      localStorage.removeItem('susbus_lang');
      localStorage.removeItem('susbus_nerd_mode');
      localStorage.removeItem('theme');
    } catch {}
    setLocalCleared(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <div className="max-w-2xl mx-auto px-5 py-8 pb-safe">
        <h1 className="text-3xl font-black tracking-tighter">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and local data.</p>

        {checking ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Delete account */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Delete Account
              </div>

              {user ? (
                <>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    You're signed in as <span className="font-mono text-foreground">{user.email}</span>. Deleting your account:
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex gap-2"><span className="text-muted-foreground/50">•</span>Permanently removes every report saved to your account</li>
                    <li className="flex gap-2"><span className="text-muted-foreground/50">•</span>Signs you out immediately on this device</li>
                    <li className="flex gap-2"><span className="text-muted-foreground/50">•</span>Cannot be undone — there is no recovery</li>
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    To complete the permanent removal of your account records, contact support@susorbus.com after confirming.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="mt-5">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete my account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This signs you out immediately and starts the permanent removal of your account data. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Yes, delete it
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    You're using Sus or Bus anonymously — your checks aren't tied to an account, so there's nothing to delete here.
                  </p>

                  <div className="mt-5 pt-5 border-t border-red-500/15">
                    <p className="text-sm font-semibold text-foreground">Clear local data</p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      Removes your saved language and explanation-mode preferences from this device.
                    </p>
                    {localCleared ? (
                      <p className="mt-4 text-sm text-emerald-500 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Local data cleared.
                      </p>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="mt-4 bg-card/60 border-border text-foreground hover:bg-secondary">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear local data
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Clear local data?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This resets your saved language and explanation-mode preferences on this device. Your reports are not affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearLocalData}>Clear data</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}