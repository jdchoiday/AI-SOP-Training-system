// ============================================
// AI Provider Layer — 모델 교체 가능한 AI 인터페이스
// ============================================
//
// 설계 원칙:
// 1. 모든 AI 기능은 이 파일의 함수를 통해서만 호출
// 2. config.js의 설정값으로 제공자(provider) 교체 가능
// 3. 무료 로컬 처리를 기본으로, 필요시 유료 API 전환
// 4. API 호출 실패 시 자동으로 로컬 폴백
//
// ==========================================
// 비용 분석 (2026년 3월 기준)
// ==========================================
//
// [스크립트/퀴즈 생성] — LLM 텍스트 생성
//   - 로컬 (무료):     JS로 HTML 파싱 → 구조화 (현재 사용 중)
//   - Google Gemini:   무료 티어 15 RPM / 유료 $0.075/1M 입력토큰
//   - OpenAI GPT-4o-mini: $0.15/1M 입력 + $0.60/1M 출력
//   - Claude Haiku:    $0.25/1M 입력 + $1.25/1M 출력
//   - Groq (Llama):    무료 티어 30 RPM
//   → 권장: 로컬 기본 + Gemini 무료 티어 (품질 향상 필요시)
//
// [AI 챗봇] — SOP 질의응답
//   - 로컬 (무료):     키워드 매칭 (현재 사용 중)
//   - Google Gemini:   무료 티어로 충분 (직원 수 적을 때)
//   - GPT-4o-mini:     ~$0.001/질문 (매우 저렴)
//   → 권장: 로컬 기본 + Gemini 무료 (고급 답변 필요시)
//
// [TTS 음성] — 나레이션 음성 생성
//   - Google TTS:      무료 100만자/월 → 이후 $4/100만자
//   - Edge TTS:        완전 무료 (Microsoft Edge 엔진, 품질 좋음)
//   - OpenAI TTS:      $15/100만자 (비쌈)
//   - ElevenLabs:      무료 1만자/월 (품질 최고, 양 적음)
//   → 권장: Edge TTS (무료+품질) or Google TTS 무료 티어
//
// [영상 생성] — 나레이션 텍스트 → 720p AI 영상
//   - 로컬 슬라이드:   HTML→Canvas (무료, 텍스트+이미지 슬라이드)
//   - Wan 2.2 (SiliconFlow): $0.29/클립(5초, 720p) ← 가성비 최고
//     - 컨텍스트 이해 우수, 중국어/영어 프롬프트, OpenAI 호환 API
//     - Sora/Hailuo 벤치마크 능가, MoE 아키텍처
//   - Vidu Q3-Turbo: $0.034/1M 토큰 (빠르고 저렴)
//     - 720p, 시네마틱 퀄리티, 5~8초 클립
//   - Vidu Q2 (WaveSpeedAI): 720p $0.075~0.275/클립
//   - Sora 2 (OpenAI): $0.10/초 = 5초 $0.50 (비쌈)
//   - HeyGen: 아바타 기반, $5~/월 (강사 영상에 적합)
//   → 권장: Wan 2.2 ($0.29/클립) — 가성비 최고 + 컨텍스트 이해력 최상
//
// ==========================================
// 월간 예상 비용 시나리오
// ==========================================
//
// [최소 비용] 로컬 전부 사용
//   스크립트: $0 | 퀴즈: $0 | 챗봇: $0 | TTS: $0 | 영상: $0
//   → 총 $0/월
//
// [권장 구성] Gemini 무료 + Edge TTS
//   스크립트: $0 (Gemini 무료) | 퀴즈: $0 | 챗봇: $0 | TTS: $0 (Edge)
//   → 총 $0/월
//
// [고품질 구성] GPT-4o-mini + Google TTS + Wan 2.2
//   스크립트: ~$0.50 | 퀴즈: ~$0.20 | 챗봇: ~$2 | TTS: $0 | 영상: ~$1.50 (SOP 5개×씬당 $0.29)
//   → 총 ~$5/월 (직원 50명, SOP 5개 기준)
//
// ==========================================
// 영상 생성 모델 비교 (720p, 2026년 3월)
// ==========================================
//
// 모델              | 가격/클립(5초) | 해상도  | 컨텍스트 이해 | API 호환성
// ------------------|---------------|---------|-------------|----------
// Wan 2.2 (SF)      | $0.29         | 720p    | ★★★★★       | OpenAI 호환
// Wan 2.1 Turbo(SF) | $0.21         | 720p    | ★★★★        | OpenAI 호환
// Vidu Q3-Turbo     | ~$0.20        | 720p    | ★★★★        | REST API
// Vidu Q2           | $0.275        | 720p    | ★★★★        | REST API
// Sora 2            | $0.50         | 720p    | ★★★★★       | OpenAI API
// HeyGen            | 구독제 $5~/월  | 1080p   | ★★★         | REST API
//
// → 1순위 추천: Wan 2.2 (SiliconFlow) — $0.29/클립, 최고 가성비
// → 2순위 대안: Vidu Q3-Turbo — $0.20/클립, 빠른 생성
// → 무료 대안: 로컬 슬라이드 (텍스트+이미지 기반)
//

// ===== AI 설정 (config.js에서 오버라이드 가능) =====
window.AI_CONFIG = window.AI_CONFIG || {
  // 스크립트 생성 제공자: 'local' | 'gemini' | 'openai' | 'groq'
  scriptProvider: 'local',

  // 퀴즈 생성 제공자: 'local' | 'gemini' | 'openai' | 'groq'
  quizProvider: 'local',

  // 챗봇 제공자: 'local' | 'gemini' | 'openai' | 'groq'
  chatProvider: 'local',

  // TTS 제공자: 'none' | 'edge' | 'google' | 'openai'
  ttsProvider: 'none',

  // 영상 생성 제공자: 'none' | 'wan' | 'vidu' | 'sora'
  videoProvider: 'none',

  // API 키 (사용할 제공자만 설정)
  keys: {
    gemini: '',        // Google AI Studio에서 무료 발급
    openai: '',        // OpenAI API Key
    groq: '',          // Groq API Key (무료)
    siliconflow: '',   // SiliconFlow API Key (Wan 2.2 영상 생성)
    vidu: '',          // Vidu API Key
  },

  // 모델 설정
  models: {
    gemini: 'gemini-2.5-flash',              // 무료 티어, 빠르고 저렴
    openai: 'gpt-4o-mini',                   // 가장 저렴한 OpenAI 모델
    groq: 'llama-3.3-70b-versatile',         // 무료, 빠름
    wan: 'Wan-AI/Wan2.2-T2V-A14B',           // $0.29/클립, 720p, 가성비 최고
    wan_turbo: 'Wan-AI/Wan2.1-T2V-14B-720P', // $0.21/클립, 720p, 더 저렴
    vidu: 'vidu-q3-turbo',                   // ~$0.20/클립, 빠른 생성
  },

  // API 엔드포인트
  endpoints: {
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}',
    openai: 'https://api.openai.com/v1/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    siliconflow: 'https://api.siliconflow.com/v1/video/submit',
    siliconflow_status: 'https://api.siliconflow.com/v1/video/status',
  },
};

// config.js에서 오버라이드 적용
if (typeof CONFIG !== 'undefined' && CONFIG.AI) {
  Object.assign(AI_CONFIG, CONFIG.AI);
}

// ===== 통합 AI 인터페이스 =====

const AI = {
  // --- 스크립트 생성 ---
  async generateScript(sopTitle, sopContent) {
    const provider = AI_CONFIG.scriptProvider;

    if (provider === 'local') {
      return this._localGenerateScript(sopTitle, sopContent);
    }

    try {
      const plainText = this._htmlToText(sopContent);
      // SOP 길이에 비례하여 최소 씬 수 결정 (200자당 1씬, 최소 5씬)
      const minScenes = Math.max(5, Math.min(20, Math.ceil(plainText.length / 200)));

      // SOP 언어 자동 감지
      const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(plainText);
      const isEnglish = !hasVietnamese && /^[\x00-\x7F\s.,!?;:'"()\-\d\n]+$/.test(plainText.slice(0, 300));
      const titleHasVie = /vie|VIE|베트남|vietnam/i.test(sopTitle);
      const titleHasEn = /eng|ENG|영어|english/i.test(sopTitle);

      let langInstruction = '나레이션은 한국어로 작성';
      if (hasVietnamese || titleHasVie) langInstruction = '나레이션은 반드시 베트남어(tiếng Việt)로 작성';
      else if (isEnglish || titleHasEn) langInstruction = '나레이션은 반드시 영어(English)로 작성';

      const prompt = `당신은 직원 교육 영상의 시각 디렉터이자 스크립트 작성 전문가입니다.

아래 SOP 문서의 모든 내용을 빠짐없이 교육 영상 스크립트로 변환하세요.
JSON 배열로 생성하며, 각 항목은 { "scene": 번호, "narration": "나레이션 텍스트", "visual": "영어 이미지 프롬프트" } 형식입니다.

SOP 제목: ${sopTitle}
SOP 내용:
${plainText}

중요 규칙:
- ${langInstruction}. SOP 원문의 언어와 동일한 언어로 나레이션을 작성할 것
- 반드시 ${minScenes}씬 이상 생성할 것 (SOP 내용이 길므로 충분한 씬이 필요)
- SOP의 모든 단락과 항목을 빠짐없이 포함할 것. 내용을 생략하지 말 것
- 첫 씬은 인사와 주제 소개
- 마지막 씬은 핵심 요약과 마무리
- 나레이션은 자연스럽고 친근한 말투로 2~4문장
- 각 씬은 교육 영상의 한 장면 (30초~1분 분량)

★★★ visual 필드 핵심 규칙 (시각 다양성 극대화) ★★★
- visual 필드는 반드시 영어로 된 상세한 이미지 생성 프롬프트를 작성할 것
- ★ 매 씬마다 다른 시각 타입을 사용할 것 (연속 2씬 이상 같은 타입 금지):
  * 실사 사진 (인물 중심): "A young Korean woman in polo shirt and apron + action + place"
  * 인포그래픽: "Clean flat-design infographic showing 5 numbered steps for hand washing..."
  * 비교도 (BEFORE/AFTER): "Split-screen comparison: LEFT messy, RIGHT clean..."
  * 클로즈업: "Extreme close-up of hands/objects with shallow depth of field..."
  * 다이어그램/플로우차트: "Professional flowchart: Step A → Step B → Step C..."
  * 오버헤드/플랫레이: "Top-down overhead shot of items neatly arranged..."
  * 일러스트/만화: "Cute kawaii educational illustration showing..."
  * 시네마틱: "Cinematic wide shot with dramatic lighting..."
- ★ 나레이션의 핵심 교육 내용을 시각화할 것 (배경 분위기가 아닌 핵심 행동/개념 포커스)
- 절차 설명 → 인포그래픽이 효과적
- 올바른/잘못된 비교 → 분할 비교도가 효과적
- 도구/재료 나열 → 오버헤드 플랫레이가 효과적
- 감정/관계 → 인물 감성 사진이 효과적
- visual의 인물은 "A young Korean woman in a light blue polo shirt and beige apron" (키즈카페 직원)
- visual의 장소는 키즈카페/실내놀이터/교육실 등 아동 관련 환경
- 절대로 의사, 간호사, 과학자, 의료인으로 묘사하지 말 것
- visual 예시들:
  * 절차 → "Step-by-step infographic: 6 numbered icons showing handwashing procedure — wet, soap, scrub 20sec, rinse, dry, sanitize. Clean medical-style illustration."
  * 비교 → "Split-screen BEFORE/AFTER: left shows cluttered messy play area, right shows organized clean play area. Same camera angle, bright lighting."
  * 감정 → "Close-up portrait of a Korean woman in polo shirt making warm eye contact with a child at eye level, genuine smile, shallow depth of field, warm golden light."
  * 도구 → "Overhead flat-lay of first aid kit contents neatly arranged on white surface: bandages, antiseptic, gloves, scissors. Clean minimalist photography."
  * 안전 → "Cute illustrated safety poster with 5 rules: icons and Korean text, kawaii style, bright colors."
  * 시네마틱 → "Cinematic wide shot of colorful LED lights turning on across indoor playground. Dark-to-bright transition, morning atmosphere."
- 각 visual은 50-80 단어로 구체적 묘사 포함
- ★★★ 인포그래픽/다이어그램/포스터 등 텍스트가 포함된 시각 타입의 경우:
  * 나레이션이 한국어면 → visual에 "with Korean text labels" 명시 (예: "Step-by-step infographic with Korean labels: 1단계, 2단계...")
  * 나레이션이 영어면 → visual에 "with English text labels" 명시 (예: "Infographic with English labels: Step 1, Step 2...")
  * 나레이션이 베트남어면 → visual에 "with Vietnamese text labels" 명시 (예: "Infographic with Vietnamese labels: Bước 1, Bước 2...")
  * 이미지 안의 텍스트는 반드시 나레이션과 같은 언어로 작성되어야 합니다
- JSON 배열만 출력, 다른 텍스트 없이`;

      const result = await this._callLLM(provider, prompt);
      const parsed = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]');
      if (parsed.length === 0) return this._localGenerateScript(sopTitle, sopContent);

      // visual 필드 품질 검증: 부실한 visual은 나레이션 기반으로 재생성
      parsed.forEach(scene => {
        if (!scene.visual || scene.visual.length < 30 ||
            /^scene\s*\d/i.test(scene.visual) ||
            /training content/i.test(scene.visual) ||
            /slide/i.test(scene.visual)) {
          scene.visual = window.ScenePrompts
            ? window.ScenePrompts.narrationToPrompt(scene.narration || '', '', { withCamera: false })
            : this._narrationToVisual(scene.narration || '', '');
        }
      });
      return parsed;
    } catch (e) {
      console.warn('AI script generation failed, falling back to local:', e.message);
      return this._localGenerateScript(sopTitle, sopContent);
    }
  },

  // --- 퀴즈 생성 ---
  async generateQuiz(sopTitle, sopContent) {
    const provider = AI_CONFIG.quizProvider;

    if (provider === 'local') {
      return this._localGenerateQuiz(sopTitle, sopContent);
    }

    try {
      const plainText = this._htmlToText(sopContent);
      // SOP 언어 자동 감지
      const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(plainText);
      const isEnglish = !hasVietnamese && /^[\x00-\x7F\s.,!?;:'"()\-\d\n]+$/.test(plainText.slice(0, 300));
      const titleHasVie = /vie|VIE|베트남|vietnam/i.test(sopTitle);
      const titleHasEn = /eng|ENG|영어|english/i.test(sopTitle);

      let quizLang = '한국어';
      if (hasVietnamese || titleHasVie) quizLang = '베트남어(tiếng Việt)';
      else if (isEnglish || titleHasEn) quizLang = '영어(English)';

      const prompt = `당신은 직원 교육 퀴즈 출제 전문가입니다.

아래 SOP 스크립트 내용에서 직접 발췌하여 4지선다 퀴즈를 **정확히 3문제** JSON 배열로 생성하세요.
각 항목은 { "question": "문제", "options": ["선택지1", "선택지2", "선택지3", "선택지4"], "correct": 정답인덱스(0~3), "explanation": "스크립트 원문에서 근거를 1문장으로 인용" } 형식입니다.

SOP 제목: ${sopTitle}
SOP 스크립트:
${plainText}

규칙:
- 반드시 정확히 3문제만 생성 (3개 초과 금지)
- 퀴즈는 반드시 ${quizLang}로 작성할 것
- 질문과 정답은 반드시 위 스크립트 본문에 있는 내용에서 발췌할 것
- 스크립트에 없는 내용으로 문제를 만들지 말 것
- 정답이 고르게 분포되도록 (0,1,2 각 1회씩)
- 오답은 그럴듯하지만 스크립트 내용과 다르게
- JSON 배열만 출력, 다른 텍스트 없이`;

      const result = await this._callLLM(provider, prompt);
      const parsed = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]');
      // 반드시 3문제로 제한
      const limited = parsed.slice(0, 3);
      return limited.length > 0 ? limited : this._localGenerateQuiz(sopTitle, sopContent);
    } catch (e) {
      console.warn('AI quiz generation failed, falling back to local:', e.message);
      return this._localGenerateQuiz(sopTitle, sopContent);
    }
  },

  // --- 챗봇 답변 ---
  async chat(question, sopDocuments, chatHistory) {
    const provider = AI_CONFIG.chatProvider;

    if (provider === 'local') {
      return null; // null이면 기존 로컬 KB 매칭 사용
    }

    try {
      // 질문과 관련된 SOP를 우선 선별 (토큰 절약)
      const scoredSops = sopDocuments.map(s => {
        const qLower = question.toLowerCase();
        const titleLower = (s.title || '').toLowerCase();
        const contentText = this._htmlToText(s.content || '').toLowerCase();
        let score = 0;
        // 제목 매칭
        const titleWords = titleLower.split(/[\s_]+/).filter(w => w.length > 1);
        titleWords.forEach(w => { if (qLower.includes(w)) score += 3; });
        // 내용 키워드 매칭
        const qWords = qLower.split(/\s+/).filter(w => w.length > 1);
        qWords.forEach(w => { if (contentText.includes(w)) score += 1; });
        return { sop: s, score };
      }).sort((a, b) => b.score - a.score);

      // 관련도 높은 SOP 우선, 최대 3개 (토큰 절약)
      const relevantSops = scoredSops.slice(0, 3).map(s => s.sop);

      // SOP 본문 + 스크립트 나레이션 내용까지 포함
      const sopContext = relevantSops.map(s => {
        let text = `[${s.title}]\n${this._htmlToText(s.content || '')}`;
        // 스크립트(나레이션) 내용도 추가 — 학습 내용의 핵심
        if (s.script && Array.isArray(s.script) && s.script.length > 0) {
          const narrations = s.script.map((sc, i) =>
            `씬${i+1}: ${sc.narration || sc.title_full || ''}`
          ).join('\n');
          text += '\n\n[학습 나레이션]\n' + narrations;
        }
        return text;
      }).join('\n\n===\n\n');

      // 대화 히스토리 포함 (최근 6개)
      let historyText = '';
      if (chatHistory && chatHistory.length > 0) {
        const recent = chatHistory.slice(-6);
        historyText = '\n\n[이전 대화]\n' + recent.map(h =>
          `사용자: ${h.question}\nAI: ${h.answer}`
        ).join('\n\n');
      }

      const prompt = `당신은 직원 교육 SOP 전문 AI 도우미입니다.

## 핵심 규칙
1. 반드시 아래 [SOP 문서]에 있는 내용만 사용하여 답변하세요.
2. 당신의 일반 지식을 사용하지 마세요. SOP 문서에 나온 내용만 인용하세요.
3. SOP에 없는 질문이면 "현재 등록된 SOP에서 해당 내용을 찾지 못했습니다."라고 답하세요.
4. 답변할 때 해당 내용이 어느 SOP/씬에서 나왔는지 간략히 언급하세요.

## 답변 형식
- 한국어, 존댓말
- 핵심 먼저 → 세부 설명
- **굵게**, 번호 목록 사용
- 300자 이내 (필요시 확장 가능)

## [SOP 문서]
${sopContext}
${historyText}

## 직원 질문: ${question}

## 답변 (반드시 위 SOP 문서 내용만 인용하여 작성):`;

      return await this._callLLM(provider, prompt);
    } catch (e) {
      console.warn('AI chat failed, falling back to local:', e.message);
      return null;
    }
  },

  // ===== LLM API 호출 (통합) =====
  async _callLLM(provider, prompt) {
    const key = AI_CONFIG.keys[provider];
    const model = AI_CONFIG.models[provider];
    const useProxy = typeof CONFIG !== 'undefined' && CONFIG.useProxy;

    if (!useProxy && !key) throw new Error(`API key not set for ${provider}`);

    if (provider === 'gemini') {
      if (useProxy) {
        // Proxy route: send to /api/gemini, API key stays server-side
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            model,
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || data.error);
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Empty response from proxy');
        return data.candidates[0].content.parts[0].text;
      }

      // Direct API call (local dev fallback)
      if (!key) throw new Error(`API key not set for ${provider}`);
      const url = AI_CONFIG.endpoints.gemini
        .replace('{model}', model)
        .replace('{key}', key);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Empty response from Gemini');
      return data.candidates[0].content.parts[0].text;
    }

    if (provider === 'openai' || provider === 'groq') {
      const url = AI_CONFIG.endpoints[provider];
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      };

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2048
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices[0].message.content;
    }

    throw new Error(`Unknown provider: ${provider}`);
  },

  // ===== 로컬 폴백 함수들 =====

  _htmlToText(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
  },

  _localGenerateScript(sopTitle, sopContent) {
    const div = document.createElement('div');
    div.innerHTML = sopContent;
    const headings = div.querySelectorAll('h3');

    const script = [
      { scene: 1, narration: `안녕하세요. "${sopTitle}"에 대해 배우겠습니다.`, visual: `A Korean woman in professional attire standing at a podium, warmly introducing the training topic "${sopTitle}". Bright modern training room with screen.` }
    ];

    headings.forEach((h, i) => {
      const section = h.textContent;
      const nextEl = h.nextElementSibling;
      let steps = '';
      if (nextEl && (nextEl.tagName === 'OL' || nextEl.tagName === 'UL')) {
        steps = Array.from(nextEl.querySelectorAll('li')).map(li => li.textContent).join('. ');
      }
      const narration = steps ? `${section}입니다. ${steps}` : `다음은 ${section}에 대해 알아보겠습니다.`;
      script.push({
        scene: i + 2,
        narration,
        visual: window.ScenePrompts
          ? window.ScenePrompts.narrationToPrompt(narration, section, { withCamera: false })
          : this._narrationToVisual(narration, section)
      });
    });

    script.push({
      scene: script.length + 1,
      narration: `"${sopTitle}" 교육을 마칩니다. 핵심 내용을 기억해주세요!`,
      visual: 'A Korean woman standing at an organized reception giving a confident thumbs up. Clean whiteboard behind with summary bullet points. Warm bright lighting.'
    });

    return script;
  },

  _narrationToVisual(narration, section) {
    const text = ((narration || '') + ' ' + (section || '')).toLowerCase();
    const scenes = [
      { kw: ['손 씻', '손씻', '비누', '세정'], en: 'A Korean woman carefully washing hands with soap under running water at a clean sink. Bright modern washroom.' },
      { kw: ['청소', '소독', '닦', '쓸'], en: 'A person in uniform wiping surfaces with disinfectant spray and cloth. Bright tidy room.' },
      { kw: ['점검', '체크', '확인'], en: 'A Korean woman in uniform checking items on a clipboard checklist. Well-organized room.' },
      { kw: ['안전', '주의', '위험'], en: 'Safety instruction signs next to well-organized equipment. Bright facility with floor markings.' },
      { kw: ['인사', '환영', '안녕'], en: 'A smiling Korean woman bowing warmly to welcome visitors at a reception desk.' },
      { kw: ['아이', '어린이', '유아', '아동'], en: 'A Korean woman kneeling at eye level with happy children in a bright playroom.' },
      { kw: ['칭찬', '격려', '응원', '잘했'], en: 'A Korean woman giving enthusiastic thumbs-up to a happy child. Bright cheerful playroom.' },
      { kw: ['자존감', '자신감'], en: 'A proud child holding up a craft project while teacher watches with encouraging smile.' },
      { kw: ['눈빛', '눈 맞', '눈높이', '표정'], en: 'A Korean woman making warm eye contact with a child at eye level, both smiling.' },
      { kw: ['진심', '진정성'], en: 'Close-up of a Korean woman speaking sincerely with hands on heart. Warm lighting.' },
      { kw: ['구체적', '명확', '디테일'], en: 'A Korean woman pointing at specific details on a child drawing. Bright art table.' },
      { kw: ['패턴', '공식', '방법', '기법', '기술'], en: 'A Korean woman pointing at a step-by-step diagram on whiteboard. Bright training room.' },
      { kw: ['소통', '대화', '경청'], en: 'A Korean woman actively listening to someone, leaning forward attentively. Quiet room.' },
      { kw: ['감정', '기분', '느낌', '정서'], en: 'Colorful emotion cards on table. Korean teacher showing them to children.' },
      { kw: ['공감', '이해', '위로'], en: 'A Korean woman comforting a child with a gentle pat on the shoulder.' },
      { kw: ['팀', '동료', '협력'], en: 'Two Korean women in uniforms discussing at a round table. Bright meeting room.' },
      { kw: ['부모', '학부모', '보호자'], en: 'A Korean woman having a warm conversation with parents at a desk.' },
      { kw: ['규칙', '규정', '절차', '약속'], en: 'A Korean woman pointing at posted rules on a wall. Organized classroom.' },
      { kw: ['음식', '식사', '간식'], en: 'A clean kitchen counter with healthy snacks on colorful plates. Bright kitchen.' },
      { kw: ['놀이', '게임', '활동'], en: 'A bright playroom with educational toys and art supplies on low tables.' },
      { kw: ['출근', '시작', '아침'], en: 'A Korean woman in neat uniform walking through a bright entrance in morning light.' },
      { kw: ['질문', '궁금', '생각해'], en: 'A Korean woman with thoughtful expression, looking at a question on whiteboard.' },
      { kw: ['예를 들', '예시', '사례'], en: 'A Korean woman presenting examples on a screen in a bright training room.' },
      { kw: ['중요', '기억', '꼭', '핵심'], en: 'A Korean woman pointing at a highlighted key point with star mark on board.' },
      { kw: ['집중', '몰입', '집중력'], en: 'A child deeply focused on building with blocks while teacher observes quietly.' },
      { kw: ['크래용', '그림', '미술'], en: 'A child drawing with colorful crayons. Korean teacher admiring the artwork.' },
      { kw: ['교육', '철학', '가치'], en: 'A Korean woman reading an educational book at a round table. Cozy meeting room.' },
      { kw: ['성장', '발달', '배움'], en: 'A wall display with children artwork and growth charts. Bright hallway.' },
      { kw: ['예민', '민감', '섬세'], en: 'A Korean woman gently approaching a shy child with soft caring expression.' },
      { kw: ['동기', '의욕', '열정'], en: 'A Korean woman energetically leading a group activity with enthusiasm.' },
      { kw: ['효과', '결과', '변화'], en: 'A presentation board showing before-and-after comparison with positive results.' },
      { kw: ['비교', '차이', '다른'], en: 'A whiteboard showing two contrasting approaches side by side.' },
      { kw: ['경험', '겪어', '시도'], en: 'A Korean woman gesturing as she tells a story with a reflective smile.' },
    ];

    for (const s of scenes) {
      if (s.kw.some(k => text.includes(k))) {
        return s.en + ' Professional training video, warm natural lighting, 8k quality.';
      }
    }

    return `A Korean woman in professional uniform explaining about "${section}" in a bright modern workspace. Clean organized interior, warm natural lighting. Professional training photo.`;
  },

  _localGenerateQuiz(sopTitle, sopContent) {
    const div = document.createElement('div');
    div.innerHTML = sopContent;
    const headings = div.querySelectorAll('h3');
    const quizzes = [];

    headings.forEach(h => {
      const section = h.textContent.replace(/^\d+\.\s*/, '');
      const nextEl = h.nextElementSibling;
      if (nextEl && (nextEl.tagName === 'OL' || nextEl.tagName === 'UL')) {
        const items = Array.from(nextEl.querySelectorAll('li'));
        if (items.length >= 2) {
          quizzes.push({
            question: `"${section}" 단계에서 가장 먼저 해야 할 일은?`,
            options: [
              items[0].textContent.slice(0, 30),
              items[items.length - 1].textContent.slice(0, 30),
              '매니저에게 보고',
              '다음 단계로 건너뛰기'
            ],
            correct: 0
          });
        }
      }
    });

    // 절차 수 퀴즈는 headings가 있을 때만
    if (headings.length > 0) {
      quizzes.push({
        question: `"${sopTitle}"의 전체 절차 수는?`,
        options: [`${headings.length}단계`, `${headings.length + 2}단계`, `${headings.length - 1}단계`, `${headings.length + 1}단계`],
        correct: 0
      });
    }

    // 최대 3개로 제한
    return quizzes.slice(0, 3);
  },

  // ===== 영상 생성 =====

  // --- Wan 2.2 (SiliconFlow) 영상 생성 ---
  async generateVideo(prompt, options = {}) {
    const provider = AI_CONFIG.videoProvider;
    if (provider === 'none') {
      return { status: 'skip', message: '영상 생성이 비활성화되어 있습니다. config.js에서 videoProvider를 설정하세요.' };
    }

    if (provider === 'wan') {
      return this._generateVideoWan(prompt, options);
    }
    if (provider === 'vidu') {
      return this._generateVideoVidu(prompt, options);
    }

    return { status: 'error', message: `알 수 없는 영상 제공자: ${provider}` };
  },

  // Wan 2.2 via SiliconFlow API
  async _generateVideoWan(prompt, options = {}) {
    const useProxy = typeof CONFIG !== 'undefined' && CONFIG.useProxy;
    const key = AI_CONFIG.keys.siliconflow;
    if (!useProxy && !key) return { status: 'error', message: 'SiliconFlow API 키가 설정되지 않았습니다.' };

    const model = options.turbo ? AI_CONFIG.models.wan_turbo : AI_CONFIG.models.wan;
    const resolution = options.resolution || '720';

    try {
      // 1단계: 영상 생성 요청
      let submitRes;
      if (useProxy) {
        submitRes = await fetch('/api/siliconflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit',
            model: model,
            prompt: prompt,
            image_size: resolution === '720' ? '1280x720' : '854x480',
          })
        });
      } else {
        submitRes = await fetch(AI_CONFIG.endpoints.siliconflow, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model,
            prompt: prompt,
            image_size: resolution === '720' ? '1280x720' : '854x480',
          })
        });
      }
      const submitData = await submitRes.json();

      if (submitData.error) throw new Error(submitData.error.message || JSON.stringify(submitData.error));

      const requestId = submitData.requestId || submitData.id;
      if (!requestId) throw new Error('요청 ID를 받지 못했습니다');

      return {
        status: 'submitted',
        requestId: requestId,
        model: model,
        prompt: prompt,
        message: '영상 생성이 시작되었습니다. 1~3분 소요됩니다.',
        estimatedCost: options.turbo ? '$0.21' : '$0.29',
        // checkStatus 함수로 완료 여부 확인
      };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  },

  // 영상 생성 상태 확인 (SiliconFlow 비동기 방식)
  async checkVideoStatus(requestId) {
    const useProxy = typeof CONFIG !== 'undefined' && CONFIG.useProxy;
    const key = AI_CONFIG.keys.siliconflow;
    if (!useProxy && !key) return { status: 'error', message: 'API 키 없음' };

    try {
      let res;
      if (useProxy) {
        res = await fetch('/api/siliconflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', requestId })
        });
      } else {
        res = await fetch(AI_CONFIG.endpoints.siliconflow_status, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({ requestId })
        });
      }
      const data = await res.json();

      if (data.status === 'Succeed' || data.status === 'completed') {
        return {
          status: 'completed',
          videoUrl: data.results?.videos?.[0]?.url || data.videoUrl || data.url,
          requestId
        };
      } else if (data.status === 'Failed' || data.status === 'failed') {
        return { status: 'failed', message: data.reason || '생성 실패', requestId };
      } else {
        return { status: 'processing', message: '생성 중...', requestId };
      }
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  },

  // 영상 생성 완료까지 폴링
  async pollVideoUntilDone(requestId, onProgress, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.checkVideoStatus(requestId);
      if (onProgress) onProgress(result, i + 1);

      if (result.status === 'completed') return result;
      if (result.status === 'failed' || result.status === 'error') return result;

      // 10초 간격으로 폴링
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    return { status: 'timeout', message: '영상 생성 시간이 초과되었습니다. 나중에 다시 확인해주세요.' };
  },

  // Vidu API 영상 생성 (대안)
  async _generateVideoVidu(prompt, options = {}) {
    const key = AI_CONFIG.keys.vidu;
    if (!key) return { status: 'error', message: 'Vidu API 키가 설정되지 않았습니다.' };

    // Vidu는 제공자별 API가 다를 수 있음 (WaveSpeedAI, Atlas Cloud 등)
    // 여기서는 기본 구조만 제공, 실제 엔드포인트는 선택한 제공자에 따라 변경
    return {
      status: 'info',
      message: 'Vidu 통합은 선택하신 API 제공자(WaveSpeedAI, Atlas Cloud 등)의 문서를 참고하여 엔드포인트를 설정해주세요.',
      estimatedCost: '~$0.20/클립'
    };
  },

  // --- SOP 전체 영상 생성 (씬별 배치) ---
  async generateSopVideo(sopId) {
    const sop = typeof SopStore !== 'undefined' ? SopStore.getById(sopId) : null;
    if (!sop || !sop.script) {
      return { status: 'error', message: 'SOP 스크립트가 없습니다. 먼저 AI 콘텐츠를 생성하세요.' };
    }

    const results = [];
    for (const scene of sop.script) {
      // Gemini로 컨텍스트 기반 영어 프롬프트 생성
      let videoPrompt;
      try {
        videoPrompt = await this._buildContextualPrompt(scene.visual, scene.narration);
      } catch (e) {
        videoPrompt = `A staff member in uniform performing procedures in a modern Korean kids cafe. ${scene.visual || ''}. Bright warm lighting, professional training video style, 720p quality.`;
      }

      const result = await this.generateVideo(videoPrompt, { turbo: true });
      results.push({
        scene: scene.scene,
        narration: scene.narration,
        videoResult: result
      });
    }

    return {
      status: 'batch_submitted',
      sopId: sopId,
      totalScenes: sop.script.length,
      results: results,
      estimatedTotalCost: `$${(sop.script.length * 0.21).toFixed(2)}~$${(sop.script.length * 0.29).toFixed(2)}`,
    };
  },

  // Gemini로 씬 나레이션 → 구체적 영어 비디오 프롬프트 생성
  async _buildContextualPrompt(visual, narration) {
    const prompt = `You are a video prompt engineer. Convert this training video scene into a detailed English video generation prompt.

SCENE VISUAL: ${visual || 'N/A'}
SCENE NARRATION: ${narration || 'N/A'}

Requirements:
- Describe a SPECIFIC scene matching the narration content
- Setting: modern Korean kids indoor playground/cafe
- Characters: staff in uniform performing described procedures
- Include specific actions, objects, details from narration
- Style: bright warm lighting, clean professional, training video
- Under 150 words, ONLY the English prompt`;

    const result = await this._callLLM('gemini', prompt);
    return result.trim().replace(/^["']|["']$/g, '');
  },
};

// ===== TTS (Text-to-Speech) — 브라우저 내장 Web Speech API =====

AI.generateTTS = function(text, lang = 'ko-KR') {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      return reject(new Error('이 브라우저는 음성 합성을 지원하지 않습니다.'));
    }

    // 이전 음성 중지
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // 해당 언어에 맞는 음성 선택 시도
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (match) utterance.voice = match;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
};

AI.stopTTS = function() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

AI.isTTSSpeaking = function() {
  return window.speechSynthesis && window.speechSynthesis.speaking;
};

AI.getTTSVoices = function() {
  if (!window.speechSynthesis) return {};
  const voices = window.speechSynthesis.getVoices();
  const langMap = { 'ko-KR': [], 'en-US': [], 'vi-VN': [] };
  voices.forEach(v => {
    Object.keys(langMap).forEach(lang => {
      if (v.lang === lang || v.lang.startsWith(lang.split('-')[0])) {
        langMap[lang].push({ name: v.name, lang: v.lang, local: v.localService });
      }
    });
  });
  return langMap;
};

// 음성 목록은 비동기 로드될 수 있으므로 미리 트리거
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// ===== TTS + 영상 동기 재생 =====

// 씬 배열에서 TTS 설정을 생성하고 localStorage에 저장
AI.generateSceneAudio = function(scenes, lang = 'ko-KR', sopId = '') {
  if (!window.speechSynthesis) return [];

  const configs = scenes.map((scene, i) => ({
    scene: scene.scene || (i + 1),
    narration: scene.narration || '',
    lang: lang,
    rate: 0.9,
    pitch: 1,
    volume: 1,
  }));

  if (sopId) {
    localStorage.setItem('sop_tts_config_' + sopId, JSON.stringify(configs));
  }
  return configs;
};

// 영상(muted) + TTS 동시 재생 컨트롤러 반환
AI.playSyncedVideo = function(videoUrl, narration, lang = 'ko-KR') {
  let videoEl = null;
  let utterance = null;
  let stopped = false;
  let onSubtitle = null; // callback(word, fullText)
  let onEnd = null;

  const controller = {
    // 자막 콜백 설정: fn(currentWord, fullText)
    set onSubtitleUpdate(fn) { onSubtitle = fn; },
    set onPlayEnd(fn) { onEnd = fn; },

    play(containerEl) {
      stopped = false;
      // 비디오 생성
      if (videoUrl) {
        videoEl = document.createElement('video');
        videoEl.src = videoUrl;
        videoEl.muted = true;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.style.cssText = 'width:100%;border-radius:8px 8px 0 0;display:block;background:#000;';
        if (containerEl) {
          containerEl.innerHTML = '';
          containerEl.appendChild(videoEl);
        }
        videoEl.play().catch(() => {});
      }

      // TTS 동시 시작
      if (narration && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        utterance = new SpeechSynthesisUtterance(narration);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        const voices = window.speechSynthesis.getVoices();
        const match = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
        if (match) utterance.voice = match;

        // 자막 하이라이트 (word boundary 이벤트)
        utterance.onboundary = (e) => {
          if (onSubtitle && e.name === 'word') {
            const word = narration.substring(e.charIndex, e.charIndex + e.charLength);
            onSubtitle(e.charIndex, e.charLength, narration);
          }
        };

        utterance.onend = () => {
          if (!stopped && onEnd) onEnd();
        };
        utterance.onerror = () => {
          if (!stopped && onEnd) onEnd();
        };

        window.speechSynthesis.speak(utterance);
      }
    },

    pause() {
      if (videoEl) videoEl.pause();
      if (window.speechSynthesis) window.speechSynthesis.pause();
    },

    resume() {
      if (videoEl) videoEl.play().catch(() => {});
      if (window.speechSynthesis) window.speechSynthesis.resume();
    },

    stop() {
      stopped = true;
      if (videoEl) { videoEl.pause(); videoEl.src = ''; videoEl = null; }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    },
  };

  return controller;
};

// ===== AI 제공자 상태 확인 =====
AI.getStatus = function() {
  const keyCheck = (provider) => {
    if (provider === 'local') return '무료';
    if (provider === 'none') return '미사용';
    const keyName = provider === 'wan' ? 'siliconflow' : provider;
    return AI_CONFIG.keys[keyName] ? 'API 연결' : '키 미설정';
  };

  return {
    script: `${AI_CONFIG.scriptProvider} (${keyCheck(AI_CONFIG.scriptProvider)})`,
    quiz: `${AI_CONFIG.quizProvider} (${keyCheck(AI_CONFIG.quizProvider)})`,
    chat: `${AI_CONFIG.chatProvider} (${keyCheck(AI_CONFIG.chatProvider)})`,
    tts: AI_CONFIG.ttsProvider === 'none' ? '미사용' : AI_CONFIG.ttsProvider,
    video: `${AI_CONFIG.videoProvider} (${keyCheck(AI_CONFIG.videoProvider)})`,
    monthlyCost: AI_CONFIG.videoProvider !== 'none'
      ? '~$5 (영상 포함)'
      : AI_CONFIG.scriptProvider === 'local' && AI_CONFIG.chatProvider === 'local' ? '$0' : '~$3',
  };
};
