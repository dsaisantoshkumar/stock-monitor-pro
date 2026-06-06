/**
 * app.js — Main application controller
 * StockMonitor Pro v7
 */

let refreshTimer = null;
let currentView  = 'grid';
window.allSignals = {};
window.latestNews = [];

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[app] StockMonitor Pro v7 initializing...');
  initEmailJS();
  loadSettings();
  startClock();
  updateMarketStatus();
  renderLoadingCards();
  await refreshAllData();
  startAutoRefresh();
  console.log('[app] Ready.');
});

// ── FULL REFRESH ──────────────────────────────────────────────
async function refreshAllData() {
  console.log('[app] Refreshing all data...');
  try {
    const [stocks, news] = await Promise.all([
      fetchAllStocks(),
      fetchNews(MAG7.map(s => s.symbol)),
    ]);
    window.allSignals = computeAllSignals();
    window.latestNews = news;
    renderDashboard();
    renderNews(news);
    renderSignals();
    updateSummaryBar();
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    await checkAutoAlerts();
  } catch (err) {
    console.error('[app] Refresh error:', err);
  }
}

// ── RENDER DASHBOARD ──────────────────────────────────────────
function renderDashboard() {
  if (currentView === 'grid') renderGridView();
  else                         renderTableView();
}

// ── GRID VIEW ─────────────────────────────────────────────────
function renderGridView() {
  const grid = document.getElementById('stocksGrid');
  if (!grid) return;
  grid.style.display = 'grid';

  const table = document.getElementById('stocksTable');
  if (table) table.style.display = 'none';

  grid.innerHTML = MAG7.map(({ symbol, name }) => {
    const d   = window.stockData[symbol];
    const sig = window.allSignals[symbol] || {};
    if (!d) return `<div class="stock-card"><div class="card-symbol">${symbol}</div><div style="color:var(--text3);font-size:.8rem;margin-top:.5rem">Loading...</div></div>`;

    const up  = d.changePct >= 0;
    const spark = buildSparkline(d.closes);
    return `<div class="stock-card ${up ? 'up' : 'down'}" onclick="window.location.href='pages/${symbol.toLowerCase()}.html'">
      <div class="card-top">
        <div>
          <div class="card-symbol">${symbol}</div>
          <div class="card-name">${name}</div>
        </div>
        <span class="card-signal ${sig.signal || 'HOLD'}">${sig.signal || '—'}</span>
      </div>
      <div class="card-price" style="color:${up ? 'var(--green)' : 'var(--red)'}">${fmtPrice(d.price)}</div>
      <div class="card-change">
        <span class="change-chip ${up ? 'up' : 'down'}">${fmtPct(d.changePct)}</span>
        <span style="color:var(--text3);font-size:.75rem">${fmtChange(d.change)}</span>
      </div>
      <div class="card-metrics">
        <div class="metric"><span class="metric-lbl">RSI</span><span class="metric-val" style="color:${rsiColor(sig.rsi)}">${sig.rsi != null ? sig.rsi.toFixed(1) : '—'}</span></div>
        <div class="metric"><span class="metric-lbl">Vol</span><span class="metric-val">${fmtVol(d.volume)}</span></div>
        <div class="metric"><span class="metric-lbl">Mkt Cap</span><span class="metric-val">${fmtCap(d.marketCap)}</span></div>
      </div>
      ${spark ? `<div class="card-sparkline">${spark}</div>` : ''}
    </div>`;
  }).join('');
}

// ── TABLE VIEW ────────────────────────────────────────────────
function renderTableView() {
  const grid = document.getElementById('stocksGrid');
  if (grid) grid.style.display = 'none';

  let table = document.getElementById('stocksTable');
  if (!table) {
    table = document.createElement('table');
    table.id = 'stocksTable';
    table.className = 'stocks-table';
    document.getElementById('stocksGrid').parentNode.insertBefore(table, document.getElementById('stocksGrid').nextSibling);
  }
  table.style.display = 'table';

  const rows = MAG7.map(({ symbol, name }) => {
    const d = window.stockData[symbol]; const sig = window.allSignals[symbol] || {};
    if (!d) return `<tr><td class="sym">${symbol}</td><td colspan="8" style="color:var(--text3)">Loading...</td></tr>`;
    const up = d.changePct >= 0;
    return `<tr onclick="window.location.href='pages/${symbol.toLowerCase()}.html'">
      <td class="sym">${symbol}</td>
      <td style="color:var(--text2)">${name}</td>
      <td style="color:${up?'var(--green)':'var(--red)'};font-weight:700">${fmtPrice(d.price)}</td>
      <td style="color:${up?'var(--green)':'var(--red)'}">${fmtPct(d.changePct)}</td>
      <td style="color:${rsiColor(sig.rsi)}">${sig.rsi != null ? sig.rsi.toFixed(1) : '—'}</td>
      <td>${sig.ma5  ? '$'+sig.ma5  : '—'}</td>
      <td>${sig.ma20 ? '$'+sig.ma20 : '—'}</td>
      <td>${fmtVol(d.volume)}</td>
      <td><span class="card-signal ${sig.signal||'HOLD'}" style="font-size:.6rem">${sig.signal||'—'}</span></td>
    </tr>`;
  }).join('');
  table.innerHTML = `<thead><tr><th>Symbol</th><th>Name</th><th>Price</th><th>Change%</th><th>RSI</th><th>MA5</th><th>MA20</th><th>Volume</th><th>Signal</th></tr></thead><tbody>${rows}</tbody>`;
}

// ── SIGNALS PANEL ─────────────────────────────────────────────
function renderSignals() {
  const container = document.getElementById('signalsList');
  if (!container) return;
  container.innerHTML = MAG7.map(({ symbol }) => {
    const sig = window.allSignals[symbol];
    const d   = window.stockData[symbol];
    if (!sig || !d) return '';
    const rsiPct = sig.rsi != null ? Math.min(sig.rsi, 100) : 50;
    const rsiBarColor = sig.rsi > 70 ? '#f85149' : sig.rsi < 30 ? '#3fb950' : '#d29922';
    return `<div class="signal-row">
      <span class="sig-sym">${symbol}</span>
      <span class="sig-badge ${sig.signal||'HOLD'}">${sig.signal||'—'}</span>
      <div class="sig-details">
        <div class="sig-metric">
          <span class="sig-metric-lbl">RSI</span>
          <span class="sig-metric-val" style="color:${rsiColor(sig.rsi)}">${sig.rsi != null ? sig.rsi.toFixed(1) : '—'}</span>
        </div>
        <div class="sig-metric">
          <span class="sig-metric-lbl">MA5</span>
          <span class="sig-metric-val">${sig.ma5 ? '$'+sig.ma5 : '—'}</span>
        </div>
        <div class="sig-metric">
          <span class="sig-metric-lbl">MA20</span>
          <span class="sig-metric-val">${sig.ma20 ? '$'+sig.ma20 : '—'}</span>
        </div>
        <div class="sig-bar">
          <div class="sig-rsi-bar"><div class="sig-rsi-fill" style="width:${rsiPct}%;background:${rsiBarColor}"></div></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── SUMMARY BAR ───────────────────────────────────────────────
function updateSummaryBar() {
  const data = Object.values(window.stockData);
  if (!data.length) return;

  const totalVal = data.reduce((s, d) => s + (d.price || 0), 0);
  const avgChg   = data.reduce((s, d) => s + (d.changePct || 0), 0) / data.length;
  const best  = data.reduce((a, b) => (b.changePct > a.changePct ? b : a));
  const worst = data.reduce((a, b) => (b.changePct < a.changePct ? b : a));

  document.getElementById('totalValue').textContent = '$' + totalVal.toFixed(2);
  const dayEl = document.getElementById('dayChange');
  dayEl.textContent = fmtPct(avgChg) + ' avg';
  dayEl.className = 'sum-val ' + (avgChg >= 0 ? 'green' : 'red');
  document.getElementById('bestToday').textContent  = `${best.symbol} ${fmtPct(best.changePct)}`;
  document.getElementById('worstToday').textContent = `${worst.symbol} ${fmtPct(worst.changePct)}`;
}

// ── LOADING SKELETON ──────────────────────────────────────────
function renderLoadingCards() {
  const grid = document.getElementById('stocksGrid');
  if (!grid) return;
  grid.innerHTML = MAG7.map(({ symbol, name }) =>
    `<div class="stock-card" style="opacity:.5">
      <div class="card-top">
        <div><div class="card-symbol">${symbol}</div><div class="card-name">${name}</div></div>
      </div>
      <div class="card-price" style="color:var(--text3)">Loading...</div>
    </div>`
  ).join('');
}

// ── CLOCK ─────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const el = document.getElementById('navTime');
    if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12:true, timeZoneName:'short' });
  }
  tick();
  setInterval(tick, 1000);
}

// ── MARKET STATUS ─────────────────────────────────────────────
function updateMarketStatus() {
  const el = document.getElementById('marketStatus');
  if (!el) return;
  if (isMarketOpen()) {
    el.textContent = '● MARKET OPEN';
    el.style.color = 'var(--green)';
    el.classList.remove('closed');
  } else {
    el.textContent = '○ MARKET CLOSED';
    el.style.color = 'var(--text3)';
    el.classList.add('closed');
  }
}

// ── AUTO REFRESH ──────────────────────────────────────────────
function startAutoRefresh() {
  const interval = parseInt(localStorage.getItem('smp_refresh') || '300') * 1000;
  if (refreshTimer) clearInterval(refreshTimer);
  if (interval > 0) {
    refreshTimer = setInterval(() => { refreshAllData(); updateMarketStatus(); }, interval);
    console.log('[app] Auto-refresh every', interval/1000, 'seconds');
  }
}

// ── VIEW TOGGLE ───────────────────────────────────────────────
function setView(view) {
  currentView = view;
  document.getElementById('btnGrid')?.classList.toggle('active', view === 'grid');
  document.getElementById('btnTable')?.classList.toggle('active', view === 'table');
  renderDashboard();
}

// ── MODALS ────────────────────────────────────────────────────
function openAlertsModal()   { document.getElementById('alertsModal')?.classList.add('open');   }
function openSettingsModal() { document.getElementById('settingsModal')?.classList.add('open'); loadSettingsToForm(); }
function closeModal(id)      { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); });

// ── SETTINGS ─────────────────────────────────────────────────
function loadSettings() {
  // Settings are loaded per-module from localStorage
}
function loadSettingsToForm() {
  const set = (id, key, def) => { const el = document.getElementById(id); if (el) el.value = localStorage.getItem(key) || def; };
  set('cfgPublicKey',  'smp_ej_key',       'fof2kfSPzOm-gRMrI');
  set('cfgServiceId',  'smp_ej_service',   'service_yxemoqc');
  set('cfgTemplateId', 'smp_ej_template',  'template_836mkd8');
  set('cfgLMStudio',   'smp_lm_endpoint',  'http://localhost:1234');
  set('cfgModel',      'smp_lm_model',     'qwen2.5-7b-instruct');
  set('cfgApify',      'smp_apify',        '');
  set('cfgRefresh',    'smp_refresh',      '300');
}
function saveSettings() {
  const get = id => document.getElementById(id)?.value || '';
  localStorage.setItem('smp_ej_key',      get('cfgPublicKey'));
  localStorage.setItem('smp_ej_service',  get('cfgServiceId'));
  localStorage.setItem('smp_ej_template', get('cfgTemplateId'));
  localStorage.setItem('smp_lm_endpoint', get('cfgLMStudio'));
  localStorage.setItem('smp_lm_model',    get('cfgModel'));
  localStorage.setItem('smp_apify',       get('cfgApify'));
  localStorage.setItem('smp_refresh',     get('cfgRefresh'));
  initEmailJS();
  startAutoRefresh();
  closeModal('settingsModal');
  alert('✅ Settings saved!');
}
