/**
 * signals.js — Technical analysis: RSI, MA5, MA20, MACD signals
 * StockMonitor Pro v7
 */

// ── RSI CALCULATOR ────────────────────────────────────────────
function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains  += delta;
    else           losses -= delta;
  }
  let avgGain = gains  / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(delta,  0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

// ── MOVING AVERAGE ────────────────────────────────────────────
function calcMA(closes, period) {
  if (!closes || closes.length < period) return null;
  const slice = closes.slice(-period);
  return parseFloat((slice.reduce((a, b) => a + b, 0) / period).toFixed(2));
}

// ── MACD ──────────────────────────────────────────────────────
function calcEMA(closes, period) {
  if (!closes || closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a,b)=>a+b,0)/period;
  for (let i = period; i < closes.length; i++) ema = closes[i]*k + ema*(1-k);
  return parseFloat(ema.toFixed(2));
}
function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  if (!ema12 || !ema26) return null;
  return parseFloat((ema12 - ema26).toFixed(2));
}

// ── BOLLINGER BANDS ───────────────────────────────────────────
function calcBollinger(closes, period = 20) {
  if (!closes || closes.length < period) return null;
  const slice = closes.slice(-period);
  const ma = slice.reduce((a,b)=>a+b,0)/period;
  const variance = slice.reduce((s,v)=>s+Math.pow(v-ma,2),0)/period;
  const std = Math.sqrt(variance);
  return { upper: +(ma+2*std).toFixed(2), mid: +ma.toFixed(2), lower: +(ma-2*std).toFixed(2) };
}

// ── GENERATE SIGNAL ───────────────────────────────────────────
function generateSignal(data, closes) {
  const rsi  = calcRSI(closes);
  const ma5  = calcMA(closes, 5);
  const ma20 = calcMA(closes, 20);
  const macd = calcMACD(closes);
  const boll = calcBollinger(closes);
  const price = data.price;

  let score = 0;
  const reasons = [];

  // RSI scoring
  if (rsi !== null) {
    if      (rsi < 30) { score += 2; reasons.push('RSI oversold'); }
    else if (rsi < 45) { score += 1; reasons.push('RSI below midpoint'); }
    else if (rsi > 70) { score -= 2; reasons.push('RSI overbought'); }
    else if (rsi > 60) { score -= 1; reasons.push('RSI elevated'); }
  }

  // MA crossover scoring
  if (ma5 && ma20) {
    if      (ma5 > ma20 && price > ma5)  { score += 2; reasons.push('Price above MA5 & MA20'); }
    else if (ma5 < ma20 && price < ma5)  { score -= 2; reasons.push('Price below MA5 & MA20'); }
    else if (ma5 > ma20)                 { score += 1; reasons.push('MA5 above MA20'); }
    else                                 { score -= 1; reasons.push('MA5 below MA20'); }
  }

  // MACD scoring
  if (macd !== null) {
    if      (macd > 0.5)  { score += 1; reasons.push('MACD bullish'); }
    else if (macd < -0.5) { score -= 1; reasons.push('MACD bearish'); }
  }

  // Bollinger scoring
  if (boll) {
    if      (price < boll.lower) { score += 1; reasons.push('Below lower Bollinger'); }
    else if (price > boll.upper) { score -= 1; reasons.push('Above upper Bollinger'); }
  }

  // Map score to signal
  let signal;
  if      (score >= 3)  signal = 'BUY';
  else if (score <= -3) signal = 'SELL';
  else if (Math.abs(score) <= 1) signal = 'HOLD';
  else    signal = 'WATCH';

  return { signal, score, rsi, ma5, ma20, macd, boll, reasons };
}

// ── COMPUTE ALL SIGNALS ───────────────────────────────────────
function computeAllSignals() {
  const results = {};
  MAG7.forEach(({ symbol }) => {
    const data   = window.stockData[symbol];
    const closes = window.priceHistory[symbol];
    if (data && closes) {
      results[symbol] = generateSignal(data, closes);
    }
  });
  return results;
}

// ── RSI COLOR ─────────────────────────────────────────────────
function rsiColor(rsi) {
  if (rsi == null) return '#8b949e';
  if (rsi < 30)   return '#3fb950';
  if (rsi > 70)   return '#f85149';
  if (rsi < 45)   return '#76e3af';
  if (rsi > 60)   return '#ff7b72';
  return '#d29922';
}
