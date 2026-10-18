// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/knowledge/index.js)
// Structured knowledge base entry point.

import {
  validateKnowledgeBase,
  metadata,
  messages,
  verdicts,
  scoring,
  domains,
  phishing,
  policyLexicon,
  findings,
  rules
} from "./validator.ts";
import { renderTemplate, escapeHtml } from "./renderer.ts";

export {
  validateKnowledgeBase,
  metadata,
  messages,
  verdicts,
  scoring,
  domains,
  phishing,
  policyLexicon,
  findings,
  rules,
  renderTemplate,
  escapeHtml
};