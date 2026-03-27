// ============================================
// SiliconFlow FLUX Image Generation API
// ============================================
// POST /api/image
// Body: { visual, narration, action, sceneIndex, totalScenes }
//
// action="generate-multi" → 씬당 3장 이미지 생성 (FLUX, 2~5초)
// action="status" → 레거시 호환 (즉시 완료)
// ============================================

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

      // visual 필드가 영어 이미지 프롬프트면 직접 사용, 아니면 키워드 매핑 fallback
      let prompts;
      const isEnglishPrompt = visual && /^[A-Z]/.test(visual.trim()) && visual.length > 30;
      if (isEnglishPrompt) {
        // AI가 생성한 영어 프롬프트를 카메라/스타일과 결합
        const camera = CAMERA_ANGLES[(sceneIndex * 3) % CAMERA_ANGLES.length];
        // visual에서 banned words 제거
        let cleanVisual = visual.replace(/\b(doctor|medical|hospital|lab coat|stethoscope|patient|clinic|nurse|surgery|examination|shirtless|nude|military|police)\b/gi, 'staff member');
        prompts = [`${camera} ${cleanVisual}. Shot on Canon EOS R5, 35mm lens, f/2.8, natural window lighting. Raw photo, realistic lighting, 8k uhd.`];
        console.log(`[Image] Using AI-generated visual prompt`);
      } else {
        prompts = buildScenePrompts(narration || '', visual || '', sceneIndex || 0, totalScenes || 6);
      }

      // 병렬 이미지 생성 (순차 → Promise.all)
      console.log(`[Image] Generating ${prompts.length} images in parallel...`);
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

      return res.status(200).json({
        type: 'image',
        images: results,
      });
    }

    // === Single image (legacy) ===
    if (!visual && !narration) {
      return res.status(400).json({ error: 'visual or narration required' });
    }

    const prompt = buildSinglePrompt(visual || '', narration || '');
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

// ============================================
// 프롬프트 시스템
// ============================================

const BASE_SETTING = 'Candid photo in a bright, clean modern Korean workplace. Professional staff in neat uniform. Warm natural lighting, clean safe interior. Shot on Canon EOS R5, 35mm lens, f/2.8, natural window lighting.';
const NEGATIVE_PROMPT = 'nude, naked, nsfw, shirtless, undressed, revealing, suggestive, violent, gore, blood, weapon, scary, horror, dark, inappropriate, doctor, lab coat, medical, hospital, stethoscope, clinic, nurse, surgery, patient, examination room, military, police, judge, lawyer, courtroom, prison, tattoo, piercing, smoking, alcohol, drugs, deformed, ugly, blurry, bad anatomy, extra limbs';

const CAMERA_ANGLES = [
  'Wide establishing shot,',
  'Medium shot,',
  'Close-up detail shot,',
  'Over-the-shoulder shot,',
  'Low angle shot,',
  'Eye-level shot,',
];

const ACTION_MAP = [
  // 출근/준비
  { kw: ['출근', '도착', '입장'], en: 'walking through the staff entrance door in morning light' },
  { kw: ['체크인', '기록'], en: 'scanning an ID badge on a wall-mounted digital terminal' },
  { kw: ['유니폼', '갈아입'], en: 'adjusting a clean uniform in front of a mirror, pinning name badge' },
  { kw: ['명찰', '이름표'], en: 'pinning a name badge onto uniform chest pocket' },
  { kw: ['머리', '묶'], en: 'tying hair into a neat ponytail, removing earrings' },
  { kw: ['손 씻', '세정', '손을'], en: 'washing hands with soap under running water at a sink' },
  { kw: ['액세서리', '반지', '귀걸이'], en: 'removing jewelry into a small tray' },
  // 점검
  { kw: ['점검', '확인', '살피'], en: 'inspecting equipment with a clipboard checklist' },
  { kw: ['놀이기구', '미끄럼틀'], en: 'checking a colorful slide for loose parts and sharp edges' },
  { kw: ['볼풀'], en: 'reaching into a ball pit, checking for debris among colorful balls' },
  { kw: ['트램펄린', '트램폴린'], en: 'testing trampoline springs and safety net tension' },
  { kw: ['파손', '보고', '고장', '이상'], en: 'photographing damaged equipment, writing notes on clipboard' },
  { kw: ['바닥', '미끄'], en: 'crouching to check floor mats, wiping wet spots' },
  { kw: ['비상구', '대피'], en: 'checking illuminated emergency exit signs and clear pathways' },
  // 청소/위생
  { kw: ['청소', '빗자루', '쓸'], en: 'sweeping floor with a professional broom' },
  { kw: ['물걸레', '바닥 닦'], en: 'mopping tile floor with smooth motions, floor gleaming' },
  { kw: ['소독', '스프레이', '살균'], en: 'spraying disinfectant on surfaces and wiping with cloth' },
  { kw: ['화장실', '세면'], en: 'cleaning restroom sink, restocking toilet paper and soap' },
  { kw: ['쓰레기', '분리수거'], en: 'replacing trash bag and carrying waste to disposal' },
  { kw: ['테이블', '의자', '카페'], en: 'wiping cafe tables and high chairs with disinfectant' },
  // 오픈 준비
  { kw: ['조명', '전등', '불'], en: 'switching on bright LED lights throughout play area' },
  { kw: ['음악', 'BGM'], en: 'adjusting background music system volume' },
  { kw: ['POS', '포스', '단말기'], en: 'testing POS terminal and receipt printer at counter' },
  { kw: ['양말', '자판기'], en: 'checking sock vending machine stock' },
  { kw: ['안내 표지판', '가격표'], en: 'placing information sign with rules and pricing' },
  // 고객 응대
  { kw: ['인사', '어서오세요', '맞이'], en: 'warmly greeting a family with bright smile at entrance' },
  { kw: ['입장', '팔찌', '밴드'], en: 'fastening admission wristband on a child wrist' },
  { kw: ['나이', '연령', '인원'], en: 'asking about child age at reception counter' },
  { kw: ['요금', '가격', '안내'], en: 'explaining pricing board to parents at reception' },
  { kw: ['안전 수칙', '규칙', '주의'], en: 'showing safety rules poster to parents' },
  { kw: ['보호자', '부모', '동반'], en: 'explaining guardian supervision rules to a parent' },
  { kw: ['신발장', '사물함'], en: 'guiding family toward shoe lockers' },
  { kw: ['결제', '카드'], en: 'processing card payment at counter terminal' },
  // 놀이공간
  { kw: ['연령', '구역', '영유아존'], en: 'leading parent and child to age-appropriate play zone' },
  { kw: ['위험', '제지', '안전해요'], en: 'calmly redirecting child from dangerous activity' },
  // 불만 처리
  { kw: ['불만', '컴플레인', '경청'], en: 'listening carefully to concerned parent, nodding attentively' },
  { kw: ['사과', '죄송', '공감'], en: 'bowing apologetically to upset parent' },
  { kw: ['매니저', '인계'], en: 'introducing manager for issue resolution' },
  // 안전/비상
  { kw: ['응급', '구급', '부상'], en: 'opening first aid kit, preparing bandages' },
  { kw: ['화재', '소화기'], en: 'checking fire extinguisher pressure gauge on wall' },
  { kw: ['119', '신고', '전화'], en: 'speaking urgently on phone during emergency' },
  { kw: ['대피', '대피로', '안전하게'], en: 'guiding children toward emergency exit calmly' },
  { kw: ['CCTV', '보안', '모니터'], en: 'watching CCTV monitors showing facility areas' },
  // 마감
  { kw: ['퇴장', '시간 종료'], en: 'approaching family showing time on tablet' },
  { kw: ['정산', '매출'], en: 'counting cash and comparing POS totals' },
  { kw: ['잠금', '시건', '닫'], en: 'locking entrance door and checking handle' },
  { kw: ['보안', '알람'], en: 'entering code on security alarm panel' },
  { kw: ['일지', '보고서', '기록'], en: 'writing in daily log book at desk' },
  // 타이틀/마무리
  { kw: ['배우겠습니다', '교육을', '시작'], en: 'approaching bright entrance of modern kids cafe' },
  { kw: ['마무리', '요약', '기억'], en: 'standing at organized reception giving thumbs up' },
  // 교육/윤리/마인드셋
  { kw: ['윤리', '도덕', '양심'], en: 'thoughtfully reading an ethics handbook at a desk' },
  { kw: ['마음가짐', '태도', '자세'], en: 'standing tall with confident posture, looking at motivational board' },
  { kw: ['사명감', '책임감', '보람'], en: 'smiling warmly while watching children play happily' },
  { kw: ['존중', '배려', '친절'], en: 'kneeling to make eye contact with a small child, gentle expression' },
  { kw: ['소통', '대화', '경청'], en: 'sitting at round table, actively listening to colleague speaking' },
  { kw: ['팀워크', '협력', '동료'], en: 'high-fiving colleague after completing task together' },
  { kw: ['성장', '발전', '배움', '학습'], en: 'studying training materials at desk with notebook open' },
  { kw: ['환영', '웃', '미소'], en: 'greeting warmly with bright natural smile at entrance' },
  { kw: ['아이', '어린이', '아동', '원아'], en: 'gently guiding a happy child through colorful play area' },
  { kw: ['교사', '선생님', '교직원'], en: 'staff member standing proudly in uniform at classroom entrance' },
  { kw: ['교육 철학', '핵심', '가치', '비전'], en: 'presenting on whiteboard with key values and mission statement' },
  { kw: ['자기발견', '호기심', '탐색'], en: 'watching child explore art materials with curiosity' },
  { kw: ['건강', '운동', '신체'], en: 'leading group exercise activity with children in play room' },
  { kw: ['언어', '영어', '베트남'], en: 'showing bilingual flashcards to children at low table' },
  { kw: ['인성', '감사', '공감', '이해'], en: 'comforting a child with gentle pat on back, empathetic expression' },
  { kw: ['규칙', '약속', '기준'], en: 'pointing at clearly posted classroom rules on wall' },
  { kw: ['모범', '본보기', '리더'], en: 'demonstrating proper behavior to children with friendly gesture' },
  { kw: ['안녕하세요', '소개', '환영합니다'], en: 'standing at podium area, warmly introducing training session' },
];

function extractActions(text) {
  const matches = [];
  for (const action of ACTION_MAP) {
    const count = action.kw.filter(k => text.includes(k)).length;
    if (count > 0) matches.push({ ...action, score: count });
  }
  matches.sort((a, b) => b.score - a.score);
  return matches;
}

function splitIntoSegments(narration) {
  const sentences = narration.split(/(?<=[.!?。])\s*/).map(s => s.trim()).filter(s => s.length > 5);
  if (sentences.length <= 1) return [narration];
  if (sentences.length <= 3) return sentences;

  const segments = [];
  const perSeg = Math.ceil(sentences.length / 3);
  for (let i = 0; i < 3; i++) {
    const start = i * perSeg;
    const end = Math.min(start + perSeg, sentences.length);
    if (start < sentences.length) segments.push(sentences.slice(start, end).join(' '));
  }
  return segments.filter(s => s.length > 0);
}

function buildScenePrompts(narration, visual, sceneIndex, totalScenes) {
  const segments = splitIntoSegments(narration);
  const allActions = extractActions(narration);
  const prompts = [];

  const timeOfDay = sceneIndex === 0 ? 'early morning golden light' :
                    sceneIndex >= totalScenes - 1 ? 'warm evening light' :
                    'bright natural lighting';

  for (let i = 0; i < segments.length; i++) {
    const segActions = extractActions(segments[i]);
    const actions = segActions.length > 0 ? segActions : allActions.slice(i, i + 2);

    const cameraIdx = (sceneIndex * 3 + i) % CAMERA_ANGLES.length;
    const camera = CAMERA_ANGLES[cameraIdx];

    if (actions.length === 0) {
      // visual 필드가 있으면 활용, 없으면 일반 장면
      const fallbackAction = visual ? `in a professional training scene about: ${visual}` : 'standing professionally at a training presentation, looking confident and friendly';
      prompts.push(`${camera} ${BASE_SETTING} She is ${fallbackAction}. ${timeOfDay}. Raw photo, no AI artifacts, natural skin texture, realistic lighting, 8k uhd.`);
      continue;
    }

    const mainAction = actions[0].en;
    const subAction = actions.length > 1 ? ` Also ${actions[1].en}.` : '';

    prompts.push(`${camera} ${BASE_SETTING} She is ${mainAction}.${subAction} ${timeOfDay}. Raw photo, no filters, no AI artifacts, natural skin texture, realistic lighting, 8k uhd.`);
  }

  if (prompts.length === 0) {
    prompts.push(`Medium shot, ${BASE_SETTING} ${timeOfDay}. Raw photo, natural skin texture, realistic lighting.`);
  }

  return prompts;
}

function buildSinglePrompt(visual, narration) {
  const actions = extractActions(`${visual} ${narration}`);
  if (actions.length === 0) {
    return `Medium shot, ${BASE_SETTING} Raw photo, natural skin texture, realistic lighting.`;
  }
  const main = actions[0].en;
  return `Medium shot, ${BASE_SETTING} She is ${main}. Raw photo, no filters, natural skin texture, realistic lighting, 8k uhd.`;
}

// ============================================
// Gemini 기반 이미지 프롬프트 생성
// ============================================
async function generatePromptsWithGemini(narration, visual, apiKey) {
  const prompt = `You are an expert at writing image generation prompts for AI (FLUX model).

Given this training video narration and scene description, generate 1-2 detailed image prompts that accurately depict the scene.

Narration: "${narration}"
Scene description: "${visual}"

Rules:
- Setting: modern Korean kids indoor playground/cafe (키즈카페)
- Subject: young Korean woman in her 20s wearing a light blue polo uniform with name badge
- Each prompt must be a single detailed sentence describing a specific action/pose matching the narration context
- Include camera angle (wide/medium/close-up), lighting (bright, warm, natural), and photographic style
- Style: candid editorial documentary photography, Canon EOS R5, 35mm lens, f/2.8, natural lighting
- End with: "Raw photo, no AI artifacts, natural skin texture, realistic lighting, 8k uhd."
- Output ONLY a JSON array of prompt strings, nothing else

Example output:
["Medium shot, candid photo of a young Korean woman in light blue polo uniform kneeling to make eye contact with a small child, gently explaining safety rules with a warm smile, in a bright modern kids indoor playground. Canon EOS R5, 35mm, f/2.8, natural window lighting. Raw photo, no AI artifacts, natural skin texture, realistic lighting, 8k uhd."]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in Gemini response');

  const prompts = JSON.parse(match[0]);
  if (!Array.isArray(prompts) || prompts.length === 0) throw new Error('Empty prompts array');

  return prompts;
}
