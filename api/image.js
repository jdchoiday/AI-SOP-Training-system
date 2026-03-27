// ============================================
// Nano Banana 2 (Gemini 3.1 Flash Image) 이미지 생성 API
// ============================================
// POST /api/image
// Body: { visual, narration, action, sceneIndex, totalScenes }
//
// 한국어 나레이션을 직접 이해하고 이미지 생성 (번역 불필요)
// ============================================

const sharp = (() => { try { return require('sharp'); } catch { return null; } })();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  try {
    const { action = 'generate', visual, narration, sceneIndex, totalScenes } = req.body || {};

    if (action === 'status') {
      return res.status(200).json({ status: 'Succeed', message: 'Image mode - no polling needed' });
    }

    if (action === 'generate-multi' || action === 'generate') {
      if (!visual && !narration) {
        return res.status(400).json({ error: 'visual or narration required' });
      }

      // 카메라 앵글 결정
      const cameras = ['와이드 샷', '미디엄 샷', '클로즈업', '오버더숄더 샷', '아이레벨 샷'];
      const camera = cameras[(sceneIndex || 0) % cameras.length];

      // 한국어 프롬프트 구성 (Nano Banana는 한국어를 직접 이해)
      const imagePrompt = `다음 나레이션의 장면을 사실적인 사진으로 생성해주세요.

나레이션: "${narration}"

장면 요구사항:
- ${camera}으로 촬영
- 나레이션에 묘사된 상황을 정확하게 시각화
- 장소: 밝고 현대적인 한국 키즈카페/실내놀이터/교육실 (나레이션 맥락에 맞게)
- 인물: 20대 한국인 여성, 라이트블루 폴로셔츠와 베이지색 앞치마 착용 (키즈카페 직원)
- 아이가 등장하면: 실제 한국 유아/어린이
- 밝고 따뜻한 자연광, 깨끗한 실내
- 사실적인 다큐멘터리 사진 스타일
- 16:9 가로 비율
- 외설적이거나 폭력적인 내용 절대 금지`;

      console.log(`[Image] Nano Banana 2 prompt for scene ${(sceneIndex || 0) + 1}: ${narration.slice(0, 80)}...`);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: imagePrompt }] }],
              generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(p => p.inlineData);

        if (imagePart && imagePart.inlineData) {
          let base64 = imagePart.inlineData.data;
          let mime = imagePart.inlineData.mimeType || 'image/jpeg';
          const origSize = Math.round(base64.length / 1024);

          // JPEG 압축 (이미 JPEG이면 리사이즈만, PNG면 변환)
          if (sharp) {
            try {
              const buf = Buffer.from(base64, 'base64');
              const jpegBuf = await sharp(buf)
                .resize(1280, 720, { fit: 'cover' })
                .jpeg({ quality: 82 })
                .toBuffer();
              base64 = jpegBuf.toString('base64');
              mime = 'image/jpeg';
            } catch (e) { /* sharp 실패 시 원본 그대로 */ }
          }

          const dataUrl = `data:${mime};base64,${base64}`;
          console.log(`[Image] Nano Banana 2 OK (${origSize}KB → ${Math.round(base64.length / 1024)}KB)`);

          if (action === 'generate-multi') {
            return res.status(200).json({
              type: 'image',
              images: [{ index: 0, imageUrl: dataUrl, prompt: narration, error: null }],
            });
          } else {
            return res.status(200).json({ type: 'image', imageUrl: dataUrl, prompt: narration });
          }
        }

        // 텍스트만 반환된 경우 (이미지 생성 거부 등)
        const textPart = parts.find(p => p.text);
        const errorMsg = textPart?.text || data.error?.message || 'No image generated';
        console.error(`[Image] Nano Banana 2 no image: ${errorMsg.slice(0, 100)}`);
        return res.status(500).json({ error: errorMsg });

      } catch (e) {
        console.error(`[Image] Nano Banana 2 failed: ${e.message}`);
        return res.status(500).json({ error: e.message });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    console.error('[Image] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
