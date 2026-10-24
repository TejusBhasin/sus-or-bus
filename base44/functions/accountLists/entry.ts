import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { findAccountByToken, sanitizeList } from '../../shared/accountAuth.ts';

// Sync rules for the account lists.
//
// The extension always sends its FULL local lists on a push. If we just
// replaced the account's lists with that push, anything added from the
// website since the extension last synced would be wiped out. So instead:
//
//  - Extension pushes ("source" absent): MERGE, never blindly replace.
//    New = (server ∪ pushed) minus the items the extension previously had
//    and dropped (that's how its un-blacklist stays intentional).
//    "Previously had" is tracked in last_synced_* — the lists the extension
//    was last known to have seen (set on every pull and login, and to the
//    pushed lists after each push).
//  - Extension pulls (token only): return the current lists and remember
//    them as the extension's known view.
//  - Website calls ("source": "web"): explicit add/remove deltas applied to
//    the current server lists — never touches the extension's known view.

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
    const update = {};

    if (body.source === 'web') {
      // Website: apply explicit adds/removes as deltas.
      const addWl = sanitizeList(body.add && body.add.whitelist, []);
      const addBl = sanitizeList(body.add && body.add.blacklist, []);
      const remWl = sanitizeList(body.remove && body.remove.whitelist, []);
      const remBl = sanitizeList(body.remove && body.remove.blacklist, []);
      if (addWl.length || addBl.length || remWl.length || remBl.length) {
        whitelist = [...new Set([...whitelist, ...addWl])].filter((o) => !remWl.includes(o));
        blacklist = [...new Set([...blacklist, ...addBl])].filter((o) => !remBl.includes(o));
        update.whitelist = whitelist;
        update.blacklist = blacklist;
      }
    } else if (Array.isArray(body.whitelist) || Array.isArray(body.blacklist)) {
      // Extension push: merge so website-added items survive, but honor the
      // items the extension intentionally dropped (un-blacklist).
      const pWl = sanitizeList(body.whitelist, whitelist);
      const pBl = sanitizeList(body.blacklist, blacklist);
      const knownWl = account.last_synced_whitelist || [];
      const knownBl = account.last_synced_blacklist || [];
      whitelist = [...new Set([...whitelist, ...pWl])].filter(
        (o) => pWl.includes(o) || !knownWl.includes(o)
      );
      blacklist = [...new Set([...blacklist, ...pBl])].filter(
        (o) => pBl.includes(o) || !knownBl.includes(o)
      );
      update.whitelist = whitelist;
      update.blacklist = blacklist;
      update.last_synced_whitelist = pWl;
      update.last_synced_blacklist = pBl;
    } else {
      // Extension pull: it is about to receive these lists — remember them
      // as the extension's known view so future pushes can tell intentional
      // removals apart from items it simply hasn't seen yet.
      update.last_synced_whitelist = whitelist;
      update.last_synced_blacklist = blacklist;
    }

    if (Object.keys(update).length > 0) {
      await base44.asServiceRole.entities.ExtensionAccount.update(account.id, update);
    }

    return Response.json({
      email: account.email,
      created: account.created_date,
      whitelist,
      blacklist,
      hasPassword: account.has_password !== false,
      identities: account.linked_identities || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}