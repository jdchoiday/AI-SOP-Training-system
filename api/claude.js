// ============================================
// Vercel Serverless Function — Anthropic Claude API Proxy
// Keeps ANTHROPIC_API_KEY server-side
// ============================================

if (typeof exports !== 'undefined') {
  try { Object.defineProperty(exports, 'config', { value: { maxDuration: 60 } }); } catch(e) {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not configured on the server.',
      hint: '.env 파일에 ANTHROPIC_API_KEY=sk-ant-... 추가 후 서버 재시작하세요.',
    });
  }

  try {
    const {
      prompt,
      system,
      model = 'claude-opus-4-7',
      max_tokens = 8192,
      temperature,
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    // Opus 4.x / Sonnet 4.x 는 thinking 모드 기반이라 temperature 를 거부
    // 명시적으로 숫자가 들어왔을 때만 포함, 모델이 thinking 계열이면 제외
    const isThinkingModel = /^claude-(opus-4|sonnet-4)/i.test(model);
    const body = {
      model,
      max_tokens,
      messages: [{ role: 'user', content: prompt }],
    };
    if (!isThinkingModel && typeof temperature === 'number') {
      body.temperature = temperature;
    }
    if (system) body.system = system;

    // 최대 3회 재시도 (429/5xx 대응)
    const MAX_RETRY = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

      let response;
      try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeout);
        lastError = fetchErr;
        if (attempt < MAX_RETRY) {
          await new Promise(r => setTimeout(r, attempt * 1500));
          continue;
        }
        break;
      } finally {
        clearTimeout(timeout);
      }

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      // 429 (rate limit) 또는 5xx 재시도
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRY) {
        const waitSec = attempt * 3;
        console.log(`[Claude] ${response.status} 재시도 대기 ${waitSec}s (${attempt}/${MAX_RETRY})`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      return res.status(response.status).json({
        error: data.error?.message || 'Claude API request failed',
        type: data.error?.type,
        details: data.error,
      });
    }

    return res.status(502).json({
      error: 'Claude API unreachable after retries',
      message: lastError?.message || 'Unknown error',
    });
  } catch (err) {
    console.error('Claude proxy error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
