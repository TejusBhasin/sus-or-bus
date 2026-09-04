// Shared helpers for the optional Sus or Bus account (extension + website).
// Account records live in the ExtensionAccount entity and are only ever
// touched by backend functions with the service role.

const encoder = new TextEncoder();

export function isEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function makeSalt() {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function makeToken() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, salt) {
  const data = encoder.encode(salt + ':' + password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function findAccountByEmail(base44, email) {
  const accounts = await base44.asServiceRole.entities.ExtensionAccount.filter({ email });
  return accounts.length > 0 ? accounts[0] : null;
}

export async function findAccountByToken(base44, token) {
  const accounts = await base44.asServiceRole.entities.ExtensionAccount.filter({ token });
  return accounts.length > 0 ? accounts[0] : null;
}

// Site lists are http(s) origins, deduplicated, capped at 500 entries.
export function sanitizeList(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const out = [];
  for (const item of value) {
    const s = String(item || '').trim();
    if (s.length > 0 && s.length <= 200 && /^https?:\/\/[^\s/]+$/i.test(s) && !out.includes(s)) out.push(s);
    if (out.length >= 500) break;
  }
  return out;
}