// Sus or Bus — toolbar popup
// Recent verdicts, the optional account, and the "disable until…" pause.
// Reads/writes chrome.storage directly; the background worker checks the
// pause key (sb_paused_until) before every scan or gate.

const REPORT_BASE = 'https://susbus.base44.app/report/';
const SITE_URL = 'https://susbus.base44.app/';
const $ = (id) => document.getElementById(id);

let currentPause = 0; // ms timestamp the extension is paused until

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

function renderRecent(cache) {
  const wrap = $('recent');
  wrap.textContent = '';
  const rows = Object.values(cache || {})
    .sort((a, b) => (b.scannedAt || 0) - (a.scannedAt || 0))
    .slice(0, 5);
  if (!rows.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No checks yet. Click a link to another site and its verdict will show up here.';
    wrap.appendChild(p);
    return;
  }
  rows.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'recent-row';
    const bus = r.verdict === 'bus';
    const badge = document.createElement('span');
    badge.className = 'v-badge ' + (bus ? 'bus' : 'sus');
    badge.textContent = bus ? 'BUS' : 'SUS';
    const host = document.createElement('span');
    host.className = 'host';
    host.textContent = String(r.origin || '').replace(/^https?:\/\//, '');
    const score = document.createElement('span');
    score.className = 'score';
    score.textContent = Math.round(r.score || 0) + ' · ' + fmtAgo(r.scannedAt);
    row.append(badge, host, score);
    row.addEventListener('click', () => {
      const target = r.reportId ? REPORT_BASE + r.reportId : (r.origin || SITE_URL);
      chrome.tabs.create({ url: target });
    });
    wrap.appendChild(row);
  });
}

function renderAccount(signedIn, email) {
  $('acct-signedin').hidden = !signedIn;
  $('acct-form').hidden = signedIn;
  if (signedIn) $('acct-email').textContent = 'Signed in as ' + email;
  $('acct-err').hidden = true;
}

async function load() {
  const s = await chrome.storage.local.get(['sb_paused_until', 'sb_cache', 'sb_token', 'sb_email']);
  renderPause(s.sb_paused_until || 0);
  renderRecent(s.sb_cache || {});
  renderAccount(!!s.sb_token, s.sb_email || '');
}

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
$('pause-cancel').addEventListener('click', () => {
  chrome.storage.local
    .remove('sb_paused_until')
    .then(() => renderPause(0))
    .catch(() => {});
});

/* ---------- Account ---------- */

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
    renderAccount(true, res.email || email);
  } catch {
    err.textContent = 'Could not reach Sus or Bus right now.';
    err.hidden = false;
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

$('acct-login').addEventListener('click', () => submitAccount('login'));
$('acct-register').addEventListener('click', () => submitAccount('register'));
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

load();