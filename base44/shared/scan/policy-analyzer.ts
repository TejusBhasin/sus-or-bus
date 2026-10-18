// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/policy-analyzer.js)
// Layer E: Terms & Privacy Policy Analysis.

import { safeFetchPage } from "./fetcher.ts";
import { extractVisibleText } from "./static-analyzer.ts";
import { policyLexicon, findings, renderTemplate } from "./knowledge/index.ts";

const findingMap = new Map();
for (const f of findings.findings) {
  findingMap.set(f.id, f);
}

/**
 * Extracts links to Terms of Service, Privacy Policy, and Cookie Policy from HTML.
 */
export function extractPolicyLinks(html, base) {
  const found = { terms: null, privacy: null, cookie: null };
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) continue;

    const innerText = match[2].replace(/<[^>]+>/g, " ").toLowerCase();
    const searchTarget = (rawHref + " " + innerText).toLowerCase();

    let absoluteUrl;
    try {
      absoluteUrl = new URL(rawHref, base).href;
    } catch {
      continue;
    }

    if (!found.terms && /(?:terms\s+of\s+service|terms\s+and\s+conditions|\btos\b|user\s+agreement)/.test(searchTarget)) {
      found.terms = absoluteUrl;
    }
    if (!found.privacy && /(?:privacy\s+policy|privacy\s+notice|data\s+policy|\bprivacy\b)/.test(searchTarget)) {
      found.privacy = absoluteUrl;
    }
    if (!found.cookie && /(?:cookie\s+policy|cookie\s+notice)/.test(searchTarget)) {
      found.cookie = absoluteUrl;
    }

    if (found.terms && found.privacy && found.cookie) break;
  }

  return found;
}

/**
 * Negation-aware deterministic analysis of policy text.
 * Distinguishes explicit denials ("we do not sell") from positive admissions and unmentioned practices.
 */
export function analyzePolicyContent(policyText) {
  const lower = policyText.toLowerCase();
  const results = {};

  for (const [category, config] of Object.entries(policyLexicon.disclosureCategories)) {
    let status = "not_found";
    let matchedPhrase = null;

    // 1. Check explicit negative patterns first
    if (config.negativePatterns && config.negativePatterns.length > 0) {
      for (const pat of config.negativePatterns) {
        const regex = new RegExp(pat, "i");
        const match = lower.match(regex);
        if (match) {
          status = "explicit_denial";
          matchedPhrase = match[0];
          break;
        }
      }
    }

    // 2. If no negative pattern matched, check affirmative patterns
    if (status === "not_found" && config.affirmativePatterns && config.affirmativePatterns.length > 0) {
      for (const pat of config.affirmativePatterns) {
        const regex = new RegExp(pat, "i");
        const match = lower.match(regex);
        if (match) {
          status = "disclosed";
          matchedPhrase = match[0];
          break;
        }
      }
    }

    results[category] = {
      status,
      matchedPhrase,
      isAffirmative: status === "disclosed",
      isDenied: status === "explicit_denial"
    };
  }

  if (!results.deletion && results.deletionRights) {
    results.deletion = results.deletionRights;
  }
  if (!results.userRights && results.deletionRights) {
    results.userRights = results.deletionRights;
  }
  if (!results.contact && results.contactMethod) {
    results.contact = results.contactMethod;
  }

  return results;
}

/**
 * Safely fetches and inspects candidate policy documents.
 */
export async function inspectPolicies(links, observedTrackers = []) {
  const policies = [];
  const candidates = [
    { kind: "Privacy Policy", url: links.privacy },
    { kind: "Terms of Service", url: links.terms }
  ];

  for (const item of candidates) {
    if (!item.url) continue;
    try {
      const page = await safeFetchPage(item.url, { timeoutMs: 6_000 });
      const ok = page.status >= 200 && page.status < 400 && page.html.length > 300;
      let disclosures = null;
      if (ok) {
        const plainText = extractVisibleText(page.html);
        disclosures = analyzePolicyContent(plainText);
      }
      policies.push({
        kind: item.kind,
        url: page.url,
        status: page.status,
        size: page.html.length,
        ok,
        disclosures
      });
    } catch (err) {
      policies.push({
        kind: item.kind,
        url: item.url,
        ok: false,
        error: err.message
      });
    }
  }

  const termsFindings = buildTermsFindings(policies, observedTrackers);
  return { policies, termsFindings };
}

/**
 * Builds findings for policy inspection from central findings catalog.
 */
export function buildTermsFindings(policies, observedTrackers = []) {
  const findingsList = [];

  if (policies.length === 0) {
    const def = findingMap.get("POL_POLICY_NONE_FOUND");
    if (def) {
      const title = renderTemplate(def.titleTemplate);
      const summary = renderTemplate(def.summaryTemplate);
      const evidence = renderTemplate(def.evidenceTemplate);
      const whyItMatters = renderTemplate(def.whyItMattersTemplate);
      const recommendation = renderTemplate(def.recommendationTemplate);

      findingsList.push({
        id: def.id,
        legacyId: def.legacyId || "policy-none-found",
        category: def.category,
        title,
        summary,
        evidence,
        whyItMatters,
        recommendation,
        severity: def.severity,
        confidence: def.confidence,
        source: def.source,
        status: "detected",
        level: "warning",
        simple: summary,
        nerd: evidence
      });
    }
    return findingsList;
  }

  for (const policy of policies) {
    if (policy.ok) {
      const disc = policy.disclosures || {};
      const discSummaries = [];
      if (disc.dataCollection && (disc.dataCollection.isAffirmative || disc.dataCollection === true)) discSummaries.push("data collection");
      if (disc.cookies && (disc.cookies.isAffirmative || disc.cookies === true)) discSummaries.push("cookies");
      if (disc.thirdPartySharing && (disc.thirdPartySharing.isAffirmative || disc.thirdPartySharing === true)) discSummaries.push("third-party sharing");
      if ((disc.deletionRights && (disc.deletionRights.isAffirmative || disc.deletionRights === true)) || (disc.deletion && (disc.deletion.isAffirmative || disc.deletion === true))) discSummaries.push("deletion rights");

      const discText = discSummaries.length > 0
        ? `Mentions ${discSummaries.join(", ")}.`
        : "Standard policy text retrieved.";

      const def = findingMap.get("POL_POLICY_AVAILABLE");
      if (def) {
        const vars = {
          kind: policy.kind,
          url: policy.url,
          status: policy.status,
          size: policy.size,
          discText
        };
        const title = renderTemplate(def.titleTemplate, vars, def.placeholders);
        const summary = renderTemplate(def.summaryTemplate, vars, def.placeholders);
        const evidence = renderTemplate(def.evidenceTemplate, vars, def.placeholders);
        const whyItMatters = renderTemplate(def.whyItMattersTemplate, vars, def.placeholders);
        const recommendation = renderTemplate(def.recommendationTemplate, vars, def.placeholders);

        findingsList.push({
          id: `${def.id}_${policy.kind.toUpperCase().replace(/\s+/g, "_")}`,
          legacyId: def.legacyId || "policy-available",
          category: def.category,
          title,
          summary,
          evidence,
          whyItMatters,
          recommendation,
          severity: def.severity,
          confidence: def.confidence,
          source: def.source,
          status: "detected",
          level: "good",
          simple: summary,
          nerd: evidence
        });
      }

      // Check explicit data selling denial
      if (disc.dataSelling && disc.dataSelling.isDenied) {
        const denyDef = findingMap.get("POL_DATA_SELLING_DENIED");
        if (denyDef) {
          const vars = { phrase: disc.dataSelling.matchedPhrase || "we do not sell personal data" };
          findingsList.push({
            id: denyDef.id,
            legacyId: denyDef.legacyId || "policy-data-selling-denied",
            category: denyDef.category,
            title: renderTemplate(denyDef.titleTemplate, vars),
            summary: renderTemplate(denyDef.summaryTemplate, vars),
            evidence: renderTemplate(denyDef.evidenceTemplate, vars),
            whyItMatters: renderTemplate(denyDef.whyItMattersTemplate, vars),
            recommendation: renderTemplate(denyDef.recommendationTemplate, vars),
            severity: denyDef.severity,
            confidence: denyDef.confidence,
            source: denyDef.source,
            status: "detected",
            level: "good",
            simple: renderTemplate(denyDef.summaryTemplate, vars),
            nerd: renderTemplate(denyDef.evidenceTemplate, vars)
          });
        }
      }

      // Tracker gap analysis
      const cookiesDisclosed = Boolean(disc.cookies && (disc.cookies.isAffirmative || disc.cookies === true));
      const adsDisclosed = Boolean((disc.dataSelling && (disc.dataSelling.isAffirmative || disc.dataSelling === true)) || (disc.advertising && (disc.advertising.isAffirmative || disc.advertising === true)));
      if (policy.kind === "Privacy Policy" && observedTrackers.length > 0 && !cookiesDisclosed && !adsDisclosed) {
        const gapDef = findingMap.get("POL_TRACKER_DISCLOSURE_GAP");
        if (gapDef) {
          const trackerNames = observedTrackers.map(t => t.provider || t.domain).join(", ");
          const vars = { trackers: trackerNames };
          const title = renderTemplate(gapDef.titleTemplate, vars);
          const summary = renderTemplate(gapDef.summaryTemplate, vars);
          const evidence = renderTemplate(gapDef.evidenceTemplate, vars);

          findingsList.push({
            id: gapDef.id,
            legacyId: gapDef.legacyId || "policy-tracker-disclosure-gap",
            category: gapDef.category,
            title,
            summary,
            evidence,
            whyItMatters: renderTemplate(gapDef.whyItMattersTemplate, vars),
            recommendation: renderTemplate(gapDef.recommendationTemplate, vars),
            severity: gapDef.severity,
            confidence: gapDef.confidence,
            source: gapDef.source,
            status: "detected",
            level: "warning",
            simple: summary,
            nerd: evidence
          });
        }
      }
    } else {
      const def = findingMap.get("POL_POLICY_UNREACHABLE");
      if (def) {
        const vars = {
          kind: policy.kind,
          url: policy.url,
          errorDetail: policy.error || `HTTP ${policy.status}`
        };
        const title = renderTemplate(def.titleTemplate, vars);
        const summary = renderTemplate(def.summaryTemplate, vars);
        const evidence = renderTemplate(def.evidenceTemplate, vars);

        findingsList.push({
          id: `${def.id}_${policy.kind.toUpperCase().replace(/\s+/g, "_")}`,
          legacyId: `policy-${policy.kind.toLowerCase().replace(/\s+/g, "-")}-unreachable`,
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

  return findingsList;
}