import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Owner-only editor for the live extension configuration. Publishes the
// values the extension fetches via extensionConfig — no store republish
// needed for these changes.
function clampNum(value, lo, hi, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Sign in first' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Owner access only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    const trustedDomains = [...new Set(
      (Array.isArray(body.trusted_domains) ? body.trusted_domains : [])
        .map((d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, ''))
        .filter((d) => d.length > 0 && d.length <= 100)
    )].slice(0, 2000);

    const config = {
      trusted_domains: trustedDomains,
      cache_days: clampNum(body.cache_days, 1, 90, 7),
      max_cache_entries: clampNum(body.max_cache_entries, 50, 5000, 500),
      announcement: String(body.announcement || '').trim().slice(0, 500)
    };

    const page = await base44.asServiceRole.entities.ExtensionConfig.list({ sort: '-created_date', limit: 1 });
    if (page.items && page.items[0]) {
      await base44.asServiceRole.entities.ExtensionConfig.update(page.items[0].id, config);
    } else {
      await base44.asServiceRole.entities.ExtensionConfig.create(config);
    }

    return Response.json({ ok: true, config });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}