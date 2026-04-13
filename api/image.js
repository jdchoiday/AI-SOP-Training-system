// ============================================
// Hybrid Image Generation API (Gemini 3.1 Flash Image)
// ============================================
// POST /api/image
// Body: { visual, narration, action, sceneIndex, totalScenes }
//
// 하이브리드 전략:
// 1순위: Gemini가 나레이션 분석 → 최적 시각 타입 결정 → 맞춤 이미지 생성
// 2순위: 정적 scene-prompts.js 프롬프트 폴백
// ============================================

const sharp = (() => { try { return require('sharp'); } catch { return null; } })();
const ScenePrompts = (() => { try { return require('../js/scene-prompts.js'); } catch { return null; } })();

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

      // === 하이브리드 프롬프트 구성 ===
      // Gemini가 직접 시각 타입을 결정하고 이미지를 생성
      const smartPrompt = ScenePrompts
        ? ScenePrompts.buildSmartVisualPrompt(narration || visual, sceneIndex, totalScenes)
        : buildFallbackPrompt(narration || visual, sceneIndex);

      console.log(`[Image] Hybrid prompt for scene ${(sceneIndex || 0) + 1}: ${(narration || visual || '').slice(0, 80)}...`);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: smartPrompt }] }],
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

          // JPEG 압축
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
          console.log(`[Image] Hybrid OK (${origSize}KB → ${Math.round(base64.length / 1024)}KB)`);

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
        console.error(`[Image] Hybrid no image: ${errorMsg.slice(0, 100)}`);
        return res.status(500).json({ error: errorMsg });

      } catch (e) {
        console.error(`[Image] Hybrid failed: ${e.message}`);
        return res.status(500).json({ error: e.message });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    console.error('[Image] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// scene-prompts.js 로드 실패 시 폴백 프롬프트
function buildFallbackPrompt(narration, sceneIndex) {
  const cameras = ['와이드 샷', '미디엄 샷', '클로즈업', '오버더숄더 샷', '아이레벨 샷'];
  const camera = cameras[(sceneIndex || 0) % cameras.length];

  // 나레이션 언어 감지
  const hasVie = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(narration || '');
  const isEn = !hasVie && /^[\x00-\x7F\s.,!?;:'"()\-\d\n]+$/.test((narration || '').slice(0, 200));
  const textLang = hasVie
    ? '★ 이미지 안의 모든 텍스트(라벨, 제목, 포스터 문구)는 반드시 베트남어(tiếng Việt)로 작성하세요.'
    : isEn
      ? '★ All text inside the image (labels, titles, poster text) MUST be written in English. No Korean or Vietnamese.'
      : '★ 이미지 안의 모든 텍스트(라벨, 제목, 포스터 문구)는 반드시 한국어로 작성하세요.';

  return `다음 나레이션의 장면을 시각적으로 생성해주세요.

나레이션: "${narration}"

${textLang}

중요: 단순히 같은 스타일의 사진만 만들지 마세요.
나레이션 내용에 따라 가장 적합한 시각 타입을 선택하세요:
- 절차 설명 → 단계별 인포그래픽
- 비교/대조 → 좌우 분할 비교 이미지
- 감정/관계 → 인물 중심 감성 사진
- 도구/재료 → 오버헤드 플랫레이
- 규칙/안전 → 일러스트 포스터
- 행동/동작 → 시네마틱 모션 사진

장면 요구사항:
- ${camera}으로 촬영
- 나레이션의 핵심 교육 내용을 시각적으로 전달
- 장소: 밝고 현대적인 한국 키즈카페/실내놀이터/교육실
- 인물: 20대 한국인 여성, 라이트블루 폴로셔츠와 베이지색 앞치마 착용
- 16:9 가로 비율
- 외설적이거나 폭력적인 내용 절대 금지`;
}
