// ============================================
// Translation API (Gemini)
// ============================================
// POST /api/translate
// Body: { items: string[], sourceLang: 'ko'|'en'|'vi', targetLangs: ['en','vi'] }
//
// 응답: { translations: { en: [...], vi: [...] } }
//
// 용도: SOP narration 등 다국어 자동 번역 (스크립트 생성 후 자동 호출)
// ============================================

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  try {
    const { items, sourceLang = 'ko', targetLangs = ['en', 'vi'] } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    if (items.length > 200) {
      return res.status(400).json({ error: 'max 200 items per request' });
    }

    const langNames = { ko: 'Korean', en: 'English', vi: 'Vietnamese' };
    const results = {};
    const warnings = [];

    for (const targetLang of targetLangs) {
      if (targetLang === sourceLang) {
        // 같은 언어면 그대로 복사
        results[targetLang] = items.slice();
        continue;
      }

      const prompt = `You are a professional translator for employee training content.
Translate the following ${langNames[sourceLang]} sentences to ${langNames[targetLang]}.

Rules:
- Preserve the original meaning, tone, and pedagogical intent
- Use natural, fluent ${langNames[targetLang]} as a native speaker would write
- For technical/SOP terminology, use the most common term in ${langNames[targetLang]} business context
- Keep brand names (AION, Kiwooza, SLCO, KBBQ) untranslated
- Maintain the same array length and order as input
- Each output must be a complete translation of the corresponding input

Input array (${items.length} items in ${langNames[sourceLang]}):
${JSON.stringify(items, null, 2)}

Return ONLY a JSON array of ${items.length} translated strings — no markdown, no explanation, no wrapper object.`;

      let text = '';
      let succeeded = false;

      // 재시도 (rate limit / 일시 오류)
      for (let attempt = 0; attempt < 3; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 50000);

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  responseMimeType: 'application/json',
                  maxOutputTokens: 8192,
                },
              }),
              signal: controller.signal,
            }
          );
          clearTimeout(timeout);

          if ((response.status === 429 || response.status === 503) && attempt < 2) {
            const wait = (attempt + 1) * 3000;
            console.log(`[Translate] ${response.status} → ${wait/1000}s 후 재시도 (${attempt+1}/2)`);
            await new Promise(r => setTimeout(r, wait));
            continue;
          }

          const data = await response.json();
          text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          succeeded = true;
          break;
        } catch (fetchErr) {
          clearTimeout(timeout);
          if (attempt < 2) {
            console.log(`[Translate] fetch error — 재시도:`, fetchErr.message);
            await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
            continue;
          }
          throw fetchErr;
        }
      }

      if (!succeeded || !text) {
        warnings.push(`${targetLang}: AI 응답 없음`);
        results[targetLang] = items.map(() => '');
        continue;
      }

      // JSON 파싱
      let translated;
      try {
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        translated = JSON.parse(cleaned);
        if (!Array.isArray(translated)) {
          translated = translated.translations || translated.items || translated.results || [];
        }
      } catch (e) {
        console.error(`[Translate] JSON parse fail for ${targetLang}:`, text.slice(0, 200));
        warnings.push(`${targetLang}: JSON 파싱 실패`);
        results[targetLang] = items.map(() => '');
        continue;
      }

      // 길이 안 맞으면 패딩 (안전 장치)
      if (translated.length < items.length) {
        warnings.push(`${targetLang}: 결과 ${translated.length}개 (요청 ${items.length}개)`);
        while (translated.length < items.length) translated.push('');
      } else if (translated.length > items.length) {
        translated = translated.slice(0, items.length);
      }

      results[targetLang] = translated;
      console.log(`[Translate] ${sourceLang} → ${targetLang}: ${translated.filter(Boolean).length}/${items.length} 성공`);
    }

    return res.status(200).json({
      translations: results,
      warnings: warnings.length > 0 ? warnings : undefined,
    });

  } catch (err) {
    console.error('[Translate] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
