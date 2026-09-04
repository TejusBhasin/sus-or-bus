// Sus or Bus — content script
// 1) Intercepts clicks on links to other sites: corner popup with Continue / Cancel.
// 2) When a page is opened directly (typed address, bookmark, pinned tab) or
//    reached without our click interception, covers it with a full-screen
//    report until the user proceeds. SUS sites get a smaller proceed button
//    plus a "Find alternative websites" tool.

(function () {
  if (window.__susbusContent) return;
  window.__susbusContent = true;

  const REPORT_BASE = 'https://susbus.base44.app/report/';
  const HERE = location.origin;

  let host = null;
  let shadow = null;
  let takeover = false; // full-screen mode (direct open) vs corner popup
  let pendingUrl = null;
  let pendingMode = 'same'; // 'same' | 'blank'
  let pendingReportId = null;

  const CSS = `
    .sb-card {
      position: fixed; right: 16px; bottom: 16px;
      width: 300px; max-width: calc(100vw - 32px);
      background: #0b1220; color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 13px; line-height: 1.45;
      z-index: 2147483647;
      animation: sb-in 0.18s ease-out;
      overflow: hidden;
    }
    @keyframes sb-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes sb-fade { from { opacity: 0; } to { opacity: 1; } }
    .sb-take {
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(2, 6, 23, 0.92);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 18px; animation: sb-fade 0.15s ease-out;
      font-family: ui-sans-serif, system-ui, sans-serif;
      color: #e2e8f0;
    }
    .sb-panel {
      width: 100%; max-width: 440px; max-height: calc(100vh - 36px);
      overflow-y: auto;
      background: #0b1220; color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 16px;
      box-shadow: 0 24px 90px rgba(0, 0, 0, 0.65);
      font-size: 13px; line-height: 1.45;
    }
    .sb-panel .sb-verdict { font-size: 44px; }
    .sb-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid rgba(148,163,184,0.18); }
    .sb-brand { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 10px; letter-spacing: 0.22em; color: #94a3b8; }
    .sb-close { background: none; border: none; color: #64748b; cursor: pointer; font-size: 15px; line-height: 1; padding: 4px 6px; }
    .sb-close:hover { color: #e2e8f0; }
    .sb-body { padding: 14px; }
    .sb-url { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: #94a3b8; word-break: break-all; margin-bottom: 10px; }
    .sb-verdict { font-size: 34px; font-weight: 900; letter-spacing: -0.03em; line-height: 1; }
    .sb-verdict.bus { color: #34d399; text-shadow: 0 0 18px rgba(52, 211, 153, 0.45); }
    .sb-verdict.sus { color: #f87171; text-shadow: 0 0 18px rgba(248, 113, 113, 0.45); }
    .sb-valid { margin-top: 4px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; font-weight: 700; }
    .sb-valid.bus { color: #34d399; }
    .sb-valid.sus { color: #f87171; }
    .sb-score { margin-top: 2px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: #94a3b8; }
    .sb-points { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
    .sb-point { display: flex; gap: 8px; }
    .sb-dot { width: 7px; height: 7px; border-radius: 999px; margin-top: 5px; flex: none; }
    .sb-dot.good { background: #34d399; }
    .sb-dot.warning { background: #fbbf24; }
    .sb-dot.bad { background: #f87171; }
    .sb-pt-title { font-weight: 600; color: #e2e8f0; }
    .sb-pt-note { color: #94a3b8; font-size: 12px; }
    .sb-actions { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid rgba(148,163,184,0.18); }
    .sb-take-actions { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px; border-top: 1px solid rgba(148,163,184,0.18); }
    .sb-btn { flex: 1; min-height: 40px; border-radius: 9px; border: 1px solid rgba(148,163,184,0.3); background: transparent; color: #e2e8f0; font-size: 13px; font-weight: 600; cursor: pointer; }
    .sb-btn:hover { background: rgba(148,163,184,0.12); }
    .sb-btn.go { background: #e2e8f0; color: #0b1220; border-color: #e2e8f0; }
    .sb-btn.go.bus { background: #34d399; border-color: #34d399; color: #052014; }
    .sb-btn.go.sus { background: #f87171; border-color: #f87171; color: #1a0505; }
    .sb-btn.go:hover { filter: brightness(1.06); }
    .sb-btn.big { width: 100%; min-height: 48px; font-size: 15px; }
    .sb-btn.sus-sm { flex: 0 1 auto; min-height: 34px; font-size: 12px; padding: 0 16px; }
    .sb-btn.alt-main { width: 100%; min-height: 46px; background: rgba(52, 211, 153, 0.14); border-color: rgba(52, 211, 153, 0.5); color: #34d399; font-size: 14px; }
    .sb-btn.alt-main:hover { background: rgba(52, 211, 153, 0.24); }
    .sb-scan { display: flex; align-items: center; gap: 10px; color: #cbd5e1; padding: 8px 0 2px; }
    .sb-spin { width: 16px; height: 16px; border: 2px solid rgba(148,163,184,0.35); border-top-color: #e2e8f0; border-radius: 50%; animation: sb-rot 0.8s linear infinite; flex: none; }
    @keyframes sb-rot { to { transform: rotate(360deg); } }
    .sb-anyway { margin-top: 10px; text-align: center; }
    .sb-link { color: #818cf8; cursor: pointer; text-decoration: none; font-size: 12px; }
    .sb-link:hover { text-decoration: underline; }
    .sb-report { display: inline-block; margin-top: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; }
    .sb-error { color: #fbbf24; }
    .sb-alts { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
    .sb-alt { border: 1px solid rgba(148,163,184,0.25); border-radius: 10px; padding: 10px 12px; cursor: pointer; text-align: left; }
    .sb-alt:hover { background: rgba(148,163,184,0.1); }
    .sb-alt-name { font-weight: 700; color: #e2e8f0; }
    .sb-alt-host { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: #94a3b8; word-break: break-all; }
    .sb-alt-why { margin-top: 2px; font-size: 12px; color: #94a3b8; }
  `;

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function shortUrl(url) {
    let s = url.replace(/^https?:\/\//i, '');
    if (s.length > 42) s = s.slice(0, 39) + '…';
    return s;
  }

  function hostOf(url) {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  }

  // Google Search pages are never checked — the extension stays fully out of the way there.
  function isGoogleSearch(url) {
    try {
      const u = new URL(url);
      return u.host === 'www.google.com' && u.pathname.startsWith('/search');
    } catch {
      return false;
    }
  }

  // Sites the user marked "Don't ask again" — kept in sync with storage so
  // clicks on them pass straight through with no popup.
  let whitelist = new Set();
  chrome.storage.local
    .get('sb_whitelist')
    .then((s) => { whitelist = new Set(s.sb_whitelist || []); })
    .catch(() => {});
  if (chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.sb_whitelist) whitelist = new Set(changes.sb_whitelist.newValue || []);
    });
  }

  function ensurePopup() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'susbus-popup';
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);
    shadow.addEventListener('click', (e) => {
      const t = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!t) return;
      const act = t.getAttribute('data-act');
      if (act === 'cancel' || act === 'dismiss') closePopup();
      else if (act === 'go') proceed();
      else if (act === 'report' && pendingReportId) {
        window.open(REPORT_BASE + pendingReportId, '_blank', 'noopener');
      } else if (act === 'alt' && pendingUrl) {
        requestAlternatives(pendingUrl);
      } else if (act === 'whitelist' && pendingUrl) {
        whitelistSite(pendingUrl);
      } else if (act === 'openalt') {
        const alt = t.getAttribute('data-url');
        if (alt) {
          chrome.runtime.sendMessage({ type: 'sb:allow', url: alt }).catch(() => {});
          window.open(alt, '_blank', 'noopener');
          closePopup();
        }
      }
    });
    document.documentElement.appendChild(host);
  }

  function renderCard(bodyHtml) {
    ensurePopup();
    const old = shadow.querySelector('.sb-take') || shadow.querySelector('.sb-card');
    if (old) old.remove();
    const root = document.createElement('div');
    root.className = takeover ? 'sb-take' : 'sb-card';
    if (takeover) {
      const panel = document.createElement('div');
      panel.className = 'sb-panel';
      panel.innerHTML = bodyHtml;
      root.appendChild(panel);
    } else {
      root.innerHTML = bodyHtml;
    }
    shadow.appendChild(root);
  }

  const headHtml = `
    <div class="sb-head">
      <span class="sb-brand">SUS or BUS</span>
      <button class="sb-close" data-act="${takeover ? 'dismiss' : 'cancel'}" aria-label="Close">✕</button>
    </div>
  `;

  function resultBody(url, d) {
    const verdict = d.verdict === 'bus' ? 'bus' : 'sus';
    const points = (d.points || [])
      .map(
        (p) => `
        <div class="sb-point">
          <span class="sb-dot ${escapeHtml(p.severity || 'warning')}"></span>
          <div>
            <div class="sb-pt-title">${escapeHtml(p.title)}</div>
            <div class="sb-pt-note">${escapeHtml(p.note)}</div>
          </div>
        </div>`
      )
      .join('');
    return `
      <div class="sb-url">${escapeHtml(shortUrl(url))}</div>
      <div class="sb-verdict ${verdict}">${verdict === 'bus' ? 'BUS' : 'SUS'}</div>
      <div class="sb-valid ${verdict}">Final verdict: ${verdict === 'bus' ? 'Valid' : 'Not Valid'}</div>
      <div class="sb-score">${Math.round(d.score || 0)} / 100</div>
      ${points ? `<div class="sb-points">${points}</div>` : ''}
      ${verdict === 'sus' ? '<a class="sb-link sb-report" data-act="alt">Find alternative websites →</a>' : ''}
      ${pendingReportId ? `<a class="sb-link sb-report" data-act="report">Full report →</a>` : ''}
      <div class="sb-anyway"><a class="sb-link" data-act="whitelist">Don\u2019t ask again for this site</a></div>
    `;
  }

  /* ---------- Corner popup (link clicks) ---------- */

  function showPopup(url, mode) {
    pendingUrl = url;
    pendingMode = mode;
    pendingReportId = null;
    renderCard(`
      ${headHtml}
      <div class="sb-body">
        <div class="sb-url">${escapeHtml(shortUrl(url))}</div>
        <div class="sb-scan"><span class="sb-spin"></span><span>Checking this site…</span></div>
        <div class="sb-anyway"><a class="sb-link" data-act="go">Open without waiting</a></div>
      </div>
    `);
    chrome.runtime
      .sendMessage({ type: 'sb:check', url })
      .then((res) => {
        if (url !== pendingUrl) return;
        if (res && res.status === 'hit') renderResult(url, res.data);
        else if (res && res.status === 'error') renderError(url, res.message);
        else if (res && res.status === 'pass') proceed(); // whitelisted — go without asking
        // 'scanning' -> waiting for sb:update
      })
      .catch(() => {
        if (url === pendingUrl) renderError(url);
      });
  }

  function renderResult(url, d) {
    if (url !== pendingUrl || !d) return;
    pendingReportId = d.reportId || null;
    const verdict = d.verdict === 'bus' ? 'bus' : 'sus';
    renderCard(`
      ${headHtml}
      <div class="sb-body">${resultBody(url, d)}</div>
      <div class="sb-actions">
        <button class="sb-btn" data-act="cancel">Cancel</button>
        <button class="sb-btn go ${verdict} ${verdict === 'sus' ? 'sus-sm' : ''}" data-act="go">
          ${verdict === 'sus' ? 'Continue anyway' : 'Continue'}
        </button>
      </div>
    `);
  }

  function renderError(url) {
    if (url !== pendingUrl) return;
    renderCard(`
      ${headHtml}
      <div class="sb-body">
        <div class="sb-url">${escapeHtml(shortUrl(url))}</div>
        <p class="sb-error">Couldn't reach Sus or Bus right now.</p>
      </div>
      <div class="sb-actions">
        <button class="sb-btn" data-act="cancel">Cancel</button>
        <button class="sb-btn go" data-act="go">Continue</button>
      </div>
    `);
  }

  /* ---------- Full-screen takeover (direct opens) ---------- */

  function showTakeoverScanning(url) {
    renderCard(`
      ${headHtml}
      <div class="sb-body">
        <div class="sb-url">${escapeHtml(shortUrl(url))}</div>
        <div class="sb-scan"><span class="sb-spin"></span><span>Checking this site before you browse it…</span></div>
        <div class="sb-anyway"><a class="sb-link" data-act="dismiss">Open without waiting</a></div>
      </div>
    `);
  }

  function renderTakeoverResult(url, d) {
    if (url !== pendingUrl || !d) return;
    pendingReportId = d.reportId || null;
    const sus = d.verdict !== 'bus';
    renderCard(`
      ${headHtml}
      <div class="sb-body">${resultBody(url, d)}</div>
      <div class="sb-take-actions">
        ${
          sus
            ? `<button class="sb-btn alt-main" data-act="alt">Find alternative websites</button>
               <button class="sb-btn go sus sus-sm" data-act="dismiss">Proceed to website</button>`
            : `<button class="sb-btn go bus big" data-act="dismiss">Proceed to website</button>`
        }
      </div>
    `);
  }

  function renderTakeoverError() {
    renderCard(`
      ${headHtml}
      <div class="sb-body">
        <div class="sb-url">${escapeHtml(shortUrl(pendingUrl))}</div>
        <p class="sb-error">Couldn't reach Sus or Bus right now.</p>
      </div>
      <div class="sb-take-actions">
        <button class="sb-btn go big" data-act="dismiss">Proceed to website</button>
      </div>
    `);
  }

  /* ---------- Safer alternatives ---------- */

  function requestAlternatives(url) {
    renderCard(`
      ${headHtml}
      <div class="sb-body">
        <div class="sb-url">${escapeHtml(shortUrl(url))}</div>
        <div class="sb-scan"><span class="sb-spin"></span><span>Looking for safer alternatives…</span></div>
      </div>
    `);
    chrome.runtime
      .sendMessage({ type: 'sb:alternatives', url })
      .then((res) => {
        if (url === pendingUrl) renderAlternatives(url, (res && res.alternatives) || []);
      })
      .catch(() => {
        if (url === pendingUrl) renderAlternatives(url, []);
      });
  }

  function renderAlternatives(url, alts) {
    const items = (alts || [])
      .map(
        (a) => `
        <div class="sb-alt" data-act="openalt" data-url="${escapeHtml(a.url)}">
          <div class="sb-alt-name">${escapeHtml(a.name)}</div>
          <div class="sb-alt-host">${escapeHtml(hostOf(a.url))}</div>
          ${a.reason ? `<div class="sb-alt-why">${escapeHtml(a.reason)}</div>` : ''}
        </div>`
      )
      .join('');
    renderCard(`
      ${headHtml}
      <div class="sb-body">
        <div class="sb-url">${escapeHtml(shortUrl(url))}</div>
        ${items ? `<div class="sb-alts">${items}</div>` : '<p class="sb-error">No safer alternatives found right now.</p>'}
        ${pendingReportId ? `<a class="sb-link sb-report" data-act="report">Full report →</a>` : ''}
      </div>
      <div class="${takeover ? 'sb-take-actions' : 'sb-actions'}">
        ${
          takeover
            ? `<button class="sb-btn go sus sus-sm" data-act="dismiss">Proceed to website</button>`
            : `<button class="sb-btn" data-act="cancel">Cancel</button>
               <button class="sb-btn go sus sus-sm" data-act="go">Continue anyway</button>`
        }
      </div>
    `);
  }

  /* ---------- Shared ---------- */

  function proceed() {
    const url = pendingUrl;
    const mode = pendingMode;
    closePopup();
    if (!url) return;
    chrome.runtime.sendMessage({ type: 'sb:allow', url }).catch(() => {});
    if (mode === 'blank') window.open(url, '_blank', 'noopener');
    else location.href = url;
  }

  // "Don't ask again for this site" — remember the site in the background,
  // then continue to it (or lift the full-screen cover if we're already on it).
  function whitelistSite(url) {
    chrome.runtime.sendMessage({ type: 'sb:whitelist', url }).catch(() => {});
    if (takeover) closePopup();
    else proceed();
  }

  function closePopup() {
    if (host) host.remove();
    host = null;
    shadow = null;
    takeover = false;
    pendingUrl = null;
    pendingReportId = null;
  }

  // Background pushes the finished scan result into an open popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== 'sb:update' || msg.url !== pendingUrl) return;
    if (msg.status === 'hit') {
      if (takeover) renderTakeoverResult(pendingUrl, msg.data);
      else renderResult(pendingUrl, msg.data);
    } else if (takeover) renderTakeoverError();
    else renderError(pendingUrl);
  });

  /* ---------- Link click interception ---------- */

  window.addEventListener(
    'click',
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      if (host && e.composedPath().includes(host)) return; // clicks inside our popup
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      let url;
      try {
        url = new URL(a.getAttribute('href'), location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol)) return;
      if (url.origin === HERE) return; // same-site links pass through
      if (isGoogleSearch(url.href)) return; // Google Search pages are never checked
      if (whitelist.has(url.origin)) return; // user whitelisted this site — pass through
      e.preventDefault();
      e.stopPropagation();
      const mode = a.target === '_blank' ? 'blank' : 'same';
      showPopup(url.href, mode);
    },
    true
  );

  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && host) closePopup();
    },
    true
  );

  /* ---------- Direct-open gate ----------
     Ask the background worker whether this page load was a direct open
     (typed, bookmark, pinned tab, or an unintercepted navigation) that
     should be covered by a full-screen report first. */

  (function gate() {
    let navType = 'navigate';
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav && nav.type) navType = nav.type;
    } catch {}
    if (navType === 'reload' || navType === 'back_forward' || navType === 'prerender') return;
    if (isGoogleSearch(location.href)) return; // Google Search pages are never checked
    if (whitelist.has(location.origin)) return; // user whitelisted this site — no takeover
    let refOrigin = '';
    try {
      if (document.referrer) refOrigin = new URL(document.referrer).origin;
    } catch {}
    chrome.runtime
      .sendMessage({ type: 'sb:gate', url: location.href, navType, refOrigin })
      .then((res) => {
        if (!res || res.status !== 'takeover') return;
        takeover = true;
        pendingUrl = location.href;
        if (res.data) renderTakeoverResult(location.href, res.data);
        else showTakeoverScanning(location.href);
      })
      .catch(() => {});
  })();
})();