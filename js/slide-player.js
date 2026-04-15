// ============================================
// Slide-based Training Video Player v2.0
// ============================================
// - Edge TTS Neural 음성 (자연스러운 사람 음성)
// - 오디오 캐싱 (한번 생성된 음성 재사용)
// - 개선된 UI/UX (부드러운 전환, 로딩 상태)
// - 프리로딩 (다음 슬라이드 음성 미리 생성)
//
// Usage:
//   SlidePlayer.open(sopId)
//   SlidePlayer.close()
//   SlidePlayer.isOpen()
// ============================================

const SlidePlayer = (() => {
  // --- State ---
  let scenes = [];
  let currentIndex = 0;
  let isPlaying = false;
  let isPaused = false;
  let sopId = null;
  let chId = null;
  let overlay = null;
  let destroyed = false;
  let autoPlay = true;
  let playSessionId = 0;  // 재생 세션 ID (씬 이동 시 이전 재생 취소용)

  // --- Audio state ---
  let currentAudio = null;       // HTMLAudioElement currently playing
  const audioCache = new Map();  // narration text hash → blob URL
  let preloadQueue = [];

  // --- Image state ---
  const imageCache = new Map();  // visual+narration hash → data URL
  let _imageApiAvailable = null; // null=unknown, true/false after first check

  // --- i18n ---
  function _lang() { return localStorage.getItem('sop_lang') || (typeof CONFIG !== 'undefined' ? CONFIG.DEFAULT_LANG : 'ko'); }

  const L = {
    ko: {
      slideOf: (c, t) => `${c} / ${t}`,
      pause: '일시정지', play: '재생', prev: '이전', next: '다음',
      close: '닫기', autoPlay: '자동 재생',
      totalDuration: '예상 소요', min: '분', sec: '초',
      visual: '시각 설명', narration: '나레이션',
      completed: '학습 완료!', completedMsg: '모든 슬라이드를 시청했습니다.',
      closeBtn: '닫기', slideTitle: (n, t) => `씬 ${n}/${t}`,
      loading: '음성 생성 중...', loadingShort: '로딩...',
      voiceReady: '음성 준비 완료',
    },
    en: {
      slideOf: (c, t) => `${c} / ${t}`,
      pause: 'Pause', play: 'Play', prev: 'Previous', next: 'Next',
      close: 'Close', autoPlay: 'Auto Play',
      totalDuration: 'Est. duration', min: 'min', sec: 'sec',
      visual: 'Visual', narration: 'Narration',
      completed: 'Training Complete!', completedMsg: 'You have viewed all slides.',
      closeBtn: 'Close', slideTitle: (n, t) => `Scene ${n}/${t}`,
      loading: 'Generating voice...', loadingShort: 'Loading...',
      voiceReady: 'Voice ready',
    },
    vi: {
      slideOf: (c, t) => `${c} / ${t}`,
      pause: 'Tam dung', play: 'Phat', prev: 'Truoc', next: 'Tiep',
      close: 'Dong', autoPlay: 'Tu dong phat',
      totalDuration: 'Thoi luong', min: 'phut', sec: 'giay',
      visual: 'Hinh anh', narration: 'Thuyet minh',
      completed: 'Hoan thanh!', completedMsg: 'Ban da xem het tat ca slide.',
      closeBtn: 'Dong', slideTitle: (n, t) => `Canh ${n}/${t}`,
      loading: 'Dang tao giong noi...', loadingShort: 'Dang tai...',
      voiceReady: 'Giong noi san sang',
    }
  };

  function t() { return L[_lang()] || L.ko; }

  function _detectTextLang(text) {
    if (!text) return null;
    const sample = text.slice(0, 200);
    // 베트남어 특수 문자 감지
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(sample)) return 'vi-VN';
    // 한글 감지
    if (/[\uAC00-\uD7AF\u3131-\u318E]/.test(sample)) return 'ko-KR';
    // 영어 (라틴 문자 위주)
    if (/^[\x00-\x7F\s.,!?;:'"()\-]+$/.test(sample.replace(/\d/g, ''))) return 'en-US';
    return null;
  }

  function _ttsLang(narrationText) {
    // 1. 나레이션 텍스트에서 자동 감지
    const detected = _detectTextLang(narrationText);
    if (detected) return detected;
    // 2. 앱 언어 설정 fallback
    const l = _lang();
    if (l === 'en') return 'en-US';
    if (l === 'vi') return 'vi-VN';
    return 'ko-KR';
  }

  function _estimateDuration(narration) {
    if (!narration) return 5;
    const l = _lang();
    const charsPerSec = l === 'ko' ? 4.5 : l === 'vi' ? 6 : 5;
    return Math.max(5, Math.ceil(narration.length / charsPerSec));
  }

  function _totalDuration() {
    return scenes.reduce((sum, s) => sum + _estimateDuration(s.narration), 0);
  }

  function _formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}${t().min} ${s}${t().sec}`;
    return `${s}${t().sec}`;
  }

  // --- Icon SVGs ---
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><polygon points="6,3 20,12 6,21"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="17,3 7,12 17,21"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="7,3 17,12 7,21"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    volume: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0012 7.5v9a4.5 4.5 0 004.5-4.5z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>',
  };

  // --- Scene background gradients ---
  const SCENE_GRADIENTS = [
    'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    'linear-gradient(135deg, #0c1220 0%, #1a2744 50%, #0c1220 100%)',
    'linear-gradient(135deg, #0f1b2d 0%, #162447 50%, #0f1b2d 100%)',
    'linear-gradient(135deg, #101a2e 0%, #1e3a5f 50%, #101a2e 100%)',
    'linear-gradient(135deg, #0d1117 0%, #21262d 50%, #0d1117 100%)',
    'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)',
  ];

  // --- Emoji visual mapping for scenes ---
  const VISUAL_EMOJI_MAP = {
    // SOP 1: 출근 및 매장 오픈
    '타이틀 화면': { emoji: '🏪', sub: ['✨', '🌅'], label: '매장 오픈' },
    '체크인 장면': { emoji: '👋', sub: ['📱', '⏰'], label: '출근 체크인' },
    '장비 점검': { emoji: '🔍', sub: ['🔧', '✅'], label: '장비 점검' },
    '청소 장면': { emoji: '🧹', sub: ['🧼', '💧'], label: '청소' },
    '최종 확인': { emoji: '📋', sub: ['🎵', '💡'], label: '최종 확인' },
    // SOP 2: 고객 응대
    '타이틀': { emoji: '📖', sub: ['🎓', '✨'], label: '교육 시작' },
    '인사 장면': { emoji: '😊', sub: ['👋', '💬'], label: '고객 인사' },
    '주문 접수': { emoji: '📝', sub: ['🎤', '✏️'], label: '주문 접수' },
    '불만 응대': { emoji: '🤝', sub: ['💭', '❤️'], label: '불만 응대' },
    '결제 처리': { emoji: '💳', sub: ['🧾', '✅'], label: '결제 처리' },
    // SOP 3: 안전/위생
    '손 씻기': { emoji: '🧴', sub: ['🫧', '💧'], label: '손 씻기' },
    '소화기 점검': { emoji: '🧯', sub: ['🔥', '🚨'], label: '소화기 점검' },
    '식품 보관': { emoji: '🧊', sub: ['🌡️', '🥗'], label: '식품 보관' },
    // SOP 4: 놀이시설
    '놀이기구 점검': { emoji: '🎠', sub: ['🔩', '🛡️'], label: '놀이기구 점검' },
    '볼풀 관리': { emoji: '⚽', sub: ['🔴', '🟡'], label: '볼풀 관리' },
    '트램펄린': { emoji: '🤸', sub: ['⬆️', '🛡️'], label: '트램펄린 점검' },
    // SOP 5: 위생 관리
    '소독': { emoji: '🧴', sub: ['🦠', '❌'], label: '소독' },
    '화장실 청소': { emoji: '🚻', sub: ['🧹', '✨'], label: '화장실 청소' },
    '쓰레기 처리': { emoji: '🗑️', sub: ['♻️', '🚛'], label: '쓰레기 처리' },
    // SOP 6: 비상 상황
    '비상 대응': { emoji: '🚨', sub: ['📞', '🏥'], label: '비상 대응' },
    '응급 처치': { emoji: '🩹', sub: ['💊', '🏥'], label: '응급 처치' },
    '대피': { emoji: '🏃', sub: ['🚪', '🧭'], label: '대피' },
    '화재': { emoji: '🔥', sub: ['🧯', '🚒'], label: '화재 대응' },
    // SOP 7: 클로징
    '정산 장면': { emoji: '💰', sub: ['🧮', '📊'], label: '정산' },
    '청소': { emoji: '🧹', sub: ['🧼', '✨'], label: '청소' },
    '잠금 확인': { emoji: '🔐', sub: ['🚪', '🔑'], label: '잠금 확인' },
    '보안 점검': { emoji: '🛡️', sub: ['📹', '🔒'], label: '보안 점검' },
    // Generic fallbacks
    '안전': { emoji: '⛑️', sub: ['🛡️', '✅'], label: '안전 관리' },
    '위생': { emoji: '🧤', sub: ['🧴', '✨'], label: '위생 관리' },
    '교육': { emoji: '📚', sub: ['🎓', '💡'], label: '교육' },
  };

  function _getVisualEmoji(visualText) {
    if (!visualText) return { emoji: '📋', sub: ['✨', '📌'], label: '' };
    // Exact match first
    if (VISUAL_EMOJI_MAP[visualText]) return VISUAL_EMOJI_MAP[visualText];
    // Partial match
    for (const [key, val] of Object.entries(VISUAL_EMOJI_MAP)) {
      if (visualText.includes(key) || key.includes(visualText)) return val;
    }
    // Keyword match
    const keywords = {
      '출근': '👋', '오픈': '🏪', '인사': '😊', '고객': '🤝', '안전': '⛑️',
      '청소': '🧹', '소독': '🧴', '점검': '🔍', '확인': '✅', '정산': '💰',
      '응급': '🩹', '비상': '🚨', '화재': '🔥', '대피': '🏃', '잠금': '🔐',
      '놀이': '🎠', '볼풀': '⚽', '음식': '🍽️', '식품': '🧊', '위생': '🧤',
      '주문': '📝', '결제': '💳', '불만': '💭', '교육': '📚', '영수': '🧾',
    };
    for (const [kw, em] of Object.entries(keywords)) {
      if (visualText.includes(kw)) return { emoji: em, sub: ['✨', '📌'], label: visualText };
    }
    return { emoji: '📋', sub: ['✨', '📌'], label: visualText };
  }

  // --- Scene accent colors ---
  const SCENE_ACCENTS = [
    { primary: '#6366f1', secondary: '#a5b4fc', bg: 'rgba(99,102,241,0.12)' },
    { primary: '#8b5cf6', secondary: '#c4b5fd', bg: 'rgba(139,92,246,0.12)' },
    { primary: '#06b6d4', secondary: '#67e8f9', bg: 'rgba(6,182,212,0.12)' },
    { primary: '#10b981', secondary: '#6ee7b7', bg: 'rgba(16,185,129,0.12)' },
    { primary: '#f59e0b', secondary: '#fcd34d', bg: 'rgba(245,158,11,0.12)' },
    { primary: '#ef4444', secondary: '#fca5a5', bg: 'rgba(239,68,68,0.12)' },
  ];

  // =========================================
  // Build overlay DOM
  // =========================================
  function _buildOverlay() {
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'slidePlayerOverlay';
    overlay.innerHTML = `
      <style>
        #slidePlayerOverlay {
          position: fixed; inset: 0; z-index: 100000;
          background: ${SCENE_GRADIENTS[0]};
          display: flex; flex-direction: column;
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #f1f5f9; overflow: hidden;
          animation: sp-fadeIn 0.35s ease;
          transition: background 0.8s ease;
        }
        @keyframes sp-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sp-slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* AI Image visual area */
        @keyframes sp-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes sp-imgReveal { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
        @keyframes sp-skeletonPulse { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        .sp-scene-visual {
          width: 100%;
          border-radius: 16px; overflow: hidden;
          position: relative;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          min-height: 200px;
        }
        .sp-scene-visual img {
          width: 100%; height: auto; max-height: 70vh;
          object-fit: cover; display: block; margin: 0 auto;
          animation: sp-imgReveal 0.6s ease;
        }
        @media (max-width: 600px) {
          .sp-scene-visual { border-radius: 8px; }
          .sp-scene-visual img { max-height: 75vh; object-fit: cover; }
        }
        .sp-scene-visual .sp-img-skeleton {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: sp-skeletonPulse 1.5s ease-in-out infinite;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px;
        }
        .sp-img-skeleton-icon { font-size: 40px; opacity: 0.3; }
        .sp-img-skeleton-text { font-size: 13px; color: #94a3b8; font-weight: 500; }
        .sp-scene-visual .sp-img-error {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px;
        }
        .sp-img-error-icon { font-size: 48px; opacity: 0.4; }
        .sp-img-error-text { font-size: 12px; color: #64748b; }
        .sp-scene-label {
          font-size: 13px; font-weight: 600; color: #94a3b8;
          text-align: center; margin-top: 4px; margin-bottom: 8px;
          opacity: 0.7;
        }
        .sp-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 20px; flex-shrink: 0;
          background: rgba(0,0,0,0.3);
        }
        .sp-topbar-left { display: flex; align-items: center; gap: 12px; }
        .sp-close-btn {
          background: rgba(255,255,255,0.1); border: none; color: #f1f5f9;
          width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .sp-close-btn:hover { background: rgba(255,255,255,0.2); }
        .sp-title-text { font-size: 15px; font-weight: 600; opacity: 0.9; }
        .sp-duration-badge {
          font-size: 12px; padding: 4px 10px; border-radius: 20px;
          background: rgba(99,102,241,0.3); color: #a5b4fc;
        }

        .sp-slide-area {
          flex: 1; display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 20px 24px; overflow-y: auto;
          position: relative;
        }

        .sp-slide-container {
          width: 100%; max-width: 600px;
          animation: sp-slideUp 0.45s ease;
        }
        @media (max-width: 600px) {
          .sp-slide-container { max-width: 100%; padding: 0 4px; }
        }

        /* Scene badge */
        .sp-scene-badge {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 700;
          padding: 6px 16px; border-radius: 20px;
          margin-bottom: 16px; letter-spacing: 0.5px;
          transition: all 0.3s ease;
        }

        /* Step indicator dots */
        .sp-step-dots {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 20px; justify-content: center;
        }
        .sp-step-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(255,255,255,0.15); transition: all 0.3s ease;
          cursor: pointer;
        }
        .sp-step-dot.active { width: 24px; border-radius: 4px; }
        .sp-step-dot.done { background: rgba(255,255,255,0.35); }

        /* Narration area */
        .sp-narration-area {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 28px 28px 24px;
          margin-bottom: 16px; position: relative;
          transition: border-color 0.3s ease;
        }
        .sp-narration-area.speaking {
          border-color: rgba(99,102,241,0.3);
        }
        .sp-narration-label {
          position: absolute; top: -10px; left: 20px;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          padding: 2px 10px; border-radius: 4px; letter-spacing: 1px;
          display: flex; align-items: center; gap: 5px;
          transition: all 0.3s ease;
        }
        .sp-narration-text {
          font-size: 20px; line-height: 1.9; color: #e2e8f0;
          font-weight: 400; word-break: keep-all;
        }

        @media (max-width: 600px) {
          .sp-narration-text { font-size: 17px; line-height: 1.7; }
          .sp-narration-area { padding: 22px 18px 18px; }
          .sp-slide-area { padding: 12px 14px; }
        }

        /* Visual description */
        .sp-visual-area {
          display: flex; align-items: flex-start; gap: 10px;
          border-radius: 12px; padding: 14px 18px;
          margin-bottom: 16px; transition: all 0.3s ease;
        }
        .sp-visual-icon { flex-shrink: 0; margin-top: 2px; }
        .sp-visual-text {
          font-size: 14px; font-style: italic; line-height: 1.5; opacity: 0.7;
        }

        /* Loading overlay */
        .sp-loading-overlay {
          position: absolute; inset: 0;
          background: rgba(15,23,42,0.7);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          z-index: 5; backdrop-filter: blur(4px);
          animation: sp-fadeIn 0.2s ease;
        }
        .sp-loading-spinner {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #6366f1;
          animation: sp-spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes sp-spin { to { transform: rotate(360deg); } }
        .sp-loading-text {
          font-size: 14px; color: #94a3b8; font-weight: 500;
        }

        /* Bottom controls */
        .sp-controls {
          flex-shrink: 0; background: rgba(0,0,0,0.5);
          backdrop-filter: blur(10px); padding: 10px 20px 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .sp-progress-wrap {
          width: 100%; height: 4px; background: rgba(255,255,255,0.1);
          border-radius: 2px; margin-bottom: 10px; cursor: pointer;
          position: relative;
        }
        .sp-progress-wrap:hover { height: 6px; }
        .sp-progress-fill {
          height: 100%; border-radius: 2px;
          transition: width 0.3s ease;
          position: relative;
        }
        .sp-progress-fill::after {
          content: ''; position: absolute; right: -5px; top: 50%;
          transform: translateY(-50%); width: 12px; height: 12px;
          border-radius: 50%;
          opacity: 0; transition: opacity 0.2s;
        }
        .sp-progress-wrap:hover .sp-progress-fill::after { opacity: 1; }

        /* Audio progress bar (within current slide) */
        .sp-audio-progress-wrap {
          width: 100%; height: 3px; background: rgba(255,255,255,0.06);
          border-radius: 2px; margin-bottom: 8px; overflow: hidden;
        }
        .sp-audio-progress-fill {
          height: 100%; width: 0%; border-radius: 2px;
          transition: width 0.2s linear;
          background: rgba(255,255,255,0.2);
        }

        .sp-btn-row {
          display: flex; align-items: center; justify-content: space-between;
        }
        .sp-btn-group { display: flex; align-items: center; gap: 8px; }

        .sp-ctrl-btn {
          background: none; border: none; color: #cbd5e1;
          cursor: pointer; padding: 8px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .sp-ctrl-btn:hover { color: #f1f5f9; background: rgba(255,255,255,0.1); }
        .sp-ctrl-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .sp-ctrl-btn.sp-play-btn {
          width: 44px; height: 44px;
        }

        .sp-slide-counter {
          font-size: 13px; color: #94a3b8; font-weight: 600;
          min-width: 60px; text-align: center;
        }

        .sp-autoplay-toggle {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: #94a3b8; cursor: pointer;
          background: none; border: none; padding: 4px 8px;
        }
        .sp-autoplay-toggle:hover { color: #e2e8f0; }
        .sp-autoplay-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #475569; transition: background 0.2s;
        }
        .sp-autoplay-dot.active { background: #22c55e; }

        /* Voice status */
        .sp-voice-status {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 500;
          padding: 3px 10px; border-radius: 12px;
          transition: all 0.3s ease;
        }
        .sp-voice-status.speaking {
          color: #a5b4fc; background: rgba(99,102,241,0.15);
        }
        .sp-voice-status.loading {
          color: #fbbf24; background: rgba(251,191,36,0.1);
          animation: sp-pulse 1.5s ease infinite;
        }
        .sp-voice-status.ready {
          color: #6ee7b7; background: rgba(16,185,129,0.1);
        }

        /* TTS wave animation */
        .sp-tts-wave {
          display: flex; align-items: flex-end; gap: 2px; height: 14px;
        }
        .sp-tts-wave-bar {
          width: 3px; border-radius: 1px;
          animation: sp-waveAnim 0.6s ease-in-out infinite alternate;
        }
        .sp-tts-wave-bar:nth-child(1) { height: 5px; animation-delay: 0s; }
        .sp-tts-wave-bar:nth-child(2) { height: 10px; animation-delay: 0.1s; }
        .sp-tts-wave-bar:nth-child(3) { height: 3px; animation-delay: 0.2s; }
        .sp-tts-wave-bar:nth-child(4) { height: 8px; animation-delay: 0.3s; }
        .sp-tts-wave-bar:nth-child(5) { height: 6px; animation-delay: 0.4s; }
        @keyframes sp-waveAnim {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
        .sp-tts-wave.paused .sp-tts-wave-bar { animation-play-state: paused; }

        /* Completion overlay */
        .sp-complete-overlay {
          position: absolute; inset: 0;
          background: rgba(15,23,42,0.95);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          z-index: 10; animation: sp-fadeIn 0.4s ease;
        }
        .sp-complete-icon { font-size: 64px; margin-bottom: 16px; }
        .sp-complete-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #a5b4fc; }
        .sp-complete-msg { font-size: 15px; color: #94a3b8; margin-bottom: 24px; }
        .sp-complete-btn {
          padding: 14px 40px; border-radius: 12px; font-size: 16px; font-weight: 700;
          border: none; cursor: pointer; color: white;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          transition: transform 0.15s;
        }
        .sp-complete-btn:hover { transform: scale(1.03); }
      </style>

      <div class="sp-topbar">
        <div class="sp-topbar-left">
          <button class="sp-close-btn" id="spCloseBtn" title="${t().close}">${ICONS.close}</button>
          <span class="sp-title-text" id="spTopTitle"></span>
        </div>
        <span class="sp-duration-badge" id="spDurationBadge"></span>
      </div>

      <div class="sp-slide-area" id="spSlideArea">
        <div class="sp-slide-container" id="spSlideContainer"></div>
      </div>

      <div class="sp-controls">
        <div class="sp-audio-progress-wrap">
          <div class="sp-audio-progress-fill" id="spAudioProgress"></div>
        </div>
        <div class="sp-progress-wrap" id="spProgressWrap">
          <div class="sp-progress-fill" id="spProgressFill" style="width:0%"></div>
        </div>
        <div class="sp-btn-row">
          <div class="sp-btn-group">
            <button class="sp-ctrl-btn" id="spPrevBtn" title="${t().prev}">${ICONS.prev}</button>
            <button class="sp-ctrl-btn sp-play-btn" id="spPlayBtn">${ICONS.play}</button>
            <button class="sp-ctrl-btn" id="spNextBtn" title="${t().next}">${ICONS.next}</button>
            <span class="sp-slide-counter" id="spCounter">1 / 1</span>
          </div>
          <div class="sp-btn-group">
            <span class="sp-voice-status" id="spVoiceStatus" style="display:none;"></span>
            <button class="sp-autoplay-toggle" id="spAutoToggle">
              <span class="sp-autoplay-dot active" id="spAutoDot"></span>
              ${t().autoPlay}
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    _bindEvents();
  }

  // =========================================
  // Render current slide
  // =========================================
  function _renderSlide() {
    const scene = scenes[currentIndex];
    if (!scene) return;

    const container = document.getElementById('spSlideContainer');
    const total = scenes.length;
    const num = currentIndex + 1;
    const accent = SCENE_ACCENTS[currentIndex % SCENE_ACCENTS.length];

    // Update background gradient
    if (overlay) {
      overlay.style.background = SCENE_GRADIENTS[currentIndex % SCENE_GRADIENTS.length];
    }

    // Build step dots
    const dotsHtml = scenes.map((_, i) => {
      const cls = i === currentIndex ? 'active' : (i < currentIndex ? 'done' : '');
      const bg = i === currentIndex ? accent.primary : '';
      return `<div class="sp-step-dot ${cls}" data-idx="${i}" style="${bg ? `background:${bg}` : ''}"></div>`;
    }).join('');

    // Build narration as flowing paragraph (NOT bullet points)
    const narrationText = _escHtml(scene.narration || '');

    container.innerHTML = `
      <div class="sp-step-dots">${dotsHtml}</div>
      <div class="sp-scene-badge" style="color:${accent.secondary};background:${accent.bg}">
        ${t().slideTitle(num, total)}
      </div>
      <div style="position:relative; width:100%;">
        <div class="sp-scene-visual" id="spSceneVisual"></div>
        <div id="spSubtitleArea" style="
          position:absolute; bottom:0; left:0; right:0;
          padding:14px 18px;
          background:linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 60%, transparent 100%);
          border-radius:0 0 12px 12px;
          min-height:48px;
          display:flex; align-items:flex-end; justify-content:center;
          pointer-events:none;
        ">
          <div id="spSubtitleText" style="
            color:#F8FAFC; font-weight:500; letter-spacing:0.3px;
            line-height:1.6; text-align:center; word-break:keep-all;
            opacity:0; transition:opacity 0.4s ease;
            padding:4px 8px;
            font-size:14px;
            text-shadow:0 1px 4px rgba(0,0,0,0.8);
          "></div>
        </div>
      </div>
    `;

    // 사전 생성된 이미지가 있으면 즉시 표시, 없으면 API 호출
    if (scene.imageUrl) {
      const vis = document.getElementById('spSceneVisual');
      if (vis) vis.innerHTML = `<img src="${scene.imageUrl}" style="width:100%;height:auto;max-height:75vh;object-fit:cover;display:block;margin:0 auto;border-radius:8px;" alt="scene">`;
    } else {
      _currentImagePromise = _loadSceneImage(scene.visual, scene.narration);
      _preloadNextImage();
    }

    // 자막 즉시 표시 — 첫 청크를 바로 보여주고, 이후 자동 전환
    const subtitleEl = document.getElementById('spSubtitleText');
    if (subtitleEl && scene.narration) {
      const chunks = _splitToChunks(scene.narration);
      const firstChunk = chunks[0] || scene.narration.slice(0, SUBTITLE_MAX_CHARS);
      subtitleEl.textContent = firstChunk;
      subtitleEl.style.fontSize = _subtitleFontSize(firstChunk);
      subtitleEl.style.opacity = '1';
    }
    // 청크 단위 자동 전환 (오디오 재생 시 동기화로 대체됨)
    _startSubtitles(scene.narration, Math.max(scene.narration.length * 0.09, 8));

    // Re-trigger animation
    container.style.animation = 'none';
    container.offsetHeight;
    container.style.animation = '';

    // Update progress fill color
    const progressFill = document.getElementById('spProgressFill');
    if (progressFill) {
      progressFill.style.background = `linear-gradient(90deg, ${accent.primary}, ${accent.secondary})`;
      progressFill.style.width = (num / total * 100) + '%';
      // Also update the dot after
      const style = `background:${accent.secondary}`;
      progressFill.style.setProperty('--dot-color', accent.secondary);
    }

    // Update counter
    document.getElementById('spCounter').textContent = t().slideOf(num, total);

    // Button states
    document.getElementById('spPrevBtn').disabled = currentIndex === 0;

    // 이벤트 위임 — container 레벨에서 한번만 바인딩 (누적 방지)
    if (!container._dotsBound) {
      container.addEventListener('click', (e) => {
        const dot = e.target.closest('.sp-step-dot');
        if (dot && dot.dataset.idx) _goToSlide(parseInt(dot.dataset.idx));
      });
      container._dotsBound = true;
    }

    // Reset audio progress
    const audioProgress = document.getElementById('spAudioProgress');
    if (audioProgress) audioProgress.style.width = '0%';
  }

  function _escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // =========================================
  // Edge TTS Audio - Fetch & Cache
  // =========================================
  // 빠른 해시 — 앞 50자 + 길이만 사용
  const _langCache = new Map();
  function _hashText(text) {
    const key = text.length + '_' + (text.slice(0, 50));
    if (!_langCache.has(key)) _langCache.set(key, _ttsLang(text));
    return _langCache.get(key) + '_' + key;
  }

  // 저장된 TTS 설정 로드
  function _getTtsSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('sop_tts_settings') || 'null');
      return {
        gender: saved?.ttsGender || 'female',
        rate: saved?.ttsRate || '+0%',
        pitch: saved?.ttsPitch || '+0Hz',
      };
    } catch (e) { return { gender: 'female', rate: '+0%', pitch: '+0Hz' }; }
  }

  async function _fetchTTSAudio(text) {
    if (!text || text.trim().length === 0) return null;

    const cacheKey = _hashText(text);
    if (audioCache.has(cacheKey)) {
      return audioCache.get(cacheKey);
    }

    try {
      const lang = _ttsLang(text);
      const ttsSettings = _getTtsSettings();
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          lang: lang,
          gender: ttsSettings.gender,
          rate: ttsSettings.rate,
          pitch: ttsSettings.pitch,
        }),
      });

      if (!res.ok) {
        console.warn(`TTS API returned ${res.status}`);
        return null;
      }

      const blob = await res.blob();
      if (blob.size < 100) {
        console.warn('TTS returned empty audio');
        return null;
      }

      const url = URL.createObjectURL(blob);
      audioCache.set(cacheKey, url);
      return url;
    } catch (e) {
      console.warn('Edge TTS fetch failed:', e.message);
      return null;
    }
  }

  // Preload next slide's audio
  function _preloadNext() {
    const nextIdx = currentIndex + 1;
    if (nextIdx < scenes.length && scenes[nextIdx]?.narration) {
      const cacheKey = _hashText(scenes[nextIdx].narration);
      if (!audioCache.has(cacheKey)) {
        _fetchTTSAudio(scenes[nextIdx].narration).catch(() => {});
      }
    }
  }

  // =========================================
  // AI Image generation
  // =========================================
  function _imageHashKey(visual, narration) {
    let h = 0;
    const str = (visual || '') + '|' + (narration || '').slice(0, 60);
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return 'img_' + h;
  }

  const MAX_CACHE_SIZE = 30;

  function _loadImageCache() {
    imageCache.clear();
  }

  function _saveImageCache() {
    // 캐시 크기 제한
    if (imageCache.size > MAX_CACHE_SIZE) {
      const keys = [...imageCache.keys()];
      for (let i = 0; i < keys.length - MAX_CACHE_SIZE; i++) {
        imageCache.delete(keys[i]);
      }
    }
  }

  const _videoFailedSet = new Set();
  const _videoPending = new Map();
  let _clipRotationTimer = null; // timer for rotating clips
  let _currentImagePromise = null; // promise for current scene's image loading

  // Poll video status until complete (max ~3 min)
  async function _pollVideoStatus(requestId, maxAttempts = 36) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', requestId }),
        });
        const data = await res.json();

        if (data.status === 'Succeed' || data.status === 'Success') {
          const videoUrl = data.results?.videos?.[0]?.url || data.video?.url || data.videoURL;
          if (videoUrl) return videoUrl;
        }
        if (data.status === 'Failed' || data.status === 'Error') {
          throw new Error('Video generation failed');
        }
        console.log(`[Video] Polling ${requestId}: ${data.status || 'pending'} (${i + 1}/${maxAttempts})`);
      } catch (e) {
        if (i >= maxAttempts - 1) throw e;
      }
    }
    throw new Error('Video generation timed out');
  }

  // Generate images via FLUX (instant, no polling needed)
  let _currentImageAbort = null;  // 현재 이미지 요청 취소용

  async function _fetchSceneClips(visual, narration) {
    if (_imageApiAvailable === false) return [];

    const cacheKey = _imageHashKey(visual, narration) + '_multi';
    if (imageCache.has(cacheKey)) {
      const cached = imageCache.get(cacheKey);
      if (typeof cached === 'string') return [cached];
      return cached;
    }
    if (_videoFailedSet.has(cacheKey)) return [];
    if (_videoPending.has(cacheKey)) return _videoPending.get(cacheKey);

    // 이전 이미지 요청 취소
    if (_currentImageAbort) _currentImageAbort.abort();
    _currentImageAbort = new AbortController();
    const signal = _currentImageAbort.signal;

    const promise = (async () => {
      try {
        const statusEl = document.getElementById('spVideoStatus');
        if (statusEl) statusEl.textContent = 'AI 이미지 생성 중...';

        const res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-multi',
            visual,
            narration,
            sceneIndex: currentIndex,
            totalScenes: scenes.length,
          }),
          signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 500 && (err.error || '').includes('API_KEY')) {
            _imageApiAvailable = false;
          }
          throw new Error(err.error || `API ${res.status}`);
        }

        _imageApiAvailable = true;
        const data = await res.json();

        // FLUX returns images directly (no polling)
        const urls = (data.images || [])
          .filter(img => img.imageUrl)
          .map(img => img.imageUrl);

        if (urls.length > 0) {
          imageCache.set(cacheKey, urls);
          _saveImageCache();
          if (statusEl) statusEl.textContent = `이미지 ${urls.length}장 완료`;
          return urls;
        }

        _videoFailedSet.add(cacheKey);
        return [];
      } catch (e) {
        console.warn('[Image] Generation failed:', e.message);
        _videoFailedSet.add(cacheKey);
        return [];
      } finally {
        _videoPending.delete(cacheKey);
      }
    })();

    _videoPending.set(cacheKey, promise);
    return promise;
  }

  // Preload clips for next slide
  function _preloadNextImage() {
    const nextIdx = currentIndex + 1;
    if (nextIdx < scenes.length) {
      const next = scenes[nextIdx];
      // 사전 저장된 이미지가 있으면 프리로드만 (API 호출 안 함)
      if (next.imageUrl) {
        const img = new Image();
        img.src = next.imageUrl;
        return;
      }
      // 저장된 이미지 없으면 API도 호출하지 않음 (그라디언트 배경 사용)
    }
  }

  // Stop clip rotation
  function _stopClipRotation() {
    if (_clipRotationTimer) {
      clearInterval(_clipRotationTimer);
      _clipRotationTimer = null;
    }
    // 이미지 요청 취소
    if (_currentImageAbort) {
      _currentImageAbort.abort();
      _currentImageAbort = null;
    }
  }

  // Start rotating between images with crossfade
  function _startClipRotation(container, urls) {
    _stopClipRotation();
    if (!urls || urls.length <= 1) return;

    let clipIndex = 0;
    const duration = 6000; // rotate every 6 seconds

    _clipRotationTimer = setInterval(() => {
      clipIndex = (clipIndex + 1) % urls.length;
      const nextUrl = urls[clipIndex];

      // Create new image with crossfade
      const existing = container.querySelector('img');
      const newImg = document.createElement('img');
      newImg.src = nextUrl;
      newImg.alt = 'scene';
      newImg.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:12px;position:absolute;top:0;left:0;opacity:0;transition:opacity 1.2s ease;';

      container.style.position = 'relative';
      container.appendChild(newImg);

      newImg.onload = () => {
        newImg.style.opacity = '1';
        // Remove old image after transition
        setTimeout(() => {
          if (existing && existing.parentNode === container) {
            container.removeChild(existing);
          }
          newImg.style.position = '';
        }, 1300);
      };
    }, duration);
  }

  // Load and display image for current scene
  async function _loadSceneImage(visual, narration) {
    const container = document.getElementById('spSceneVisual');
    if (!container) return;
    const mySession = playSessionId;

    _stopClipRotation();

    // 1순위: 씬에 사전 저장된 이미지 (관리자가 확정한 이미지)
    const scene = scenes?.[currentIndex];
    if (scene?.imageUrl) {
      container.innerHTML = `<img src="${scene.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" alt="scene" onerror="this.parentNode.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;color:white;font-size:48px;\\'>📚</div>'">`;
      _preloadNextImage();
      return;
    }

    // 이미지 없음 — 기본 배경 표시 (API 호출 없음)
    const vis = _getVisualEmoji(visual);
    container.innerHTML = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
        background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;color:white;text-align:center;padding:40px;">
        <div style="font-size:64px;margin-bottom:16px;">${vis.emoji}</div>
        <div style="font-size:14px;opacity:0.8;">씬 ${(currentIndex||0)+1}</div>
      </div>
    `;
  }

  // =========================================
  // Audio playback
  // =========================================
  // ===== 자막 시스템 (읽기 좋은 크기 + 공간 활용) =====
  let _subtitleTimer = null;
  const SUBTITLE_MAX_CHARS = 40; // 한 화면에 보여줄 최대 글자

  // 나레이션을 읽기 좋은 청크로 분할 (의미 단위)
  function _splitToChunks(text) {
    const sentences = text.match(/[^.!?。]+[.!?。]?\s*/g) || [text];
    const chunks = [];

    sentences.forEach(sent => {
      const s = sent.trim();
      if (!s) return;

      if (s.length <= SUBTITLE_MAX_CHARS) {
        chunks.push(s);
      } else {
        // 의미 단위로 분할: 쉼표, 접속사, 조사+쉼표 기준
        const splitPoints = /(?<=,\s)|(?<=\s(?:그리고|하지만|또한|특히|즉|이것은|왜냐하면|결국|따라서|그래서|그런데|이때|여기서|실제로)\s)|(?<=다\.\s)|(?<=니다\.\s)/;
        const parts = s.split(splitPoints);
        let current = '';
        parts.forEach(part => {
          if ((current + part).length <= SUBTITLE_MAX_CHARS) {
            current += part;
          } else {
            if (current.trim()) chunks.push(current.trim());
            current = part;
          }
        });
        if (current.trim()) chunks.push(current.trim());
      }
    });

    return chunks.length > 0 ? chunks : [text.slice(0, SUBTITLE_MAX_CHARS)];
  }

  // 글자 수 + 화면 폭에 따른 동적 폰트 크기 (공간 잘 쓰기)
  function _subtitleFontSize(text) {
    const len = text.length;
    const isMobile = window.innerWidth <= 600;
    if (isMobile) {
      if (len <= 12) return '17px';
      if (len <= 20) return '16px';
      if (len <= 30) return '15px';
      return '14px';
    }
    // PC — 더 크게
    if (len <= 10) return '22px';
    if (len <= 18) return '20px';
    if (len <= 28) return '18px';
    if (len <= 38) return '16px';
    return '15px';
  }

  function _startSubtitles(narrationText, durationSec) {
    _stopSubtitles();
    const subtitleEl = document.getElementById('spSubtitleText');
    if (!subtitleEl || !narrationText) return;

    const chunks = _splitToChunks(narrationText);
    const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
    const duration = (durationSec || Math.max(narrationText.length * 0.08, 5)) * 1000;

    let chunkIdx = 0;

    function showNext() {
      if (chunkIdx >= chunks.length) {
        // 마지막 청크는 유지 (사라지지 않음)
        return;
      }
      const chunk = chunks[chunkIdx];
      const fontSize = _subtitleFontSize(chunk);

      // 페이드 전환 효과
      subtitleEl.style.opacity = '0';
      setTimeout(() => {
        subtitleEl.textContent = chunk;
        subtitleEl.style.fontSize = fontSize;
        subtitleEl.style.opacity = '1';
      }, 150);

      const chunkDuration = (chunk.length / totalChars) * duration;
      chunkIdx++;
      _subtitleTimer = setTimeout(showNext, Math.max(chunkDuration, 1200));
    }
    showNext();
  }

  function _stopSubtitles() {
    if (_subtitleTimer) { clearTimeout(_subtitleTimer); _subtitleTimer = null; }
    const el = document.getElementById('spSubtitleText');
    if (el) { el.style.opacity = '0'; }
  }

  function _playAudioFromUrl(url) {
    return new Promise((resolve, reject) => {
      if (destroyed) return reject(new Error('destroyed'));

      _stopCurrentAudio();

      currentAudio = new Audio(url);
      currentAudio.playbackRate = 1.0;

      // 프로그레스 바 — requestAnimationFrame (60fps 제한, DOM 쿼리 캐시)
      const progressBar = document.getElementById('spAudioProgress');
      let rafId = null;
      const updateProgress = () => {
        if (currentAudio && currentAudio.duration && progressBar) {
          progressBar.style.width = (currentAudio.currentTime / currentAudio.duration * 100) + '%';
        }
        if (currentAudio && !currentAudio.paused) rafId = requestAnimationFrame(updateProgress);
      };
      rafId = requestAnimationFrame(updateProgress);
      currentAudio._rafId = rafId;

      // 자막 시작: 오디오 재생과 동기화
      currentAudio.onloadedmetadata = () => {
        const scene = scenes[currentIndex];
        if (scene) _startSubtitles(scene.narration, currentAudio.duration / currentAudio.playbackRate);
      };

      currentAudio.onended = () => {
        currentAudio = null;
        _stopSubtitles();
        const bar = document.getElementById('spAudioProgress');
        if (bar) bar.style.width = '100%';
        resolve();
      };

      currentAudio.onerror = () => {
        currentAudio = null;
        resolve(); // Don't reject, continue playback
      };

      currentAudio.play().catch(() => resolve());
    });
  }

  // Web Speech API fallback (if Edge TTS unavailable)
  function _playWebSpeechFallback(text) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !text) return resolve();

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = _ttsLang(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1;

      // 한 번 선택한 음성을 고정 (씬마다 같은 목소리)
      const lang = _ttsLang(text);
      if (!SlidePlayer._fixedVoices) SlidePlayer._fixedVoices = {};
      if (!SlidePlayer._fixedVoices[lang]) {
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v =>
          v.lang === lang && (v.name.includes('Online') || v.name.includes('Neural') || v.name.includes('Natural'))
        );
        const fallback = voices.find(v => v.lang === lang) ||
                          voices.find(v => v.lang.startsWith(lang.split('-')[0]));
        SlidePlayer._fixedVoices[lang] = preferred || fallback || null;
        if (SlidePlayer._fixedVoices[lang]) {
          console.log(`[TTS] 고정 음성: ${SlidePlayer._fixedVoices[lang].name} (${lang})`);
        }
      }
      utterance.voice = SlidePlayer._fixedVoices[lang];

      utterance.onend = () => { _stopSubtitles(); resolve(); };
      utterance.onerror = () => { _stopSubtitles(); resolve(); };

      // Web Speech용 자막 (대략적 시간 추정: 한국어 ~4.5자/초)
      const estimatedSec = text.length / 4.5;
      _startSubtitles(text, estimatedSec);

      window.speechSynthesis.speak(utterance);
    });
  }

  function _stopCurrentAudio() {
    if (currentAudio) {
      if (currentAudio._rafId) cancelAnimationFrame(currentAudio._rafId);
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    _stopSubtitles();
    // 프로그레스 바 리셋
    const bar = document.getElementById('spAudioProgress');
    if (bar) bar.style.width = '0%';
  }

  function _pauseCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  function _resumeCurrentAudio() {
    if (currentAudio) {
      currentAudio.play().catch(() => {});
    }
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  // =========================================
  // Voice status indicator
  // =========================================
  function _setVoiceStatus(status) {
    const el = document.getElementById('spVoiceStatus');
    if (!el) return;

    el.style.display = 'inline-flex';
    el.className = 'sp-voice-status';

    const accent = SCENE_ACCENTS[currentIndex % SCENE_ACCENTS.length];

    if (status === 'loading') {
      el.classList.add('loading');
      el.innerHTML = `<span class="sp-loading-text">${t().loadingShort}</span>`;
    } else if (status === 'speaking') {
      el.classList.add('speaking');
      el.innerHTML = `
        <div class="sp-tts-wave" id="spTtsWave">
          <div class="sp-tts-wave-bar" style="background:${accent.primary}"></div>
          <div class="sp-tts-wave-bar" style="background:${accent.primary}"></div>
          <div class="sp-tts-wave-bar" style="background:${accent.primary}"></div>
          <div class="sp-tts-wave-bar" style="background:${accent.primary}"></div>
          <div class="sp-tts-wave-bar" style="background:${accent.primary}"></div>
        </div>
      `;
    } else if (status === 'paused') {
      el.classList.add('speaking');
      el.innerHTML = `
        <div class="sp-tts-wave paused" id="spTtsWave">
          <div class="sp-tts-wave-bar" style="background:${accent.primary}"></div>
          <div class="sp-tts-wave-bar" style="background:${accent.primary}"></div>
          <div class="sp-tts-wave-bar" style="background:${accent.primary}"></div>
          <div class="sp-tts-wave-bar" style="background:${accent.primary}"></div>
          <div class="sp-tts-wave-bar" style="background:${accent.primary}"></div>
        </div>
      `;
    } else {
      el.style.display = 'none';
    }
  }

  // =========================================
  // Show/hide loading overlay
  // =========================================
  function _showLoading() {
    const area = document.getElementById('spSlideArea');
    if (!area || area.querySelector('.sp-loading-overlay')) return;
    const el = document.createElement('div');
    el.className = 'sp-loading-overlay';
    el.id = 'spLoadingOverlay';
    el.innerHTML = `
      <div class="sp-loading-spinner"></div>
      <div class="sp-loading-text">${t().loading}</div>
    `;
    area.appendChild(el);
  }

  function _hideLoading() {
    const el = document.getElementById('spLoadingOverlay');
    if (el) el.remove();
  }

  // =========================================
  // TTS playback for current slide
  // =========================================
  async function _playCurrentTTS() {
    if (destroyed) throw new Error('destroyed');
    const mySession = playSessionId;

    const scene = scenes[currentIndex];
    if (!scene || !scene.narration) return;

    const narrArea = document.getElementById('spNarrationArea');
    if (narrArea) narrArea.classList.add('speaking');

    const cacheKey = _hashText(scene.narration);
    const cached = audioCache.has(cacheKey);

    if (!cached) {
      _setVoiceStatus('loading');
      _showLoading();
    }

    try {
      const audioUrl = await _fetchTTSAudio(scene.narration);
      _hideLoading();

      // 씬이 바뀌었으면 재생하지 않음
      if (destroyed || mySession !== playSessionId) throw new Error('destroyed');

      if (audioUrl) {
        _setVoiceStatus('speaking');
        _preloadNext();
        _preloadNextImage();
        await _playAudioFromUrl(audioUrl);
      } else {
        _setVoiceStatus('speaking');
        await _playWebSpeechFallback(scene.narration);
      }
    } catch (e) {
      _hideLoading();
      if (e.message === 'destroyed' || mySession !== playSessionId) {
        if (narrArea) narrArea.classList.remove('speaking');
        return;
      }
      console.warn('All TTS failed, waiting:', e.message);
      await new Promise(r => setTimeout(r, _estimateDuration(scene.narration) * 1000));
    }

    if (narrArea) narrArea.classList.remove('speaking');
    _setVoiceStatus('none');
  }

  // =========================================
  // Playback control
  // =========================================
  async function _playSlide() {
    if (destroyed || isPaused) return;
    const mySession = playSessionId;  // 현재 세션 캡처
    isPlaying = true;
    _updatePlayBtn();

    try {
      await _playCurrentTTS();
    } catch (e) {
      if (e.message === 'destroyed') return;
    }

    // 씬 이동으로 세션이 바뀌었으면 이 재생 중단
    if (destroyed || isPaused || mySession !== playSessionId) return;

    // Auto-advance
    if (autoPlay && currentIndex < scenes.length - 1) {
      currentIndex++;
      _renderSlide();
      await new Promise(r => setTimeout(r, 200));
      if (!destroyed && !isPaused && mySession === playSessionId) _playSlide();
    } else if (currentIndex >= scenes.length - 1) {
      _showCompletion();
    } else {
      isPlaying = false;
      _updatePlayBtn();
    }
  }

  function _togglePlay() {
    if (isPlaying && !isPaused) {
      isPaused = true;
      playSessionId++;  // 일시정지 시 이전 체인 무효화
      _pauseCurrentAudio();
      _setVoiceStatus('paused');
      _updatePlayBtn();
    } else if (isPaused) {
      isPaused = false;
      _setVoiceStatus('speaking');
      _updatePlayBtn();
      // If audio element is paused, resume it
      if (currentAudio && currentAudio.paused) {
        _resumeCurrentAudio();
      } else {
        _playSlide();
      }
    } else {
      isPaused = false;
      _playSlide();
    }
  }

  let _goToDebounce = 0;
  function _goToSlide(idx) {
    if (idx < 0 || idx >= scenes.length) return;
    // 빠른 연타 방지 (300ms 쿨다운)
    const now = Date.now();
    if (now - _goToDebounce < 300) return;
    _goToDebounce = now;

    playSessionId++;  // 이전 _playSlide 비동기 체인 무효화
    _stopCurrentAudio();
    _stopClipRotation();
    _hideLoading();
    isPaused = false;
    isPlaying = false;
    currentIndex = idx;
    _renderSlide();
    _setVoiceStatus('none');
    const completeEl = document.querySelector('.sp-complete-overlay');
    if (completeEl) completeEl.remove();
    if (autoPlay) {
      setTimeout(() => _playSlide(), 300);
    }
  }

  function _updatePlayBtn() {
    const btn = document.getElementById('spPlayBtn');
    if (!btn) return;
    const accent = SCENE_ACCENTS[currentIndex % SCENE_ACCENTS.length];
    btn.style.background = `rgba(${_hexToRgb(accent.primary)},0.3)`;
    if (isPlaying && !isPaused) {
      btn.innerHTML = ICONS.pause;
    } else {
      btn.innerHTML = ICONS.play;
    }
  }

  function _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}` : '99,102,241';
  }

  function _showCompletion() {
    isPlaying = false;
    _updatePlayBtn();

    // Mark all videos as watched
    if (chId && typeof Progress !== 'undefined') {
      const vids = typeof SopStore !== 'undefined' ? SopStore.getVideos(chId) : [];
      vids.forEach(v => {
        if (!Progress.isVideoCompleted(v.id)) {
          Progress.completeVideo(v.id, chId);
          const user = JSON.parse(localStorage.getItem('sop_user') || 'null');
          if (user?.id && typeof SupabaseMode !== 'undefined' && SupabaseMode._ready) {
            SupabaseMode.saveVideoProgress(user.id, v.id, chId).catch(() => {});
          }
        }
      });
    }

    const area = document.getElementById('spSlideArea');
    if (!area) return;

    const completeEl = document.createElement('div');
    completeEl.className = 'sp-complete-overlay';
    completeEl.innerHTML = `
      <div class="sp-complete-icon">&#127891;</div>
      <div class="sp-complete-title">${t().completed}</div>
      <div class="sp-complete-msg">${t().completedMsg}</div>
      <button class="sp-complete-btn" id="spCompleteCloseBtn">${t().closeBtn}</button>
    `;
    area.appendChild(completeEl);

    document.getElementById('spCompleteCloseBtn').addEventListener('click', () => _close());
    document.getElementById('spProgressFill').style.width = '100%';
  }

  // =========================================
  // Progress bar click
  // =========================================
  function _handleProgressClick(e) {
    const wrap = document.getElementById('spProgressWrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetIdx = Math.min(scenes.length - 1, Math.floor(pct * scenes.length));
    _goToSlide(targetIdx);
  }

  // =========================================
  // Event binding
  // =========================================
  function _bindEvents() {
    document.getElementById('spCloseBtn').addEventListener('click', _close);
    document.getElementById('spPlayBtn').addEventListener('click', _togglePlay);
    document.getElementById('spPrevBtn').addEventListener('click', () => _goToSlide(currentIndex - 1));
    document.getElementById('spNextBtn').addEventListener('click', () => _goToSlide(currentIndex + 1));
    document.getElementById('spProgressWrap').addEventListener('click', _handleProgressClick);

    document.getElementById('spAutoToggle').addEventListener('click', () => {
      autoPlay = !autoPlay;
      const dot = document.getElementById('spAutoDot');
      if (dot) dot.classList.toggle('active', autoPlay);
    });

    // Keyboard
    overlay._keyHandler = (e) => {
      if (e.key === 'Escape') _close();
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); _togglePlay(); }
      if (e.key === 'ArrowLeft' || e.key === 'p') _goToSlide(currentIndex - 1);
      if (e.key === 'ArrowRight' || e.key === 'n') _goToSlide(currentIndex + 1);
    };
    document.addEventListener('keydown', overlay._keyHandler);

    // Touch swipe
    let touchStartX = 0;
    const area = document.getElementById('spSlideArea');
    area.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    area.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 60) {
        if (dx > 0) _goToSlide(currentIndex - 1);
        else _goToSlide(currentIndex + 1);
      }
    }, { passive: true });
  }

  // =========================================
  // Public: open / close
  // =========================================
  function _open(targetSopId) {
    sopId = targetSopId;
    chId = targetSopId;
    destroyed = false;
    currentIndex = 0;
    isPlaying = false;
    isPaused = false;
    autoPlay = true;

    if (typeof SopStore === 'undefined') {
      console.error('SlidePlayer: SopStore not available');
      return;
    }
    const sop = SopStore.getById(sopId);
    if (!sop || !sop.script || sop.script.length === 0) {
      console.error('SlidePlayer: No script found for SOP', sopId);
      return;
    }
    scenes = sop.script;

    // 매번 새로 시작 — 이전 세션 캐시 초기화
    imageCache.clear();
    audioCache.clear();
    _loadImageCache();

    _buildOverlay();

    // Title
    const titleEl = document.getElementById('spTopTitle');
    if (titleEl) {
      const lang = _lang();
      titleEl.textContent = (lang === 'en' && sop.title_en) ? sop.title_en
                          : (lang === 'vi' && sop.title_vn) ? sop.title_vn
                          : sop.title;
    }

    // Duration
    const durEl = document.getElementById('spDurationBadge');
    if (durEl) {
      durEl.textContent = `${t().totalDuration}: ~${_formatDuration(_totalDuration())}`;
    }

    _renderSlide();
    document.body.style.overflow = 'hidden';

    // Start preloading first slide audio immediately
    if (scenes[0]?.narration) {
      _fetchTTSAudio(scenes[0].narration).catch(() => {});
    }

    // Auto-start after short delay
    setTimeout(() => {
      if (!destroyed) _playSlide();
    }, 800);
  }

  function _close() {
    destroyed = true;
    _stopCurrentAudio();
    _stopClipRotation();
    _hideLoading();

    // TTS Blob URL 메모리 해제
    audioCache.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch(e) {}
    });
    audioCache.clear();

    if (overlay) {
      if (overlay._keyHandler) {
        document.removeEventListener('keydown', overlay._keyHandler);
      }
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.25s ease';
      setTimeout(() => {
        if (overlay) overlay.remove();
        overlay = null;
      }, 260);
    }

    document.body.style.overflow = '';
    isPlaying = false;
    isPaused = false;

    if (_onCloseCallback) {
      _onCloseCallback();
      _onCloseCallback = null;
    }
  }

  let _onCloseCallback = null;

  return {
    open(sid) { _open(sid); },
    close() { _close(); },
    isOpen() { return !!overlay && !destroyed; },
    onClose(fn) { _onCloseCallback = fn; },
  };
})();
