// Turns a scan's findings into a scoring ledger: a fixed baseline, positive
// points for good findings, deductions for warnings and issues, ending
// exactly at the saved score.
export const BASELINE = 50;

export function buildLedger(findings, score) {
  const final = Math.round(score);
  const deductions = findings.filter((f) => f.level !== 'good').reduce((s, f) => s + (f.impact || 0), 0);
  const goods = findings.filter((f) => f.level === 'good');
  let baseline = BASELINE;
  let pool = final - baseline + deductions;
  if (goods.length === 0 || pool < 0) {
    baseline = final + deductions;
    pool = 0;
  }
  const each = goods.length ? Math.floor(pool / goods.length) : 0;
  let extra = goods.length ? pool - each * goods.length : 0;
  let running = baseline;
  const rows = findings.map((f) => {
    let delta;
    if (f.level === 'good') {
      delta = each + (extra > 0 ? 1 : 0);
      if (extra > 0) extra -= 1;
    } else {
      delta = -(f.impact || 0);
    }
    running += delta;
    return { ...f, delta, running };
  });
  return { baseline, rows, final, gained: pool, lost: deductions };
}