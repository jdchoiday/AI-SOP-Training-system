// ============================================
// Vercel Serverless Function — Gemini API Proxy
// Keeps GEMINI_API_KEY server-side
// ============================================

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  try {
    const { prompt, type, model, generationConfig } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    const geminiModel = model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: generationConfig || {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    // 429 자동 재시도 (최대 3회, 대기 후 재시도)
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      // 429 (Too Many Requests) → 대기 후 재시도
      if (response.status === 429 && attempt < maxRetries - 1) {
        const waitSec = (attempt + 1) * 5; // 5초, 10초, 15초
        console.log(`[Gemini] 429 rate limit, ${waitSec}초 대기 후 재시도 (${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      lastError = data;
      return res.status(response.status).json({
        error: data.error?.message || 'Gemini API request failed',
        details: data.error,
      });
    }
  } catch (err) {
    console.error('Gemini proxy error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
