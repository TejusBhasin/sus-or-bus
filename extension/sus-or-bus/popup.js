// Sus or Bus — toolbar popup
// Recent verdicts (searchable + filterable), lifetime stats, the optional
// account, data export/import, the "disable until…" pause and a session
// pause. Reads/writes chrome.storage directly; the background worker checks
// the pause keys (sb_paused_until / sb_session_paused) before every scan.

const REPORT_BASE = 'https://susorbus.com/report/';
const SITE_URL = 'https://susorbus.com/';
const $ = (id) => document.getElementById(id);

let currentPause = 0; // ms timestamp the extension is paused until
let recentCache = {}; // scan history shown under "Recent checks"
let recentFilter = 'all'; // all | bus | sus

function fmtAgo(ts) {
  if (!ts) return '';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.round(hrs / 24) + 'd ago';
}

function fmtWhen(ts) {
  return new Date(ts).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

// datetime-local input format: YYYY-MM-DDTHH:mm (local time)
function toLocalInput(ts) {
  const p = (n) => String(n).padStart(2, '0');
  const d = new Date(ts);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function setPause(ms) {
  if (!(ms > Date.now())) return;
  chrome.storage.local
    .set({ sb_paused_until: ms })
    .then(() => renderPause(ms))
    .catch(() => {});
}

function renderPause(until) {
  currentPause = until;
  const now = Date.now();
  if (until > now) {
    $('pause-active').hidden = false;
    $('pause-form').hidden = true;
    $('pause-until').textContent = 'Checks are paused until ' + fmtWhen(until);
  } else {
    if (until) chrome.storage.local.remove('sb_paused_until').catch(() => {});
    currentPause = 0;
    $('pause-active').hidden = true;
    $('pause-form').hidden = false;
    const dt = $('pause-dt');
    dt.value = toLocalInput(now + 60 * 60 * 1000); // default: one hour from now
    dt.min = toLocalInput(now);
  }
}

/* ---------- Announcement (live note from the site) ---------- */

function renderAnnouncement(cfg, dismissed) {
  const el = $('announcement');
  if (!cfg || !cfg.announcement || cfg.version === dismissed) {
    el.hidden = true;
    return;
  }
  $('announcement-text').textContent = cfg.announcement;
  el.hidden = false;
}

$('announcement-dismiss').addEventListener('click', async () => {
  const s = await chrome.storage.local.get('sb_config');
  await chrome.storage.local
    .set({ sb_announcement_dismissed: (s.sb_config && s.sb_config.version) || '' })
    .catch(() => {});
  $('announcement').hidden = true;
});

/* ---------- Theme (dark by default, light toggle, remembered) ---------- */

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  $('theme-toggle').textContent = theme === 'light' ? '\u263d' : '\u2600';
}

$('theme-toggle').addEventListener('click', () => {
  const next = document.body.classList.contains('light') ? 'dark' : 'light';
  chrome.storage.local.set({ sb_theme: next }).catch(() => {});
  applyTheme(next);
});

/* ---------- Session pause (clears when the browser closes) ---------- */

function renderSessionPause(on) {
  if (!chrome.storage.session) return; // stays hidden where unsupported
  $('pause-session').hidden = on;
}

$('pause-session').addEventListener('click', async () => {
  if (!chrome.storage.session) return;
  await chrome.storage.session.set({ sb_session_paused: true });
  $('pause-active').hidden = false;
  $('pause-form').hidden = true;
  $('pause-until').textContent = 'Checks are paused for this browser session.';
  renderSessionPause(true);
});

/* ---------- Lifetime stats ---------- */

function renderStats(st) {
  st = st || { checked: 0, sus: 0, bus: 0 };
  $('stat-checked').textContent = st.checked || 0;
  $('stat-sus').textContent = st.sus || 0;
  $('stat-bus').textContent = st.bus || 0;
}

/* ---------- Recent checks: search, filter, delete ---------- */

function renderRecent(cache) {
  recentCache = cache || {};
  paintRecent();
}

function paintRecent() {
  const wrap = $('recent');
  wrap.textContent = '';
  const q = ($('recent-search').value || '').trim().toLowerCase();
  const rows = Object.entries(recentCache)
    .filter(([, r]) => {
      if (recentFilter !== 'all' && r.verdict !== recentFilter) return false;
      return !q || String(r.origin || '').toLowerCase().includes(q);
    })
    .sort(([, a], [, b]) => (b.scannedAt || 0) - (a.scannedAt || 0))
    .slice(0, 8);
  if (!rows.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = Object.keys(recentCache).length
      ? 'No checks match your search.'
      : 'No checks yet. Click a link to another site and its verdict will show up here.';
    wrap.appendChild(p);
    return;
  }
  rows.forEach(([key, r]) => {
    const row = document.createElement('div');
    row.className = 'recent-row';
    const bus = r.verdict === 'bus';
    const badge = document.createElement('span');
    badge.className = 'v-badge ' + (bus ? 'bus' : 'sus');
    badge.textContent = bus ? 'BUS' : 'SUS';
    const host = document.createElement('span');
    host.className = 'host';
    host.textContent = String(r.origin || key).replace(/^https?:\/\//, '');
    const score = document.createElement('span');
    score.className = 'score';
    score.textContent = Math.round(r.score || 0) + ' \u00b7 ' + fmtAgo(r.scannedAt);
    const del = document.createElement('button');
    del.className = 'x-btn';
    del.title = 'Remove this entry';
    del.textContent = '\u00d7';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      const s = await chrome.storage.local.get('sb_cache');
      const c = s.sb_cache || {};
      delete c[key];
      await chrome.storage.local.set({ sb_cache: c });
      renderRecent(c);
    });
    row.append(badge, host, score, del);
    row.addEventListener('click', () => {
      const target = r.reportId ? REPORT_BASE + r.reportId : (r.origin || SITE_URL);
      chrome.tabs.create({ url: target });
    });
    wrap.appendChild(row);
  });
}

$('recent-search').addEventListener('input', paintRecent);

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
    chip.classList.add('on');
    recentFilter = chip.dataset.f;
    paintRecent();
  });
});

$('clear-recent').addEventListener('click', async () => {
  await chrome.storage.local.set({ sb_cache: {} });
  renderRecent({});
});

$('check-page').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'sb:scan-current' }).catch(() => {});
});

/* ---------- Settings ---------- */

$('opt-subdomains').addEventListener('change', (e) => {
  chrome.storage.local.set({ sb_match_mode: e.target.checked ? 'domain' : 'origin' }).catch(() => {});
});
$('opt-notify').addEventListener('change', (e) => {
  chrome.storage.local.set({ sb_notify: e.target.checked }).catch(() => {});
});

/* ---------- Export / import your data ---------- */

$('export-data').addEventListener('click', async () => {
  const s = await chrome.storage.local.get(['sb_whitelist', 'sb_blacklist', 'sb_cache', 'sb_stats']);
  const blob = new Blob(
    [JSON.stringify({ app: 'Sus or Bus', savedAt: new Date().toISOString(), ...s }, null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sus-or-bus-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('import-data').addEventListener('click', () => $('import-file').click());

$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    alert('That file is not a valid Sus or Bus backup.');
    return;
  }
  const store = await chrome.storage.local.get(['sb_whitelist', 'sb_blacklist', 'sb_cache']);
  const wl = new Set(store.sb_whitelist || []);
  (data.whitelist || []).forEach((o) => wl.add(o));
  const bl = new Set(store.sb_blacklist || []);
  (data.blacklist || []).forEach((o) => bl.add(o));
  const cache = Object.assign({}, store.sb_cache || {}, data.sb_cache || {});
  await chrome.storage.local.set({ sb_whitelist: [...wl], sb_blacklist: [...bl], sb_cache: cache });
  await load();
});

/* ---------- Account ---------- */

function renderAccount(signedIn, email) {
  $('acct-signedin').hidden = !signedIn;
  $('acct-form').hidden = signedIn;
  $('acct-reset').hidden = true;
  if (signedIn) $('acct-email').textContent = 'Signed in as ' + email;
  $('acct-err').hidden = true;
}

async function submitAccount(mode) {
  const email = $('acct-email-in').value.trim();
  const pass = $('acct-pass').value;
  const err = $('acct-err');
  err.hidden = true;
  if (!email || !pass) {
    err.textContent = 'Enter your email and password.';
    err.hidden = false;
    return;
  }
  if (mode === 'register' && pass.length < 8) {
    err.textContent = 'Password must be at least 8 characters.';
    err.hidden = false;
    return;
  }
  const btns = [$('acct-login'), $('acct-register')];
  btns.forEach((b) => (b.disabled = true));
  try {
    const res = await chrome.runtime.sendMessage({
      type: mode === 'register' ? 'sb:register' : 'sb:login',
      email,
      password: pass
    });
    if (!res || res.error) {
      err.textContent = (res && res.error) || 'Something went wrong.';
      err.hidden = false;
      return;
    }
    $('acct-pass').value = '';
    if (res.recoveryCode) {
      $('acct-code-value').textContent = res.recoveryCode;
      $('acct-code').hidden = false;
    }
    if (res.mustSetPassword) {
      $('acct-signedin').hidden = true;
      $('acct-form').hidden = true;
      $('acct-reset').hidden = false;
    } else {
      renderAccount(true, res.email || email);
    }
  } catch {
    err.textContent = 'Could not reach Sus or Bus right now.';
    err.hidden = false;
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

$('acct-login').addEventListener('click', () => submitAccount('login'));
$('acct-register').addEventListener('click', () => submitAccount('register'));
$('acct-setpass').addEventListener('click', async () => {
  const p1 = $('acct-new-pass').value;
  const p2 = $('acct-new-pass2').value;
  const err = $('acct-reset-err');
  err.hidden = true;
  if (!p1 || p1.length < 8) {
    err.textContent = 'New password must be at least 8 characters.';
    err.hidden = false;
    return;
  }
  if (p1 !== p2) {
    err.textContent = 'Passwords do not match.';
    err.hidden = false;
    return;
  }
  $('acct-setpass').disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'sb:setPassword', newPassword: p1 });
    if (!res || res.error) {
      err.textContent = (res && res.error) || 'Something went wrong.';
      err.hidden = false;
    } else {
      $('acct-new-pass').value = '';
      $('acct-new-pass2').value = '';
      const saved = await chrome.storage.local.get(['sb_email']);
      renderAccount(true, saved.sb_email || '');
    }
  } catch {
    err.textContent = 'Could not reach Sus or Bus right now.';
    err.hidden = false;
  } finally {
    $('acct-setpass').disabled = false;
  }
});
$('acct-code-dismiss').addEventListener('click', () => {
  $('acct-code').hidden = true;
});

$('acct-recover-link').addEventListener('click', () => {
  $('acct-err').hidden = true;
  $('acct-form').hidden = true;
  $('acct-recover').hidden = false;
});
$('acct-recover-back').addEventListener('click', () => {
  $('acct-recover').hidden = true;
  $('acct-form').hidden = false;
});
$('acct-recover-go').addEventListener('click', async () => {
  const email = $('acct-recover-email').value.trim();
  const code = $('acct-recover-code').value.trim();
  const p1 = $('acct-recover-pass').value;
  const p2 = $('acct-recover-pass2').value;
  const err = $('acct-recover-err');
  err.hidden = true;
  if (!email || !code) {
    err.textContent = 'Enter your email and recovery code.';
    err.hidden = false;
    return;
  }
  if (p1.length < 8) {
    err.textContent = 'New password must be at least 8 characters.';
    err.hidden = false;
    return;
  }
  if (p1 !== p2) {
    err.textContent = 'Passwords do not match.';
    err.hidden = false;
    return;
  }
  $('acct-recover-go').disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'sb:recover', email, code, newPassword: p1 });
    if (!res || res.error) {
      err.textContent = (res && res.error) || 'Something went wrong.';
      err.hidden = false;
      return;
    }
    $('acct-recover-email').value = '';
    $('acct-recover-code').value = '';
    $('acct-recover-pass').value = '';
    $('acct-recover-pass2').value = '';
    $('acct-recover').hidden = true;
    $('acct-form').hidden = false;
    renderAccount(true, res.email || email);
  } catch {
    err.textContent = 'Could not reach Sus or Bus right now.';
    err.hidden = false;
  } finally {
    $('acct-recover-go').disabled = false;
  }
});
$('acct-google').addEventListener('click', () => {
  chrome.tabs.create({ url: SITE_URL + 'account?provider=google' });
});
$('acct-microsoft').addEventListener('click', () => {
  chrome.tabs.create({ url: SITE_URL + 'account?provider=microsoft' });
});
$('acct-apple').addEventListener('click', () => {
  chrome.tabs.create({ url: SITE_URL + 'account?provider=apple' });
});

$('acct-logout').addEventListener('click', () => {
  chrome.storage.local
    .remove(['sb_token', 'sb_email'])
    .then(() => renderAccount(false, ''))
    .catch(() => {});
});

$('open-site').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: SITE_URL });
});

/* ---------- Pause controls ---------- */

$('pause-set').addEventListener('click', () => {
  const v = $('pause-dt').value;
  if (!v) return;
  setPause(new Date(v).getTime());
});
$('pause-1h').addEventListener('click', () => setPause(Date.now() + 60 * 60 * 1000));
$('pause-edit').addEventListener('click', () => {
  $('pause-active').hidden = true;
  $('pause-form').hidden = false;
  const dt = $('pause-dt');
  dt.value = toLocalInput(currentPause > Date.now() ? currentPause : Date.now() + 60 * 60 * 1000);
  dt.min = toLocalInput(Date.now());
});
$('pause-cancel').addEventListener('click', async () => {
  if (chrome.storage.session) {
    await chrome.storage.session.remove('sb_session_paused').catch(() => {});
    renderSessionPause(false);
  }
  chrome.storage.local
    .remove('sb_paused_until')
    .then(() => renderPause(0))
    .catch(() => {});
});

/* ---------- Load ---------- */

async function load() {
  const s = await chrome.storage.local.get([
    'sb_paused_until', 'sb_cache', 'sb_token', 'sb_email',
    'sb_stats', 'sb_match_mode', 'sb_notify', 'sb_theme',
    'sb_config', 'sb_announcement_dismissed'
  ]);
  applyTheme(s.sb_theme === 'light' ? 'light' : 'dark');
  renderAnnouncement(s.sb_config, s.sb_announcement_dismissed);
  renderPause(s.sb_paused_until || 0);
  $('opt-subdomains').checked = s.sb_match_mode === 'domain';
  $('opt-notify').checked = !!s.sb_notify;
  renderStats(s.sb_stats);
  renderRecent(s.sb_cache || {});
  renderAccount(!!s.sb_token, s.sb_email || '');
  const sp = chrome.storage.session ? await chrome.storage.session.get('sb_session_paused') : {};
  if (sp.sb_session_paused) {
    $('pause-active').hidden = false;
    $('pause-form').hidden = true;
    $('pause-until').textContent = 'Checks are paused for this browser session.';
    renderSessionPause(true);
  } else {
    renderSessionPause(false);
  }
}

load();