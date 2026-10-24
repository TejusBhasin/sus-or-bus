import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public, read-only live configuration for the published browser extension.
// The extension fetches this and merges it over its baked-in defaults. It is
// DATA only — never code — which keeps the extension compliant with the
// Chrome Web Store's remote-code policy: the owner can change these values
// (trusted domains, scan cache settings, popup announcement) without
// republishing, because no executable logic is downloaded.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Deliberately public read of non-sensitive settings; the entity itself
    // stays admin-only so it can only be changed through saveExtensionConfig.
    const page = await base44.asServiceRole.entities.ExtensionConfig.list({ sort: '-created_date', limit: 1 });
    const record = page.items && page.items[0];
    return Response.json({
      config: record
        ? {
            trusted_domains: record.trusted_domains || [],
            cache_days: record.cache_days,
            max_cache_entries: record.max_cache_entries,
            announcement: record.announcement || ''
          }
        : {},
      version: record ? String(record.updated_date || record.created_date || '') : ''
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}