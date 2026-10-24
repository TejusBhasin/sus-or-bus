import React from 'react';
import { KeyRound } from 'lucide-react';

// Shown exactly once after account creation: the recovery code that signs the
// user back in if the password is ever lost. Only its hash is stored.
export default function RecoveryCodeNotice({ code }) {
  if (!code) return null;
  return (
    <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 max-w-md">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400">
        <KeyRound className="w-3.5 h-3.5" />
        Save your recovery code
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed">
        If you ever lose your password, this code signs you back in and lets you set a new one. It is shown only this
        once — store it somewhere safe.
      </p>
      <code className="block select-all break-all rounded-lg border border-border bg-background/70 px-3 py-2 font-mono text-sm font-bold tracking-wider">
        {code}
      </code>
    </div>
  );
}