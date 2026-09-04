import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { findAccountByToken, sanitizeList } from '../../shared/accountAuth.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const token = String(body.token || '');

    if (!token) return Response.json({ error: 'Not signed in' }, { status: 401 });

    const account = await findAccountByToken(base44, token);
    if (!account) return Response.json({ error: 'Session expired — sign in again' }, { status: 401 });

    let whitelist = account.whitelist || [];
    let blacklist = account.blacklist || [];

    if (Array.isArray(body.whitelist) || Array.isArray(body.blacklist)) {
      whitelist = sanitizeList(body.whitelist, whitelist);
      blacklist = sanitizeList(body.blacklist, blacklist);
      await base44.asServiceRole.entities.ExtensionAccount.update(account.id, { whitelist, blacklist });
    }

    return Response.json({ email: account.email, created: account.created_date, whitelist, blacklist });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}