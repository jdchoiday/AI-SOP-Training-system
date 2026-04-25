// ============================================
// Sentry Browser SDK 초기화
// ============================================
// 빌드 스텝 없이 CDN 스크립트로 로드되는 방식.
// admin/index.html + chapter.html 에서 <script src="js/sentry-init.js"> 로 포함.
//
// DSN 은 window.SENTRY_DSN_BROWSER 로 주입하거나, data-sentry-dsn 속성 사용.
// DSN 이 없으면 초기화 스킵 (로컬 개발 환경 안전).
//
// 캡처 범위:
//   - JS 에러 (TypeError, ReferenceError 등)
//   - unhandled promise rejection
//   - Fetch 실패 (4xx/5xx 자동 태그)
// ============================================

(function () {
  // 중복 로드 방지
  if (window.__sentryInitialized) return;

  const dsn = window.SENTRY_DSN_BROWSER
    || document.currentScript?.getAttribute('data-sentry-dsn')
    || '';

  if (!dsn) {
    // 조용히 스킵 — 로컬/미설정 환경에서 콘솔 스팸 방지
    return;
  }

  // Sentry CDN 이 로드되지 않았으면 동적 로드
  function loadSentryCDN(cb) {
    if (window.Sentry) return cb();
    const s = document.createElement('script');
    s.src = 'https://browser.sentry-cdn.com/8.40.0/bundle.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = cb;
    s.onerror = () => console.warn('[Sentry] CDN 로드 실패');
    document.head.appendChild(s);
  }

  loadSentryCDN(function () {
    try {
      window.Sentry.init({
        dsn,
        environment: (location.hostname === 'localhost' || location.hostname.endsWith('.vercel.app'))
          ? (location.hostname === 'localhost' ? 'development' : 'preview')
          : 'production',
        release: (window.APP_VERSION || '2026-04-23e'),
        tracesSampleRate: 0.1,        // 10% 성능 샘플 (과비용 방지)
        replaysSessionSampleRate: 0,  // 세션 리플레이 끔 (프라이버시)
        replaysOnErrorSampleRate: 0.5, // 에러 발생 시 50% 리플레이
        // 민감정보 필터링
        beforeSend(event) {
          // password, token, apikey 같은 필드 제거
          try {
            const str = JSON.stringify(event);
            if (/password|apikey|api_key|token|secret/i.test(str)) {
              // 민감 필드가 있으면 request data 통째로 날림
              if (event.request && event.request.data) delete event.request.data;
            }
          } catch (e) { /* ignore */ }
          return event;
        },
        // 자주 발생하지만 무의미한 에러 차단
        ignoreErrors: [
          /ResizeObserver loop/i,
          /Non-Error promise rejection/i,
          /Load failed/i,        // 네트워크 끊김
          /cancelled/i,          // abort 된 요청
          /Script error/i,       // 크로스도메인 스크립트
        ],
      });
      window.__sentryInitialized = true;
      console.log('[Sentry] ✅ 초기화 완료');
    } catch (e) {
      console.warn('[Sentry] 초기화 실패:', e.message);
    }
  });
})();
