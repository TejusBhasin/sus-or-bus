// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/dns.js)
// Layer B: DNS & SSRF Protection.

import * as dns from "node:dns/promises";
import net from "node:net";

export class DnsSecurityError extends Error {
  constructor(message, code = "SSRF_BLOCKED") {
    super(message);
    this.name = "DnsSecurityError";
    this.code = code;
  }
}

/**
 * Validates whether an IPv4 address is globally routable and public.
 * Blocks private, loopback, link-local, carrier-grade NAT, documentation,
 * cloud metadata, multicast, and broadcast addresses.
 */
export function isPublicIPv4(ip) {
  const parts = ip.split(".").map(s => Number.parseInt(s, 10));
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b, c, d] = parts;

  // 0.0.0.0/8 - "This" network
  if (a === 0) return false;
  // 10.0.0.0/8 - Private-Use
  if (a === 10) return false;
  // 100.64.0.0/10 - Shared Address Space (Carrier Grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return false;
  // 127.0.0.0/8 - Loopback
  if (a === 127) return false;
  // 169.254.0.0/16 - Link-Local (includes cloud metadata service 169.254.169.254)
  if (a === 169 && b === 254) return false;
  // 172.16.0.0/12 - Private-Use
  if (a === 172 && b >= 16 && b <= 31) return false;
  // 192.0.0.0/24 - IETF Protocol Assignments
  if (a === 192 && b === 0 && c === 0) return false;
  // 192.0.2.0/24 - Documentation (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return false;
  // 192.168.0.0/16 - Private-Use
  if (a === 192 && b === 168) return false;
  // 198.18.0.0/15 - Benchmarking
  if (a === 198 && (b === 18 || b === 19)) return false;
  // 198.51.100.0/24 - Documentation (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return false;
  // 203.0.113.0/24 - Documentation (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return false;
  // 224.0.0.0/4 - Multicast
  if (a >= 224 && a <= 239) return false;
  // 240.0.0.0/4 - Reserved for Future Use & 255.255.255.255 Broadcast
  if (a >= 240) return false;

  return true;
}

/**
 * Validates whether an IPv6 address is globally routable and public.
 * Handles IPv4-mapped IPv6, link-local, loopback, unique local, documentation,
 * and multicast addresses.
 */
export function isPublicIPv6(ip) {
  const norm = ip.toLowerCase();

  // Unspecified ::
  if (norm === "::" || norm === "0:0:0:0:0:0:0:0") return false;
  // Loopback ::1
  if (norm === "::1" || norm === "0:0:0:0:0:0:0:1") return false;

  // IPv4-mapped IPv6 (e.g. ::ffff:192.168.1.1 or 0:0:0:0:0:ffff:127.0.0.1)
  const mappedMatch = norm.match(/(?:^::ffff:|^0:0:0:0:0:ffff:)(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedMatch) {
    return isPublicIPv4(mappedMatch[1]);
  }

  // fe80::/10 - Link-local unicast
  if (/^fe[89ab][0-9a-f]:/i.test(norm)) return false;
  // fc00::/7 - Unique local address (fc00:: - fdff::)
  if (/^f[cd][0-9a-f]{2}:/i.test(norm)) return false;
  // ff00::/8 - Multicast
  if (/^ff[0-9a-f]{2}:/i.test(norm)) return false;
  // 2001:db8::/32 - Documentation space
  if (norm.startsWith("2001:db8:") || norm.startsWith("2001:0db8:")) return false;
  // 100::/64 - Discard prefix
  if (norm.startsWith("100:")) return false;

  // Check first hextet: globally routable unicast typically starts with 2000::/3 (2000 - 3fff)
  const firstHextet = Number.parseInt(norm.split(":")[0] || "0", 16);
  return firstHextet >= 0x2000 && firstHextet <= 0x3fff;
}

export function isPublicAddress(address) {
  if (!address || typeof address !== "string") return false;
  if (net.isIPv4(address)) return isPublicIPv4(address);
  if (net.isIPv6(address)) return isPublicIPv6(address);
  return false;
}

/**
 * Checks if a hostname matches local, internal, or blocked domain patterns.
 */
export function isProhibitedHostname(hostname) {
  const h = (hostname || "").toLowerCase().trim();
  if (!h) return true;
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".corp") ||
    h.endsWith(".lan") ||
    h.endsWith(".home") ||
    h.endsWith(".intranet")
  ) {
    return true;
  }
  // If hostname is directly an IP address, check public address rules
  if (net.isIP(h)) {
    return !isPublicAddress(h);
  }
  return false;
}

/**
 * Resolves a hostname via DNS and enforces SSRF boundaries on all returned addresses.
 * If any returned address is private/reserved, rejects the entire resolution.
 */
export async function resolveAndValidate(hostname, customLookup = null) {
  if (isProhibitedHostname(hostname)) {
    throw new DnsSecurityError(
      `Access to '${hostname}' is prohibited for security reasons.`,
      "PROHIBITED_HOSTNAME"
    );
  }

  // If hostname is already a validated public IP literal, return directly
  if (net.isIP(hostname)) {
    const family = net.isIPv4(hostname) ? 4 : 6;
    return [{ address: hostname, family }];
  }

  const lookupFn = customLookup || dns.lookup;
  let records;
  try {
    records = await lookupFn(hostname, { all: true, verbatim: true });
  } catch (err) {
    throw new DnsSecurityError(`DNS lookup failed for '${hostname}': ${err.message}`, "DNS_LOOKUP_FAILED");
  }

  if (!records || records.length === 0) {
    throw new DnsSecurityError(`No DNS records found for '${hostname}'.`, "DNS_NO_RECORDS");
  }

  // SSRF check: verify every address resolved
  for (const record of records) {
    if (!isPublicAddress(record.address)) {
      throw new DnsSecurityError(
        `Destination address (${record.address}) is restricted or non-public. Request blocked.`,
        "SSRF_BLOCKED"
      );
    }
  }

  return records;
}