import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { makeSalt, hashPassword, findAccountByToken } from '../../shared/accountAuth.ts';

// Sets a new password for the signed-in account. Used after someone signs
// in with their account key (salt-hash) instead of a password: the new
// salt and hash replace the old key, so it can never be used again.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const token = String(body.token || '');
    const newPassword = String(body.newPassword || '');

    if (!token) return Response.json({ error: 'Not signed in' }, { status: 401 });
    if (newPassword.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    if (/^[0-9a-f]{32}-[0-9a-f]{64}$/i.test(newPassword)) {
      return Response.json({ error: 'Choose a new password, not your account key again' }, { status: 400 });
    }

    const account = await findAccountByToken(base44, token);
    if (!account) return Response.json({ error: 'Session expired — sign in again' }, { status: 401 });

    const salt = makeSalt();
    await base44.asServiceRole.entities.ExtensionAccount.update(account.id, {
      password_salt: salt,
      password_hash: await hashPassword(newPassword, salt)
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}