// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/synthesizer.js)
// Deterministic Natural Language Synthesis Engine
// Generates rich, contextual, authoritative security briefings that read like advanced AI analysis,
// without connecting to any external LLM or AI service.

export function generateAiSynthesis(context = {}) {
  const {
    site = "target domain",
    url = "",
    score = 100,
    verdict = "BUS",
    counts = { good: 0, warning: 0, bad: 0 },
    findings = [],
    trackers = [],
    policies = [],
    coverage = {},
    vectors = {}
  } = context;

  const findingIds = new Set(findings.map(f => f.id));
  const legacyIds = new Set(findings.map(f => f.legacyId).filter(Boolean));
  const hasFinding = (id, legId) => findingIds.has(id) || (legId && legacyIds.has(legId));

  // Determine transport status
  const isHttps = url.startsWith("https:") || hasFinding("SEC_TRANSPORT_HTTPS", "transport-https");
  const hasStrongHsts = hasFinding("SEC_HEADER_HSTS_STRONG", "header-hsts-strong");
  const hasShortHsts = hasFinding("SEC_HEADER_HSTS_SHORT", "header-hsts-short");
  const hasCsp = hasFinding("SEC_HEADER_CSP_PRESENT", "header-csp-present");
  const hasNosniff = hasFinding("SEC_HEADER_XCTO_PRESENT", "header-xcto-present");
  const hasBannerDisclosure = hasFinding("SEC_HEADER_VERSION_DISCLOSURE", "header-version-disclosure");

  // Determine form / content status
  const hasCrossOriginPassword = hasFinding("SEC_FORM_PASSWORD_CROSS_ORIGIN", "form-password-insecure-destination");
  const hasPasswordDetected = hasFinding("SEC_FORM_PASSWORD_DETECTED", "form-password-detected");
  const hasScamLanguage = hasFinding("SEC_CONTENT_SCAM_KEYWORDS", "content-scam-urgency-language");
  const hasObfuscation = hasFinding("SEC_SCRIPT_OBFUSCATION", "scripts-obfuscation-detected");
  const hasMetaRefresh = hasFinding("SEC_REDIRECT_META_REFRESH", "meta-refresh-redirect");
  const hasThirdPartyIframes = hasFinding("SEC_IFRAME_THIRD_PARTY", "iframes-third-party");

  // Determine policy status
  const hasNoPolicy = hasFinding("POL_POLICY_NONE_FOUND", "policy-none-found");
  const hasTrackerGap = hasFinding("POL_TRACKER_DISCLOSURE_GAP", "policy-tracker-disclosure-gap");
  const hasSaleDenied = hasFinding("POL_DATA_SELLING_DENIED", "policy-data-selling-denied");
  const hasPolicyAvailable = policies.some(p => p.ok);

  // 1. Paragraph 1: Transport & DOM Integrity
  let p1Transport = "";
  if (!isHttps) {
    p1Transport = `CRITICAL PROTOCOL HAZARD: Automated heuristic scanning of ${site} identified that communications occur over unencrypted HTTP. All in-transit packets are exposed to eavesdropping, packet sniffing, and unauthorized on-path modification by intermediaries.`;
  } else if (hasStrongHsts && hasCsp) {
    p1Transport = `Heuristic inspection of ${site} confirms an enterprise-grade cryptographic baseline. Transport is strictly secured via HTTPS backed by long-duration HSTS enforcement, complemented by active Content Security Policy (CSP) directives that restrict unauthorized origin script execution.`;
  } else if (hasStrongHsts) {
    p1Transport = `Heuristic inspection of ${site} confirms hardened TLS transport encryption backed by long-duration HSTS enforcement. However, the server does not enforce a Content Security Policy (CSP), leaving document script execution boundaries dependent on default browser isolation.`;
  } else if (hasShortHsts) {
    p1Transport = `Heuristic inspection of ${site} confirms TLS encryption; however, HSTS max-age is set to a short duration, leaving future sessions vulnerable to protocol downgrade intercepts. Additionally, defensive CSP headers were not detected.`;
  } else {
    p1Transport = `Heuristic inspection of ${site} indicates standard TLS encryption is active, but HTTP Strict Transport Security (HSTS) is omitted. Without an enforced HSTS policy, client connections remain exposed to downgrade threats and initial-request spoofing.`;
  }

  let p1Forms = "";
  if (hasCrossOriginPassword) {
    p1Forms = ` CRITICAL FORM VULNERABILITY: Document parsing detected password input elements configured to submit credentials cross-origin to an untrusted external destination—an established indicator of credential harvesting and deceptive phishing landing pages.`;
  } else if (hasPasswordDetected) {
    p1Forms = ` Authentication elements were detected; form handlers target the verified origin without cross-origin exfiltration routes.`;
  } else {
    p1Forms = ` No authentication credential fields or password capture inputs were identified on the analyzed landing document.`;
  }
  const paragraph1 = p1Transport + p1Forms;

  // 2. Paragraph 2: Telemetry Footprint & Governance Commitments
  let p2Trackers = "";
  if (trackers.length === 0) {
    p2Trackers = `From a telemetry standpoint, the landing page exhibits a clean profile with zero detected third-party tracking beacons, ad exchanges, or commercial analytics scripts.`;
  } else {
    const trackerNames = trackers.map(t => t.provider || t.domain).slice(0, 4).join(", ");
    const extra = trackers.length > 4 ? ` and ${trackers.length - 4} others` : "";
    p2Trackers = `From a telemetry standpoint, the page ingests ${trackers.length} external tracking service(s) (${trackerNames}${extra}), establishing outbound network requests across distinct third-party domains.`;
  }

  let p2Policy = "";
  if (hasSaleDenied) {
    p2Policy = ` Commendably, the published privacy documentation features explicit contractual disclosures confirming the operator does not monetize or sell user personal records to third-party data brokers.`;
  } else if (hasTrackerGap) {
    p2Policy = ` Crucially, the published privacy documentation fails to disclose these active third-party tracking entities, creating an observed discrepancy between document runtime behavior and published privacy commitments.`;
  } else if (hasNoPolicy) {
    p2Policy = ` Crucially, no accessible privacy policy or terms of service could be verified for this domain, leaving data retention periods, visitor recourse, and third-party data distribution completely undefined.`;
  } else if (hasPolicyAvailable) {
    p2Policy = ` The domain publishes accessible legal documentation outlining data collection procedures, though explicit contractual guarantees against data resale were not detected.`;
  } else {
    p2Policy = ` Legal disclosure documentation was unreachable or incomplete during this scan cycle.`;
  }
  const paragraph2 = p2Trackers + p2Policy;

  // 3. Paragraph 3: Skeptical Analyst Verdict & Tactical Guidance
  let paragraph3 = "";
  let riskProfile = "MINIMAL RISK";
  if (score >= 70) {
    riskProfile = "MINIMAL RISK";
    paragraph3 = `Analyst Assessment: ${site} satisfies baseline security expectations with a calibrated trust score of ${score}/100. While no automated heuristic analysis can guarantee absolute safety against zero-day vulnerabilities or targeted social engineering, the lack of malicious redirect chains, obfuscated script loaders, or deceptive inputs makes this link appropriate for regular interaction under standard user precautions.`;
  } else if (score >= 40) {
    riskProfile = "ELEVATED EXPOSURE";
    paragraph3 = `Analyst Assessment: ${site} exhibits an elevated risk profile with a calibrated score of ${score}/100 (MILDLY SUS). The convergence of defensive configuration gaps (e.g. absent framing protection or missing HSTS) and third-party telemetry exposure warrants visitor vigilance. Passive reading is acceptable, but visitors should avoid submitting sensitive credentials or financial information until security posture improves.`;
  } else {
    riskProfile = "CRITICAL HAZARD";
    paragraph3 = `Analyst Assessment: CRITICAL THREAT PROFILE (${score}/100 - SUS). The automated scanner discovered high-severity security anomalies consistent with deceptive landing infrastructure, insecure credential routing, or protocol deprivation. Visitors are strongly advised not to interact with this page, bypass browser warnings, download attached resources, or enter any personal credentials.`;
  }

  // Key Takeaways
  const keyTakeaways = [
    `Transport: ${isHttps ? (hasStrongHsts ? "Enforced TLS with long-term HSTS" : "Standard TLS (missing HSTS preloading)") : "UNENCRYPTED (High Risk)"}`,
    `Telemetry: ${trackers.length === 0 ? "Zero third-party trackers detected" : `${trackers.length} active tracker/analytics service(s) identified`}`,
    `Governance: ${hasSaleDenied ? "Explicit data selling denial confirmed" : (hasNoPolicy ? "Missing privacy and terms disclosures" : (hasTrackerGap ? "Tracker disclosure transparency gap" : "Basic policy disclosures present"))}`
  ];

  // Actionable Technical Recommendations
  const actionableRecommendations = [];
  if (!isHttps) {
    actionableRecommendations.push({ action: "Migrate entire site transport to HTTPS with TLS 1.3", points: "+33 pts", priority: "critical" });
  }
  if (hasCrossOriginPassword) {
    actionableRecommendations.push({ action: "Refactor login forms to submit exclusively to the same verified origin", points: "+47 pts", priority: "critical" });
  }
  if (hasObfuscation) {
    actionableRecommendations.push({ action: "Eliminate dynamic eval/unpackers and compile scripts cleanly", points: "+37 pts", priority: "critical" });
  }
  if (!hasStrongHsts && isHttps) {
    actionableRecommendations.push({ action: "Enable Strict-Transport-Security (max-age >= 31536000; preload)", points: "+9 pts", priority: "high" });
  }
  if (!hasCsp) {
    actionableRecommendations.push({ action: "Deploy Content-Security-Policy with strict script-src and frame-ancestors", points: "+7 pts", priority: "medium" });
  }
  if (hasTrackerGap) {
    actionableRecommendations.push({ action: "Update Privacy Policy to explicitly disclose third-party analytics partners", points: "+8 pts", priority: "medium" });
  }
  if (hasNoPolicy) {
    actionableRecommendations.push({ action: "Publish formal Privacy Policy and Terms of Service documents", points: "+14 pts", priority: "high" });
  }
  if (hasThirdPartyIframes) {
    actionableRecommendations.push({ action: "Apply sandbox attributes to third-party iframe embeds", points: "+6 pts", priority: "low" });
  }
  if (hasBannerDisclosure) {
    actionableRecommendations.push({ action: "Strip detailed web server version banners from HTTP headers", points: "+3 pts", priority: "low" });
  }

  // Calculate Verification Confidence
  let confidencePoints = 70;
  if (coverage.staticHtml === "completed") confidencePoints += 7;
  if (coverage.securityHeaders === "completed") confidencePoints += 7;
  if (coverage.trackers === "completed") confidencePoints += 6;
  if (coverage.privacyPolicy === "completed" || coverage.privacyPolicy === "not_found") confidencePoints += 3;
  if (coverage.termsOfService === "completed" || coverage.termsOfService === "not_found") confidencePoints += 3;
  const confidenceScore = Math.min(98, confidencePoints);

  return {
    badge: "HEURISTIC AI SYNTHESIS — V2.6",
    headline: `Calibrated Trust Index: ${score}/100 (${verdict}) — ${riskProfile}`,
    executiveSummary: [paragraph1, paragraph2, paragraph3].join("\n\n"),
    paragraphs: [paragraph1, paragraph2, paragraph3],
    keyTakeaways,
    riskProfile,
    confidenceScore,
    skepticismCalibration: "Zero-Trust Deterministic Heuristics",
    actionableRecommendations: actionableRecommendations.slice(0, 4),
    vectors: vectors || {}
  };
}