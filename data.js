/**
 * data.js — Stock data, Yahoo Finance fetching, price history
 * StockMonitor Pro v7
 */

// ── MAG 7 CONFIG ──────────────────────────────────────────────
const MAG7 = [
  { symbol: 'AAPL', name: 'Apple Inc.',       color: '#58a6ff', page: 'pages/aapl.html' },
  { symbol: 'MSFT', name: 'Microsoft Corp.',  color: '#bc8cff', page: 'pages/msft.html' },
  { symbol: 'GOOGL',name: 'Alphabet Inc.',    color: '#3fb950', page: 'pages/googl.html'},
  { symbol: 'AMZN', name: 'Amazon.com Inc.',  color: '#d29922', page: 'pages/amzn.html' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.',     color: '#76e3af', page: 'pages/nvda.html' },
  { symbol: 'META', name: 'Meta Platforms',   color: '#f78166', page: 'pages/meta.html' },
  { symbol: 'TSLA', name: 'Tesla Inc.',       color: '#ff7b72', page: 'pages/tsla.html' },
];

// ── LIVE DATA STORE ───────────────────────────────────────────
window.stockData = {};
window.priceHistory = {};  // { AAPL: [175.2, 176.1, ...] } last 20 points

// ── YAHOO FINANCE VIA CORS PROXY ─────────────────────────────
const PROXY = 'https://corsproxy.io/?url=';
const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';

async function fetchQuote(symbol) {
  try {
    const url = `${PROXY}${encodeURIComponent(YF_BASE + symbol + '?interval=1d&range=1mo')}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('No data');

    const meta   = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const closes = result.indicators?.adjclose?.[0]?.adjclose || quotes?.close || [];
    const timestamps = result.timestamp || [];

    const price   = meta.regularMarketPrice;
    const prev    = meta.previousClose || meta.chartPreviousClose;
    const change  = price - prev;
    const changePct = (change / prev) * 100;

    // Build price history array (last 20 closes)
    const cleanCloses = closes.filter(v => v != null).slice(-20);
    window.priceHistory[symbol] = cleanCloses;

    return {
      symbol,
      price:      price,
      prev:       prev,
      change:     change,
      changePct:  changePct,
      open:       meta.regularMarketOpen,
      high:       meta.regularMarketDayHigh,
      low:        meta.regularMarketDayLow,
      volume:     meta.regularMarketVolume,
      marketCap:  meta.marketCap,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow:  meta.fiftyTwoWeekLow,
      closes:     cleanCloses,
      timestamp:  new Date().toLocaleTimeString(),
    };
  } catch (err) {
    console.warn(`[data] Failed to fetch ${symbol}:`, err.message);
    return getMockData(symbol);
  }
}

// ── MOCK DATA (fallback when market closed / rate limited) ─────
function getMockData(symbol) {
  const base = { AAPL:182.3, MSFT:415.7, GOOGL:178.4, AMZN:195.2, NVDA:875.4, META:543.1, TSLA:248.9 };
  const price = base[symbol] || 100;
  const chg   = (Math.random() - 0.48) * price * 0.025;
  const closes = Array.from({length:20}, (_,i) => parseFloat((price - chg + (Math.random()-.5)*price*.02).toFixed(2)));
  window.priceHistory[symbol] = closes;
  return {
    symbol, price, prev: price - chg,
    change: chg, changePct: (chg/price)*100,
    open: price - chg*.3, high: price + Math.abs(chg)*.8, low: price - Math.abs(chg)*.8,
    volume: Math.floor(Math.random()*80e6 + 20e6),
    marketCap: price * 1e9 * (symbol === 'AAPL' ? 2.8 : 1.2),
    fiftyTwoWeekHigh: price * 1.35, fiftyTwoWeekLow: price * 0.72,
    closes, timestamp: new Date().toLocaleTimeString() + ' (cached)',
  };
}

// ── FETCH ALL STOCKS ──────────────────────────────────────────
async function fetchAllStocks() {
  const results = await Promise.allSettled(MAG7.map(s => fetchQuote(s.symbol)));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      window.stockData[MAG7[i].symbol] = r.value;
    }
  });
  return window.stockData;
}

// ── FORMATTERS ────────────────────────────────────────────────
function fmtPrice(n)  { return n != null ? '$' + n.toFixed(2) : '—'; }
function fmtChange(n) { return (n >= 0 ? '+' : '') + n.toFixed(2); }
function fmtPct(n)    { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; }
function fmtVol(n)    { if (!n) return '—'; if (n >= 1e9) return (n/1e9).toFixed(2)+'B'; if (n >= 1e6) return (n/1e6).toFixed(1)+'M'; return n.toLocaleString(); }
function fmtCap(n)    { if (!n) return '—'; if (n >= 1e12) return '$'+(n/1e12).toFixed(2)+'T'; if (n >= 1e9) return '$'+(n/1e9).toFixed(0)+'B'; return '$'+n.toLocaleString(); }

// ── SPARKLINE SVG ─────────────────────────────────────────────
function buildSparkline(closes, color = '#58a6ff') {
  if (!closes || closes.length < 2) return '';
  const w = 240, h = 40, pad = 2;
  const min = Math.min(...closes), max = Math.max(...closes);
  const range = max - min || 1;
  const pts = closes.map((v, i) => {
    const x = pad + (i / (closes.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const isUp = closes[closes.length-1] >= closes[0];
  const lineColor = isUp ? '#3fb950' : '#f85149';
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="sparkline-svg">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${lineColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ── MARKET STATUS ─────────────────────────────────────────────
function isMarketOpen() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const h = et.getHours(), m = et.getMinutes();
  const mins = h * 60 + m;
  if (day === 0 || day === 6) return false;
  return mins >= 570 && mins < 960; // 9:30 AM – 4:00 PM ET
}
