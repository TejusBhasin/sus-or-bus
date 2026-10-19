// The ONLY module in the dashboard that talks to a backend. To migrate the
// dashboard elsewhere, replace the body of loadScanStats() with a call to
// your own storage — the components consume the plain object it returns.
import { base44 } from '@/api/base44Client';

// Summarizes saved verdicts per day, per verdict, plus the average score —
// one server-side aggregation, no per-record reads, no AI, no credits.
export async function loadScanStats() {
  const res = await base44.entities.Report.aggregate({
    groupBy: 'verdict',
    dateBucket: { field: 'created_date', unit: 'day' },
    avg: 'score'
  });

  const byDay = new Map();
  for (const row of res.rows || []) {
    const date = String(row.created_date || '').slice(0, 10);
    if (!date) continue;
    if (!byDay.has(date)) byDay.set(date, { date, bus: 0, sus: 0, scoreSum: 0, scoreN: 0 });
    const day = byDay.get(date);
    const n = row.count || 0;
    day[row.verdict === 'sus' ? 'sus' : 'bus'] += n;
    if (typeof row.avg_score === 'number' && n > 0) {
      day.scoreSum += row.avg_score * n;
      day.scoreN += n;
    }
  }

  const totals = { bus: 0, sus: 0 };
  for (const day of byDay.values()) {
    totals.bus += day.bus;
    totals.sus += day.sus;
    day.avgScore = day.scoreN > 0 ? Math.round(day.scoreSum / day.scoreN) : null;
  }

  // Fill gap days so the timeline is continuous and honest about quiet days.
  const dates = [...byDay.keys()].sort();
  const days = [];
  if (dates.length > 0) {
    const cur = new Date(dates[0] + 'T00:00:00Z');
    const end = new Date(dates[dates.length - 1] + 'T00:00:00Z');
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      const day = byDay.get(key) || { date: key, bus: 0, sus: 0, avgScore: null };
      days.push({ date: key, bus: day.bus, sus: day.sus, avgScore: day.avgScore, total: day.bus + day.sus });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  totals.total = totals.bus + totals.sus;
  return {
    days,
    totals,
    range: dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null
  };
}