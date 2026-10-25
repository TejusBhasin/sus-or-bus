import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isEmail, makeSalt, makeToken, hashPassword, issueRecoveryCode, findAccountByEmail } from '../../shared/accountAuth.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!isEmail(email)) return Response.json({ error: 'Please enter a valid email address' }, { status: 400 });
    if (password.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    const existing = await findAccountByEmail(base44, email);
    if (existing) return Response.json({ error: 'An account with this email already exists — sign in instead' }, { status: 409 });

    const salt = makeSalt();
    const token = makeToken();
    await base44.asServiceRole.entities.ExtensionAccount.create({
      email,
      password_salt: salt,
      password_hash: await hashPassword(password, salt),
      token,
      whitelist: [],
      blacklist: []
    });

    // Every account also gets a single-use recovery code (stored unencrypted
    // so the owner can always be given it) so a lost password never means a
    // lost account.
    const recoveryCode = await issueRecoveryCode(base44, email);

    return Response.json({ token, email, whitelist: [], blacklist: [], recoveryCode });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}