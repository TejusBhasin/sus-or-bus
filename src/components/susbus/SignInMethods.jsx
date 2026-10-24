import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';
import { MicrosoftIcon, AppleIcon } from '@/components/ProviderIcons';
import SetPasswordPrompt from '@/components/susbus/SetPasswordPrompt';

const PROVIDERS = [
  { id: 'google', label: 'Google', Icon: GoogleIcon },
  { id: 'microsoft', label: 'Microsoft', Icon: MicrosoftIcon },
  { id: 'apple', label: 'Apple', Icon: AppleIcon }
];

function ConnectedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Connected
    </span>
  );
}

function MethodRow({ icon, label, connected, action }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5">
      <div className="flex items-center gap-2.5 text-sm font-medium">
        {icon}
        {label}
      </div>
      {connected ? (
        <ConnectedBadge />
      ) : (
        <Button variant="outline" size="sm" onClick={action} className="h-8 rounded-md px-3 text-xs">
          {action}
        </Button>
      )}
    </div>
  );
}

// Connected sign-in methods for the signed-in account: connecting a provider
// means signing in with it opens this same account, and provider-created
// accounts can add a password so the browser extension can sign in too.
export default function SignInMethods({ token, hasPassword, identities, busy, error, onConnect, onPasswordSet }) {
  const [showSetPassword, setShowSetPassword] = useState(false);
  const isConnected = (id) => (identities || []).some((i) => i && i.provider === id);

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 max-w-md">
      <div className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">ways to sign in</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Connect any of these and signing in with it opens this same account.
      </p>

      <div className="mt-4 space-y-2">
        <MethodRow
          icon={<Mail className="w-4 h-4" />}
          label="Email & password"
          connected={hasPassword}
          action={() => setShowSetPassword(true)}
        />
        {PROVIDERS.map(({ id, label, Icon }) => (
          <MethodRow
            key={id}
            icon={<Icon className="w-4 h-4" />}
            label={label}
            connected={isConnected(id)}
            action={() => onConnect(id)}
          />
        ))}
      </div>

      {busy && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Connecting…
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>}

      {showSetPassword && !hasPassword && (
        <SetPasswordPrompt
          token={token}
          onDone={() => {
            setShowSetPassword(false);
            onPasswordSet();
          }}
        />
      )}
    </div>
  );
}