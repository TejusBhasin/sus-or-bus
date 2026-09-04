// Sus or Bus — background service worker
// Caches ratings per site origin and runs new scans automatically.

const ENDPOINT = 'https://susbus.base44.app/functions/analyzeContent';
const FRESH_MS = 7 * 24 * 60 * 60 * 1000; // re-scan a site after 7 days
const MAX_ENTRIES = 500;

const inflight = new Map(); // origin -> Promise<entry>

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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'sb:check') {
    handleCheck(msg.url, sender)
      .then(sendResponse)
      .catch(() => sendResponse({ status: 'error', message: 'Check failed' }));
    return true; // async response
  }
});