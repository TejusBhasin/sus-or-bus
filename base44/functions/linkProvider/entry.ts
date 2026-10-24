import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { findAccountByToken, findAccountByIdentity } from '../../shared/accountAuth.ts';

// Connects one more sign-in provider (Google / Microsoft / Apple) to the
// already-signed-in Sus or Bus account, so the user can sign in with any of
// them and reach the same account. The identity being connected comes from
// the caller's platform session; the client only supplies which provider
// button was clicked (used as a display label).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.email) {
      return Response.json({ error: 'Finish the provider sign-in first' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || '');
    const provider = ['google', 'microsoft', 'apple'].includes(body.provider) ? String(body.provider) : 'provider';

    const account = await findAccountByToken(base44, token);
    if (!account) return Response.json({ error: 'Session expired — sign in again' }, { status: 401 });

    const email = String(user.email).trim().toLowerCase();

    // The identity must not belong to a different account.
    if (email !== account.email) {
      const other = await findAccountByIdentity(base44, email);
      if (other && other.id !== account.id) {
        return Response.json({ error: 'That email is already connected to another Sus or Bus account' }, { status: 409 });
      }
    }

    // Add (or refresh) the {provider, email} identity.
    const identities = (account.linked_identities || []).filter(
      (i) => !(i && String(i.email || '').toLowerCase() === email && i.provider === provider)
    );
    identities.push({ provider, email });

    const update = { linked_identities: identities };
    if (email !== account.email) {
      update.linked_emails = [...new Set([...(account.linked_emails || []), email])];
    }
    await base44.asServiceRole.entities.ExtensionAccount.update(account.id, update);

    return Response.json({ identities, connectedEmail: email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}