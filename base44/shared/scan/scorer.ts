// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/scorer.js)
// Layer F: Evidence Scoring & Deduplication.

import { scoring, verdicts, findings as kbFindings } from "./knowledge/index.ts";

export const SEVERITY_WEIGHTS = scoring.severityWeights;
export const CONFIDENCE_MULTIPLIERS = scoring.confidenceMultipliers;

const findingDefMap = new Map();
for (const f of kbFindings.findings) {
  findingDefMap.set(f.id, f);
}

/**
 * Deduplicates findings by stable identifier and guarantees standard schema fields.
 */
export function normalizeAndDeduplicateFindings(rawFindings = []) {
  const seenIds = new Set();
  const result = [];

  for (const f of rawFindings) {
    if (!f || typeof f !== "object") continue;

    const findingId = f.id || `${f.category || "gen"}-${f.title}`;
    if (seenIds.has(findingId)) continue;
    seenIds.add(findingId);

    // Look up canonical definition if available
    const canonical = findingDefMap.get(findingId);

    let severity = f.severity || canonical?.severity;
    if (!severity) {
      if (f.level === "bad") severity = "high";
      else if (f.level === "warning") severity = "medium";
      else severity = "informational";
    }

    let level = f.level;
    if (!level) {
      if (severity === "critical" || severity === "high") level = "bad";
      else if (severity === "medium" || severity === "low") level = "warning";
      else level = "good";
    }

    const normalizedFinding = {
      id: findingId,
      category: f.category || canonical?.category || "security",
      subcategory: f.subcategory || canonical?.subcategory || "general",
      title: f.title || canonical?.titleTemplate || "Finding",
      severity,
      confidence: f.confidence || canonical?.confidence || "high",
      summary: f.summary || f.simple || "",
      evidence: f.evidence || f.nerd || "",
      whyItMatters: f.whyItMatters || canonical?.whyItMattersTemplate || "Affects page trust or privacy profile.",
      recommendation: f.recommendation || canonical?.recommendationTemplate || "Review and verify.",
      source: f.source || canonical?.source || "Static Analysis",
      status: f.status || "detected",
      limitations: f.limitations || canonical?.limitations || "",

      // Backward-compatible properties for frontend
      level,
      simple: f.simple || f.summary || "",
      nerd: f.nerd || f.evidence || ""
    };

    result.push(normalizedFinding);
  }

  return result;
}

/**
 * Computes deterministic score (0 - 100) and assigns verdict from knowledge base.
 */
export function calculateRiskScore(findings = [], options = {}) {
  const counts = { good: 0, warning: 0, bad: 0 };
  let totalDeduction = 0;
  const findingWeights = scoring.findingWeights || {};

  const vectorDeductions = {
    transport: 0,
    content: 0,
    telemetry: 0,
    governance: 0
  };

  for (const finding of findings) {
    counts[finding.level] = (counts[finding.level] || 0) + 1;

    // Use finding-specific calibrated weight if catalog ID, otherwise fall back to severity weight
    const specificWeight = (finding.id && findingWeights[finding.id]) ?? (finding.legacyId && findingWeights[finding.legacyId]);
    const baseWeight = specificWeight !== undefined
      ? specificWeight
      : (SEVERITY_WEIGHTS[finding.severity] ?? (
          finding.level === "bad" ? 25 : finding.level === "warning" ? 10 : 0
        ));
    const confidenceMultiplier = CONFIDENCE_MULTIPLIERS[finding.confidence] ?? 1.0;
    const deduction = Math.round(baseWeight * confidenceMultiplier);
    finding.impact = deduction;

    totalDeduction += deduction;

    // Attribute to specific risk vector
    const sub = finding.subcategory || "";
    const cat = finding.category || "";
    if (sub === "transport" || sub === "headers") {
      vectorDeductions.transport += deduction;
    } else if (sub === "forms" || sub === "scripts" || sub === "elements" || sub === "scam" || cat === "content") {
      vectorDeductions.content += deduction;
    } else if (cat === "privacy" || sub === "tracking_transparency" || sub === "telemetry") {
      vectorDeductions.telemetry += deduction;
    } else if (cat === "policy" || sub === "transparency") {
      vectorDeductions.governance += deduction;
    }
  }

  // Skeptical adjustment for active third-party tracker count if provided
  const trackers = options.trackers || [];
  if (trackers.length > 0) {
    const trackerPenalty = Math.min(14, trackers.length * 2);
    totalDeduction += trackerPenalty;
    vectorDeductions.telemetry += trackerPenalty;
  }

  // Calculate score bounded between minScore (0) and maxScore (100)
  const score = Math.max(scoring.minScore, Math.min(scoring.maxScore, Math.round(scoring.baseScore - totalDeduction)));

  // Resolve verdict from knowledge base
  let verdictObj = verdicts.verdicts.find(v => score >= v.minScore && score <= v.maxScore);
  if (!verdictObj) {
    verdictObj = verdicts.verdicts[verdicts.verdicts.length - 1]; // Fallback to SUS
  }

  // Compute vector scores and labels
  const vectors = {
    transport: {
      score: Math.max(0, Math.min(100, 100 - vectorDeductions.transport)),
      label: vectorDeductions.transport === 0 ? "Hardened" : (vectorDeductions.transport < 15 ? "Guarded" : "Vulnerable")
    },
    content: {
      score: Math.max(0, Math.min(100, 100 - vectorDeductions.content)),
      label: vectorDeductions.content === 0 ? "Clean" : (vectorDeductions.content < 20 ? "Caution" : "Suspicious")
    },
    telemetry: {
      score: Math.max(0, Math.min(100, 100 - vectorDeductions.telemetry)),
      label: vectorDeductions.telemetry === 0 ? "Minimal" : (vectorDeductions.telemetry < 16 ? "Moderate" : "Heavy Tracking")
    },
    governance: {
      score: Math.max(0, Math.min(100, 100 - vectorDeductions.governance)),
      label: vectorDeductions.governance === 0 ? "Transparent" : (vectorDeductions.governance < 15 ? "Deficient" : "Unverified")
    }
  };

  return {
    score,
    verdict: verdictObj.code === "MILDLY_SUS" ? "MILDLY SUS" : verdictObj.code,
    verdictDetails: {
      code: verdictObj.code,
      label: verdictObj.label,
      summary: verdictObj.summary,
      explanation: verdictObj.explanation,
      color: verdictObj.color
    },
    counts,
    vectors,
    totalDeduction: Math.round(totalDeduction),
    scoringVersion: scoring.version
  };
}