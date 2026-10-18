// Ported from https://github.com/TejusBhasin/SusOrBus-Basic-HC-Capitol (sus-or-bus/lib/knowledge/renderer.js)
// Deterministic template renderer.

/**
 * Escapes HTML characters in variable values to prevent untrusted remote
 * website content (e.g., page titles, form actions, keywords) from injecting HTML.
 */
export function escapeHtml(str) {
  if (typeof str !== "string") str = String(str ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Deterministic template renderer.
 * Safely interpolates placeholders `{key}` from provided variables.
 * Enforces type validation, prevents code execution, and applies context escaping.
 */
export function renderTemplate(templateString, variables = {}, schema = {}, options = {}) {
  if (typeof templateString !== "string") {
    return "";
  }

  const escapeOutput = options.escapeHtml !== false;
  const strict = options.strict === true;

  return templateString.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = variables[key];

    if (value === undefined || value === null) {
      if (strict) {
        throw new Error(`Template rendering error: Missing required placeholder '${key}'`);
      }
      return match;
    }

    // Type validation against declared schema if provided
    const expectedType = schema[key];
    if (expectedType) {
      if (expectedType === "integer") {
        if (!Number.isInteger(Number(value))) {
          if (strict) throw new TypeError(`Placeholder '${key}' expected integer, got '${value}'`);
        }
      } else if (expectedType === "string") {
        if (typeof value !== "string" && typeof value !== "number") {
          if (strict) throw new TypeError(`Placeholder '${key}' expected string, got ${typeof value}`);
        }
      }
    }

    const stringVal = String(value);
    return escapeOutput ? escapeHtml(stringVal) : stringVal;
  });
}