// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/fetcher.js)
// Layer B: Pinned Safe Network Fetcher.

import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { normalizeUrl } from "./url.ts";
import { resolveAndValidate, DnsSecurityError } from "./dns.ts";

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
 * Performs a single secure HTTP/HTTPS request pinned to a validated public IP address.
 */
function requestSingle(parsedUrl, pinnedAddress, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const isHttps = parsedUrl.protocol === "https:";
  const client = isHttps ? https : http;
  const port = parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : (isHttps ? 443 : 80);

  return new Promise((resolve, reject) => {
    let timer = null;
    let finished = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      finished = true;
    };

    const reqOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: port,
      path: (parsedUrl.pathname || "/") + (parsedUrl.search || ""),
      method: "GET",
      // Pin connection to validated IP address to prevent DNS rebinding
      lookup: (_host, lookupOpts, cb) => {
        if (lookupOpts && lookupOpts.all) {
          cb(null, [{ address: pinnedAddress.address, family: pinnedAddress.family }]);
        } else {
          cb(null, pinnedAddress.address, pinnedAddress.family);
        }
      },
      headers: {
        "User-Agent": "SusOrBus-Scanner/2.0 (+https://github.com/TejusBhasin/SusOrBus)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Host": parsedUrl.host,
        "Connection": "close"
      }
    };

    if (isHttps) {
      reqOptions.servername = parsedUrl.hostname;
    }

    const req = client.request(reqOptions, response => {
      const statusCode = response.statusCode || 0;
      const headers = response.headers || {};
      const location = headers.location || null;
      const encoding = (headers["content-encoding"] || "").toLowerCase();
      const contentType = (headers["content-type"] || "").toLowerCase();

      // Decompression stream setup with byte-counting guard
      let stream = response;
      if (encoding === "gzip" || encoding === "x-gzip") {
        const gunzip = zlib.createGunzip();
        stream = response.pipe(gunzip);
      } else if (encoding === "deflate") {
        const inflate = zlib.createInflate();
        stream = response.pipe(inflate);
      } else if (encoding === "br") {
        const brotli = zlib.createBrotliDecompress();
        stream = response.pipe(brotli);
      }

      const chunks = [];
      let totalBytes = 0;
      let truncated = false;

      stream.on("data", chunk => {
        if (finished) return;
        totalBytes += chunk.length;
        if (totalBytes <= MAX_HTML_BYTES) {
          chunks.push(chunk);
        } else {
          truncated = true;
          req.destroy();
          cleanup();
          const bodyBuffer = Buffer.concat(chunks);
          resolve({
            status: statusCode,
            location,
            headers,
            contentType,
            body: bodyBuffer.toString("utf8"),
            truncated: true,
            ip: pinnedAddress.address
          });
        }
      });

      stream.on("end", () => {
        if (finished) return;
        cleanup();
        const bodyBuffer = Buffer.concat(chunks);
        resolve({
          status: statusCode,
          location,
          headers,
          contentType,
          body: bodyBuffer.toString("utf8"),
          truncated,
          ip: pinnedAddress.address
        });
      });

      stream.on("error", err => {
        if (finished) return;
        cleanup();
        reject(new FetchSecurityError(`Decompression or stream error: ${err.message}`, "STREAM_ERROR"));
      });
    });

    timer = setTimeout(() => {
      cleanup();
      req.destroy();
      reject(new FetchSecurityError(`Request timed out after ${timeoutMs}ms.`, "REQUEST_TIMEOUT"));
    }, timeoutMs);

    req.on("error", err => {
      if (finished) return;
      cleanup();
      reject(new FetchSecurityError(`Network error connecting to ${parsedUrl.hostname}: ${err.message}`, "NETWORK_ERROR"));
    });

    req.end();
  });
}

/**
 * Safely fetches a web page with full SSRF protection, strict redirect validation,
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