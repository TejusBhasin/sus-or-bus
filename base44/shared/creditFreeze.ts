// Temporary integration-credit freeze: block all AI (integration) calls until
// this instant. Cached scan results still serve — only credit-spending calls are blocked.
// Remove this module (and its usages) after the freeze lifts.
const FREEZE_UNTIL = new Date('2026-10-16T04:01:00Z'); // Oct 16, 2026, 12:01 AM America/New_York (EDT)

export const creditFreezeActive = (): boolean => Date.now() < FREEZE_UNTIL.getTime();

export const creditFreezeResponse = (): Response =>
  Response.json(
    {
      error:
        'Scans are paused until October 16, 2026 — we are saving up for a big event. Check back after that date!'
    },
    { status: 503 }
  );