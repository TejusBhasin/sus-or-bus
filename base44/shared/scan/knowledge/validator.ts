// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/knowledge/validator.js)
// Knowledge base integrity validator.

import metadata from "./metadata.json" with { type: "json" };
import messages from "./messages.json" with { type: "json" };
import verdicts from "./verdicts.json" with { type: "json" };
import scoring from "./scoring.json" with { type: "json" };
import domains from "./domains.json" with { type: "json" };
import phishing from "./phishing.json" with { type: "json" };
import policyLexicon from "./policy-lexicon.json" with { type: "json" };
import findings from "./findings.json" with { type: "json" };
import rules from "./rules.json" with { type: "json" };

/**
 * Validates the entire SusOrBus structured knowledge base.
 * Checks for ID uniqueness, reference integrity, valid schemas, and placeholders.
 */
export function validateKnowledgeBase() {
  const errors = [];
  const warnings = [];

  // 1. Verify Metadata
  if (!metadata.name || !metadata.version || !metadata.schemaVersion) {
    errors.push("metadata.json is missing required version or name headers.");
  }

  // 2. Verify Findings
  const findingMap = new Map();
  const validSeverities = new Set(["critical", "high", "medium", "low", "informational"]);
  const validConfidences = new Set(["high", "medium", "low"]);
  const validCategories = new Set(["security", "privacy", "code", "content", "reputation", "policy", "topic"]);

  for (const f of findings.findings) {
    if (!f.id) {
      errors.push("Found finding with missing ID.");
      continue;
    }
    if (findingMap.has(f.id)) {
      errors.push(`Duplicate finding ID: '${f.id}'`);
    }
    findingMap.set(f.id, f);

    if (!validSeverities.has(f.severity)) {
      errors.push(`Finding '${f.id}' has invalid severity: '${f.severity}'`);
    }
    if (!validConfidences.has(f.confidence)) {
      errors.push(`Finding '${f.id}' has invalid confidence: '${f.confidence}'`);
    }
    if (!validCategories.has(f.category)) {
      errors.push(`Finding '${f.id}' has unknown category: '${f.category}'`);
    }
    if (!f.titleTemplate || !f.summaryTemplate || !f.whyItMattersTemplate || !f.recommendationTemplate) {
      errors.push(`Finding '${f.id}' is missing required template definitions.`);
    }

    // Check placeholder declarations in templates
    const templates = [f.titleTemplate, f.summaryTemplate, f.evidenceTemplate, f.whyItMattersTemplate, f.recommendationTemplate];
    const declaredPlaceholders = new Set(Object.keys(f.placeholders || {}));
    for (const t of templates) {
      if (!t) continue;
      const matches = t.matchAll(/\{([a-zA-Z0-9_]+)\}/g);
      for (const m of matches) {
        if (!declaredPlaceholders.has(m[1])) {
          warnings.push(`Finding '${f.id}' uses undeclared placeholder '{${m[1]}}' in template.`);
        }
      }
    }
  }

  // 3. Verify Rules
  const ruleMap = new Map();
  for (const r of rules.rules) {
    if (!r.id) {
      errors.push("Found rule with missing ID.");
      continue;
    }
    if (ruleMap.has(r.id)) {
      errors.push(`Duplicate rule ID: '${r.id}'`);
    }
    ruleMap.set(r.id, r);

    // Verify output finding exists in findings.json
    if (!findingMap.has(r.outputFindingId)) {
      errors.push(`Rule '${r.id}' references non-existent outputFindingId: '${r.outputFindingId}'`);
    }
  }

  // 4. Verify Verdicts & Scoring
  if (!verdicts.verdicts || verdicts.verdicts.length === 0) {
    errors.push("verdicts.json has empty or missing verdicts array.");
  }
  if (!scoring.severityWeights || !scoring.confidenceMultipliers) {
    errors.push("scoring.json is missing severity weights or confidence multipliers.");
  }

  // 5. Verify Domain Database
  const seenPatterns = new Set();
  let duplicateDomainCount = 0;
  for (const s of domains.services) {
    if (!s.pattern || !s.category || !s.provider) {
      errors.push(`Domain entry missing pattern, category, or provider: ${JSON.stringify(s)}`);
    }
    if (seenPatterns.has(s.pattern)) {
      duplicateDomainCount++;
    }
    seenPatterns.add(s.pattern);
  }
  if (duplicateDomainCount > 0) {
    warnings.push(`Domain database contains ${duplicateDomainCount} duplicate pattern(s).`);
  }

  // Summary report
  const report = {
    valid: errors.length === 0,
    version: metadata.version,
    schemaVersion: metadata.schemaVersion,
    counts: {
      totalFindings: findings.findings.length,
      activeRules: rules.rules.length,
      domainServices: domains.services.length,
      scamPhrases: phishing.scamKeywords.length,
      phishingBrands: phishing.brands.length,
      policyCategories: Object.keys(policyLexicon.disclosureCategories).length,
      errors: errors.length,
      warnings: warnings.length
    },
    errors,
    warnings
  };

  return report;
}

export { metadata, messages, verdicts, scoring, domains, phishing, policyLexicon, findings, rules };