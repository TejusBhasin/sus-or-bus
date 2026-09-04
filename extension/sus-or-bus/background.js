// Sus or Bus — background service worker
// Caches ratings per site origin, runs new scans automatically, and gates
// direct navigations (typed address, bookmark, pinned tab) behind a
// full-screen report shown by the content script.

const ENDPOINT = 'https://susbus.base44.app/functions/analyzeContent';
const ALT_ENDPOINT = 'https://susbus.base44.app/functions/findAlternatives';
const APP_ORIGIN = 'https://susbus.base44.app';
const FRESH_MS = 7 * 24 * 60 * 60 * 1000; // re-scan a site after 7 days
const MAX_ENTRIES = 500;
const ALLOW_MS = 30 * 1000; // a "continue" is honored for 30s so the next page passes the gate

const inflight = new Map(); // origin -> Promise<entry>
const allowed = new Map(); // origin -> expiresAt (navigations the user already approved)

function originOf(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

async function readCache() {
  const store = await chrome.storage.local.get('sb_cache');
  return store.sb_cache || {};
}

async function writeCache(cache) {
  const entries = Object.values(cache);
  if (entries.length > MAX_ENTRIES) {
    entries.sort((a, b) => (a.scannedAt || 0) - (b.scannedAt || 0));
    for (const e of entries.slice(0, entries.length - MAX_ENTRIES)) delete cache[e.origin];
  }
  await chrome.storage.local.set({ sb_cache: cache });
}

async function scanOrigin(origin) {
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputType: 'url', content: origin })
  });
  const data = await resp.json();
  if (!resp.ok || !data || data.error) throw new Error((data && data.error) || 'Scan failed');
  return {
    origin,
    verdict: data.verdict,
    score: data.score,
    summary: data.simple_summary || data.summary,
    points: (data.points || []).slice(0, 4).map((p) => ({
      title: p.title,
      severity: p.severity,
      note: p.simple_description || p.description
    })),
    reportId: data.reportId,
    scannedAt: Date.now()
  };
}

function getScan(origin) {
  if (!inflight.has(origin)) {
    const promise = scanOrigin(origin).finally(() => inflight.delete(origin));
    inflight.set(origin, promise);
  }
  return inflight.get(origin);
}

function notify(sender, message) {
  if (!sender.tab || sender.tab.id == null) return;
  chrome.tabs.sendMessage(sender.tab.id, message).catch(() => {});
}

// A navigation the user approved (corner popup "Continue", or opening a
// suggested alternative) is exempt from the full-screen gate for a moment.
function allowOrigin(origin) {
  allowed.set(origin, Date.now() + ALLOW_MS);
}

function consumeAllow(origin) {
  const exp = allowed.get(origin);
  if (exp && Date.now() < exp) {
    allowed.delete(origin);
    return true;
  }
  return false;
}

async function handleCheck(url, sender) {
  const origin = originOf(url);
  if (!origin) return { status: 'pass' }; // not a checkable website — let it through

  const cache = await readCache();
  const hit = cache[origin];
  if (hit && Date.now() - (hit.scannedAt || 0) < FRESH_MS) {
    return { status: 'hit', data: hit };
  }

  getScan(origin).then(
    async (entry) => {
      const c = await readCache();
      c[origin] = entry;
      await writeCache(c);
      notify(sender, { type: 'sb:update', url, status: 'hit', data: entry });
    },
    (err) => notify(sender, { type: 'sb:update', url, status: 'error', message: err.message })
  );

  return { status: 'scanning' };
}

// Called by the content script whenever a page loads directly (typed,
// bookmark, pinned tab, or a cross-site navigation we didn't intercept).
// Decides whether the page should be covered by a full-screen report first.
async function handleGate(msg, sender) {
  const origin = originOf(msg.url);
  if (!origin) return { status: 'pass' };
  if (origin === APP_ORIGIN) return { status: 'pass' }; // never gate our own app
  if (msg.navType === 'reload' || msg.navType === 'back_forward' || msg.navType === 'prerender') {
    return { status: 'pass' };
  }
  if (msg.refOrigin && msg.refOrigin === origin) return { status: 'pass' }; // same-site chain
  if (consumeAllow(origin)) return { status: 'pass' }; // already approved this hop

  const cache = await readCache();
  const hit = cache[origin];
  if (hit && Date.now() - (hit.scannedAt || 0) < FRESH_MS) {
    return { status: 'takeover', data: hit };
  }

  getScan(origin).then(
    async (entry) => {
      const c = await readCache();
      c[origin] = entry;
      await writeCache(c);
      notify(sender, { type: 'sb:update', url: msg.url, status: 'hit', data: entry });
    },
    (err) => notify(sender, { type: 'sb:update', url: msg.url, status: 'error', message: err.message })
  );

  return { status: 'takeover', pending: true };
}

async function handleAlternatives(url) {
  const resp = await fetch(ALT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || data.error) throw new Error((data && data.error) || 'Lookup failed');
  return { alternatives: data.alternatives || [] };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'sb:check') {
    handleCheck(msg.url, sender)
      .then(sendResponse)
      .catch(() => sendResponse({ status: 'error', message: 'Check failed' }));
    return true; // async response
  }
  if (msg.type === 'sb:gate') {
    handleGate(msg, sender)
      .then(sendResponse)
      .catch(() => sendResponse({ status: 'pass' }));
    return true;
  }
  if (msg.type === 'sb:allow') {
    const origin = originOf(msg.url);
    if (origin) allowOrigin(origin);
    sendResponse({ status: 'ok' });
    return;
  }
  if (msg.type === 'sb:alternatives') {
    handleAlternatives(msg.url)
      .then(sendResponse)
      .catch((err) => sendResponse({ alternatives: [], error: err.message }));
    return true;
  }
});