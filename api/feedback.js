// ============================================
// /api/feedback — 베타 피드백 수집 엔드포인트
// ============================================
// POST { employee_id, employee_name, category, severity, message, page_url,
//        user_agent, viewport, metadata }
// → 200 { ok: true, id }
// ============================================

const { withSentry, captureError } = require('./_sentry');
const { rateLimit } = require('./_ratelimit');

// 스팸 방지 — IP 당 분당 10건 까지
const feedbackGate = rateLimit({ key: 'feedback', limit: 10, windowMs: 60_000 });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const ALLOWED_CATEGORIES = ['bug', 'suggestion', 'content', 'ux', 'general'];
const ALLOWED_SEVERITIES = ['low', 'normal', 'high', 'critical'];
const MAX_MESSAGE_LEN = 4000;

// 중복 스팸 방지 — 같은 사번 + 같은 메시지 해시 10초 내 차단
const recentSubmissions = new Map(); // key: `${employee_id}:${hash}` → timestamp
const DEDUPE_WINDOW_MS = 10_000;

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h.toString(16);
}

function cleanString(v, max = 500) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

async function handler(req, res) {
  // CORS — 같은 도메인에서만 호출되지만 혹시 몰라 명시
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!feedbackGate(req, res)) return;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ ok: false, error: 'Supabase 환경변수 미설정' });
  }

  // Body 파싱 (Vercel 은 자동 파싱되지만 안전하게)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {
      return res.status(400).json({ ok: false, error: '잘못된 JSON' });
    }
  }
  body = body || {};

  const message = cleanString(body.message, MAX_MESSAGE_LEN);
  if (!message) {
    return res.status(400).json({ ok: false, error: '내용을 입력해주세요' });
  }

  const category = ALLOWED_CATEGORIES.includes(body.category) ? body.category : 'general';
  const severity = ALLOWED_SEVERITIES.includes(body.severity) ? body.severity : 'normal';

  const employee_id = cleanString(body.employee_id, 50);
  const employee_name = cleanString(body.employee_name, 100);
  const page_url = cleanString(body.page_url, 500);
  const user_agent = cleanString(body.user_agent, 500)
    || cleanString(req.headers?.['user-agent'], 500);
  const viewport = cleanString(body.viewport, 20);

  let metadata = body.metadata;
  if (metadata && typeof metadata === 'object') {
    try {
      const str = JSON.stringify(metadata);
      if (str.length > 8000) metadata = { _truncated: true };
    } catch (e) {
      metadata = null;
    }
  } else {
    metadata = null;
  }

  // 중복 제출 차단
  const dedupeKey = `${employee_id || 'anon'}:${simpleHash(message)}`;
  const now = Date.now();
  const last = recentSubmissions.get(dedupeKey);
  if (last && (now - last) < DEDUPE_WINDOW_MS) {
    return res.status(429).json({ ok: false, error: '잠시 후 다시 시도해주세요' });
  }
  recentSubmissions.set(dedupeKey, now);
  // 맵 크기 제한 — 콜드스타트마다 초기화되지만 warm 인스턴스 누수 방지
  if (recentSubmissions.size > 500) {
    const cutoff = now - DEDUPE_WINDOW_MS;
    for (const [k, t] of recentSubmissions) {
      if (t < cutoff) recentSubmissions.delete(k);
    }
  }

  const record = {
    employee_id,
    employee_name,
    category,
    severity,
    message,
    page_url,
    user_agent,
    viewport,
    metadata,
    status: 'new',
  };

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/beta_feedback`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(record),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[feedback] Supabase insert 실패:', resp.status, errText);
      captureError(new Error(`Supabase insert ${resp.status}: ${errText}`), req, { record }).catch(() => {});
      return res.status(502).json({ ok: false, error: '저장 실패 (잠시 후 재시도)' });
    }

    const rows = await resp.json();
    const inserted = Array.isArray(rows) ? rows[0] : rows;

    return res.status(200).json({
      ok: true,
      id: inserted?.id,
      created_at: inserted?.created_at,
    });
  } catch (e) {
    console.error('[feedback] 예외:', e);
    captureError(e, req, { record }).catch(() => {});
    return res.status(500).json({ ok: false, error: '서버 오류' });
  }
}

module.exports = withSentry(handler);
