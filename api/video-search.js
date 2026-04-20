// ============================================
// Pexels + Pixabay 영상 검색 API
// ============================================
// POST /api/video-search
// Body: { query: "teacher kindergarten", count: 5, minDuration: 3, maxDuration: 15 }
//
// 응답: 영상 URL 목록 (우선 Pexels, 결과 부족 시 Pixabay 폴백)
// ============================================

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const pexelsKey = process.env.PEXELS_API_KEY;
  const pixabayKey = process.env.PIXABAY_API_KEY; // 선택 (폴백용)

  if (!pexelsKey && !pixabayKey) {
    return res.status(500).json({
      error: 'No video API key configured',
      hint: 'Set PEXELS_API_KEY or PIXABAY_API_KEY in Vercel env'
    });
  }

  try {
    const { query, count = 5, minDuration = 3, maxDuration = 20, orientation = 'landscape' } = req.body || {};
    if (!query) return res.status(400).json({ error: 'query required' });

    const pexelsResults = [];
    const pixabayResults = [];
    const warnings = [];

    // Pexels + Pixabay 병렬 요청 (다양성 극대화)
    const perPage = Math.min(count * 2, 20);

    const pexelsTask = pexelsKey ? (async () => {
      try {
        const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}&size=medium`;
        const resp = await fetch(url, { headers: { Authorization: pexelsKey } });
        if (!resp.ok) { warnings.push(`Pexels HTTP ${resp.status}`); return; }
        const data = await resp.json();
        (data.videos || []).filter(v =>
          v.duration >= minDuration && v.duration <= maxDuration
        ).forEach(v => {
          const files = (v.video_files || []).filter(f =>
            f.file_type === 'video/mp4' && f.width <= 1280 && f.width >= 640
          ).sort((a, b) => b.width - a.width);
          const best = files[0] || v.video_files?.[0];
          if (best) {
            pexelsResults.push({
              id: 'pexels-' + v.id,
              source: 'pexels',
              url: best.link,
              duration: v.duration,
              width: best.width,
              height: best.height,
              thumbnail: v.image,
              author: v.user?.name,
              sourceUrl: v.url,
              tags: v.tags || [],
            });
          }
        });
      } catch (e) { warnings.push('Pexels error: ' + e.message); }
    })() : Promise.resolve();

    const pixabayTask = pixabayKey ? (async () => {
      try {
        const url = `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(query)}&per_page=${perPage}&min_width=640`;
        const resp = await fetch(url);
        if (!resp.ok) { warnings.push(`Pixabay HTTP ${resp.status}`); return; }
        const data = await resp.json();
        (data.hits || []).forEach(v => {
          if (v.duration < minDuration || v.duration > maxDuration) return;
          const file = v.videos?.medium || v.videos?.small;
          if (!file) return;
          pixabayResults.push({
            id: 'pixabay-' + v.id,
            source: 'pixabay',
            url: file.url,
            duration: v.duration,
            width: file.width,
            height: file.height,
            thumbnail: v.videos?.medium?.thumbnail || v.userImageURL,
            author: v.user,
            sourceUrl: v.pageURL,
            tags: (v.tags || '').split(',').map(t => t.trim()),
          });
        });
      } catch (e) { warnings.push('Pixabay error: ' + e.message); }
    })() : Promise.resolve();

    await Promise.all([pexelsTask, pixabayTask]);

    // 소스별 라운드로빈 믹싱 (다양성 증가: Pexels/Pixabay 번갈아)
    const results = [];
    const maxLen = Math.max(pexelsResults.length, pixabayResults.length);
    for (let i = 0; i < maxLen; i++) {
      if (pexelsResults[i]) results.push(pexelsResults[i]);
      if (pixabayResults[i]) results.push(pixabayResults[i]);
    }

    return res.status(200).json({
      query,
      count: results.length,
      sources: { pexels: pexelsResults.length, pixabay: pixabayResults.length },
      results: results.slice(0, count),
      warnings: warnings.length > 0 ? warnings : undefined,
    });

  } catch (err) {
    console.error('[VideoSearch] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
