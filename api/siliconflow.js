// ============================================
// Vercel Serverless Function — SiliconFlow API Proxy
// Keeps SILICONFLOW_API_KEY server-side
// Supports video submit and status-check endpoints
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

  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'SILICONFLOW_API_KEY is not configured on the server.' });
  }

  try {
    const { action, ...payload } = req.body;

    // Determine which SiliconFlow endpoint to call
    // action: 'submit' (default) or 'status'
    let targetUrl;
    if (action === 'status') {
      targetUrl = 'https://api.siliconflow.com/v1/video/status';
    } else {
      targetUrl = 'https://api.siliconflow.com/v1/video/submit';
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || data.message || 'SiliconFlow API request failed',
        details: data.error || data,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('SiliconFlow proxy error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
