import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '@/components/susbus/TopNav';
import Footer from '@/components/susbus/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UserPlus, LogIn, LogOut, Mail, ShieldCheck, KeyRound } from 'lucide-react';
import { registerAccount } from '@/functions/registerAccount';
import { loginAccount } from '@/functions/loginAccount';
import { accountLists } from '@/functions/accountLists';
import { recoveryCode as recoveryCodeFn } from '@/functions/recoveryCode';
import { platformSignIn } from '@/functions/platformSignIn';
import { base44 } from '@/api/base44Client';
import GoogleIcon from '@/components/GoogleIcon';
import { MicrosoftIcon, AppleIcon } from '@/components/ProviderIcons';
import AccountListEditor from '@/components/susbus/AccountListEditor';
import SetPasswordPrompt from '@/components/susbus/SetPasswordPrompt';
import RecoveryCodeNotice from '@/components/susbus/RecoveryCodeNotice';

const STORAGE_KEY = 'sb_account';

export function getSavedAccount() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function normalizeOrigin(value) {
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

export default function Account() {
  const [session, setSession] = useState(() => getSavedAccount());
  const [mode, setMode] = useState('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lists, setLists] = useState({ whitelist: [], blacklist: [] });
  const [saving, setSaving] = useState(false);
  const [recoveryCodeValue, setRecoveryCodeValue] = useState('');
  const [code, setCode] = useState('');
  const [providerBusy, setProviderBusy] = useState(false);

  const signOut = () => {
    const wasProvider = session?.via === 'provider';
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setLists({ whitelist: [], blacklist: [] });
    // Provider sessions outlive this page — end them too, or the account
    // would silently sign itself back in on the next visit.
    if (wasProvider) base44.auth.logout(window.location.pathname).catch(() => {});
  };

  const handleProvider = (provider) => {
    base44.auth.loginWithProvider(provider, '/account');
  };

  useEffect(() => {
    if (!session?.token) return;
    accountLists({ token: session.token, source: 'web' })
      .then((res) => {
        if (res.data?.error) {
          if (String(res.data.error).toLowerCase().includes('sign in')) signOut();
          return;
        }
        setLists({ whitelist: res.data.whitelist || [], blacklist: res.data.blacklist || [] });
      })
      .catch(() => {});
  }, [session]); // eslint-disable-line

  // Provider sign-in (Google / Microsoft / Apple): a ?provider= link from the
  // extension starts the OAuth flow; landing back here links the platform
  // session to the account system (creating the account if it's new).
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get('provider');
    if (provider) window.history.replaceState({}, '', window.location.pathname);
    const saved = getSavedAccount();
    if (['google', 'microsoft', 'apple'].includes(provider) && !saved) {
      base44.auth.loginWithProvider(provider, '/account');
      return;
    }
    if (saved) return;
    let cancelled = false;
    base44.auth
      .isAuthenticated()
      .then((authed) => (authed ? base44.auth.me() : null))
      .then(async (user) => {
        if (cancelled || !user?.email) return;
        setProviderBusy(true);
        try {
          const res = await platformSignIn();
          const d = res.data || {};
          if (!d.error && d.token) {
            const linked = { token: d.token, email: d.email, mustSetPassword: !!d.mustSetPassword, via: 'provider' };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(linked));
            setLists({ whitelist: d.whitelist || [], blacklist: d.blacklist || [] });
            setSession(linked);
            setRecoveryCodeValue(d.recoveryCode || '');
          }
        } catch {
          // linking failed — the email/password form stays available
        }
        if (!cancelled) setProviderBusy(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line

  const handleAuth = async () => {
    if (loading) return;
    setError('');
    if (mode === 'recover') {
      if (password.length < 8) {
        setError('New password must be at least 8 characters.');
        return;
      }
      setLoading(true);
      try {
        const res = await recoveryCodeFn({ action: 'redeem', email, code, newPassword: password, source: 'web' });
        if (res.data?.error) {
          setError(res.data.error);
        } else if (res.data?.token) {
          const saved = { token: res.data.token, email: res.data.email, mustSetPassword: false };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
          setLists({ whitelist: res.data.whitelist || [], blacklist: res.data.blacklist || [] });
          setSession(saved);
          setEmail('');
          setPassword('');
          setCode('');
        } else {
          setError('Something went wrong — please try again.');
        }
      } catch (e) {
        setError(e?.response?.data?.error || 'Something went wrong — please try again.');
      }
      setLoading(false);
      return;
    }
    if (mode === 'create' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res =
        mode === 'create'
          ? await registerAccount({ email, password, source: 'web' })
          : await loginAccount({ email, password, source: 'web' });
      if (res.data?.error) {
        setError(res.data.error);
      } else if (res.data?.token) {
        const saved = { token: res.data.token, email: res.data.email, mustSetPassword: !!res.data.mustSetPassword };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        setLists({ whitelist: res.data.whitelist || [], blacklist: res.data.blacklist || [] });
        setSession(saved);
        setRecoveryCodeValue(res.data.recoveryCode || '');
        setEmail('');
        setPassword('');
        setConfirm('');
      } else {
        setError('Something went wrong — please try again.');
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Something went wrong — please try again.');
    }
    setLoading(false);
  };

  // Send explicit add/remove deltas instead of full lists, so saving from the
  // website can never overwrite items the extension added elsewhere.
  const applyDelta = async (delta, optimistic) => {
    if (optimistic) setLists(optimistic);
    setSaving(true);
    try {
      const res = await accountLists({ token: session.token, source: 'web', ...delta });
      if (res.data && !res.data.error) {
        setLists({ whitelist: res.data.whitelist || [], blacklist: res.data.blacklist || [] });
      }
    } catch {
      // keep the optimistic update — the server stays authoritative for sync
    }
    setSaving(false);
  };

  const addToList = (kind, value) => {
    const origin = normalizeOrigin(value);
    if (!origin || lists[kind].includes(origin)) return;
    applyDelta({ add: { [kind]: [origin] } }, { ...lists, [kind]: [...lists[kind], origin] });
  };

  const removeFromList = (kind, origin) => {
    applyDelta({ remove: { [kind]: [origin] } }, { ...lists, [kind]: lists[kind].filter((o) => o !== origin) });
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col pt-safe">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[600px] rounded-full bg-indigo-600/10 blur-[130px]" />
      </div>

      <TopNav />

      <div className="relative max-w-2xl mx-auto px-5 py-8 flex-1 w-full">
        {!session ? (
          <>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">
              <ShieldCheck className="w-4 h-4" />
              account
            </div>
            <h1 className="text-3xl font-black tracking-tighter">
              {mode === 'create' ? 'Create your account' : 'Sign in'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
              Optional — checking sites never needs an account. An account syncs your safe-site and
              never-visit lists between the browser extension and this site.
            </p>

            <div className="mt-8 rounded-2xl border border-border bg-card/60 backdrop-blur p-6 space-y-4 max-w-md">
              <div className="flex gap-1 p-1 bg-background/60 rounded-lg border border-border w-fit">
                {[
                  { id: 'create', label: 'Create account', icon: UserPlus },
                  { id: 'signin', label: 'Sign in', icon: LogIn },
                  { id: 'recover', label: 'Recovery', icon: KeyRound }
                ].map((tb) => {
                  const Icon = tb.icon;
                  return (
                    <button
                      key={tb.id}
                      onClick={() => { setMode(tb.id); setError(''); }}
                      className={`inline-flex min-h-10 items-center gap-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                        mode === tb.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tb.label}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 bg-background/60 border-border font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground">{mode === 'recover' ? 'New password' : 'Password'}</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  placeholder="At least 8 characters"
                  className="mt-1 bg-background/60 border-border font-mono text-sm"
                />
              </div>
              {mode === 'signin' && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Forgot your password? Use the <span className="font-semibold text-foreground">Recovery</span> tab
                  with your recovery code — it signs you back in and lets you set a new password. Lost the code too?
                  Contact support for a new one.
                </p>
              )}
              {mode === 'recover' && (
                <>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground">Recovery code</label>
                    <Input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                      placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                      className="mt-1 bg-background/60 border-border font-mono text-sm uppercase tracking-wider"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Enter the recovery code you saved when you created your account (or one support gave you), and
                    choose a new password.
                  </p>
                </>
              )}
              {mode === 'create' && (
                <div>
                  <label className="text-xs font-mono text-muted-foreground">Confirm password</label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                    className="mt-1 bg-background/60 border-border font-mono text-sm"
                  />
                </div>
              )}

              {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

              <Button
                onClick={handleAuth}
                disabled={loading || !email.trim() || !password || (mode === 'recover' && !code.trim())}
                className="w-full h-12 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === 'create' ? 'Creating…' : mode === 'recover' ? 'Recovering…' : 'Signing in…'}
                  </>
                ) : (
                  <>
                    {mode === 'create' ? <UserPlus className="w-4 h-4 mr-2" /> : mode === 'recover' ? <KeyRound className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                    {mode === 'create' ? 'Create account' : mode === 'recover' ? 'Recover account' : 'Sign in'}
                  </>
                )}
              </Button>

              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">or continue with</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleProvider('google')}
                  disabled={providerBusy}
                  aria-label="Continue with Google"
                  className="h-11 bg-background/60 border-border text-foreground hover:bg-secondary"
                >
                  {providerBusy ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : <GoogleIcon className="w-5 h-5 mx-auto" />}
                  <span className="text-xs">Google</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleProvider('microsoft')}
                  disabled={providerBusy}
                  aria-label="Continue with Microsoft"
                  className="h-11 bg-background/60 border-border text-foreground hover:bg-secondary"
                >
                  {providerBusy ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : <MicrosoftIcon className="w-5 h-5 mx-auto" />}
                  <span className="text-xs">Microsoft</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleProvider('apple')}
                  disabled={providerBusy}
                  aria-label="Continue with Apple"
                  className="h-11 bg-background/60 border-border text-foreground hover:bg-secondary"
                >
                  {providerBusy ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : <AppleIcon className="w-5 h-5 mx-auto" />}
                  <span className="text-xs">Apple</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A secure provider window opens. New accounts then choose a password here, so the browser extension can
                sign in with it too.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  <Mail className="w-3.5 h-3.5" />
                  signed in
                </div>
                <h1 className="text-2xl font-black tracking-tighter break-all">{session.email}</h1>
              </div>
              <Button variant="outline" size="sm" onClick={signOut} className="bg-card/60 border-border text-foreground hover:bg-secondary">
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign out
              </Button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-lg">
              These lists sync to the browser extension: whitelisted sites are never checked, and
              blacklisted sites warn you never to visit them.
            </p>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Open your threat-landscape dashboard →
            </Link>

            {session.mustSetPassword && (
              <SetPasswordPrompt
                token={session.token}
                onDone={() => {
                  const saved = { ...session, mustSetPassword: false };
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
                  setSession(saved);
                }}
              />
            )}

            {recoveryCodeValue && (
              <div className="mt-6 max-w-md">
                <RecoveryCodeNotice code={recoveryCodeValue} />
                <button
                  onClick={() => setRecoveryCodeValue('')}
                  className="mt-3 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  I've saved it — dismiss
                </button>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <AccountListEditor
                title="Whitelist — never check these sites"
                hint="Sus or Bus stays completely out of the way on these sites."
                items={lists.whitelist}
                onAdd={(v) => addToList('whitelist', v)}
                onRemove={(o) => removeFromList('whitelist', o)}
                saving={saving}
              />
              <AccountListEditor
                title="Blacklist — never visit these sites"
                hint="A full-screen warning stops you before opening these sites, on the web and in the extension."
                items={lists.blacklist}
                onAdd={(v) => addToList('blacklist', v)}
                onRemove={(o) => removeFromList('blacklist', o)}
                saving={saving}
              />
            </div>
          </>
        )}
      </div>

      <div className="relative max-w-2xl mx-auto px-5 w-full pb-safe">
        <Footer />
      </div>
    </div>
  );
}