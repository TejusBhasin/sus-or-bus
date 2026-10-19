// "Seasoned" wording for the dashboard: deterministic, seeded phrase pools so
// every history reads slightly differently while the same numbers always
// produce the same sentences. Fully local — no AI, no network, no credits.

function fnv(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const POOLS = {
  calm: {
    simple: [
      'Your history reads calm — the links you checked overwhelmingly came back safe.',
      'Most of what you scanned turned out fine; your threat landscape is quiet.',
      'Safe verdicts dominate your history — you have been steering clear of trouble.'
    ],
    nerd: [
      'Aggregated history shows a high BUS ratio with no sustained SUS clusters — a low-exposure browsing pattern.',
      'Verdict distribution is heavily skewed toward BUS; SUS detections are sparse and isolated in time.',
      'The timeline shows a stable, low-density threat profile: mostly clean verdicts with scattered warnings.'
    ]
  },
  mixed: {
    simple: [
      'Your history is a real mix — plenty of safe links, but suspicious ones keep showing up.',
      'You live in interesting territory: safe verdicts lead, but SUS flags appear regularly.',
      'Your checks split between safe and suspicious, so the landscape is worth watching.'
    ],
    nerd: [
      'Verdict distribution is bimodal: BUS leads, but recurring SUS days indicate repeated exposure to risky destinations.',
      'History shows interleaved BUS/SUS clusters — consistent with intermittent encounters with untrusted links.',
      'The ratio leans safe, yet SUS detections recur across the timeline rather than clustering in a single event.'
    ]
  },
  risky: {
    simple: [
      'Suspicious verdicts lead your history — many links you checked did not look safe.',
      'Your landscape is busy with SUS flags; more of your checks went wrong than right.',
      'Red dominates your history — the sites you are drawn to checking keep turning out suspicious.'
    ],
    nerd: [
      'SUS verdicts dominate the aggregate: repeated high-risk detections across the timeline form an elevated exposure profile.',
      'History is weighted toward SUS with sustained clusters — a high-contact pattern with untrusted destinations.',
      'The distribution skews SUS; repeated detections suggest systematic exposure rather than one-off events.'
    ]
  }
};

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function buildTakeaway(stats) {
  const { totals, range } = stats;
  const share = totals.total > 0 ? Math.round((totals.bus / totals.total) * 100) : 0;
  const bucket = share >= 75 ? 'calm' : share >= 50 ? 'mixed' : 'risky';
  const seed = fnv(`bus:${totals.bus}|sus:${totals.sus}|from:${range ? range.from : 'none'}`);
  const pool = POOLS[bucket];
  const simple = pool.simple[seed % pool.simple.length];
  const nerd = pool.nerd[seed % pool.nerd.length];

  const period = range
    ? `between ${fmtDate(range.from)} and ${fmtDate(range.to)}`
    : 'over your recorded history';
  const detail = `Signals counted: ${totals.total} scan${totals.total === 1 ? '' : 's'} ${period}; ${totals.bus} BUS (${share}%), ${totals.sus} SUS (${100 - share}%).`;

  return { simple: `${simple} ${detail}`, nerd: `${nerd} ${detail}` };
}