// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/security-headers.js)
// Layer I: HTTP Security Headers Analysis.

import { evaluateObservationRules } from "./engine.ts";

/**
 * Analyzes HTTP response security headers and transport protocol
 * via deterministic rule engine evaluation against knowledge base definitions.
 */
export function analyzeSecurityHeaders(headers = {}, finalUrl = "") {
  const normHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    normHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v);
  }

  const isHttps = finalUrl.startsWith("https:");
  const hsts = normHeaders["strict-transport-security"];
  let hstsMaxAge = 0;
  if (hsts) {
    const maxAgeMatch = hsts.match(/max-age=(\d+)/i);
    hstsMaxAge = maxAgeMatch ? Number.parseInt(maxAgeMatch[1], 10) : 0;
  }

  const csp = normHeaders["content-security-policy"];
  const xfo = normHeaders["x-frame-options"];
  const hasCspFraming = csp && /frame-ancestors/i.test(csp);
  const framingMechanism = xfo ? `X-Frame-Options: ${xfo}` : (hasCspFraming ? "CSP frame-ancestors directive" : "");

  const serverBanner = normHeaders["server"] || normHeaders["x-powered-by"] || "";
  const hasServerVersionDisclosure = Boolean(serverBanner && /\d+\.\d+/.test(serverBanner));

  // Build header observations object
  const observations = {
    finalUrl,
    protocol: isHttps ? "https:" : "http:",
    isHttps,
    hasHsts: Boolean(hsts),
    hstsValue: hsts || "",
    hstsMaxAge,
    hasCsp: Boolean(csp),
    cspSnippet: csp ? (csp.length > 120 ? csp.slice(0, 120) + "..." : csp) : "",
    hasXctoNosniff: Boolean(normHeaders["x-content-type-options"] && normHeaders["x-content-type-options"].toLowerCase().includes("nosniff")),
    xctoValue: normHeaders["x-content-type-options"] || "",
    hasFramingProtection: Boolean(xfo || hasCspFraming),
    framingMechanism,
    hasServerVersionDisclosure,
    serverBanner
  };

  const { findings } = evaluateObservationRules(observations);
  // Filter for network transport and header findings
  return findings.filter(f => f.category === "security" && (f.subcategory === "transport" || f.subcategory === "headers"));
}