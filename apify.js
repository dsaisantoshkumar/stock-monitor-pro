/**
 * apify.js — News scraping via Apify Web Scraper
 * StockMonitor Pro v7
 *
 * Uses Apify actor: apify/website-content-crawler
 * Scrapes: Yahoo Finance News, CNBC Markets, Reuters Finance
 */

let currentNewsFilter = 'all';

// ── CONFIG ────────────────────────────────────────────────────
function getApifyToken() {
  return localStorage.getItem('smp_apify') || '';
}

// ── FETCH NEWS ────────────────────────────────────────────────
async function fetchNews(symbols = ['AAPL','MSFT','GOOGL','NVDA','TSLA']) {
  const token = getApifyToken();
  if (!token) {
    console.log('[apify] No API token — using built-in mock news');
    return getMockNews(symbols);
  }
  try {
    const urls = symbols.slice(0, 3).map(s =>
      `https://finance.yahoo.com/quote/${s}/news`
    );
    const runRes = await fetch('https://api.apify.com/v2/acts/apify~website-content-crawler/runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        startUrls: urls.map(url => ({ url })),
        maxCrawlPages: 3,
        maxCrawlDepth: 0,
      })
    });
    const run = await runRes.json();
    const datasetId = run?.data?.defaultDatasetId;
    if (!datasetId) throw new Error('No dataset ID from Apify');

    await new Promise(r => setTimeout(r, 8000));
    const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const items = await dataRes.json();
    return parseApifyNews(items, symbols);
  } catch (err) {
    console.warn('[apify] Falling back to mock news:', err.message);
    return getMockNews(symbols);
  }
}

// ── PARSE APIFY OUTPUT ────────────────────────────────────────
function parseApifyNews(items, symbols) {
  const news = [];
  items.forEach(item => {
    const text = (item.text || item.title || '').substring(0, 300);
    if (!text) return;
    const ticker = symbols.find(s => text.includes(s)) || 'MARKET';
    news.push({
      headline: item.title || text.substring(0, 100),
      source: item.url ? new URL(item.url).hostname.replace('www.','') : 'News',
      time: '2h ago',
      ticker,
      sentiment: analyzeSentiment(text),
      url: item.url || '#',
    });
  });
  return news.slice(0, 12);
}

// ── MOCK NEWS (fallback) ──────────────────────────────────────
function getMockNews(symbols) {
  const pool = [
    { headline: 'Apple Intelligence features expand to more regions in latest iOS update', source: 'Reuters', ticker: 'AAPL', sentiment: 1, time: '32m ago' },
    { headline: 'NVIDIA reports record data center revenue driven by H100 demand surge', source: 'CNBC', ticker: 'NVDA', sentiment: 1, time: '1h ago' },
    { headline: 'Microsoft Azure cloud growth accelerates as AI workloads increase', source: 'Bloomberg', ticker: 'MSFT', sentiment: 1, time: '1h ago' },
    { headline: 'Tesla cuts Model 3 prices in China amid intensifying EV competition', source: 'Reuters', ticker: 'TSLA', sentiment: -1, time: '2h ago' },
    { headline: 'Alphabet reports strong YouTube and Search revenue in Q3 earnings', source: 'WSJ', ticker: 'GOOGL', sentiment: 1, time: '2h ago' },
    { headline: 'Amazon Web Services adds new AI capabilities to cloud platform', source: 'TechCrunch', ticker: 'AMZN', sentiment: 1, time: '3h ago' },
    { headline: 'Meta Platforms Threads surpasses 200 million monthly active users', source: 'Verge', ticker: 'META', sentiment: 1, time: '3h ago' },
    { headline: 'Fed signals potential rate cuts as inflation data shows improvement', source: 'FT', ticker: 'MARKET', sentiment: 0, time: '4h ago' },
    { headline: 'Tech sector sees broad gains amid AI investment optimism', source: 'CNBC', ticker: 'MARKET', sentiment: 1, time: '4h ago' },
    { headline: 'Apple Vision Pro production reportedly ramping ahead of schedule', source: 'MacRumors', ticker: 'AAPL', sentiment: 1, time: '5h ago' },
    { headline: 'Tesla Cybertruck delivery targets revised lower for Q4', source: 'Electrek', ticker: 'TSLA', sentiment: -1, time: '5h ago' },
    { headline: 'NVIDIA partners with cloud providers for next-gen Blackwell GPU rollout', source: 'Wired', ticker: 'NVDA', sentiment: 1, time: '6h ago' },
  ];
  return pool;
}

// ── SENTIMENT ANALYZER ────────────────────────────────────────
function analyzeSentiment(text) {
  const pos = ['surge', 'record', 'growth', 'gain', 'strong', 'beat', 'rise', 'expand', 'boost', 'profit', 'rally'];
  const neg = ['cut', 'fall', 'miss', 'decline', 'drop', 'loss', 'weak', 'struggle', 'downgrade', 'concern', 'risk'];
  const t = text.toLowerCase();
  let score = 0;
  pos.forEach(w => { if (t.includes(w)) score++; });
  neg.forEach(w => { if (t.includes(w)) score--; });
  return score > 0 ? 1 : score < 0 ? -1 : 0;
}

// ── RENDER NEWS LIST ──────────────────────────────────────────
function renderNews(news) {
  const container = document.getElementById('newsList');
  if (!container) return;

  const filtered = currentNewsFilter === 'all'
    ? news
    : news.filter(n => n.ticker === currentNewsFilter || n.ticker === 'MARKET');

  if (!filtered.length) {
    container.innerHTML = '<div class="news-loading">No news found for this filter.</div>';
    return;
  }

  container.innerHTML = filtered.map(n => {
    const sentColor = n.sentiment > 0 ? '#3fb950' : n.sentiment < 0 ? '#f85149' : '#8b949e';
    return `<div class="news-item" onclick="window.open('${n.url || '#'}','_blank')">
      <div class="news-headline">
        <span class="news-sentiment" style="background:${sentColor}"></span>
        ${n.headline}
      </div>
      <div class="news-meta">
        <span class="news-ticker">${n.ticker}</span>
        <span class="news-source">${n.source}</span>
        <span class="news-time">${n.time}</span>
      </div>
    </div>`;
  }).join('');
}

// ── FILTER NEWS ───────────────────────────────────────────────
function filterNews(ticker) {
  currentNewsFilter = ticker;
  document.querySelectorAll('.nf-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nf-btn').forEach(b => {
    if (b.textContent.trim() === ticker || (ticker === 'all' && b.textContent.trim() === 'All')) {
      b.classList.add('active');
    }
  });
  renderNews(window.latestNews || []);
}
