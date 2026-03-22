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
const AI_CONFIG = {
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
    gemini: 'gemini-2.0-flash',              // 무료 티어, 빠르고 저렴
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
      const prompt = `당신은 직원 교육 영상 스크립트 작성 전문가입니다.

아래 SOP 문서를 기반으로 교육 영상 스크립트를 JSON 배열로 생성하세요.
각 항목은 { "scene": 번호, "narration": "나레이션 텍스트", "visual": "화면 설명" } 형식입니다.

SOP 제목: ${sopTitle}
SOP 내용:
${this._htmlToText(sopContent)}

규칙:
- 첫 씬은 인사와 주제 소개
- 마지막 씬은 핵심 요약과 마무리
- 나레이션은 자연스럽고 친근한 말투
- 각 씬 30초~1분 분량
- JSON 배열만 출력, 다른 텍스트 없이`;

      const result = await this._callLLM(provider, prompt);
      const parsed = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]');
      return parsed.length > 0 ? parsed : this._localGenerateScript(sopTitle, sopContent);
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
      const prompt = `당신은 직원 교육 퀴즈 출제 전문가입니다.

아래 SOP 문서를 기반으로 4지선다 퀴즈를 JSON 배열로 생성하세요.
각 항목은 { "question": "문제", "options": ["선택지1", "선택지2", "선택지3", "선택지4"], "correct": 정답인덱스(0~3) } 형식입니다.

SOP 제목: ${sopTitle}
SOP 내용:
${this._htmlToText(sopContent)}

규칙:
- 5~7개 문제 생성
- SOP의 핵심 절차와 주의사항 중심
- 정답이 고르게 분포되도록 (0,1,2,3 골고루)
- 오답도 그럴듯하게
- JSON 배열만 출력`;

      const result = await this._callLLM(provider, prompt);
      const parsed = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]');
      return parsed.length > 0 ? parsed : this._localGenerateQuiz(sopTitle, sopContent);
    } catch (e) {
      console.warn('AI quiz generation failed, falling back to local:', e.message);
      return this._localGenerateQuiz(sopTitle, sopContent);
    }
  },

  // --- 챗봇 답변 ---
  async chat(question, sopDocuments) {
    const provider = AI_CONFIG.chatProvider;

    if (provider === 'local') {
      return null; // null이면 기존 로컬 KB 매칭 사용
    }

    try {
      const sopContext = sopDocuments.map(s =>
        `[${s.title}]\n${this._htmlToText(s.content)}`
      ).join('\n\n---\n\n');

      const prompt = `당신은 매장 직원을 위한 SOP 도우미입니다.
아래 SOP 문서를 기반으로 질문에 친절하게 답변하세요.
SOP에 없는 내용은 "해당 SOP를 찾을 수 없습니다"라고 답하세요.

SOP 문서:
${sopContext}

질문: ${question}

답변 (마크다운 형식, 핵심만 간결하게):`;

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

    if (!key) throw new Error(`API key not set for ${provider}`);

    if (provider === 'gemini') {
      const url = AI_CONFIG.endpoints.gemini
        .replace('{model}', model)
        .replace('{key}', key);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
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
      { scene: 1, narration: `안녕하세요. "${sopTitle}"에 대해 배우겠습니다.`, visual: '타이틀 화면' }
    ];

    headings.forEach((h, i) => {
      const section = h.textContent;
      const nextEl = h.nextElementSibling;
      let steps = '';
      if (nextEl && (nextEl.tagName === 'OL' || nextEl.tagName === 'UL')) {
        steps = Array.from(nextEl.querySelectorAll('li')).map(li => li.textContent).join('. ');
      }
      script.push({
        scene: i + 2,
        narration: steps ? `${section}입니다. ${steps}` : `다음은 ${section}에 대해 알아보겠습니다.`,
        visual: `${section} - 관련 장면`
      });
    });

    script.push({
      scene: script.length + 1,
      narration: `"${sopTitle}" 교육을 마칩니다. 핵심 내용을 기억해주세요!`,
      visual: '요약 + 마무리'
    });

    return script;
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

    quizzes.push({
      question: `"${sopTitle}"의 전체 절차 수는?`,
      options: [`${headings.length}단계`, `${headings.length + 2}단계`, `${headings.length - 1}단계`, `${headings.length + 1}단계`],
      correct: 0
    });

    return quizzes;
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
    const key = AI_CONFIG.keys.siliconflow;
    if (!key) return { status: 'error', message: 'SiliconFlow API 키가 설정되지 않았습니다.' };

    const model = options.turbo ? AI_CONFIG.models.wan_turbo : AI_CONFIG.models.wan;
    const resolution = options.resolution || '720';

    try {
      // 1단계: 영상 생성 요청
      const submitRes = await fetch(AI_CONFIG.endpoints.siliconflow, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          image_size: resolution === '720' ? '1280x720' : '854x480',
          // seed: options.seed || undefined,  // 재현성
        })
      });
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
    const key = AI_CONFIG.keys.siliconflow;
    if (!key) return { status: 'error', message: 'API 키 없음' };

    try {
      const res = await fetch(AI_CONFIG.endpoints.siliconflow_status, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({ requestId })
      });
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
      // 나레이션을 영상 프롬프트로 변환
      const videoPrompt = `교육 영상 장면. ${scene.visual}. 깨끗한 매장 환경, 유니폼을 입은 직원이 절차를 수행하는 모습. 밝고 전문적인 분위기. 720p 품질.`;

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
