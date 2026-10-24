import React from "react";
import { Info } from "lucide-react";

// Legacy-account migration note. Shown on the login screen for 30 days from
// rollout (October 24, 2026), then disappears automatically.
const START = new Date("2026-10-24T00:00:00Z").getTime();
const END = new Date("2026-11-23T23:59:59Z").getTime();

export default function LegacyAccountNotice() {
  const now = Date.now();
  if (now < START || now > END) return null;
  return (
    <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-relaxed text-foreground">
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <p>
        Created an account before October 24th, 2026? Log in, and link one of our 3rd party auth providers for a more
        seamless login.
      </p>
    </div>
  );
}