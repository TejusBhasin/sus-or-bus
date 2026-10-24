import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { setAccountPassword } from '@/functions/setAccountPassword';

// Shown right after an account-key (salt-hash) sign-in: the user must set
// a real password before the old key stops being the way in.
export default function SetPasswordPrompt({ token, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (loading || done) return;
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await setAccountPassword({ token, newPassword: password });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setDone(true);
        setPassword('');
        setConfirm('');
        setTimeout(onDone, 1500);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Something went wrong — please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 max-w-md">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">
        <KeyRound className="w-3.5 h-3.5" />
        set a new password
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        You signed in with your account key. Choose a new password for this account — the key
        will stop working once the new password is saved.
      </p>
      {done ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          New password saved.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-mono text-muted-foreground">New password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="At least 8 characters"
              className="mt-1 bg-background/60 border-border font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground">Confirm new password</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Repeat it"
              className="mt-1 bg-background/60 border-border font-mono text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <Button onClick={submit} disabled={loading || !password || !confirm} className="w-full h-11 font-semibold">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              'Save new password'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}