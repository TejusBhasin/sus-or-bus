import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { SUMMARY_KEYS, VARIANTS_PER_KEY, expandSummaryVariant } from '../../shared/wordBank.ts';

// One-time seeder: expands the fragment bank into 500 concrete summary
// variants per key and stores them in the WordingBank database. Re-runnable:
// clears each key first.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const seeded: Record<string, number> = {};

    for (const key of SUMMARY_KEYS) {
      await base44.asServiceRole.entities.WordingBank.deleteMany({ key });
      const rows: Array<{ key: string; idx: number; text: string }> = [];
      for (let i = 0; i < VARIANTS_PER_KEY; i++) {
        rows.push({ key, idx: i, text: expandSummaryVariant(key, i) });
      }
      for (let i = 0; i < rows.length; i += 250) {
        await base44.asServiceRole.entities.WordingBank.bulkCreate(rows.slice(i, i + 250));
      }
      seeded[key] = rows.length;
    }

    return Response.json({ seeded, total: Object.values(seeded).reduce((a: number, b: number) => a + b, 0) });
  } catch (error) {
    return Response.json({ error: error?.message || 'Seeding failed' }, { status: 500 });
  }
}