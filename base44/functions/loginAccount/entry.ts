import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isEmail, hashPassword, findAccountByEmail } from '../../shared/accountAuth.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!isEmail(email) || !password) return Response.json({ error: 'Enter your email and password' }, { status: 400 });

    const account = await findAccountByEmail(base44, email);
    if (!account) return Response.json({ error: 'No account found with this email' }, { status: 401 });

    // Account-key sign-in: the password field can hold the account's own
    // "salt-hash" key instead of a password. On an exact match the sign-in
    // succeeds, but the client is told to collect a new password.
    const keyLogin = /^[0-9a-f]{32}-[0-9a-f]{64}$/i.test(password);
    let mustSetPassword = false;
    if (keyLogin) {
      if (password.toLowerCase() !== `${account.password_salt}-${account.password_hash}`) {
        return Response.json({ error: 'That account key does not match this email' }, { status: 401 });
      }
      mustSetPassword = true;
    } else {
      const hash = await hashPassword(password, account.password_salt);
      if (hash !== account.password_hash) return Response.json({ error: 'Wrong password' }, { status: 401 });
    }

    // When the extension signs in, it merges the returned lists into its
    // local storage — so remember them as the extension's known view. The
    // website marks its own sign-ins with source: "web" and is skipped.
    if (body.source !== 'web') {
      await base44.asServiceRole.entities.ExtensionAccount.update(account.id, {
        last_synced_whitelist: account.whitelist || [],
        last_synced_blacklist: account.blacklist || []
      });
    }

    return Response.json({
      mustSetPassword,
      token: account.token,
      email: account.email,
      whitelist: account.whitelist || [],
      blacklist: account.blacklist || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}