// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/static-analyzer.js)
// Layer C: Static Document Analysis.

import { classifyThirdParty } from "./trackers.ts";
import { evaluateObservationRules } from "./engine.ts";
import { phishing, findings, renderTemplate } from "./knowledge/index.ts";

const findingMap = new Map();
for (const f of findings.findings) {
  findingMap.set(f.id, f);
}

/**
 * Lightweight, safe HTML element and attribute tokenizer.
 */
export function parseHtmlElements(html) {
  const elements = [];
  const tagRegex = /<\/?([a-zA-Z0-9:-]+)((?:\s+[^'">\s=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
  const attrRegex = /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const rawTag = match[1].toLowerCase();
    const isClosing = match[0].startsWith("</");
    const rawAttrs = match[2] || "";

    const attributes = {};
    if (!isClosing && rawAttrs) {
      let attrMatch;
      while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrVal = attrMatch[2] !== undefined ? attrMatch[2]
          : attrMatch[3] !== undefined ? attrMatch[3]
          : attrMatch[4] !== undefined ? attrMatch[4]
          : "";
        attributes[attrName] = attrVal;
      }
    }

    elements.push({
      tag: rawTag,
      isClosing,
      attributes,
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  return elements;
}

/**
 * Extracts visible plain text by stripping scripts, styles, comments, and tags.
 */
export function extractVisibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Scans static HTML, collects observations, and evaluates them through the rule engine.
 */
export function analyzeStaticDocument(html, targetHost, finalUrl = "") {
  const elements = parseHtmlElements(html);
  const text = extractVisibleText(html).toLowerCase();

  // Document metadata
  let title = "";
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
  }

  let metaRefreshContent = null;
  let canonicalUrl = null;

  // Trackers and script collections
  let inlineScriptsCount = 0;
  const externalScripts = [];
  const iframes = [];
  const forms = [];
  const thirdPartyTrackers = new Map();
  const scriptOrigins = new Set();

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.isClosing) continue;

    if (el.tag === "meta") {
      const httpEquiv = (el.attributes["http-equiv"] || "").toLowerCase();
      if (httpEquiv === "refresh") {
        metaRefreshContent = el.attributes["content"] || "";
      }
    } else if (el.tag === "link") {
      const rel = (el.attributes["rel"] || "").toLowerCase();
      if (rel === "canonical") {
        canonicalUrl = el.attributes["href"] || null;
      }
    } else if (el.tag === "script") {
      const src = el.attributes["src"];
      if (src) {
        externalScripts.push(src);
        try {
          const scriptUrl = new URL(src, finalUrl || "https://" + targetHost);
          scriptOrigins.add(scriptUrl.hostname.toLowerCase());
          const classification = classifyThirdParty(scriptUrl.href, targetHost);
          if (classification.isThirdParty) {
            thirdPartyTrackers.set(classification.domain, classification);
          }
        } catch {}
      } else {
        inlineScriptsCount++;
      }
    } else if (el.tag === "iframe") {
      const src = el.attributes["src"] || "";
      let isThirdParty = false;
      let frameHost = "";
      if (src && !src.startsWith("data:") && !src.startsWith("javascript:")) {
        try {
          const frameUrl = new URL(src, finalUrl || "https://" + targetHost);
          frameHost = frameUrl.hostname.toLowerCase();
          isThirdParty = frameHost !== targetHost && !frameHost.endsWith("." + targetHost);
        } catch {}
      }
      iframes.push({ src, isThirdParty, frameHost, sandbox: el.attributes["sandbox"] !== undefined });
    } else if (el.tag === "form") {
      const method = (el.attributes["method"] || "GET").toUpperCase();
      const action = el.attributes["action"] || "";
      let destinationUrl = null;
      let isCrossOrigin = false;
      let isInsecure = false;

      if (action) {
        try {
          destinationUrl = new URL(action, finalUrl || "https://" + targetHost);
          isCrossOrigin = destinationUrl.hostname.toLowerCase() !== targetHost.toLowerCase() &&
            !destinationUrl.hostname.toLowerCase().endsWith("." + targetHost.toLowerCase());
          isInsecure = destinationUrl.protocol === "http:";
        } catch {}
      }

      const inputs = [];
      let hasPassword = false;
      for (let j = i + 1; j < elements.length; j++) {
        if (elements[j].tag === "form" && elements[j].isClosing) break;
        if (elements[j].tag === "input" && !elements[j].isClosing) {
          const inputType = (elements[j].attributes["type"] || "text").toLowerCase();
          inputs.push(inputType);
          if (inputType === "password") hasPassword = true;
        }
      }

      forms.push({
        method,
        action,
        destinationUrl: destinationUrl ? destinationUrl.href : null,
        isCrossOrigin,
        isInsecure,
        hasPassword,
        inputs
      });
    }
  }

  // Evaluate form conditions
  const hasPasswordInput = /<input[^>]+type=["']password["']/i.test(html);
  const insecureForm = forms.find(f => f.hasPassword && (f.isInsecure || f.isCrossOrigin));

  // Script obfuscation check
  const hasScriptObfuscation = /(?:eval\s*\(\s*(?:unescape|atob|decodeURIComponent)\s*\(|document\.write\s*\(\s*unescape\s*\()/i.test(html);

  // Scam language match against knowledge base catalog
  const matchedScamPhrases = [];
  for (const item of phishing.scamKeywords) {
    if (text.includes(item.phrase)) {
      matchedScamPhrases.push(item.phrase);
    }
  }

  // Domain structure & brand impersonation check
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(targetHost);
  const freeTld = phishing.freeTlds.some(tld => targetHost.endsWith("." + tld));
  const hyphens = (targetHost.match(/-/g) || []).length;
  const isLong = targetHost.replace(/\./g, "").length > 30;
  const hasUnusualDomainStructure = freeTld || hyphens >= 3 || isLong;

  let brandMatched = null;
  let hasBrandImpersonation = false;
  for (const b of phishing.brands) {
    if (targetHost.includes(b) && targetHost !== b && !targetHost.endsWith("." + b + ".com") && !targetHost.endsWith("." + b + ".org")) {
      brandMatched = b;
      hasBrandImpersonation = true;
      break;
    }
  }

  const thirdPartyFrames = iframes.filter(f => f.isThirdParty);

  // Build normalized observations object for the Rule Engine
  const observations = {
    targetHost,
    finalUrl,
    protocol: finalUrl.startsWith("https:") ? "https:" : "http:",
    isIpLiteral: isIp,
    hasUnusualDomainStructure,
    unusualDomainDetail: `Free TLD: ${freeTld}, Hyphen count: ${hyphens}, Length: ${targetHost.length}`,
    hasBrandImpersonation,
    brandMatched,
    hasPasswordInput,
    hasInsecureOrCrossOriginPasswordForm: Boolean(insecureForm),
    passwordFormAction: insecureForm ? insecureForm.action : "",
    passwordFormDestinationDetail: insecureForm ? (insecureForm.isInsecure ? "plain HTTP" : "cross-origin domain") : "",
    hasMetaRefresh: Boolean(metaRefreshContent),
    metaRefreshContent,
    scripts: {
      total: externalScripts.length + inlineScriptsCount,
      external: externalScripts.length,
      inline: inlineScriptsCount,
      distinctOrigins: Array.from(scriptOrigins)
    },
    hasScriptObfuscation,
    scriptObfuscationPattern: "eval(unescape(...)) or eval(atob(...)) unpacker",
    thirdPartyIframesCount: thirdPartyFrames.length,
    thirdPartyIframeDomains: thirdPartyFrames.map(f => f.frameHost || "external").slice(0, 3).join(", "),
    hasScamKeywords: matchedScamPhrases.length > 0,
    scamPhrasesMatched: matchedScamPhrases.join(", ")
  };

  // Evaluate rules in Rule Engine
  const { findings: engineFindings } = evaluateObservationRules(observations);

  // Content topics analysis (deterministic word frequency)
  const topicFindings = [];
  const topics = {
    gambling: { level: "warning", words: ["casino", "jackpot", "odds", "wager", "poker", "betting", "roulette"] },
    crypto: { level: "warning", words: ["bitcoin", "crypto", "blockchain", "wallet", "token", "airdrop", "defi"] },
    finance: { level: "warning", words: ["loan", "interest rate", "credit score", "mortgage", "debt relief"] },
    adult: { level: "warning", words: ["adult content", "xxx", "webcam", "nsfw"] },
    shopping: { level: "good", words: ["cart", "checkout", "shipping", "add to cart", "order now", "free shipping"] },
    news: { level: "good", words: ["breaking news", "headlines", "subscribe", "editorial"] }
  };

  const countWord = (hay, w) => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    const m = hay.match(new RegExp("\\b" + escaped + "\\b", "g"));
    return m ? m.length : 0;
  };

  const topicDef = findingMap.get("CONTENT_TOPIC_DETECTED");
  for (const [topic, info] of Object.entries(topics)) {
    const matched = info.words.map(w => ({ w, n: countWord(text, w) })).filter(h => h.n > 0);
    if (matched.length === 0) continue;
    const evidenceStr = matched.map(h => `'${h.w}' x${h.n}`).join(", ");
    if (topicDef) {
      const vars = { topic, evidenceStr, title: title || "" };
      const fTitle = renderTemplate(topicDef.titleTemplate, vars);
      const fSummary = renderTemplate(topicDef.summaryTemplate, vars);
      const fEvidence = renderTemplate(topicDef.evidenceTemplate, vars);

      topicFindings.push({
        id: `topic-${topic}`,
        category: "topic",
        title: fTitle,
        summary: fSummary,
        evidence: fEvidence,
        whyItMatters: renderTemplate(topicDef.whyItMattersTemplate, vars),
        recommendation: renderTemplate(topicDef.recommendationTemplate, vars),
        severity: info.level === "good" ? "informational" : "low",
        confidence: "medium",
        source: topicDef.source,
        status: "detected",
        level: info.level,
        simple: fSummary,
        nerd: fEvidence
      });
    }
  }

  return {
    findings: [...engineFindings, ...topicFindings],
    meta: {
      title,
      canonicalUrl,
      metaRefresh: metaRefreshContent
    },
    trackers: Array.from(thirdPartyTrackers.values()),
    scripts: observations.scripts,
    forms,
    iframes
  };
}