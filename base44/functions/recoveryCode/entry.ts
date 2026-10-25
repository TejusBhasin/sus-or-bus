import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isEmail, makeSalt, hashPassword, issueRecoveryCode, findAccountByEmail } from '../../shared/accountAuth.ts';

// Recovery codes for Sus or Bus accounts. A code is a one-time secret that
// lets an account owner set a new password without the old one. Codes are
// stored unencrypted so the account owner can always be given a code
// directly.
//   - 'issue'  : admin-only. Generates a fresh single-use code for an
//                account and returns it.
//   - 'redeem' : guarded by the high-entropy code itself. Verifies the code,
//                burns it, sets the new password, issues the next code, and
//                returns a signed-in session. After 5 wrong tries the newest
//                code is burned.

const MAX_ATTEMPTS = 5;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const action = String(body.action || '');
    const email = String(body.email || '').trim().toLowerCase();

    if (action === 'issue') {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Only admins can issue recovery codes' }, { status: 403 });
      }
      if (!isEmail(email)) return Response.json({ error: 'Please enter a valid email address' }, { status: 400 });
      const account = await findAccountByEmail(base44, email);
      if (!account) return Response.json({ error: 'No account found with this email' }, { status: 404 });

      const code = await issueRecoveryCode(base44, email);
      return Response.json({ ok: true, email, code });
    }

    if (action === 'redeem') {
      const code = String(body.code || '').trim().toUpperCase();
      const newPassword = String(body.newPassword || '');
      if (!isEmail(email) || !code) return Response.json({ error: 'Enter your email and recovery code' }, { status: 400 });
      if (newPassword.length < 8) return Response.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
      if (/^[0-9a-f]{32}-[0-9a-f]{64}$/i.test(newPassword)) {
        return Response.json({ error: 'Choose a new password, not your account key again' }, { status: 400 });
      }

      const account = await findAccountByEmail(base44, email);
      if (!account) return Response.json({ error: 'No account found with this email' }, { status: 401 });

      const records = await base44.asServiceRole.entities.RecoveryCode.filter({ email, used: false });
      const now = Date.now();
      const active = (Array.isArray(records) ? records : records.items || [])
        .filter((r) => !r.expires || new Date(r.expires).getTime() > now)
        .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      if (active.length === 0) {
        return Response.json({ error: 'No active recovery code for this account — contact support for a new one' }, { status: 401 });
      }

      let matched = null;
      for (const rec of active) {
        if (String(rec.code || '').toUpperCase() === code) {
          matched = rec;
          break;
        }
      }

      if (!matched) {
        // Rate-limit guessing: burn the newest code after too many failures.
        const target = active[0];
        const attempts = (target.attempts || 0) + 1;
        await base44.asServiceRole.entities.RecoveryCode.update(target.id, {
          attempts,
          used: attempts >= MAX_ATTEMPTS
        });
        return Response.json({ error: 'That recovery code is not valid' }, { status: 401 });
      }

      // Single use: burn the code, rotate the password, and issue the next
      // code so the account always has a live one.
      await base44.asServiceRole.entities.RecoveryCode.update(matched.id, { used: true });
      const nextCode = await issueRecoveryCode(base44, email);
      const salt = makeSalt();
      await base44.asServiceRole.entities.ExtensionAccount.update(account.id, {
        password_salt: salt,
        password_hash: await hashPassword(newPassword, salt)
      });

      // Same contract as loginAccount, so the extension can merge its lists.
      if (body.source !== 'web') {
        await base44.asServiceRole.entities.ExtensionAccount.update(account.id, {
          last_synced_whitelist: account.whitelist || [],
          last_synced_blacklist: account.blacklist || []
        });
      }

      return Response.json({
        token: account.token,
        email: account.email,
        whitelist: account.whitelist || [],
        blacklist: account.blacklist || [],
        recoveryCode: nextCode
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}