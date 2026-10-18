// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/engine.js)
// Rule Engine: executes declarative rules against normalized observations
// and emits catalog-backed findings.

import { findings, rules, renderTemplate } from "./knowledge/index.ts";

const findingCatalog = new Map();
for (const f of findings.findings) {
  findingCatalog.set(f.id, f);
}

/**
 * Checks whether an observation satisfies a rule's condition set.
 */
export function evaluateConditions(conditions, obs) {
  for (const [key, expected] of Object.entries(conditions)) {
    switch (key) {
      case "protocolEquals":
        if (obs.protocol !== expected) return false;
        break;
      case "isHttps":
        if (Boolean(obs.isHttps) !== expected) return false;
        break;
      case "hasPasswordInput":
        if (Boolean(obs.hasPasswordInput) !== expected) return false;
        break;
      case "hasInsecureOrCrossOriginPasswordForm":
        if (Boolean(obs.hasInsecureOrCrossOriginPasswordForm) !== expected) return false;
        break;
      case "hasMetaRefresh":
        if (Boolean(obs.hasMetaRefresh) !== expected) return false;
        break;
      case "hasHsts":
        if (Boolean(obs.hasHsts) !== expected) return false;
        break;
      case "hstsMaxAgeGte":
        if ((obs.hstsMaxAge || 0) < expected) return false;
        break;
      case "hstsMaxAgeLt":
        if ((obs.hstsMaxAge || 0) >= expected) return false;
        break;
      case "hasCsp":
        if (Boolean(obs.hasCsp) !== expected) return false;
        break;
      case "hasXctoNosniff":
        if (Boolean(obs.hasXctoNosniff) !== expected) return false;
        break;
      case "hasFramingProtection":
        if (Boolean(obs.hasFramingProtection) !== expected) return false;
        break;
      case "hasServerVersionDisclosure":
        if (Boolean(obs.hasServerVersionDisclosure) !== expected) return false;
        break;
      case "totalScriptsEquals":
        if ((obs.scripts?.total ?? 0) !== expected) return false;
        break;
      case "externalScriptsGt":
        if ((obs.scripts?.external ?? 0) <= expected) return false;
        break;
      case "hasScriptObfuscation":
        if (Boolean(obs.hasScriptObfuscation) !== expected) return false;
        break;
      case "thirdPartyIframesGt":
        if ((obs.thirdPartyIframesCount ?? 0) <= expected) return false;
        break;
      case "isIpLiteral":
        if (Boolean(obs.isIpLiteral) !== expected) return false;
        break;
      case "hasUnusualDomainStructure":
        if (Boolean(obs.hasUnusualDomainStructure) !== expected) return false;
        break;
      case "hasBrandImpersonation":
        if (Boolean(obs.hasBrandImpersonation) !== expected) return false;
        break;
      case "hasScamKeywords":
        if (Boolean(obs.hasScamKeywords) !== expected) return false;
        break;
      default:
        // Generic equality check
        if (obs[key] !== expected) return false;
        break;
    }
  }
  return true;
}

/**
 * Executes declarative rules against normalized observations and emits catalog-backed findings.
 */
export function evaluateObservationRules(obs, options = {}) {
  const emittedFindings = [];
  const diagnostics = [];

  for (const rule of rules.rules) {
    const isMatch = evaluateConditions(rule.conditions, obs);

    if (options.diagnostic) {
      diagnostics.push({
        ruleId: rule.id,
        outputFindingId: rule.outputFindingId,
        matched: isMatch,
        stage: rule.stage
      });
    }

    if (!isMatch) continue;

    const findingDef = findingCatalog.get(rule.outputFindingId);
    if (!findingDef) continue;

    // Gather variable values from observation
    const variables = {
      finalUrl: obs.finalUrl || "",
      action: obs.passwordFormAction || "",
      destinationDetail: obs.passwordFormDestinationDetail || "",
      content: obs.metaRefreshContent || "",
      hstsValue: obs.hstsValue || "",
      maxAge: obs.hstsMaxAge || 0,
      policySnippet: obs.cspSnippet || "",
      headerValue: obs.xctoValue || "nosniff",
      mechanism: obs.framingMechanism || "framing protection",
      banner: obs.serverBanner || "",
      scriptCount: obs.scripts?.external || 0,
      originCount: obs.scripts?.distinctOrigins?.length || 0,
      patternDetail: obs.scriptObfuscationPattern || "eval/atob unpacker",
      frameCount: obs.thirdPartyIframesCount || 0,
      domains: obs.thirdPartyIframeDomains || "",
      host: obs.targetHost || "",
      detail: obs.unusualDomainDetail || "",
      brand: obs.brandMatched || "",
      hostname: obs.targetHost || "",
      phrases: obs.scamPhrasesMatched || ""
    };

    // Render predefined templates deterministically
    const title = renderTemplate(findingDef.titleTemplate, variables, findingDef.placeholders);
    const summary = renderTemplate(findingDef.summaryTemplate, variables, findingDef.placeholders);
    const evidence = renderTemplate(findingDef.evidenceTemplate, variables, findingDef.placeholders);
    const whyItMatters = renderTemplate(findingDef.whyItMattersTemplate, variables, findingDef.placeholders);
    const recommendation = renderTemplate(findingDef.recommendationTemplate, variables, findingDef.placeholders);

    let level = "good";
    if (findingDef.severity === "critical" || findingDef.severity === "high") level = "bad";
    else if (findingDef.severity === "medium" || findingDef.severity === "low") level = "warning";

    emittedFindings.push({
      id: findingDef.id,
      legacyId: findingDef.legacyId || findingDef.id,
      category: findingDef.category,
      subcategory: findingDef.subcategory,
      title,
      summary,
      evidence,
      whyItMatters,
      recommendation,
      severity: findingDef.severity,
      confidence: findingDef.confidence,
      source: findingDef.source,
      status: "detected",
      limitations: findingDef.limitations,

      // Backward-compatible properties
      level,
      simple: summary,
      nerd: evidence,

      matchedRuleId: rule.id
    });
  }

  return {
    findings: emittedFindings,
    diagnostics: options.diagnostic ? diagnostics : undefined
  };
}

export { findingCatalog };