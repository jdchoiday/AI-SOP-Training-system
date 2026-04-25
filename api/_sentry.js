// ============================================
// 서버리스 함수용 Sentry 얇은 래퍼
// ============================================
// npm install 없이 fetch 만으로 Sentry ingestion API 호출.
// @sentry/node 는 서버리스 콜드스타트 비용이 커서 대체.
//
// 사용법:
//   const { withSentry, captureError } = require('./_sentry');
//   module.exports = withSentry(async (req, res) => { ... });
//
// 환경변수:
//   SENTRY_DSN_SERVER   — 서버용 DSN (프론트용 DSN과 분리 권장)
// ============================================

function parseDsn(dsn) {
  try {
    // DSN 형식: https://PUBLIC_KEY@o123.ingest.sentry.io/PROJECT_ID
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace('/', '').replace(/\/$/, '');
    const host = u.host;
    if (!publicKey || !projectId) return null;
    return {
      publicKey,
      projectId,
      endpoint: `https://${host}/api/${projectId}/store/`,
    };
  } catch (e) {
    return null;
  }
}

async function sendToSentry(dsnInfo, payload) {
  const auth = [
    'Sentry sentry_version=7',
    `sentry_client=sop-training/1.0`,
    `sentry_key=${dsnInfo.publicKey}`,
  ].join(', ');

  try {
    await fetch(dsnInfo.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': auth,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Sentry 자체가 실패해도 앱 동작에 영향 없도록 조용히 삼킴
    console.warn('[Sentry] 전송 실패:', e.message);
  }
}

function buildPayload(err, req, extra) {
  const now = new Date().toISOString();
  // 민감 필드 마스킹
  const maskedBody = (() => {
    try {
      const clone = JSON.parse(JSON.stringify(req?.body || {}));
      const SENSITIVE = /password|api[_-]?key|secret|token|authorization/i;
      function mask(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        for (const k of Object.keys(obj)) {
          if (SENSITIVE.test(k)) obj[k] = '[REDACTED]';
          else if (typeof obj[k] === 'object') mask(obj[k]);
        }
        return obj;
      }
      return mask(clone);
    } catch (e) { return null; }
  })();

  return {
    event_id: (Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)).slice(0, 32),
    timestamp: now,
    level: 'error',
    platform: 'node',
    release: '2026-04-23e',
    environment: process.env.VERCEL_ENV || 'development',
    server_name: process.env.VERCEL_URL || 'local',
    request: req ? {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers?.['user-agent'],
        'x-forwarded-for': req.headers?.['x-forwarded-for'],
      },
      data: maskedBody,
    } : undefined,
    exception: {
      values: [{
        type: err?.name || 'Error',
        value: String(err?.message || err).slice(0, 500),
        stacktrace: err?.stack ? {
          frames: String(err.stack).split('\n').slice(1, 11).map((line) => ({
            filename: line.trim(),
          })),
        } : undefined,
      }],
    },
    tags: {
      function: req?.url?.split('?')[0] || 'unknown',
    },
    extra: extra || undefined,
  };
}

async function captureError(err, req, extra) {
  const dsn = process.env.SENTRY_DSN_SERVER;
  if (!dsn) return; // DSN 미설정 → 스킵
  const info = parseDsn(dsn);
  if (!info) {
    console.warn('[Sentry] SENTRY_DSN_SERVER 형식 오류 — 스킵');
    return;
  }
  const payload = buildPayload(err, req, extra);
  await sendToSentry(info, payload);
}

function withSentry(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (err) {
      console.error('[Handler Error]', err);
      // Sentry 비동기 전송 (응답 차단 없이)
      captureError(err, req).catch(() => {});
      if (!res.writableEnded) {
        res.status(500).json({
          error: 'Internal server error',
          message: process.env.VERCEL_ENV === 'development' ? err.message : 'An unexpected error occurred',
        });
      }
    }
  };
}

module.exports = { withSentry, captureError };
