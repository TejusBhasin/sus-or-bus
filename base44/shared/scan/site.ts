// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/site.js)
// Layer G: Orchestration API. Coordinates the full scan pipeline:
//   1. Input normalization
//   2. SSRF-hardened fetching
//   3. Static document analysis
//   4. Security header evaluation
//   5. Terms & privacy policy inspection
//   6. Headless browser behavior analysis (if configured)
//   7. Evidence-based scoring and deduplication against knowledge base

import { cleanTarget, normalizeUrl } from "./url.ts";
import { safeFetchPage, MAX_HTML_BYTES } from "./fetcher.ts";
import { analyzeStaticDocument } from "./static-analyzer.ts";
import { analyzeSecurityHeaders } from "./security-headers.ts";
import { extractPolicyLinks, inspectPolicies } from "./policy-analyzer.ts";
import { runBrowserAnalysis } from "./browser-client.ts";
import { normalizeAndDeduplicateFindings, calculateRiskScore } from "./scorer.ts";
import { generateAiSynthesis } from "./synthesizer.ts";
import { metadata, findings as kbFindings, renderTemplate } from "./knowledge/index.ts";

export const SOURCE_LIMIT = 20_000;

const findingMap = new Map();
for (const f of kbFindings.findings) {
  findingMap.set(f.id, f);
}

/**
 * Backward-compatible analyze function wrapping the upgraded static analyzer.
 */
export function analyze(html, host, finalUrl) {
  const result = analyzeStaticDocument(html, host, finalUrl);
  return result.findings;
}

/**
 * Backward-compatible fetchPage function using the SSRF-hardened fetcher.
 */
export async function fetchPage(input) {
  return safeFetchPage(input);
}

/**
 * Complete scan pipeline coordinating all layers.
 */
export async function runFullScan(targetInput, options = {}) {
  // Layer A: URL Validation
  const normalized = normalizeUrl(targetInput);
  const targetHost = normalized.hostname;

  // Layer B: Secure Network Fetching
  const page = await safeFetchPage(normalized.href, options);

  // Layer C: Static Document Analysis
  const staticResult = analyzeStaticDocument(page.html, targetHost, page.url);

  // Layer I: Security Headers Analysis
  const headerFindings = analyzeSecurityHeaders(page.headers, page.url);

  // Layer E: Policy & Privacy Analysis
  const policyLinks = extractPolicyLinks(page.html, page.url);
  const { policies, termsFindings } = await inspectPolicies(policyLinks, staticResult.trackers);

  // Layer D: Isolated Browser Analysis (if available/configured)
  const browserResult = await runBrowserAnalysis(page.url, options);

  // Layer F: Consolidate & Deduplicate Findings
  const allFindings = [
    ...staticResult.findings,
    ...headerFindings,
    ...termsFindings
  ];

  // If browser analysis found additional runtime issues, incorporate findings from knowledge base
  if (browserResult.completed && browserResult.observations) {
    const obs = browserResult.observations;
    if (obs.consoleErrors && obs.consoleErrors.length > 5) {
      const def = findingMap.get("CODE_BROWSER_CONSOLE_ERRORS");
      if (def) {
        const vars = { errorCount: obs.consoleErrors.length };
        const title = renderTemplate(def.titleTemplate, vars);
        const summary = renderTemplate(def.summaryTemplate, vars);
        const evidence = renderTemplate(def.evidenceTemplate, vars);

        allFindings.push({
          id: def.id,
          legacyId: def.legacyId || def.id,
          category: def.category,
          title,
          summary,
          evidence,
          whyItMatters: renderTemplate(def.whyItMattersTemplate, vars),
          recommendation: renderTemplate(def.recommendationTemplate, vars),
          severity: def.severity,
          confidence: def.confidence,
          source: def.source,
          status: "detected",
          level: "warning",
          simple: summary,
          nerd: evidence
        });
      }
    }
  }

  const deduplicatedFindings = normalizeAndDeduplicateFindings(allFindings);
  const { score, verdict, verdictDetails, counts, vectors } = calculateRiskScore(deduplicatedFindings, {
    trackers: staticResult.trackers
  });

  // Extract security headers for technical summary display
  const secHeaders = {};
  for (const h of [
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
    "server"
  ]) {
    const val = page.headers && page.headers[h];
    if (val) secHeaders[h] = Array.isArray(val) ? val.join(", ") : String(val);
  }

  // Determine coverage across all analysis stages
  const hasPrivacy = policies.some(p => p.kind.includes("Privacy") && p.ok);
  const hasTerms = policies.some(p => p.kind.includes("Terms") && p.ok);

  const coverage = {
    staticHtml: "completed",
    securityHeaders: "completed",
    redirects: "completed",
    trackers: "completed",
    privacyPolicy: hasPrivacy ? "completed" : (policies.some(p => p.kind.includes("Privacy")) ? "unreachable" : "not_found"),
    termsOfService: hasTerms ? "completed" : (policies.some(p => p.kind.includes("Terms")) ? "unreachable" : "not_found"),
    browserBehavior: browserResult.status
  };

  const aiSynthesis = generateAiSynthesis({
    site: targetHost,
    url: page.url,
    score,
    verdict,
    verdictDetails,
    counts,
    findings: deduplicatedFindings,
    trackers: staticResult.trackers,
    policies,
    coverage,
    vectors
  });

  return {
    // Backward-compatible core response shape
    site: targetHost,
    url: page.url,
    status: page.status,
    checkedAt: new Date().toISOString(),
    score,
    verdict,
    verdictDetails,
    counts,
    vectors,
    aiSynthesis,
    findings: deduplicatedFindings,
    policies,
    termsFindings,
    chain: page.chain || [],
    headers: secHeaders,
    source: page.html.slice(0, SOURCE_LIMIT),

    // Enriched modern schema fields
    coverage,
    kbVersion: metadata.version,
    analysis: {
      trackers: staticResult.trackers,
      scripts: staticResult.scripts,
      forms: staticResult.forms,
      iframes: staticResult.iframes,
      browser: browserResult
    }
  };
}

export { extractPolicyLinks };
export { inspectPolicies };
export { buildTermsFindings } from "./policy-analyzer.ts";
export { MAX_HTML_BYTES };