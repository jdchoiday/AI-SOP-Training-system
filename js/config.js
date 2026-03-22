// ============================================
// SOP Training System - 설정 파일
// ============================================

const CONFIG = {
  // === Supabase 설정 ===
  SUPABASE_URL: 'https://xbcdzkrhtjgxdwfqqugc.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable__vL6h25o1qwCs9UWBi54Sw_Zsq4uFw8',

  // === 시스템 설정 ===
  APP_NAME: 'SOP Training System',
  DEFAULT_LANG: 'ko',        // 'ko' | 'en' | 'vi'
  QUIZ_PASS_SCORE: 80,       // 퀴즈 합격 점수 (%)
  CHAPTER_PASS_SCORE: 70,    // 챕터 테스트 합격 점수 (%)
  VIDEO_COMPLETE_PERCENT: 90, // 시청 완료 인정 비율 (%)

  // === AI 설정 ===
  // 각 기능별로 제공자를 선택할 수 있습니다
  // 'local' = 무료 (자체 처리), API 키 불필요
  // 'gemini' = Google Gemini (무료 티어 가능)
  // 'openai' = OpenAI (유료, 가성비 좋음)
  // 'groq'   = Groq (무료 티어 가능, Llama 모델)
  AI: {
    // 스크립트 생성: SOP → 영상 나레이션
    scriptProvider: 'gemini',   // Gemini 무료 티어 (고품질 스크립트)

    // 퀴즈 생성: SOP → 4지선다 문제
    quizProvider: 'gemini',     // Gemini 무료 티어 (고품질 퀴즈)

    // 챗봇: 직원 SOP 질의응답
    chatProvider: 'gemini',     // Gemini 무료 티어 (고품질 챗봇)

    // TTS: 나레이션 음성
    ttsProvider: 'none',        // 'edge' 추천 (무료+고품질)

    // 영상 생성: SOP 스크립트 → 720p AI 영상
    videoProvider: 'none',      // 'wan' 추천 ($0.29/클립, 720p, 가성비 최고)
                                // 'vidu' 대안 ($0.20/클립, 빠름)

    // API 키 (사용할 제공자만 입력)
    keys: {
      gemini: 'AIzaSyBCsnJr0WTvLUa7AuZKAloafg5d97EH_VI',        // https://aistudio.google.com 에서 무료 발급
      openai: '',        // https://platform.openai.com 에서 발급 (유료)
      groq: '',          // https://console.groq.com 에서 무료 발급
      siliconflow: '',   // https://siliconflow.com 에서 발급 (Wan 영상 생성)
      vidu: '',          // Vidu API 키 (WaveSpeedAI 또는 Atlas Cloud)
    },

    // 모델 (기본값, 변경 가능)
    models: {
      gemini: 'gemini-2.0-flash',              // 무료, 빠름
      openai: 'gpt-4o-mini',                   // 가장 저렴한 OpenAI
      groq: 'llama-3.3-70b-versatile',         // 무료, 고성능
      wan: 'Wan-AI/Wan2.2-T2V-A14B',           // $0.29/클립, 720p, 추천
      wan_turbo: 'Wan-AI/Wan2.1-T2V-14B-720P', // $0.21/클립, 720p, 더 저렴
    },
  },
};

// ==========================================
// AI 제공자별 비용 비교표
// ==========================================
//
// 기능          | local(무료)  | Gemini        | GPT-4o-mini    | Groq
// --------------|------------|---------------|----------------|----------
// 스크립트 생성   | $0         | $0 (무료 티어) | ~$0.01/건       | $0 (무료)
// 퀴즈 생성      | $0         | $0 (무료 티어) | ~$0.005/건      | $0 (무료)
// 챗봇 (건당)    | $0         | $0 (무료 티어) | ~$0.001/질문    | $0 (무료)
// TTS (분당)    | -          | $0 (100만자)  | $0.015/분       | -
// 영상 (클립당)  | $0 (슬라이드) | -             | Sora $0.50      | -
//
// 영상 전용:     | Wan 2.2    | Wan 2.1 Turbo | Vidu Q3-Turbo  | Sora 2
//               | $0.29/클립  | $0.21/클립     | ~$0.20/클립     | $0.50/클립
//
// 추천 조합:
// [무비용]  local 전부 → $0/월
// [가성비]  Gemini 무료 + Edge TTS → $0/월
// [영상포함] Gemini + Edge TTS + Wan 2.2 → ~$1.50/SOP (5씬 기준)
// [고품질]  GPT-4o-mini + Google TTS + Wan 2.2 → ~$5/월 (SOP 5개, 직원 50명)
