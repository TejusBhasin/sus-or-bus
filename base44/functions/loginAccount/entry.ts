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

    const hash = await hashPassword(password, account.password_salt);
    if (hash !== account.password_hash) return Response.json({ error: 'Wrong password' }, { status: 401 });

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
      token: account.token,
      email: account.email,
      whitelist: account.whitelist || [],
      blacklist: account.blacklist || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}