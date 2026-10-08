// Sus or Bus — background service worker
// Caches ratings per site origin, runs new scans automatically, and gates
// direct navigations (typed address, bookmark, pinned tab) behind a
// full-screen report shown by the content script.

const ENDPOINT = 'https://susbus.base44.app/functions/analyzeContent';
const ALT_ENDPOINT = 'https://susbus.base44.app/functions/findAlternatives';
const REGISTER_ENDPOINT = 'https://susbus.base44.app/functions/registerAccount';
const LOGIN_ENDPOINT = 'https://susbus.base44.app/functions/loginAccount';
const LISTS_ENDPOINT = 'https://susbus.base44.app/functions/accountLists';
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

// Google Search pages are never checked.
function isGoogleSearch(url) {
  try {
    const u = new URL(url);
    return u.host === 'www.google.com' && u.pathname.startsWith('/search');
  } catch {
    return false;
  }
}

// Well-known, reputable domains that skip scanning entirely — 0 credits and
// no popups. Most browsing happens on sites like these.
const TRUSTED_DOMAINS = new Set([
  'google.com', 'youtube.com', 'gmail.com', 'googleapis.com', 'gstatic.com',
  'facebook.com', 'instagram.com', 'whatsapp.com', 'messenger.com',
  'wikipedia.org', 'wikimedia.org', 'reddit.com', 'x.com', 'twitter.com',
  'linkedin.com', 'tiktok.com', 'pinterest.com', 'snapchat.com',
  'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'etsy.com', 'shopify.com',
  'microsoft.com', 'live.com', 'office.com', 'bing.com', 'github.com',
  'stackoverflow.com', 'apple.com', 'icloud.com', 'netflix.com', 'hulu.com',
  'disneyplus.com', 'spotify.com', 'yahoo.com', 'duckduckgo.com',
  'nytimes.com', 'cnn.com', 'bbc.com', 'bbc.co.uk', 'reuters.com',
  'apnews.com', 'espn.com', 'weather.com', 'zoom.us', 'dropbox.com',
  'adobe.com', 'canva.com', 'notion.so', 'figma.com', 'openai.com',
  'anthropic.com', 'paypal.com', 'chase.com', 'bankofamerica.com',
  'wellsfargo.com', 'capitalone.com', 'americanexpress.com', 'visa.com',
  'mastercard.com', 'cloudflare.com', 'mozilla.org', 'wordpress.com',
  'medium.com', 'quora.com', 'yelp.com', 'tripadvisor.com', 'booking.com',
  'airbnb.com', 'expedia.com', 'mapquest.com', 'roblox.com', 'steampowered.com',
  'discord.com', 'twitch.tv', 'soundcloud.com', 'imdb.com', 'dictionary.com'
]);

// True when the URL's host is a trusted domain (or a subdomain of one).
function isTrusted(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    if (TRUSTED_DOMAINS.has(h)) return true;
    for (const d of TRUSTED_DOMAINS) {
      if (h.endsWith('.' + d)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// The user's "Don't ask again" list, persisted in local storage.
async function isWhitelisted(origin) {
  const store = await chrome.storage.local.get('sb_whitelist');
  return (store.sb_whitelist || []).includes(origin);
}

async function addWhitelist(origin) {
  const store = await chrome.storage.local.get('sb_whitelist');
  const list = store.sb_whitelist || [];
  if (!list.includes(origin)) {
    list.push(origin);
    await chrome.storage.local.set({ sb_whitelist: list });
  }
}

async function addToStorageList(key, origin) {
  const store = await chrome.storage.local.get(key);
  const list = store[key] || [];
  if (!list.includes(origin)) {
    list.push(origin);
    await chrome.storage.local.set({ [key]: list });
  }
}

async function removeFromStorageList(key, origin) {
  const store = await chrome.storage.local.get(key);
  const list = (store[key] || []).filter((o) => o !== origin);
  await chrome.storage.local.set({ [key]: list });
}

// Push the device's lists to the user's account (when signed in) so the
// extension and the Sus or Bus site stay in sync.
async function syncAccountLists() {
  const store = await chrome.storage.local.get(['sb_token', 'sb_whitelist', 'sb_blacklist']);
  if (!store.sb_token) return;
  await fetch(LISTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: store.sb_token,
      whitelist: store.sb_whitelist || [],
      blacklist: store.sb_blacklist || []
    })
  }).catch(() => {});
}

// On startup: pull the account's lists and merge them into this device, then
// push the merged result back so both sides match.
chrome.storage.local.get('sb_token').then((s) => {
  if (!s.sb_token) return;
  fetch(LISTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: s.sb_token })
  })
    .then((r) => r.json())
    .then(async (d) => {
      if (!d || d.error || (!Array.isArray(d.whitelist) && !Array.isArray(d.blacklist))) return;
      const store = await chrome.storage.local.get(['sb_whitelist', 'sb_blacklist']);
      const wl = new Set(store.sb_whitelist || []);
      const bl = new Set(store.sb_blacklist || []);
      (d.whitelist || []).forEach((o) => wl.add(o));
      (d.blacklist || []).forEach((o) => bl.add(o));
      await chrome.storage.local.set({ sb_whitelist: [...wl], sb_blacklist: [...bl] });
      syncAccountLists();
    })
    .catch(() => {});
});

// "Disable until" — the user can pause all checks until a chosen date & time
// (set from the toolbar popup). While paused, everything passes through.
async function isPaused() {
  const s = await chrome.storage.local.get('sb_paused_until');
  return !!(s.sb_paused_until && Date.now() < s.sb_paused_until);
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
    terms: data.terms_privacy
      ? {
          summary: data.terms_privacy.simple_summary || data.terms_privacy.summary,
          points: (data.terms_privacy.points || []).slice(0, 2).map((p) => ({
            title: p.title,
            severity: p.severity,
            note: p.simple_description || p.description
          }))
        }
      : null,
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
  if (await isPaused()) return { status: 'pass' }; // paused until a chosen time — let everything through
  if (isGoogleSearch(url)) return { status: 'pass' }; // Google Search pages are never checked
  if (isTrusted(url)) return { status: 'pass' }; // well-known safe domain — no scan needed
  if (await isWhitelisted(origin)) return { status: 'pass' }; // user whitelisted this site

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
  if (await isPaused()) return { status: 'pass' }; // paused until a chosen time — let everything through
  if (origin === APP_ORIGIN) return { status: 'pass' }; // never gate our own app
  if (msg.navType === 'reload' || msg.navType === 'back_forward' || msg.navType === 'prerender') {
    return { status: 'pass' };
  }
  if (isGoogleSearch(msg.url)) return { status: 'pass' }; // Google Search pages are never checked
  if (isTrusted(msg.url)) return { status: 'pass' }; // well-known safe domain — no scan needed
  if (msg.refOrigin && msg.refOrigin === origin) return { status: 'pass' }; // same-site chain
  if (consumeAllow(origin)) return { status: 'pass' }; // already approved this hop
  if (await isWhitelisted(origin)) return { status: 'pass' }; // user whitelisted this site

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
  const origin = originOf(url);
  // Suggested alternatives rarely change — cache them for 30 days so repeat
  // lookups on the same site cost 0 credits.
  if (origin) {
    const store = await chrome.storage.local.get('sb_alt_cache');
    const cache = store.sb_alt_cache || {};
    const hit = cache[origin];
    if (hit && Date.now() - hit.at < 30 * 24 * 60 * 60 * 1000) {
      return { alternatives: hit.list };
    }
    const resp = await fetch(ALT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || data.error) throw new Error((data && data.error) || 'Lookup failed');
    const list = data.alternatives || [];
    if (list.length) {
      cache[origin] = { list, at: Date.now() };
      await chrome.storage.local.set({ sb_alt_cache: cache });
    }
    return { alternatives: list };
  }
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
  if (msg.type === 'sb:whitelist') {
    const origin = originOf(msg.url);
    if (origin) {
      addWhitelist(origin) // remember the site across sessions
        .then(syncAccountLists)
        .catch(() => {});
      allowOrigin(origin); // and let this navigation through
    }
    sendResponse({ status: 'ok' });
    return;
  }
  if (msg.type === 'sb:blacklist') {
    const origin = originOf(msg.url);
    if (origin) {
      addToStorageList('sb_blacklist', origin)
        .then(syncAccountLists)
        .catch(() => {});
    }
    sendResponse({ status: 'ok' });
    return;
  }
  if (msg.type === 'sb:unblacklist') {
    const origin = originOf(msg.url);
    if (origin) {
      removeFromStorageList('sb_blacklist', origin)
        .then(syncAccountLists)
        .catch(() => {});
    }
    sendResponse({ status: 'ok' });
    return;
  }
  if (msg.type === 'sb:register' || msg.type === 'sb:login') {
    fetch(msg.type === 'sb:register' ? REGISTER_ENDPOINT : LOGIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: msg.email, password: msg.password })
    })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => null) }))
      .then(async ({ ok, data }) => {
        if (!ok || !data || data.error) {
          sendResponse({ error: (data && data.error) || 'Something went wrong' });
          return;
        }
        await chrome.storage.local.set({ sb_token: data.token, sb_email: data.email, sb_asked: true });
        const wl = new Set(data.whitelist || []);
        const bl = new Set(data.blacklist || []);
        const store = await chrome.storage.local.get(['sb_whitelist', 'sb_blacklist']);
        (store.sb_whitelist || []).forEach((o) => wl.add(o));
        (store.sb_blacklist || []).forEach((o) => bl.add(o));
        await chrome.storage.local.set({ sb_whitelist: [...wl], sb_blacklist: [...bl] });
        syncAccountLists();
        sendResponse({ ok: true, token: data.token, email: data.email });
      })
      .catch(() => sendResponse({ error: 'Could not reach Sus or Bus right now' }));
    return true; // async response
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