// ============================================
// /api/health — 시스템 상태 종합 점검
// ============================================
// 체크 항목:
//   1. Gemini API key 유효성 (1토큰 호출로 최소 비용)
//   2. Edge TTS 가용성 (짧은 샘플 1회)
//   3. Supabase REST 연결 (env 기반 체크)
//   4. 환경변수 존재 여부
//
// 응답 형식:
//   { ok: boolean, checks: {gemini, edgeTts, supabase, env}, timestamp, version }
//
// 사용:
//   - 수동: curl /api/health
//   - 자동: /api/cron-health (Vercel Cron 15분마다)
//   - 관리자 대시보드 실시간 표시
// ============================================

const HEALTH_TIMEOUT_MS = 8000; // 각 체크 8초 타임아웃

async function checkGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: 'GEMINI_API_KEY not set', durationMs: 0 };

  const started = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    // 최소 비용 호출: 1 토큰 응답만 요청
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ok' }] }],
          generationConfig: { maxOutputTokens: 1, temperature: 0 },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(t);

    const durationMs = Date.now() - started;
    if (!res.ok) {
      const body = await res.text();
      // API key 만료 등 명시적 실패 감지
      const expired = /expired|INVALID_ARGUMENT|API_KEY_INVALID/i.test(body);
      return {
        ok: false,
        error: expired ? 'API key expired or invalid' : `HTTP ${res.status}`,
        detail: body.slice(0, 200),
        expired,
        durationMs,
      };
    }
    return { ok: true, durationMs };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, error: e.message, durationMs: Date.now() - started };
  }
}

async function checkEdgeTts() {
  // Edge TTS 는 MS 엔드포인트로 WebSocket 연결을 하는데,
  // 여기서는 node-edge-tts 모듈 로드 가능 여부만 확인 (빠른 smoke test)
  const started = Date.now();
  try {
    const { EdgeTTS } = require('node-edge-tts');
    if (!EdgeTTS) throw new Error('EdgeTTS module missing');
    // 인스턴스 생성만 시도 (실제 호출은 cost 발생 + 8s 대기)
    const tts = new EdgeTTS({ voice: 'ko-KR-SunHiNeural', lang: 'ko-KR', timeout: 5000 });
    return { ok: !!tts, durationMs: Date.now() - started };
  } catch (e) {
    return { ok: false, error: e.message, durationMs: Date.now() - started };
  }
}

async function checkSupabase() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  // 환경변수 없어도 프론트엔드에 직접 주입된 경우도 있으니 경고만
  if (!url || !anonKey) {
    return { ok: false, error: 'SUPABASE_URL/ANON_KEY not set (may be injected client-side)', durationMs: 0, warnOnly: true };
  }

  const started = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    // /rest/v1/ ping — 인증 없이도 빈 응답 받음
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey },
      signal: controller.signal,
    });
    clearTimeout(t);
    return { ok: res.status < 500, status: res.status, durationMs: Date.now() - started };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, error: e.message, durationMs: Date.now() - started };
  }
}

function checkEnv() {
  const required = [
    'GEMINI_API_KEY',
  ];
  const optional = [
    'RESEND_API_KEY',    // 알림 이메일
    'ALERT_EMAIL',       // 알림 수신
    'SENTRY_DSN_SERVER', // 에러 트래킹
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]);
  const optionalMissing = optional.filter((k) => !process.env[k]);
  return {
    ok: missing.length === 0,
    missing,
    optionalMissing,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const started = Date.now();
  const [gemini, edgeTts, supabase] = await Promise.all([
    checkGemini(),
    checkEdgeTts(),
    checkSupabase(),
  ]);
  const env = checkEnv();

  // 전체 OK 조건: Gemini + Edge TTS + Supabase 모두 정상 + env 필수값 존재
  // (supabase.warnOnly 인 경우 경고만, 실패로 취급 안 함)
  const supabaseOk = supabase.ok || supabase.warnOnly;
  const ok = gemini.ok && edgeTts.ok && supabaseOk && env.ok;

  const result = {
    ok,
    timestamp: new Date().toISOString(),
    version: '2026-04-23e',
    totalDurationMs: Date.now() - started,
    checks: {
      gemini,
      edgeTts,
      supabase,
      env,
    },
  };

  return res.status(ok ? 200 : 503).json(result);
};
