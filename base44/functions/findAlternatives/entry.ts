import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { creditFreezeActive, creditFreezeResponse } from '../../shared/creditFreeze.ts';

export default async function(req: Request): Promise<Response> {
  try {
    if (creditFreezeActive()) return creditFreezeResponse();
    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url || url.length > 500) {
      return Response.json({ error: 'A website URL is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        `The web-safety checker "Sus or Bus" flagged the website "${url}" as unsafe or suspicious (verdict: SUS). ` +
        `The user was trying to visit it. Suggest 3 to 5 alternative websites that are well-known, reputable and safe ` +
        `and that serve the same purpose as the flagged site. For example: if it is a shady online store, suggest trusted ` +
        `retailers or the brand's official store; if it is a suspicious download site, suggest the official vendor page; ` +
        `if it is a fake login page, suggest the real service. Only suggest websites you are confident are legitimate. ` +
        `For each one return the site name, its full https:// URL, and a one-sentence reason why it is a good, safe ` +
        `alternative. Never suggest the flagged site itself or any domain of it.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          alternatives: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                reason: { type: 'string' }
              },
              required: ['name', 'url', 'reason']
            }
          }
        },
        required: ['alternatives']
      }
    });

    const alternatives = (Array.isArray(result?.alternatives) ? result.alternatives : [])
      .filter((a) => a && typeof a.url === 'string' && /^https?:\/\//i.test(a.url))
      .slice(0, 5)
      .map((a) => ({ name: String(a.name || a.url), url: a.url, reason: String(a.reason || '') }));

    return Response.json({ alternatives });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to find alternatives' }, { status: 500 });
  }
}