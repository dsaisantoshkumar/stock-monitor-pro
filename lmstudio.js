/**
 * lmstudio.js — Local AI analysis via LM Studio API
 * StockMonitor Pro v7
 *
 * Requires LM Studio running locally:
 *   1. Download: https://lmstudio.ai
 *   2. Load model: qwen2.5-7b-instruct (or any model)
 *   3. Start local server: Settings → Local Server → Start
 *   4. Default endpoint: http://localhost:1234
 */

function getLMConfig() {
  return {
    endpoint: localStorage.getItem('smp_lm_endpoint') || 'http://localhost:1234',
    model:    localStorage.getItem('smp_lm_model')    || 'qwen2.5-7b-instruct',
  };
}

// ── RUN AI ANALYSIS ───────────────────────────────────────────
async function runAIAnalysis() {
  const symbol = document.getElementById('aiStockSelect')?.value || 'AAPL';
  const aiContent = document.getElementById('aiContent');
  if (!aiContent) return;

  // Show loading state
  aiContent.innerHTML = `<div class="ai-loading">
    <div class="ai-spinner"></div>
    <span>Analyzing ${symbol} with LM Studio AI...</span>
  </div>`;

  const stock = window.stockData[symbol];
  const sigs  = (window.allSignals || {})[symbol] || {};
  const mag7  = MAG7.find(s => s.symbol === symbol) || {};

  if (!stock) {
    aiContent.innerHTML = `<div class="ai-placeholder"><p>No price data for ${symbol}. Try refreshing first.</p></div>`;
    return;
  }

  const prompt = buildAnalysisPrompt(symbol, mag7.name, stock, sigs);
  const cfg = getLMConfig();

  try {
    const res = await fetch(`${cfg.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional stock market analyst. Provide concise, data-driven analysis in 3-4 short paragraphs. 
Use clear sections: Outlook, Risk Factors, Key Levels, Short-term View.
Be direct and actionable. Today's date: ${new Date().toDateString()}.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 400,
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LM Studio returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || 'No response from model.';
    renderAIOutput(symbol, stock, sigs, text);

  } catch (err) {
    console.warn('[lmstudio] Error:', err.message);
    if (err.name === 'TimeoutError' || err.message.includes('Failed to fetch') || err.message.includes('ERR_CONNECTION_REFUSED')) {
      aiContent.innerHTML = `
        <div class="ai-placeholder">
          <div class="ai-icon">⚠️</div>
          <p><strong>LM Studio not running</strong></p>
          <p>Start LM Studio on your machine and load a model, then try again.</p>
          <p class="ai-note mono">Expected at: ${getLMConfig().endpoint}</p>
          <div style="margin-top:1rem; padding:.8rem; background:var(--bg3); border-radius:8px; text-align:left; font-size:.78rem; color:var(--text2);">
            <strong>Quick Setup:</strong><br>
            1. Download LM Studio from <span style="color:var(--blue)">lmstudio.ai</span><br>
            2. Load a model (recommended: Qwen2.5-7B-Instruct)<br>
            3. Click "Start Server" in the Local Server tab<br>
            4. Refresh and try again
          </div>
          <button class="btn-analyze" style="margin-top:1rem" onclick="useFallbackAnalysis('${symbol}')">Use Fallback Analysis →</button>
        </div>`;
    } else {
      aiContent.innerHTML = `<div class="ai-placeholder"><p>Error: ${err.message}</p></div>`;
    }
  }
}

// ── BUILD PROMPT ──────────────────────────────────────────────
function buildAnalysisPrompt(symbol, name, stock, sigs) {
  return `Analyze ${name} (${symbol}) stock:

PRICE DATA:
- Current: ${fmtPrice(stock.price)} | Change: ${fmtChange(stock.change)} (${fmtPct(stock.changePct)})
- Day: High ${fmtPrice(stock.high)}, Low ${fmtPrice(stock.low)}
- 52W: High ${fmtPrice(stock.fiftyTwoWeekHigh)}, Low ${fmtPrice(stock.fiftyTwoWeekLow)}
- Volume: ${fmtVol(stock.volume)} | Market Cap: ${fmtCap(stock.marketCap)}

TECHNICAL SIGNALS:
- Signal: ${sigs.signal || '—'}
- RSI(14): ${sigs.rsi != null ? sigs.rsi.toFixed(1) : '—'}
- MA5: ${sigs.ma5 ? '$'+sigs.ma5 : '—'} | MA20: ${sigs.ma20 ? '$'+sigs.ma20 : '—'}
- MACD: ${sigs.macd != null ? sigs.macd : '—'}
- Reasons: ${(sigs.reasons || []).join(', ') || 'N/A'}

Provide analysis with sections: **Outlook**, **Risk Factors**, **Key Levels**, **Short-term View**.`;
}

// ── RENDER AI OUTPUT ──────────────────────────────────────────
function renderAIOutput(symbol, stock, sigs, text) {
  const aiContent = document.getElementById('aiContent');
  const sentimentColor = sigs.signal === 'BUY' ? '#3fb950' : sigs.signal === 'SELL' ? '#f85149' : '#d29922';
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<h4>$1</h4>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>').replace(/$/, '</p>');

  aiContent.innerHTML = `
    <div class="ai-output">
      <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.8rem;padding-bottom:.8rem;border-bottom:1px solid var(--border2)">
        <span style="font-family:var(--font-mono);font-size:.82rem;font-weight:700;color:var(--text)">${symbol}</span>
        <span style="font-family:var(--font-mono);font-size:.82rem">${fmtPrice(stock.price)}</span>
        <span style="font-size:.75rem;padding:.15rem .55rem;border-radius:999px;background:${sentimentColor}22;color:${sentimentColor};font-weight:700;border:1px solid ${sentimentColor}44">${sigs.signal || '—'}</span>
        <span style="font-size:.7rem;color:var(--text3);margin-left:auto;font-family:var(--font-mono)">${new Date().toLocaleTimeString()}</span>
      </div>
      ${formatted}
    </div>`;
}

// ── FALLBACK ANALYSIS (no LM Studio needed) ───────────────────
function useFallbackAnalysis(symbol) {
  const stock = window.stockData[symbol] || {};
  const sigs  = (window.allSignals || {})[symbol] || {};
  const mag7  = MAG7.find(s => s.symbol === symbol) || {};

  const rsi  = sigs.rsi != null ? sigs.rsi.toFixed(1) : '—';
  const ma5  = sigs.ma5  || '—';
  const ma20 = sigs.ma20 || '—';

  const outlook = sigs.signal === 'BUY'  ? 'Bullish — momentum indicators suggest positive near-term movement.'
                : sigs.signal === 'SELL' ? 'Bearish — indicators suggest possible short-term weakness.'
                : 'Neutral — stock is in consolidation, waiting for clear direction.';

  const analysis = `**Outlook**\n${outlook} Current price of ${fmtPrice(stock.price)} with ${fmtPct(stock.changePct)} daily change suggests ${stock.changePct >= 0 ? 'buying pressure' : 'selling pressure'}.

**Risk Factors**\nKey resistance at ${fmtPrice(stock.fiftyTwoWeekHigh)}. RSI at ${rsi} ${parseFloat(rsi) > 65 ? 'approaching overbought territory' : parseFloat(rsi) < 35 ? 'approaching oversold territory' : 'in neutral zone'}. Monitor volume for confirmation.

**Key Levels**\nSupport: ${fmtPrice(stock.low)} (day low) / ${fmtPrice(stock.fiftyTwoWeekLow)} (52W low)\nResistance: ${fmtPrice(stock.high)} (day high) / ${fmtPrice(stock.fiftyTwoWeekHigh)} (52W high)\nMA5: $${ma5} | MA20: $${ma20}

**Short-term View**\nSignal: ${sigs.signal || '—'}. ${(sigs.reasons || []).slice(0,2).join('. ')}${sigs.reasons?.length ? '.' : ''} Consider position sizing based on risk tolerance.`;

  renderAIOutput(symbol, stock, sigs, analysis);
}
