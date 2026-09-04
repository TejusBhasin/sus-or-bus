// Sus or Bus — content script
// Intercepts clicks on links to other sites, shows the SUS or BUS rating
// in a corner popup with Continue / Cancel.

(function () {
  if (window.__susbusContent) return;
  window.__susbusContent = true;

  const REPORT_BASE = 'https://susbus.base44.app/report/';
  const HERE = location.origin;

  let host = null;
  let shadow = null;
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
    .sb-btn { flex: 1; min-height: 40px; border-radius: 9px; border: 1px solid rgba(148,163,184,0.3); background: transparent; color: #e2e8f0; font-size: 13px; font-weight: 600; cursor: pointer; }
    .sb-btn:hover { background: rgba(148,163,184,0.12); }
    .sb-btn.go { background: #e2e8f0; color: #0b1220; border-color: #e2e8f0; }
    .sb-btn.go.sus { background: #f87171; border-color: #f87171; color: #1a0505; }
    .sb-btn.go:hover { filter: brightness(1.06); }
    .sb-scan { display: flex; align-items: center; gap: 10px; color: #cbd5e1; padding: 8px 0 2px; }
    .sb-spin { width: 16px; height: 16px; border: 2px solid rgba(148,163,184,0.35); border-top-color: #e2e8f0; border-radius: 50%; animation: sb-rot 0.8s linear infinite; flex: none; }
    @keyframes sb-rot { to { transform: rotate(360deg); } }
    .sb-anyway { margin-top: 10px; text-align: center; }
    .sb-link { color: #818cf8; cursor: pointer; text-decoration: none; font-size: 12px; }
    .sb-link:hover { text-decoration: underline; }
    .sb-report { display: inline-block; margin-top: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; }
    .sb-error { color: #fbbf24; }
  `;

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function shortUrl(url) {
    let s = url.replace(/^https?:\/\//i, '');
    if (s.length > 42) s = s.slice(0, 39) + '…';
    return s;
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
      if (act === 'cancel') closePopup();
      else if (act === 'go') proceed();
      else if (act === 'report' && pendingReportId) {
        window.open(REPORT_BASE + pendingReportId, '_blank', 'noopener');
      }
    });
    document.documentElement.appendChild(host);
  }

  function renderCard(bodyHtml) {
    ensurePopup();
    const old = shadow.querySelector('.sb-card');
    if (old) old.remove();
    const card = document.createElement('div');
    card.className = 'sb-card';
    card.innerHTML = bodyHtml;
    shadow.appendChild(card);
  }

  const headHtml = `
    <div class="sb-head">
      <span class="sb-brand">SUS or BUS</span>
      <button class="sb-close" data-act="cancel" aria-label="Close">✕</button>
    </div>
  `;

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
    renderCard(`
      ${headHtml}
      <div class="sb-body">
        <div class="sb-url">${escapeHtml(shortUrl(url))}</div>
        <div class="sb-verdict ${verdict}">${verdict === 'bus' ? 'BUS' : 'SUS'}</div>
        <div class="sb-valid ${verdict}">Final verdict: ${verdict === 'bus' ? 'Valid' : 'Not Valid'}</div>
        <div class="sb-score">${Math.round(d.score || 0)} / 100</div>
        ${points ? `<div class="sb-points">${points}</div>` : ''}
        ${pendingReportId ? `<a class="sb-link sb-report" data-act="report">Full report →</a>` : ''}
      </div>
      <div class="sb-actions">
        <button class="sb-btn" data-act="cancel">Cancel</button>
        <button class="sb-btn go ${verdict}" data-act="go">Continue</button>
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

  function proceed() {
    const url = pendingUrl;
    const mode = pendingMode;
    closePopup();
    if (!url) return;
    if (mode === 'blank') window.open(url, '_blank', 'noopener');
    else location.href = url;
  }

  function closePopup() {
    if (host) host.remove();
    host = null;
    shadow = null;
    pendingUrl = null;
    pendingReportId = null;
  }

  // Background pushes the finished scan result into an open popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== 'sb:update' || msg.url !== pendingUrl) return;
    if (msg.status === 'hit') renderResult(pendingUrl, msg.data);
    else renderError(pendingUrl);
  });

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
})();