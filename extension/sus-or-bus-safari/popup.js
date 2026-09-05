// Sus or Bus — toolbar popup
// Overview stats, "Don't check me" snooze, recent sites, account, and lists.

const APP = 'https://susbus.base44.app';
const HOUR_OPTIONS = [0.5, 1, 2, 4, 8, 12, 24];

let state = { cache: {}, whitelist: [], blacklist: [], token: '', email: '', snoozeUntil: 0 };
let authMode = 'register'; // 'register' | 'login'
let showAuthForm = false;

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function hostOf(u) {
  try {
    return new URL(u).host.replace(/^www\./, '');
  } catch {
    return u;
  }
}

function ago(ts) {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}

function remaining(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' hr ' + (m % 60) + ' min';
}

async function loadState() {
  const s = await chrome.storage.local.get([
    'sb_cache', 'sb_whitelist', 'sb_blacklist', 'sb_token', 'sb_email', 'sb_snooze_until'
  ]);
  state = {
    cache: s.sb_cache || {},
    whitelist: s.sb_whitelist || [],
    blacklist: s.sb_blacklist || [],
    token: s.sb_token || '',
    email: s.sb_email || '',
    snoozeUntil: s.sb_snooze_until || 0
  };
}

function listHtml(items, kind) {
  if (!items || !items.length) return '<div class="muted small pad">Nothing here yet.</div>';
  return (
    '<div class="list">' +
    items
      .map(
        (o) => `
        <div class="list-item">
          <span class="muted small mono">${esc(hostOf(o))}</span>
          <button class="x" data-act="remove" data-kind="${kind}" data-origin="${esc(o)}" aria-label="Remove">✕</button>
        </div>`
      )
      .join('') +
    '</div>'
  );
}

function authFormHtml() {
  return `
    <div class="card">
      <div class="tabs">
        <button class="tab ${authMode === 'register' ? 'on' : ''}" data-act="mode" data-mode="register">Sign up</button>
        <button class="tab ${authMode === 'login' ? 'on' : ''}" data-act="mode" data-mode="login">Log in</button>
      </div>
      <input id="pop-email" type="email" placeholder="Email" autocomplete="email">
      <input id="pop-pass" type="password" placeholder="Password (8+ characters)" autocomplete="new-password">
      <div id="pop-err" class="err" hidden></div>
      <button class="btn wide" data-act="submit-auth">${authMode === 'register' ? 'Create account' : 'Sign in'}</button>
    </div>
  `;
}

function render() {
  const entries = Object.values(state.cache).sort((a, b) => (b.scannedAt || 0) - (a.scannedAt || 0));
  const bus = entries.filter((e) => e.verdict === 'bus').length;
  const sus = entries.length - bus;
  const snoozed = Date.now() < state.snoozeUntil;
  const recent = entries.slice(0, 8);

  document.getElementById('app').innerHTML = `
    <header>
      <div class="brand"><span class="r">Sus</span><span class="or">or</span><span class="g">Bus</span></div>
      ${state.token
        ? '<button class="chip" data-act="signout">Sign out</button>'
        : '<button class="chip" data-act="auth">Sign up / Log in</button>'}
    </header>

    <div class="stats">
      <div class="stat"><div class="num">${entries.length}</div><div class="lbl">checked</div></div>
      <div class="stat bus"><div class="num">${bus}</div><div class="lbl">bus</div></div>
      <div class="stat sus"><div class="num">${sus}</div><div class="lbl">sus</div></div>
    </div>

    ${
      snoozed
        ? `<div class="card snooze-on">
            <div>
              <div class="card-title">Checks are paused</div>
              <div class="muted small" id="snooze-left">resumes in ${remaining(state.snoozeUntil - Date.now())}</div>
            </div>
            <button class="btn" data-act="unsnooze">Resume now</button>
          </div>`
        : `<div class="card">
            <div class="card-title">Don't check me for…</div>
            <div class="hours">
              ${HOUR_OPTIONS.map(
                (h) => `<button class="hour" data-act="snooze" data-h="${h}">${h === 0.5 ? '½' : h} hr${h === 0.5 || h === 1 ? '' : 's'}</button>`
              ).join('')}
            </div>
          </div>`
    }

    <div class="section">
      <div class="section-title">Recent sites</div>
      ${
        recent.length
          ? recent
              .map(
                (e) => `
              <div class="site" ${e.reportId ? `data-act="open-report" data-id="${esc(e.reportId)}"` : ''}>
                <span class="dot ${e.verdict === 'bus' ? 'bus' : 'sus'}"></span>
                <div class="site-mid">
                  <div class="site-host">${esc(hostOf(e.origin))}</div>
                  <div class="muted small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc((e.summary || '').slice(0, 64))}</div>
                </div>
                <div class="site-right">
                  <span class="badge ${e.verdict === 'bus' ? 'bus' : 'sus'}">${e.verdict === 'bus' ? 'BUS' : 'SUS'}</span>
                  <div class="muted small">${ago(e.scannedAt || 0)}</div>
                </div>
              </div>`
              )
              .join('')
          : '<div class="muted small pad">No sites checked yet — click a link and Sus or Bus will check it first.</div>'
      }
    </div>

    <div class="section">
      <div class="section-title">Safe list — don't ask again</div>
      ${listHtml(state.whitelist, 'whitelist')}
      <div class="section-title">Never-visit list</div>
      ${listHtml(state.blacklist, 'blacklist')}
    </div>

    <div class="section">
      <div class="section-title">Account</div>
      ${
        state.token
          ? `<div class="card">
              <div class="muted small">Signed in as</div>
              <div class="email">${esc(state.email)}</div>
              <div class="muted small">Your lists sync between this extension and the Sus or Bus site.</div>
            </div>`
          : showAuthForm
            ? authFormHtml()
            : `<div class="card">
                <div class="muted small">Optional — checking sites always works without one. An account syncs your safe-site and never-visit lists between this extension and the Sus or Bus site.</div>
                <button class="btn wide" data-act="auth">Sign up / Log in</button>
              </div>`
      }
    </div>

    <footer><a href="${APP}" target="_blank" rel="noopener">Open full Sus or Bus →</a></footer>
  `;
}

async function submitAuth() {
  const emailEl = document.getElementById('pop-email');
  const passEl = document.getElementById('pop-pass');
  const errEl = document.getElementById('pop-err');
  const btn = document.querySelector('[data-act="submit-auth"]');
  const fail = (msg) => {
    if (errEl) {
      errEl.textContent = msg;
      errEl.hidden = false;
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = authMode === 'register' ? 'Create account' : 'Sign in';
    }
  };
  const email = (emailEl ? emailEl.value : '').trim();
  const password = passEl ? passEl.value : '';
  if (!email || !password) {
    fail('Enter your email and password');
    return;
  }
  if (authMode === 'register' && password.length < 8) {
    fail('Password must be at least 8 characters');
    return;
  }
  if (btn) {
    btn.disabled = true;
    btn.textContent = '…';
  }
  const res = await chrome.runtime
    .sendMessage({ type: authMode === 'register' ? 'sb:register' : 'sb:login', email, password })
    .catch(() => null);
  if (!res || res.error) {
    fail((res && res.error) || 'Could not reach Sus or Bus right now');
    return;
  }
  showAuthForm = false;
  await loadState();
  render();
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest ? e.target.closest('[data-act]') : null;
  if (!t) return;
  const act = t.getAttribute('data-act');
  if (act === 'snooze') {
    await chrome.runtime.sendMessage({ type: 'sb:snooze', hours: parseFloat(t.getAttribute('data-h')) });
    await loadState();
    render();
  } else if (act === 'unsnooze') {
    await chrome.runtime.sendMessage({ type: 'sb:unsnooze' });
    await loadState();
    render();
  } else if (act === 'auth') {
    showAuthForm = true;
    render();
    const el = document.getElementById('pop-email');
    if (el) el.focus();
  } else if (act === 'mode') {
    authMode = t.getAttribute('data-mode');
    render();
  } else if (act === 'submit-auth') {
    submitAuth();
  } else if (act === 'signout') {
    await chrome.runtime.sendMessage({ type: 'sb:logout' });
    showAuthForm = false;
    await loadState();
    render();
  } else if (act === 'open-report') {
    chrome.tabs.create({ url: APP + '/report/' + t.getAttribute('data-id') });
  } else if (act === 'remove') {
    const kind = t.getAttribute('data-kind');
    const origin = t.getAttribute('data-origin');
    const key = kind === 'whitelist' ? 'sb_whitelist' : 'sb_blacklist';
    const list = (state[kind] || []).filter((o) => o !== origin);
    await chrome.storage.local.set({ [key]: list });
    chrome.runtime.sendMessage({ type: 'sb:sync' }).catch(() => {});
    await loadState();
    render();
  }
});

// Keep the snooze countdown fresh; re-render when it expires.
setInterval(() => {
  const el = document.getElementById('snooze-left');
  if (!el) return;
  if (Date.now() >= state.snoozeUntil) {
    loadState().then(render);
  } else {
    el.textContent = 'resumes in ' + remaining(state.snoozeUntil - Date.now());
  }
}, 30000);

loadState().then(render);