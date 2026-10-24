import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { makeSalt, makeToken, hashPassword, makeRecoveryCode, findAccountByEmail, sanitizeList } from '../../shared/accountAuth.ts';

// Links a platform provider sign-in (Google / Microsoft / Apple) to the
// optional Sus or Bus account. The caller's identity comes from their
// platform session — never from a client-supplied email.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.email) {
      return Response.json({ error: 'Sign in with Google, Microsoft, or Apple first' }, { status: 401 });
    }

    const email = String(user.email).trim().toLowerCase();
    const existing = await findAccountByEmail(base44, email);

    if (existing) {
      // Existing account (created here or in the extension): link this
      // provider sign-in to it by rotating the session token.
      const token = makeToken();
      await base44.asServiceRole.entities.ExtensionAccount.update(existing.id, { token });
      return Response.json({
        token,
        email,
        whitelist: sanitizeList(existing.whitelist, []),
        blacklist: sanitizeList(existing.blacklist, []),
        mustSetPassword: false
      });
    }

    // New provider account: no password is set yet (the user picks one right
    // after on the site so the extension can sign in too), and a single-use
    // recovery code is issued so the account is never lost.
    const token = makeToken();
    const salt = makeSalt();
    const lockout = makeToken(); // unknown value: password sign-in stays impossible until the user sets one
    await base44.asServiceRole.entities.ExtensionAccount.create({
      email,
      password_salt: salt,
      password_hash: await hashPassword(lockout, salt),
      token,
      whitelist: [],
      blacklist: []
    });

    const recoveryCode = makeRecoveryCode();
    const recoverySalt = makeSalt();
    await base44.asServiceRole.entities.RecoveryCode.create({
      email,
      code_salt: recoverySalt,
      code_hash: await hashPassword(recoveryCode, recoverySalt),
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      used: false,
      attempts: 0
    });

    return Response.json({ token, email, whitelist: [], blacklist: [], mustSetPassword: true, recoveryCode });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}