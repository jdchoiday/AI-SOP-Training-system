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
  QUIZ_PASS_SCORE: 70,       // 씬별 미니 퀴즈 합격 점수 (%) — 3문항 중 ≥70%
  CHAPTER_PASS_SCORE: 70,    // 챕터 종합시험 합격 점수 (%) — 20문항 중 ≥14개
  CHAPTER_EXAM_COUNT: 20,    // 챕터 종합시험 문항 수 (E2 설계)
  CERT_TIER_THRESHOLDS: { bronze: 70, silver: 80, gold: 90 }, // E6 자동 자격증 등급 (챕터 평균 점수 기준)
  VIDEO_COMPLETE_PERCENT: 90, // 시청 완료 인정 비율 (%)

  // === API Proxy 설정 ===
  // true = Vercel Edge Functions 경유 (API 키 서버 보관, 프로덕션 권장)
  // false = 브라우저에서 직접 API 호출 (로컬 개발용)
  useProxy: true,

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

    // 영상 소스: SOP 스크립트 → 다큐멘터리 영상
    videoProvider: 'pexels',    // Phase 1: Pexels 스톡 영상 (무료, 기본값)
                                // 'wan' (Wan 2.2, $0.29/클립) 또는 'vidu' ($0.20/클립) 은 AI 생성 경로

    // 2-Pass 교과서 HTML 인포그래픽 (false=기존 CSS 렌더, true=씬별 AI 생성 HTML iframe 렌더)
    // Pass 1 분석 JSON + Pass 2 9:16 HTML (8-스타일 라이브러리 + 12원칙 준수)
    // 씬당 비용 ~$0.005~0.02 (Gemini 2.5 Pro 기준), 시간 +15~25s/씬
    // 스크립트 생성 시 visual 타입(stat/comparison/infographic/iconGrid/conceptExplainer/quote/keypoint 등)에만 적용
    useTwoPassHTML: true,

    // 참고사진(Reference Photo) 생성 — 인포그래픽 위에 10초 뒤 토글되는 다큐멘터리 사진
    // false: 인포그래픽만 노출 (균일·단순·저렴), true: 인포 + 사진 토글 (다큐 느낌)
    // 베타 기간: false 권장 (씬마다 길이 달라 토글 시점이 들쑥날쑥, 비용 ~$0.03/씬 절감)
    enableReferencePhoto: false,

    // 2-Pass HTML 전용 모델 (useTwoPassHTML=true 일 때만)
    // A/B 테스트 중: Opus 4.7 → Gemini 2.5 Pro (약 8배 저렴, 품질 검증 필요)
    twoPassHTMLModel: 'gemini-2.5-pro',         // Pass 2 (HTML 디자인) — Gemini 2.5 Pro ($0.02~0.03/씬, 이전 Opus $0.15/씬)
    twoPassHTMLPass1Model: 'gemini-2.5-flash',  // Pass 1 (분석 JSON) — Flash 로 비용 절감 ($0.0015/씬)

    // API 키 (사용할 제공자만 입력)
    // API 키는 서버 환경변수(.env)에서만 관리. 클라이언트에 노출하지 않음.
    keys: {
      gemini: '',        // 서버 프록시 사용 (/api/gemini)
      openai: '',        // https://platform.openai.com 에서 발급 (유료)
      groq: '',          // https://console.groq.com 에서 무료 발급
      siliconflow: '',   // 서버 프록시 사용 (/api/image)
      vidu: '',          // Vidu API 키
    },

    // 모델 (기본값, 변경 가능)
    models: {
      gemini: 'gemini-2.5-flash',              // 무료, 빠름
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
