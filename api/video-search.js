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

    const results = [];
    const warnings = [];

    // 1) Pexels 검색 (1순위)
    if (pexelsKey) {
      try {
        const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${Math.min(count * 2, 15)}&orientation=${orientation}&size=medium`;
        const resp = await fetch(url, { headers: { Authorization: pexelsKey } });

        if (!resp.ok) {
          warnings.push(`Pexels HTTP ${resp.status}`);
        } else {
          const data = await resp.json();
          const videos = (data.videos || []).filter(v =>
            v.duration >= minDuration && v.duration <= maxDuration
          );

          videos.forEach(v => {
            // 가장 적절한 해상도 파일 선택 (SD 품질, 모바일 친화)
            const files = (v.video_files || []).filter(f =>
              f.file_type === 'video/mp4' && f.width <= 1280 && f.width >= 640
            ).sort((a, b) => b.width - a.width);
            const best = files[0] || v.video_files?.[0];
            if (best) {
              results.push({
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
        }
      } catch (e) {
        warnings.push('Pexels error: ' + e.message);
      }
    }

    // 2) Pixabay 폴백 (Pexels 부족 시)
    if (results.length < count && pixabayKey) {
      try {
        const url = `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(query)}&per_page=${count * 2}&min_width=640`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          (data.hits || []).forEach(v => {
            if (results.find(r => r.id === 'pixabay-' + v.id)) return;
            if (v.duration < minDuration || v.duration > maxDuration) return;
            const file = v.videos?.medium || v.videos?.small;
            if (!file) return;
            results.push({
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
        }
      } catch (e) {
        warnings.push('Pixabay error: ' + e.message);
      }
    }

    // 품질 순으로 정렬 (해상도 > 세로형보다 가로형 선호)
    results.sort((a, b) => {
      const aScore = (a.width / a.height > 1 ? 100 : 0) + a.width;
      const bScore = (b.width / b.height > 1 ? 100 : 0) + b.width;
      return bScore - aScore;
    });

    return res.status(200).json({
      query,
      count: results.length,
      results: results.slice(0, count),
      warnings: warnings.length > 0 ? warnings : undefined,
    });

  } catch (err) {
    console.error('[VideoSearch] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
