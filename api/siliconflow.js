// Vercel Serverless Function — SiliconFlow API Proxy
// maxDuration 설정으로 타임아웃 확장

// Vercel config (ignored in local server)
if (typeof exports !== 'undefined') {
  try { Object.defineProperty(exports, 'config', { value: { maxDuration: 30 } }); } catch(e) {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'SILICONFLOW_API_KEY not set' });

  try {
    const { action, ...rest } = req.body;

    const targetUrl = action === 'status'
      ? 'https://api.siliconflow.com/v1/video/status'
      : 'https://api.siliconflow.com/v1/video/submit';

    let payload;
    if (action === 'status') {
      payload = { requestId: rest.requestId };
    } else {
      payload = { model: rest.model, prompt: rest.prompt, image_size: rest.image_size || '1280x720' };
    }

    // 최대 2번 재시도
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (e) {
        lastError = e;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }
    }

    return res.status(500).json({ error: lastError.message });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
