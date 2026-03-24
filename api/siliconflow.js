// ============================================
// Vercel Serverless Function — SiliconFlow API Proxy
// ============================================

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

    // Only send fields that SiliconFlow expects
    let payload;
    if (action === 'status') {
      payload = { requestId: rest.requestId };
    } else {
      payload = {
        model: rest.model,
        prompt: rest.prompt,
        image_size: rest.image_size || '1280x720',
      };
      if (rest.negative_prompt) payload.negative_prompt = rest.negative_prompt;
      if (rest.seed) payload.seed = rest.seed;
    }

    console.log('SiliconFlow proxy ->', targetUrl, JSON.stringify(payload));

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('SiliconFlow response <-', response.status, JSON.stringify(data));

    return res.status(response.status).json(data);
  } catch (err) {
    console.error('SiliconFlow proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
};
