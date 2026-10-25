import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { makeToken, hashPassword, issueRecoveryCode, findAccountByIdentity, sanitizeList } from '../../shared/accountAuth.ts';

// Signs the caller into their Sus or Bus account using their platform
// provider session (Google / Microsoft / Apple). The account matches on the
// caller's email — as the account's primary address OR as any provider
// identity previously connected to it — so every linked provider reaches the
// same account. The identity always comes from the platform session, never
// from a client-supplied email.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.email) {
      return Response.json({ error: 'Sign in with Google, Microsoft, or Apple first' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const provider = ['google', 'microsoft', 'apple'].includes(body.provider) ? String(body.provider) : 'provider';

    const email = String(user.email).trim().toLowerCase();
    const existing = await findAccountByIdentity(base44, email);

    if (existing) {
      // Existing account (created here, in the extension, or via another
      // provider): link this sign-in to it by rotating the session token.
      const token = makeToken();
      await base44.asServiceRole.entities.ExtensionAccount.update(existing.id, { token });
      return Response.json({
        token,
        email: existing.email,
        whitelist: sanitizeList(existing.whitelist, []),
        blacklist: sanitizeList(existing.blacklist, []),
        mustSetPassword: existing.has_password === false,
        hasPassword: existing.has_password !== false,
        identities: existing.linked_identities || []
      });
    }

    // New provider account: no password is set yet (the user picks one right
    // after on the site so the extension can sign in too), and a single-use
    // recovery code is issued so the account is never lost.
    const token = makeToken();
    const salt = makeToken().slice(0, 32);
    const lockout = makeToken(); // unknown value: password sign-in stays impossible until the user sets one
    await base44.asServiceRole.entities.ExtensionAccount.create({
      email,
      password_salt: salt,
      password_hash: await hashPassword(lockout, salt),
      token,
      whitelist: [],
      blacklist: [],
      has_password: false,
      linked_identities: [{ provider, email }]
    });

    const recoveryCode = await issueRecoveryCode(base44, email);

    return Response.json({
      token,
      email,
      whitelist: [],
      blacklist: [],
      mustSetPassword: true,
      hasPassword: false,
      identities: [{ provider, email }],
      recoveryCode
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}