// ============================================
// SiliconFlow FLUX Image Generation API
// ============================================
// POST /api/image
// Body: { visual, narration, action, sceneIndex, totalScenes }
//
// action="generate-multi" → 씬당 이미지 생성 (FLUX, 2~5초)
// action="status" → 레거시 호환 (즉시 완료)
// ============================================

// 통합 씬 프롬프트 매핑 사용 (Single Source of Truth)
const { CAMERA_ANGLES, BASE_SETTING, NEGATIVE_PROMPT, QUALITY_SUFFIX, narrationToPrompt, extractActions } = require('../js/scene-prompts.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const siliconflowKey = process.env.SILICONFLOW_API_KEY;
  if (!siliconflowKey) return res.status(500).json({ error: 'SILICONFLOW_API_KEY not set' });

  const apiBase = 'https://api.siliconflow.com';

  try {
    const { action = 'generate', visual, narration, sceneIndex, totalScenes } = req.body || {};

    // === Status polling (legacy compat - return immediately) ===
    if (action === 'status') {
      return res.status(200).json({ status: 'Succeed', message: 'Image mode - no polling needed' });
    }

    // === Generate multiple images (FLUX) ===
    if (action === 'generate-multi') {
      if (!visual && !narration) {
        return res.status(400).json({ error: 'visual or narration required' });
      }

      // visual 필드가 영어 이미지 프롬프트면 직접 사용, 아니면 공유 매핑으로 변환
      let prompts;
      const isEnglishPrompt = visual && /^[A-Z]/.test(visual.trim()) && visual.length > 30;
      if (isEnglishPrompt) {
        const camera = CAMERA_ANGLES[(sceneIndex * 3) % CAMERA_ANGLES.length];
        let cleanVisual = visual
          .replace(/\b(doctor|medical|hospital|lab coat|white coat|stethoscope|patient|clinic|nurse|surgery|examination|scrubs|shirtless|nude|military|police)\b/gi, 'staff member')
          .replace(/\buniform\b/gi, 'light blue polo shirt and beige apron');
        prompts = [`${camera} ${cleanVisual}. ${QUALITY_SUFFIX}`];
        console.log(`[Image] Using AI-generated visual prompt`);
      } else {
        // 공유 매핑으로 나레이션 → 영어 프롬프트 변환
        const prompt = narrationToPrompt(narration || '', visual || '', { withCamera: true, cameraIndex: (sceneIndex || 0) * 3 });
        prompts = [prompt];
        console.log(`[Image] Using shared narrationToPrompt: ${prompt.slice(0, 80)}...`);
      }

      console.log(`[Image] Generating ${prompts.length} images...`);
      const results = await Promise.all(prompts.map(async (prompt, i) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 25000);
          const response = await fetch(`${apiBase}/v1/images/generations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${siliconflowKey}`,
            },
            body: JSON.stringify({
              model: 'black-forest-labs/FLUX.1-dev',
              prompt,
              negative_prompt: NEGATIVE_PROMPT,
              image_size: '1280x720',
              num_inference_steps: 20,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const data = await response.json();
          if (data.images && data.images.length > 0) {
            console.log(`[Image] Clip ${i + 1} success`);
            return { index: i, imageUrl: data.images[0].url, prompt, error: null };
          }
          return { index: i, imageUrl: null, prompt, error: data.message || 'No image' };
        } catch (e) {
          return { index: i, imageUrl: null, prompt, error: e.message };
        }
      }));

      const successCount = results.filter(r => r.imageUrl).length;
      console.log(`[Image] Done: ${successCount}/${results.length} images`);

      return res.status(200).json({ type: 'image', images: results });
    }

    // === Single image (legacy) ===
    if (!visual && !narration) {
      return res.status(400).json({ error: 'visual or narration required' });
    }

    const prompt = narrationToPrompt(narration || '', visual || '', { withCamera: true });
    console.log(`[Image] Single: ${prompt.slice(0, 120)}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const response = await fetch(`${apiBase}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${siliconflowKey}`,
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt: prompt,
        negative_prompt: NEGATIVE_PROMPT,
        image_size: '1280x720',
        num_inference_steps: 4,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();

    if (data.images && data.images.length > 0) {
      return res.status(200).json({ type: 'image', imageUrl: data.images[0].url, prompt });
    }

    return res.status(500).json({ error: data.message || 'Image generation failed' });

  } catch (err) {
    console.error('[Image] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
