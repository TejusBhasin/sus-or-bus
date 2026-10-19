// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/fetcher.js)
// Layer B: Safe Network Fetcher.

import { normalizeUrl } from "./url.ts";
import { resolveAndValidate } from "./dns.ts";

export const MAX_HTML_BYTES = 1_000_000; // 1 MB
export const MAX_REDIRECTS = 5;
export const DEFAULT_TIMEOUT_MS = 10_000; // 10 seconds

export class FetchSecurityError extends Error {
  constructor(message, code = "FETCH_ERROR") {
    super(message);
    this.name = "FetchSecurityError";
    this.code = code;
  }
}

/**
 * Performs a single HTTP/HTTPS request. The hostname has already been resolved
 * and validated as public (and is re-validated on every redirect hop). The
 * Deno runtime cannot pin the socket to the validated IP, so the platform
 * fetch is used with manual redirects and a hard byte cap.
 */
async function requestSingle(parsedUrl, pinnedAddress, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetch(parsedUrl.href, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "SusOrBus-Scanner/2.0 (+https://github.com/TejusBhasin/SusOrBus)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5"
        }
      });
    } catch (err) {
      if (controller.signal.aborted) {
        throw new FetchSecurityError(`Request timed out after ${timeoutMs}ms.`, "REQUEST_TIMEOUT");
      }
      throw new FetchSecurityError(`Network error connecting to ${parsedUrl.hostname}: ${err.message}`, "NETWORK_ERROR");
    }

    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const chunks = [];
    let totalBytes = 0;
    let truncated = false;
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.length;
        if (totalBytes > MAX_HTML_BYTES) {
          truncated = true;
          chunks.push(value.slice(0, Math.max(0, value.length - (totalBytes - MAX_HTML_BYTES))));
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    const merged = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    return {
      status: response.status,
      location: headers.location || null,
      headers,
      contentType: (headers["content-type"] || "").toLowerCase(),
      body: new TextDecoder("utf-8").decode(merged),
      truncated,
      ip: pinnedAddress.address
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Safely fetches a web page with SSRF protection, strict redirect validation,
 * response bounds, and timeouts.
 */
export async function safeFetchPage(inputUrl, options = {}) {
  let normalized = normalizeUrl(inputUrl);
  const chain = [];
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const customLookup = options.customLookup || null;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    chain.push(normalized.href);

    // Resolve hostname to public IP addresses
    const records = await resolveAndValidate(normalized.hostname, customLookup);
    const pinnedAddress = records[0];

    // Fetch the single page
    const result = await requestSingle(normalized.url, pinnedAddress, { timeoutMs });

    // Handle redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(result.status) && result.location) {
      if (hop === maxRedirects) {
        throw new FetchSecurityError(`Too many redirects (exceeded limit of ${maxRedirects}).`, "TOO_MANY_REDIRECTS");
      }

      let redirectTarget;
      try {
        redirectTarget = new URL(result.location, normalized.url).href;
      } catch {
        throw new FetchSecurityError(`Invalid redirect location header: '${result.location}'`, "INVALID_REDIRECT");
      }

      // Re-validate redirect destination URL
      normalized = normalizeUrl(redirectTarget);
      continue;
    }

    return {
      status: result.status,
      html: result.body,
      url: normalized.href,
      headers: result.headers,
      contentType: result.contentType,
      chain,
      ip: result.ip,
      truncated: result.truncated
    };
  }

  throw new FetchSecurityError(`Redirect limit reached.`, "TOO_MANY_REDIRECTS");
}