// URL input safety for Sus or Bus.
//
// normalizeUrl(): validates and normalizes a user-supplied URL, and blocks
//   private / loopback / reserved destinations (the SSRF guard).
// safeFetch(): fetches with a manual redirect loop (every hop is
//   re-validated), plus a hard timeout and a hard cap on downloaded bytes.
//
// Limitation, documented honestly: this runtime cannot resolve DNS itself,
// so hostname-based destinations are validated by name and IP-literal form.
// A domain that resolves to a private address behind DNS can only be caught
// by the redirect/IP rules below, not by a DNS lookup.

const MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_MAX_BYTES = 500000;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 SusOrBusSafetyScanner/1.0';

const ALLOWED_PORTS = ['', '80', '443'];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'ip6-localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'instance-data'
]);

const LOCAL_SUFFIXES = ['.local', '.internal', '.lan', '.home.arpa', '.corp'];

function ipv4Parts(host) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return parts;
}

// Private, loopback, link-local, reserved, and multicast IPv4 space.
function isPrivateIpv4(parts) {
  const a = parts[0];
  const b = parts[1];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // shared NAT range
    (a === 169 && b === 254) || // link-local incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(host) {
  const h = String(host).toLowerCase().replace(/^\[|\]$/g, '');
  // IPv4-mapped IPv6 (::ffff:1.2.3.4) — validate the embedded IPv4 too
  const mapped = /ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(h);
  if (mapped) {
    const p = ipv4Parts(mapped[1]);
    return p ? isPrivateIpv4(p) : true;
  }
  if (h === '::' || h === '::1') return true;
  // unique-local (fc00::/7) and link-local (fe80::/10)
  if (h.startsWith('fc') || h.startsWith('fd') || /^fe[89ab]/.test(h)) return true;
  return false;
}

export function normalizeUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'A URL is required' };
  }
  let candidate = raw.trim();
  if (candidate.length > 2000) {
    return { ok: false, error: 'The URL is too long' };
  }
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = 'https://' + candidate;
  }
  let u;
  try {
    u = new URL(candidate);
  } catch {
    return { ok: false, error: 'That does not look like a valid web address' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https addresses can be scanned' };
  }
  if (u.username || u.password) {
    return { ok: false, error: 'Addresses with embedded usernames or passwords are not supported' };
  }
  if (!ALLOWED_PORTS.includes(u.port)) {
    return { ok: false, error: 'Only standard web ports are supported' };
  }
  const host = u.hostname.toLowerCase();
  if (!host) {
    return { ok: false, error: 'The address is missing a host name' };
  }
  if (BLOCKED_HOSTNAMES.has(host) || LOCAL_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, error: 'Local and internal addresses are not scanned' };
  }
  const v4 = ipv4Parts(host);
  if (v4) {
    if (isPrivateIpv4(v4)) {
      return { ok: false, error: 'Private and reserved IP addresses are not scanned' };
    }
  } else if (host.includes(':') && isPrivateIpv6(host)) {
    return { ok: false, error: 'Private and reserved IP addresses are not scanned' };
  }
  // Stable normalized form: origin + path + query (no credentials possible)
  const normalized = u.origin + (u.pathname && u.pathname !== '/' ? u.pathname : '') + u.search + u.hash;
  return {
    ok: true,
    url: normalized,
    origin: u.origin,
    host,
    protocol: u.protocol
  };
}

function friendlyFetchError(e) {
  const msg = String((e && e.message) || e);
  if (/timeout|timed?\s?out|abort/i.test(msg)) return 'The site took too long to respond';
  if (/dns|not\s?found|resolve/i.test(msg)) return 'The address could not be found (DNS lookup failed)';
  if (/refused|reset|unreachable/i.test(msg)) return 'The site refused the connection';
  return 'The site could not be reached';
}

async function readCapped(resp, maxBytes) {
  try {
    const reader = resp.body.getReader();
    const chunks = [];
    let total = 0;
    let truncated = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.length >= maxBytes) {
        if (maxBytes > total) chunks.push(value.slice(0, maxBytes - total));
        truncated = true;
        try {
          await reader.cancel();
        } catch {}
        break;
      }
      chunks.push(value);
      total += value.length;
    }
    const merged = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    return { text: new TextDecoder('utf-8').decode(merged), truncated };
  } catch {
    return { text: '', truncated: false };
  }
}

// Fetch with SSRF-safe validation on every redirect hop, a timeout, and a
// byte cap. Returns { ok, status, headers, contentType, text, truncated,
// finalUrl, chain, error }.
export async function safeFetch(rawUrl, opts) {
  const options = opts || {};
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
  const chain = [];

  const start = normalizeUrl(rawUrl);
  if (!start.ok) return { ok: false, error: start.error, chain };
  let current = start;

  let resp = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let r;
    try {
      r = await fetch(current.url, {
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (e) {
      return { ok: false, error: friendlyFetchError(e), chain, url: current.url };
    }
    if (r.status >= 300 && r.status < 400) {
      const location = r.headers.get('location') || '';
      try {
        if (r.body) await r.body.cancel();
      } catch {}
      if (!location) {
        return { ok: false, error: 'The site redirected without a destination', chain, url: current.url };
      }
      let next;
      try {
        next = normalizeUrl(new URL(location, current.url).toString());
      } catch {
        next = { ok: false };
      }
      if (!next.ok) {
        return {
          ok: false,
          error: next.error || 'The site redirected to an invalid or unsafe address',
          chain,
          url: current.url
        };
      }
      chain.push({ from: current.url, to: next.url, status: r.status });
      current = next;
      continue;
    }
    resp = r;
    break;
  }

  if (!resp) {
    return { ok: false, error: 'Too many redirects', chain, url: current.url };
  }

  const contentType = resp.headers.get('content-type') || '';
  let body = { text: '', truncated: false };
  if (options.wantBody !== false) {
    body = await readCapped(resp, maxBytes);
  }
  return {
    ok: true,
    status: resp.status,
    headers: resp.headers,
    contentType,
    text: body.text,
    truncated: body.truncated,
    finalUrl: current.url,
    chain
  };
}