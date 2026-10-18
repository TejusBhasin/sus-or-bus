// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/url.js)
// Layer A: Input Validation & Normalization.

import { domainToASCII, domainToUnicode } from "node:url";
import net from "node:net";

export class UrlValidationError extends Error {
  constructor(message, code = "INVALID_URL") {
    super(message);
    this.name = "UrlValidationError";
    this.code = code;
  }
}

/**
 * Normalizes and validates user-supplied target input.
 * Accepts hostname or full URL, forces/defaults to HTTPS.
 */
export function normalizeUrl(raw) {
  let input = String(raw || "").trim();
  if (!input) {
    throw new UrlValidationError("No website address provided.", "EMPTY_URL");
  }

  // Pre-check for raw credentials syntax before parsing
  if (input.includes("@") && !input.startsWith("http://") && !input.startsWith("https://")) {
    throw new UrlValidationError("URLs with embedded credentials are not allowed.", "CREDENTIALS_DISALLOWED");
  }

  // Check if input has an explicit protocol
  const schemeMatch = input.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== "http" && scheme !== "https") {
      throw new UrlValidationError(
        `Unsupported protocol '${scheme}:'. Only HTTP and HTTPS are permitted.`,
        "UNSUPPORTED_PROTOCOL"
      );
    }
  } else {
    // Default to HTTPS if protocol was omitted
    input = "https://" + input;
  }

  let parsed;
  try {
    parsed = new URL(input);
  } catch (err) {
    throw new UrlValidationError("Malformed website URL.", "MALFORMED_URL");
  }

  // Reject unsupported protocols (double check post-parsing)
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new UrlValidationError(
      `Unsupported protocol '${parsed.protocol}'. Only HTTP and HTTPS are permitted.`,
      "UNSUPPORTED_PROTOCOL"
    );
  }

  // Reject credentials in URL
  if (parsed.username || parsed.password) {
    throw new UrlValidationError("URLs with embedded credentials are not allowed.", "CREDENTIALS_DISALLOWED");
  }

  // Port restrictions: only allow standard web ports (80 for http, 443 for https) or no port specified
  if (parsed.port) {
    const portNum = Number.parseInt(parsed.port, 10);
    const isStandard =
      (parsed.protocol === "https:" && portNum === 443) ||
      (parsed.protocol === "http:" && portNum === 80);
    if (!isStandard) {
      throw new UrlValidationError(
        `Custom port :${parsed.port} is not permitted. Only standard web ports (80, 443) are allowed.`,
        "UNSUPPORTED_PORT"
      );
    }
  }

  // Handle hostname normalization and internationalized domain names (IDN / punycode)
  let rawHostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!rawHostname) {
    throw new UrlValidationError("Invalid or missing hostname.", "INVALID_HOSTNAME");
  }

  // Convert IDN to punycode ASCII
  let asciiHostname = domainToASCII(rawHostname);
  let unicodeHostname = domainToUnicode(asciiHostname);

  // Validate length constraints
  if (asciiHostname.length > 253) {
    throw new UrlValidationError("Hostname exceeds maximum allowable length of 253 characters.", "HOSTNAME_TOO_LONG");
  }

  const labels = asciiHostname.split(".");
  for (const label of labels) {
    if (!label && labels.length > 1) {
      throw new UrlValidationError("Hostname contains empty label segments.", "INVALID_HOSTNAME");
    }
    if (label.length > 63) {
      throw new UrlValidationError("Domain label segment exceeds 63 characters.", "HOSTNAME_LABEL_TOO_LONG");
    }
  }

  parsed.hostname = asciiHostname;
  return {
    url: parsed,
    href: parsed.href,
    protocol: parsed.protocol,
    hostname: asciiHostname,
    displayHostname: unicodeHostname,
    isPunycode: asciiHostname.startsWith("xn--") || asciiHostname.includes(".xn--"),
    isIpLiteral: net.isIP(asciiHostname) !== 0
  };
}

/**
 * Backward-compatible helper to extract cleaned target hostname string.
 * Returns empty string on invalid input.
 */
export function cleanTarget(raw) {
  try {
    const normalized = normalizeUrl(raw);
    return normalized.hostname;
  } catch {
    return "";
  }
}