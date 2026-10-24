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

// Finds the account that owns an email — as its primary address or as any
// provider identity previously connected to it — so signing in with any
// linked provider reaches the same account.
export async function findAccountByIdentity(base44, email) {
  const linked = await base44.asServiceRole.entities.ExtensionAccount.filter({ linked_emails: email });
  if (linked.length > 0) return linked[0];
  return findAccountByEmail(base44, email);
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

// Recovery codes: high-entropy, single-use, shown to the user exactly once.
// Only the salt and hash are ever stored — never the code itself.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function makeRecoveryCode() {
  const groups = [];
  for (let g = 0; g < 4; g++) {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    let s = '';
    for (let i = 0; i < 5; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    groups.push(s);
  }
  return groups.join('-');
}