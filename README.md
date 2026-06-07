# 📈 Stock Monitor Pro — Mag 7 Dashboard

> A self-contained, real-time dashboard for tracking the **Magnificent 7** stocks — built by Sai Santosh Kumar Devarasetty.

🔗 **Live site:** [dsaisantoshkumar.github.io/stock-monitor-pro](https://dsaisantoshkumar.github.io/stock-monitor-pro)

---

## What is this?

Stock Monitor Pro is a lightweight, single-file web dashboard that helps you keep an eye on the seven biggest tech stocks in the market — Apple, Google, Tesla, Microsoft, NVIDIA, Amazon, and Meta.

No backend. No build step. No dependencies to install. Just one HTML file that runs entirely in your browser.

It fetches live prices from Yahoo Finance, gives you buy/hold/sell signals based on simple technical analysis, sends email alerts when your price thresholds are hit, and shows you curated news with a sentiment score for each stock.

---

## Stocks tracked

| Ticker | Company |
|--------|---------|
| AAPL | Apple Inc. |
| GOOGL | Alphabet (Google) |
| TSLA | Tesla Inc. |
| MSFT | Microsoft Corp. |
| NVDA | NVIDIA Corp. |
| AMZN | Amazon.com |

---

## Features

**Dashboard**
- Live prices pulled from Yahoo Finance every 5 minutes
- Day high / day low / % change at a glance
- News sentiment score (positive / neutral / bearish)
- Analyst target price and consensus rating
- Switch between any of the 6 stocks with one click

**Price chart**
- Interactive line chart via Chart.js
- Price history for 1 day, 1 week, or 1 month
- Overlays: 5-day moving average, 20-day moving average
- 20-day price forecast based on current trend direction

**Buy / Hold / Sell signal**
The signal is based on 4 factors scored together:
- Momentum (RSI) — is the stock moving too fast or too slow?
- Price vs 20-day average — is it above or below the trend?
- Short-term uptrend — is the 5-day avg crossing above the 20-day?
- News sentiment — are the headlines positive or negative?

All 4 positive → **BUY**. Mixed → **HOLD**. All negative → **CAUTION**.

**Portfolio tracker**
- Add your own positions with number of shares and buy price
- See live P&L (profit and loss) calculated in real time
- Allocation donut chart showing your portfolio split

**Email alerts**
Powered by [EmailJS](https://www.emailjs.com/) — no server needed. Set a rule and get an email when it fires:
- Price drops below a threshold
- Price rises above a target
- Single-day % drop exceeds your limit
- Critical danger low
- Momentum oversold (RSI < 30) — potential buy opportunity
- Momentum overbought (RSI > 70) — consider taking profit

**News feed**
- Curated headlines for each stock with bullish / neutral / bearish labels
- Sentiment scores on a scale from -1 (very bearish) to +1 (very bullish)
- Filter by individual stock or view all at once

**Custom stock**
Add any ticker (e.g. META) via the Settings tab. It fetches the live price and slots into the dashboard alongside the defaults.

---

## How the signals work (plain English)

| Signal | What it means |
|--------|--------------|
| **Momentum (RSI 0–100)** | Like a speedometer. Below 30 = too slow, may bounce up. Above 70 = too fast, may drop. 30–70 = healthy. |
| **Price vs 20-day avg** | If today's price is above the 20-day average, the stock is in good shape. Below it = weak. |
| **20-day forecast** | If the current trend keeps going at the same speed, this is where the price might land. Not a guarantee. |
| **Risk score (1–10)** | 1–3 = good time to invest. 4–6 = proceed carefully. 7–10 = better to wait. |

---

## Tech stack

- **Vanilla HTML / CSS / JavaScript** — zero frameworks, zero build tools
- **[Chart.js 4.4.1](https://www.chartjs.org/)** — price charts via CDN
- **[Yahoo Finance API](https://query1.finance.yahoo.com/)** — live price data
- **[EmailJS](https://www.emailjs.com/)** — email alerts without a backend
- **GitHub Pages** — hosting

Everything is bundled into a single `index.html` file. No `node_modules`, no webpack, no server.

---

## EmailJS setup

The alert emails are configured with:

| Field | Value |
|-------|-------|
| Service ID | `service_3rss6un` |
| Template ID | `template_oqicjpe` |
| Public Key | `fof2kfSPzOm-gRMrI` |
| To email | `saisantoshkumar29@gmail.com` (hardcoded in template) |

To use your own EmailJS account, replace those values near the top of `index.html`:

```js
const EMAILJS_PUB = 'your_public_key';
const SVC = 'your_service_id';
const TPL = 'your_template_id';
```

---

## Local development

No build step needed. Just open the file:

```bash
# Option 1: open directly
open index.html

# Option 2: serve locally (avoids CORS issues with Yahoo Finance)
npx serve .
# or
python3 -m http.server 8080
```

---

## Deployment

This project is deployed via GitHub Pages from the `main` branch. Any commit to `main` automatically updates the live site within about 60 seconds.

To deploy your own copy:
1. Fork this repo
2. Go to **Settings → Pages**
3. Set source to **Deploy from a branch → main → / (root)**
4. Your site will be live at `https://yourusername.github.io/stock-monitor-pro`

---

## Project structure

```
stock-monitor-pro/
├── index.html        ← entire app (HTML + CSS + JS, self-contained)
└── README.md
```

The old multi-file setup (`app.js`, `data.js`, `signals.js`, `email.js`, `style.css`) has been replaced by this single file for simplicity and portability.

---

## Disclaimer

This dashboard is for **informational and educational purposes only**. Nothing here is financial advice. Stock signals are based on simple technical indicators — they are not predictions. Always do your own research before investing, and never invest more than you can afford to lose.

---

## Author

**Sai Santosh Kumar Devarasetty**
SAP ABAP Consultant · GitHub: [@dsaisantoshkumar](https://github.com/dsaisantoshkumar)
