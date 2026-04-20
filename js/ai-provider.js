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

  // 영상 소스: 'none' | 'pexels' | 'wan' | 'vidu' | 'sora'
  videoProvider: 'pexels',

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
      let regionHint = 'East Asian / Korean context';
      if (hasVietnamese || titleHasVie) {
        langInstruction = '나레이션은 반드시 베트남어(tiếng Việt)로 작성';
        regionHint = 'Vietnamese / Southeast Asian context — ALL video_keywords MUST include "vietnamese" or "asian" prefix for authentic representation';
      } else if (isEnglish || titleHasEn) {
        langInstruction = '나레이션은 반드시 영어(English)로 작성';
        regionHint = 'Asian context preferred — prefer "asian" prefix in video_keywords when describing people';
      } else {
        regionHint = 'Korean / East Asian context — include "korean" or "asian" prefix in people-related video_keywords';
      }

      const prompt = `당신은 Netflix 다큐멘터리 스타일의 교육 영상 시각 디렉터입니다.
모바일로 6분 보고 "이해되고 기억에 남는" 영상 시퀀스를 설계합니다.
당신의 일은 "영상을 만드는 것"이 아니라 "영상을 만들기 위한 정확한 지시서"를 쓰는 것입니다.

SOP 제목: ${sopTitle}
SOP 내용:
${plainText}

═══════════════════════════════════════════════
★ 원칙 1 — 문장 분류 (반드시 먼저 수행) ★
═══════════════════════════════════════════════
입력 SOP의 각 의미 단위를 씬으로 나누기 전에, 문장마다 분류하라:

A. CONCRETE — 물리적 행동/실제 사물/구체 상황 (예: "고기를 뒤집는다")
   → video_scenario 또는 comparison 로 씬 생성
B. ABSTRACT — 개념/원칙/수치/관계 (예: "70% 재방문율 상승")
   → stat 또는 infographic 으로 씬 생성 (일반 스톡 금지)
C. EMOTIONAL — 태도/감정/기억/자부심 (예: "아이가 기억하는 건 감정")
   → title_card 또는 분위기 video_scenario + 강한 overlay

추상 개념을 일반 미소 스톡으로 때우면 학습 효과 급락. ABSTRACT 는 반드시 stat / infographic 으로.

═══════════════════════════════════════════════
★ 원칙 2 — 나레이션/비주얼/오버레이 = 3개 다른 정보 ★
═══════════════════════════════════════════════
나레이션이 "3초 안에 인사하라"고 말할 때, 영상이 단순 "인사 장면"이면 정보 중복.
세 레이어는 **다른 각도로 하나의 메시지**에 수렴해야 한다:
  나레이션: "첫 3초가 결정합니다"
  비주얼:   시계 바늘 3초 넘어가는 클로즈업
  오버레이: "3초"
→ caption / overlay_text 필드는 자막 반복 금지. 숫자·기호·핵심 단어 1개 (앵커).

═══════════════════════════════════════════════
★ 5가지 씬 타입 (반드시 type 필드에 명시) ★
═══════════════════════════════════════════════

1. "title_card" — 챕터/섹션 도입
   - 큰 텍스트만, 영상/이미지 없음
   - 사용: 첫 씬, 큰 섹션 시작, 마무리
   - 필드: { scene, type:"title_card", narration, kicker, title_main, title_sub }

2. "video_scenario" — 실제 상황/행동 (★ 가장 많이 사용)
   - 실사 영상 (Pexels에서 검색)
   - 사용: "교사가 체온 잰다", "아이와 인사한다" 같은 동작/장면
   - 필드: { scene, type:"video_scenario", narration, video_keywords:[…], caption, tag }

3. "infographic" — 절차/체크리스트/단계
   - AI 이미지 (인포그래픽 차트)
   - 사용: "체온 측정 3단계", "5가지 주의사항"
   - 필드: { scene, type:"infographic", narration, header_tag, header_title, steps:[…], visual }

4. "stat" — 큰 숫자/통계 강조
   - 텍스트만, 배경에 흐린 영상
   - 사용: "90초가 결정한다", "72%가 만족"
   - 필드: { scene, type:"stat", narration, tag, number, unit, context, source(optional), video_keywords }

5. "comparison" — 잘못 vs 올바른 (BEFORE/AFTER)
   - 화면 위/아래 분할, 영상 2개
   - 사용: "이렇게 하지 마세요 / 이렇게 하세요"
   - 필드: { scene, type:"comparison", narration, left_label, left_text, left_video_keywords:[…], right_label, right_text, right_video_keywords:[…] }

═══════════════════════════════════════════════
★ 분배 가이드라인 ★
═══════════════════════════════════════════════
- 첫 씬: title_card (도입)
- 두 번째 씬: stat 또는 video_scenario (왜 중요한지)
- 본문: video_scenario 위주, 사이사이 infographic 끼워넣기
- 절차/체크리스트 있으면 반드시 infographic 1~2씬
- 잘못 vs 올바른 사례 있으면 comparison 1씬
- 마지막 씬: title_card (전환/요약)

전체 비율 (참고):
- title_card: 10~20% (도입+마무리)
- video_scenario: 50~60% (메인)
- infographic: 20~30% (절차/요약)
- stat: 5~10% (강조)
- comparison: 0~10% (있으면 효과적)

═══════════════════════════════════════════════
★ 각 타입별 필드 작성 규칙 ★
═══════════════════════════════════════════════

【공통】
- ${langInstruction}. SOP 원문의 언어와 동일하게 나레이션 작성
- 반드시 ${minScenes}씬 이상 생성
- SOP의 모든 단락/항목을 빠짐없이 포함
- 나레이션은 자연스럽고 친근한 2~4문장 (TTS가 읽음, 이모지 금지)

【title_card 필드】
- kicker: 영문 작은 라벨 (예: "Chapter 01 · Welcome Protocol")
- title_main: 핵심 제목 (예: "등원 <span class='accent'>맞이</span>")
   <span class='accent'>로 감싸면 강조색
- title_sub: 영문 서브타이틀 (예: "Morning Welcome SOP")

【video_scenario 필드】
- message_type: "CONCRETE" | "ABSTRACT" | "EMOTIONAL" (원칙 1 분류 결과)
- video_keywords: 영어 검색어 3개 (1→3순위 폴백, 필수)
   ★ 구체 동사 + 주체 + 장소 형태. 추상명사 금지 ("importance", "connection", "education" 같은 단어 단독 사용 X)
   예: ["asian teacher kneeling eye level with child preschool", "kindergarten greeting morning arrival", "teacher smile child classroom"]
- search_layers: 4단계 폴백 설계 (선택, 있으면 검색 품질↑)
   [
     { layer: 1, query: "정확히 맞는 장면 영어 검색어" },
     { layer: 2, query: "맥락 유사 / 국가·디테일 다름" },
     { layer: 3, query: "추상적이지만 분위기 맞음" },
     { layer: 4, type: "motion_graphic", description: "스톡 실패 시 모션그래픽 설계 — 아이콘/텍스트 애니메이션" }
   ]
- caption: 화면 자막 앵커 (자막이 아닌 기호/숫자/핵심 단어 1개, 나레이션 반복 금지)
   나쁜 예: "첫인상이 중요합니다" (나레이션 반복)
   좋은 예: "<b>3초</b>" / "<b>×</b> 7초" / "+15% ↑"
- tag: 작은 영문 라벨 (예: "STEP 01", "ACTION", "MOMENT")

【infographic 필드】
- header_tag: 영문 카테고리 (예: "Health Screening", "Checklist")
- header_title: 한국어 제목 (예: "체온 체크 <span style='color:var(--highlight)'>3단계</span>")
- steps: 단계 배열 3~5개, 각 항목에 <span class='hl'>키워드</span>로 강조
   예: ["비접촉 체온계로 이마 중앙 <span class='hl'>3회 측정</span>", ...]
- visual: AI 이미지 생성용 영어 프롬프트 (50~80단어)
   "Modern educational infographic showing N numbered steps with icons, soft pastel palette teal/amber, clean flat design, mobile-friendly vertical composition, ${hasVietnamese ? 'with Vietnamese text labels' : isEnglish ? 'with English text labels' : 'with Korean text labels'}"

【stat 필드】
- tag: 영문 라벨 (예: "RESEARCH", "DATA", "WHY IT MATTERS")
- number: 큰 숫자 (예: "90", "37.5", "72")
- unit: 단위 (예: "SECONDS", "%", "분", "도", null도 가능)
- context: 한국어 부연 설명 1~2줄
- source: 출처 (선택, 예: "MOE Childhood Study, 2023")
- video_keywords: 배경에 깔 영상 검색어 (3개)

【comparison 필드】
- left_label: "잘못된 방식" / "이전" 등
- left_text: 잘못된 행동 설명 (한 줄)
- left_video_keywords: 영어 검색어 (3개)
- right_label: "올바른 방식" / "권장" 등
- right_text: 올바른 행동 설명 (한 줄)
- right_video_keywords: 영어 검색어 (3개)

═══════════════════════════════════════════════
★ video_keywords / search_layers 작성 핵심 ★
═══════════════════════════════════════════════
- 반드시 영어로 작성 (Pexels는 영어 검색 결과가 풍부)
- 3~5단어 조합: "subject + action + setting + mood"
- 추상명사 단독 금지 ("importance" / "connection" / "education" 등 금지)
- ★★ 이 SOP의 지역 맥락: ${regionHint} ★★
- 사람이 나오는 씬에는 반드시 "asian" / "vietnamese" / "korean" 중 하나의 지역 수식어 포함
- 좋은 예 (지역 + 구체 동사):
  * "asian teacher kneeling eye level with child preschool"
  * "vietnamese kindergarten morning arrival greeting"
  * "korean woman barbecue restaurant grilling meat"
- 나쁜 예:
  * "education" / "training" / "morning" (너무 일반적)
  * "teacher with child" (지역 수식어 누락)
  * "first impression importance" (추상명사 단독)

═══════════════════════════════════════════════
★ 세션 리듬 (참고용, JSON엔 포함 안 함) ★
═══════════════════════════════════════════════
[0~15%] 훅 — stat 또는 EMOTIONAL title_card (왜 중요한지)
[15~30%] 맥락 — video_scenario CONCRETE 위주
[30~70%] 핵심 학습 — infographic(구조) + stat(근거) + video_scenario 교차
[70~90%] 사례·실습 — video_scenario 또는 comparison
[90~100%] 요약·전환 — title_card EMOTIONAL
리듬 원칙: 같은 타입 3씬 연속 금지. stat/infographic은 전체의 30% 이내.

═══════════════════════════════════════════════
★ 씬별 자체 검증 (출력 전 체크리스트) ★
═══════════════════════════════════════════════
각 씬마다 다음을 확인하고 통과하지 못하면 수정:
1) message_type 분류가 씬 타입과 일관 (CONCRETE→video_scenario, ABSTRACT→stat/infographic, EMOTIONAL→title_card/분위기)
2) video_keywords가 영어 3개, 구체 동사+주체, 추상명사 없음
3) 사람 나오는 씬에 지역 수식어 (asian/vietnamese/korean) 포함
4) caption/오버레이가 나레이션 반복이 아니고 앵커(숫자/기호/핵심 단어 1개)
5) 나레이션 길이 2~4문장 (TTS 적정)
6) 같은 타입 3씬 연속 안 함 (리듬)

═══════════════════════════════════════════════
★ 출력 형식 ★
═══════════════════════════════════════════════
JSON 배열만 출력, 다른 텍스트 없이.
각 씬에 type 필드 필수.
type에 맞지 않는 필드는 생략 가능.

예시:
[
  {
    "scene": 1,
    "type": "title_card",
    "message_type": "EMOTIONAL",
    "narration": "오늘은 등원 맞이 표준 절차를 배워보겠습니다",
    "kicker": "Chapter 01 · Morning Welcome",
    "title_main": "등원 <span class='accent'>맞이</span>",
    "title_sub": "Standard Operating Procedure"
  },
  {
    "scene": 2,
    "type": "stat",
    "message_type": "ABSTRACT",
    "narration": "연구에 따르면 첫 90초가 하루의 정서를 결정합니다",
    "tag": "WHY IT MATTERS",
    "number": "90",
    "unit": "SECONDS",
    "context": "아이가 유치원을 좋아할지<br>결정되는 시간",
    "video_keywords": ["asian child entering kindergarten morning", "preschool first day arrival", "parent handoff school entrance"],
    "search_layers": [
      { "layer": 1, "query": "asian child entering kindergarten morning" },
      { "layer": 2, "query": "preschool morning arrival entrance" },
      { "layer": 3, "query": "school entrance ambient morning" },
      { "layer": 4, "type": "motion_graphic", "description": "검은 배경에 큰 90 숫자가 카운트업, 뒤에 시계 바늘 천천히 회전" }
    ]
  },
  {
    "scene": 3,
    "type": "video_scenario",
    "message_type": "CONCRETE",
    "narration": "도착 즉시 비접촉 체온계로 체온을 측정합니다",
    "tag": "STEP 01",
    "caption": "<b>37.5°</b>",
    "video_keywords": ["asian teacher checking child temperature forehead", "non-contact thermometer kindergarten", "health screening preschool asian"],
    "search_layers": [
      { "layer": 1, "query": "asian teacher checking child temperature forehead" },
      { "layer": 2, "query": "non-contact thermometer kindergarten" },
      { "layer": 3, "query": "health screening preschool" },
      { "layer": 4, "type": "motion_graphic", "description": "이마 아이콘 + 체온계 아이콘 + 37.5° 숫자 강조 애니메이션" }
    ]
  },
  {
    "scene": 4,
    "type": "infographic",
    "message_type": "ABSTRACT",
    "narration": "체온 측정은 3단계로 진행합니다. 이마 중앙 3회 측정, 평균 37.5도 이상이면 격리, 보호자 즉시 연락",
    "header_tag": "Health Screening",
    "header_title": "체온 체크 <span style='color:var(--highlight)'>3단계</span>",
    "steps": [
      "비접촉 체온계로 이마 중앙 <span class='hl'>3회 측정</span>",
      "평균값이 <span class='hl'>37.5도 이상</span>이면 격리실 안내",
      "보호자에게 즉시 연락 · 원아 기록부 작성"
    ],
    "visual": "Modern educational infographic showing 3 numbered steps for health screening, soft pastel palette teal/amber, clean flat design, vertical mobile composition, with Korean text labels"
  }
]`;

      const result = await this._callLLM(provider, prompt);
      const parsed = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]');
      if (parsed.length === 0) return this._localGenerateScript(sopTitle, sopContent);

      // 씬 타입 정규화 + 폴백 처리
      parsed.forEach((scene, idx) => {
        // type 필드 누락 시 기본값
        if (!scene.type) {
          // 첫 씬과 마지막 씬은 title_card, 나머지는 video_scenario 기본
          if (idx === 0 || idx === parsed.length - 1) scene.type = 'title_card';
          else if (scene.visual && /infographic|chart|diagram|flowchart/i.test(scene.visual)) {
            scene.type = 'infographic';
          } else {
            scene.type = 'video_scenario';
          }
        }

        // search_layers 가 있고 video_keywords 가 비어있으면 layer 1~3 query를 video_keywords로 추출
        // (다운스트림 _searchPexels 는 video_keywords 배열 소비. search_layers 는 미래 motion_graphic 폴백용 보존)
        if (Array.isArray(scene.search_layers) && scene.search_layers.length > 0 &&
            (!Array.isArray(scene.video_keywords) || scene.video_keywords.length === 0)) {
          scene.video_keywords = scene.search_layers
            .filter(l => l && typeof l.query === 'string' && l.query.trim())
            .slice(0, 3)
            .map(l => l.query.trim());
        }

        // video_scenario / stat / comparison: video_keywords 누락 시 자동 생성
        if (['video_scenario', 'stat'].includes(scene.type) &&
            (!scene.video_keywords || scene.video_keywords.length === 0)) {
          scene.video_keywords = this._narrationToKeywords(scene.narration || '');
        }
        if (scene.type === 'comparison') {
          if (!scene.left_video_keywords) scene.left_video_keywords = this._narrationToKeywords(scene.left_text || scene.narration || '');
          if (!scene.right_video_keywords) scene.right_video_keywords = this._narrationToKeywords(scene.right_text || scene.narration || '');
        }

        // infographic: visual 필드 품질 검증
        if (scene.type === 'infographic') {
          if (!scene.visual || scene.visual.length < 30 ||
              /^scene\s*\d/i.test(scene.visual) ||
              /training content/i.test(scene.visual) ||
              /slide/i.test(scene.visual)) {
            scene.visual = window.ScenePrompts
              ? window.ScenePrompts.narrationToPrompt(scene.narration || '', '', { withCamera: false })
              : this._narrationToVisual(scene.narration || '', '');
          }
        }

        // title_card / stat 기본 텍스트 폴백
        if (scene.type === 'title_card') {
          if (!scene.kicker) scene.kicker = `Scene ${scene.scene || idx + 1}`;
          if (!scene.title_main) scene.title_main = (scene.narration || '').slice(0, 30);
          if (!scene.title_sub) scene.title_sub = '';
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

  // 나레이션에서 영상 검색용 영어 키워드 자동 추출 (Pexels용)
  _narrationToKeywords(narration) {
    const text = (narration || '').toLowerCase();
    const keywordMap = [
      { kw: ['체온', '열', '발열'], en: ['child temperature check kindergarten', 'thermometer scanning forehead', 'health screening preschool'] },
      { kw: ['손 씻', '손씻', '비누'], en: ['child washing hands soap', 'handwashing kindergarten', 'kids hygiene routine'] },
      { kw: ['청소', '소독'], en: ['cleaning preschool surfaces', 'disinfecting toys daycare', 'sanitizing classroom'] },
      { kw: ['인사', '환영', '맞이', '등원'], en: ['teacher greeting child morning', 'kindergarten welcome scene', 'parent dropping off child'] },
      { kw: ['아이', '어린이', '유아', '아동'], en: ['happy children playing kindergarten', 'preschool kids classroom', 'daycare children activity'] },
      { kw: ['놀이', '장난감', '놀이터'], en: ['children playing toys preschool', 'indoor playground kids', 'kids play area daycare'] },
      { kw: ['식사', '점심', '급식'], en: ['kindergarten lunch time children', 'preschool meal eating', 'kids cafeteria snack'] },
      { kw: ['수업', '학습', '교육'], en: ['kindergarten teacher lesson', 'preschool learning activity', 'children classroom education'] },
      { kw: ['선생님', '교사'], en: ['kindergarten teacher with children', 'preschool teacher classroom', 'female teacher kids'] },
      { kw: ['부모', '학부모'], en: ['parent teacher conversation school', 'mother dropping child preschool', 'parent child handoff'] },
      { kw: ['위험', '응급', '비상', '안전'], en: ['child safety preschool', 'emergency drill kindergarten', 'first aid kit kids'] },
      { kw: ['감정', '울', '달래', '진정'], en: ['comforting crying child', 'teacher hugging upset kid', 'soothing toddler kindergarten'] },
      { kw: ['고기', '구이', '바베큐', 'bbq'], en: ['korean bbq grill restaurant', 'meat grilling table', 'asian barbecue dining'] },
      { kw: ['주방', '조리', '요리'], en: ['restaurant kitchen cooking', 'chef preparing food', 'commercial kitchen staff'] },
      { kw: ['고객', '손님', '서비스'], en: ['restaurant customer service', 'waitress greeting customer', 'asian restaurant dining'] },
      { kw: ['매장', '카페', '레스토랑'], en: ['busy restaurant interior', 'cafe staff working', 'restaurant atmosphere dining'] },
    ];

    const matches = [];
    for (const m of keywordMap) {
      if (m.kw.some(k => text.includes(k))) matches.push(...m.en);
    }

    // 매칭 없으면 일반 폴백
    if (matches.length === 0) {
      return ['professional workplace training', 'employee learning scene', 'modern office setting'];
    }
    return matches.slice(0, 3); // 상위 3개
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
