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
    const { action = 'generate', visual, narration, sceneIndex, totalScenes, portrait = true } = req.body || {};

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
        const timeout = setTimeout(() => controller.abort(), 50000); // 50초 (Vercel 60초 내)

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

          // JPEG 압축 (세로/가로 비율 선택)
          if (sharp) {
            try {
              const buf = Buffer.from(base64, 'base64');
              const [w, h] = portrait ? [720, 1280] : [1280, 720];
              const jpegBuf = await sharp(buf)
                .resize(w, h, { fit: 'cover' })
                .jpeg({ quality: 82 })
                .toBuffer();
              base64 = jpegBuf.toString('base64');
              mime = 'image/jpeg';
            } catch (e) { console.warn('[Image] Sharp compression failed:', e.message); }
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

// scene-prompts.js 로드 실패 시 폴백 프롬프트 (새 룰: 교육 인포그래픽)
function buildFallbackPrompt(narration, sceneIndex) {
  const hasVie = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(narration || '');
  const isEn = !hasVie && /^[\x00-\x7F\s.,!?;:'"()\-\d\n]+$/.test((narration || '').slice(0, 200));
  const lang = hasVie ? 'Vietnamese' : isEn ? 'English' : 'Korean';

  const visualTypes = ['concept explanation', 'process flow', 'comparison', 'structure diagram', 'cause-effect', 'checklist', 'workflow'];
  const suggestedType = visualTypes[(sceneIndex || 0) % visualTypes.length];

  return `Generate a VERTICAL portrait 9:16 educational infographic.

Narration: "${narration}"

Create a structured educational diagram that helps a first-time learner understand this content.

Layout:
- TOP: Bold short title in ${lang}
- CENTER: Main infographic diagram (suggested type: ${suggestedType})
  Use labeled boxes, arrows, icons, flow charts, comparison blocks as needed
- BOTTOM: 3 short keyword boxes in ${lang}

Style: Clean flat 2D infographic, white/light background, modern educational publishing
Text: Short ${lang} keywords only, no full sentences, large and readable
Must be: portrait orientation (taller than wide), structured, clear hierarchy

Avoid: realistic photos, cinematic style, decorative backgrounds, emotional characters, poster style, long text, landscape format`;
}
