// ============================================
// Error Tracker — 사용자 에러 → 관리자 이메일 알림
// ============================================
// window.onerror + unhandledrejection 잡아서 /api/error-report 로 전송.
// 같은 에러 30초 내 중복 차단 (클라이언트 측 dedupe — 서버는 30분 쿨다운).
// 민감정보 자동 필터 (password, token, apikey 등 포함된 메시지는 본문 마스킹).
// 페이지 로드 직후 즉시 작동.
// ============================================
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // 중복 초기화 방지
  if (window.__errorTrackerLoaded) return;
  window.__errorTrackerLoaded = true;

  // localhost / file:// 에서는 알림 안 보냄 (개발 노이즈 방지)
  if (location.protocol === 'file:' || location.hostname === 'localhost') return;

  // 클라이언트 측 dedupe: 같은 에러 30초 내 중복은 무시
  const SHORT_COOLDOWN_MS = 30 * 1000;
  const recent = new Map(); // hash → lastSentAt

  // 무시할 에러 패턴 (Sentry 와 같은 정책)
  const IGNORE_PATTERNS = [
    /ResizeObserver loop/i,
    /Non-Error promise rejection/i,
    /Load failed/i,            // 네트워크 끊김
    /cancelled/i,              // abort 된 요청
    /Script error\.?$/i,        // 크로스도메인 (정보 없음)
    /AbortError/i,
    /Failed to fetch/i,        // 네트워크 일시 단절
    /NetworkError/i,
    /Loading chunk \d+ failed/i, // 캐시된 구버전 청크 (배포 직후 흔함)
    /Loading CSS chunk/i,
    /The user aborted a request/i,
    /play\(\) failed because the user/i, // 자동재생 정책
    /play\(\) request was interrupted/i,
  ];

  // 민감정보 마스킹 (메시지/스택에 포함된 경우)
  const SENSITIVE_PATTERNS = [
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
    /token\s*[:=]\s*['"][^'"]+['"]/gi,
    /apikey\s*[:=]\s*['"][^'"]+['"]/gi,
    /api_key\s*[:=]\s*['"][^'"]+['"]/gi,
    /secret\s*[:=]\s*['"][^'"]+['"]/gi,
    /Bearer\s+[A-Za-z0-9._-]+/gi,
  ];

  function maskSensitive(text) {
    if (!text) return text;
    let out = String(text);
    for (const re of SENSITIVE_PATTERNS) {
      out = out.replace(re, '[REDACTED]');
    }
    return out;
  }

  function isIgnored(message) {
    const msg = String(message || '');
    return IGNORE_PATTERNS.some(p => p.test(msg));
  }

  function hashKey(message, filename, lineno) {
    return `${message || ''}|${filename || ''}|${lineno || 0}`.slice(0, 200);
  }

  function getUserContext() {
    try {
      const user = JSON.parse(localStorage.getItem('sop_user') || 'null');
      const lang = localStorage.getItem('sop_lang') || 'ko';
      return {
        userId: user?.id || '',
        userName: user?.name || '',
        userEmail: user?.email || '',
        userBranch: user?.branch || '',
        userLang: lang,
      };
    } catch {
      return { userId: '', userName: '', userEmail: '', userBranch: '', userLang: 'ko' };
    }
  }

  async function reportError(payload) {
    if (!payload || !payload.message) return;
    if (isIgnored(payload.message)) return;

    // 클라이언트 측 dedupe
    const key = hashKey(payload.message, payload.filename, payload.lineno);
    const now = Date.now();
    const last = recent.get(key) || 0;
    if (now - last < SHORT_COOLDOWN_MS) return;
    recent.set(key, now);

    // 오래된 엔트리 정리 (메모리 누수 방지)
    if (recent.size > 50) {
      const oldKeys = [...recent.entries()].filter(([, t]) => now - t > 5 * 60 * 1000).map(([k]) => k);
      oldKeys.forEach(k => recent.delete(k));
    }

    const ctx = getUserContext();
    const body = {
      message: maskSensitive(payload.message),
      stack: maskSensitive(payload.stack),
      filename: payload.filename || '',
      lineno: payload.lineno || 0,
      colno: payload.colno || 0,
      url: location.href,
      userAgent: navigator.userAgent || '',
      appVersion: window.APP_VERSION || '',
      type: payload.type || 'error',
      timestamp: new Date().toISOString(),
      ...ctx,
    };

    try {
      // keepalive: 페이지 닫히는 중에도 전송 보장
      await fetch('/api/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch (e) {
      // 보고 실패는 콘솔에만 (재귀 방지)
      console.warn('[ErrorTracker] 보고 실패:', e?.message);
    }
  }

  // ===== 이벤트 핸들러 =====

  // 일반 JS 에러
  window.addEventListener('error', (e) => {
    // 리소스 로드 에러 (이미지/스크립트 404 등) 는 e.message 가 빈 문자열 → 스킵
    if (!e.message && e.target && e.target !== window) return;
    reportError({
      type: 'error',
      message: e.message || (e.error && e.error.message) || 'Unknown error',
      stack: e.error && e.error.stack,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    });
  });

  // 미처리 Promise rejection
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    let message, stack;
    if (reason instanceof Error) {
      message = reason.message;
      stack = reason.stack;
    } else if (typeof reason === 'string') {
      message = reason;
    } else {
      try { message = JSON.stringify(reason).slice(0, 500); }
      catch { message = String(reason); }
    }
    reportError({
      type: 'unhandledrejection',
      message,
      stack,
    });
  });

  // 외부에서 수동 보고 (예: try/catch 안에서 명시적 호출)
  window.ErrorTracker = {
    report: (err, extra) => {
      reportError({
        type: 'manual',
        message: err?.message || String(err),
        stack: err?.stack,
        ...(extra || {}),
      });
    },
  };

})();
