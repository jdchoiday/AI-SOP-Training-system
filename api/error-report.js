// ============================================
// /api/error-report — 클라이언트 에러 → 관리자 이메일 알림
// ============================================
// 클라이언트 에러 트래커(js/error-tracker.js)에서 호출.
// Resend 로 관리자 이메일에 발송. 30분 쿨다운 + 같은 에러 dedupe.
//
// 필요 env:
//   RESEND_API_KEY  — https://resend.com (cron-health 와 동일 키 재사용)
//   ALERT_EMAIL     — 알림 수신 (쉼표로 복수 가능, cron-health 와 동일 변수)
//   ALERT_FROM      — 발신 (도메인 검증된 주소, 기본값 onboarding@resend.dev)
//
// ============================================

// 콜드 스타트마다 초기화 (Vercel serverless 특성)
const recentErrors = new Map(); // key: errorHash, value: { lastSentAt, count }
const COOLDOWN_MS = 30 * 60 * 1000; // 30분 쿨다운 (같은 에러 중복 발송 방지)
const HASH_TTL_MS = 24 * 60 * 60 * 1000; // 24시간 후 해시 만료

// 너무 큰 페이로드 차단 (악성/실수 방지)
const MAX_FIELD_LEN = 2000;
const MAX_TOTAL_LEN = 10000;

function truncate(s, max) {
  if (typeof s !== 'string') return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function hashError(payload) {
  // 같은 에러를 식별하기 위한 키 (메시지 + 파일 + 줄번호)
  return [
    payload.message || '',
    payload.filename || '',
    payload.lineno || '',
    payload.colno || '',
  ].join('|').slice(0, 200);
}

function cleanOldHashes() {
  const cutoff = Date.now() - HASH_TTL_MS;
  for (const [k, v] of recentErrors.entries()) {
    if (v.lastSentAt < cutoff) recentErrors.delete(k);
  }
}

async function sendEmail({ from, to, subject, html, apiKey }) {
  const recipients = to.split(',').map(e => e.trim()).filter(Boolean);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: recipients, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Resend 발송 실패');
  return data;
}

module.exports = async (req, res) => {
  // CORS (같은 도메인이지만 안전하게)
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL;
  const from = process.env.ALERT_FROM || 'onboarding@resend.dev';

  if (!apiKey || !to) {
    // env 없으면 조용히 OK 응답 (클라이언트 에러로 인한 cascading 실패 방지)
    console.warn('[error-report] RESEND_API_KEY 또는 ALERT_EMAIL 미설정 — 무시');
    return res.status(200).json({ ok: true, skipped: 'no-env' });
  }

  // 페이로드 파싱
  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'invalid json' });
  }

  // 페이로드 크기 검증
  const totalSize = JSON.stringify(body).length;
  if (totalSize > MAX_TOTAL_LEN) {
    return res.status(413).json({ error: 'payload too large' });
  }

  // 필수 필드 정리·잘라내기
  const payload = {
    message: truncate(body.message, MAX_FIELD_LEN),
    stack: truncate(body.stack, MAX_FIELD_LEN),
    filename: truncate(body.filename, 200),
    lineno: body.lineno || 0,
    colno: body.colno || 0,
    url: truncate(body.url, 300),
    userAgent: truncate(body.userAgent, 300),
    userName: truncate(body.userName, 100),
    userId: truncate(body.userId, 60),
    userBranch: truncate(body.userBranch, 60),
    userEmail: truncate(body.userEmail, 100),
    userLang: truncate(body.userLang, 10),
    appVersion: truncate(body.appVersion, 30),
    type: truncate(body.type, 30) || 'error', // 'error' | 'unhandledrejection' | 'manual'
    timestamp: body.timestamp || new Date().toISOString(),
  };

  if (!payload.message) {
    return res.status(400).json({ error: 'message required' });
  }

  // Dedupe
  cleanOldHashes();
  const hash = hashError(payload);
  const now = Date.now();
  const existing = recentErrors.get(hash);

  if (existing && (now - existing.lastSentAt) < COOLDOWN_MS) {
    // 쿨다운 중 — 카운트만 늘리고 발송 스킵
    existing.count++;
    return res.status(200).json({ ok: true, deduped: true, count: existing.count });
  }

  const occurrence = existing ? existing.count + 1 : 1;

  // 이메일 본문 작성
  const subject = `🚨 [Kiwooza] 사용자 에러 — ${payload.message.slice(0, 60)}`;
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;background:#0F172A;color:#E5E7EB;padding:24px;border-radius:12px;">
  <div style="background:linear-gradient(135deg,#DC2626,#B91C1C);border-radius:10px;padding:16px 20px;margin-bottom:18px;">
    <h2 style="margin:0;font-size:18px;color:white;">🚨 사용자 에러 발생</h2>
    <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">베타 테스트 중 클라이언트 에러가 감지되었습니다</p>
  </div>

  <h3 style="font-size:14px;color:#FCA5A5;margin:16px 0 8px;">👤 누가</h3>
  <table style="width:100%;font-size:13px;color:#CBD5E1;border-collapse:collapse;">
    <tr><td style="padding:4px 0;width:90px;color:#94A3B8;">이름</td><td><strong style="color:#F1F5F9;">${payload.userName || '(미로그인)'}</strong></td></tr>
    <tr><td style="padding:4px 0;color:#94A3B8;">이메일</td><td>${payload.userEmail || '-'}</td></tr>
    <tr><td style="padding:4px 0;color:#94A3B8;">지점</td><td>${payload.userBranch || '-'}</td></tr>
    <tr><td style="padding:4px 0;color:#94A3B8;">언어</td><td>${payload.userLang || '-'}</td></tr>
    <tr><td style="padding:4px 0;color:#94A3B8;">시각</td><td>${payload.timestamp}</td></tr>
  </table>

  <h3 style="font-size:14px;color:#FCA5A5;margin:18px 0 8px;">📍 어디서</h3>
  <table style="width:100%;font-size:13px;color:#CBD5E1;border-collapse:collapse;">
    <tr><td style="padding:4px 0;width:90px;color:#94A3B8;">URL</td><td style="word-break:break-all;">${payload.url || '-'}</td></tr>
    <tr><td style="padding:4px 0;color:#94A3B8;">파일</td><td>${payload.filename || '-'}</td></tr>
    <tr><td style="padding:4px 0;color:#94A3B8;">위치</td><td>line ${payload.lineno}, col ${payload.colno}</td></tr>
    <tr><td style="padding:4px 0;color:#94A3B8;">브라우저</td><td style="font-size:11px;">${payload.userAgent || '-'}</td></tr>
    <tr><td style="padding:4px 0;color:#94A3B8;">버전</td><td>${payload.appVersion || '-'}</td></tr>
    <tr><td style="padding:4px 0;color:#94A3B8;">타입</td><td>${payload.type}</td></tr>
  </table>

  <h3 style="font-size:14px;color:#FCA5A5;margin:18px 0 8px;">⚠️ 에러 메시지</h3>
  <pre style="background:#7F1D1D;color:#FEE2E2;padding:14px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-all;margin:0;">${payload.message}</pre>

  ${payload.stack ? `
  <h3 style="font-size:14px;color:#FCA5A5;margin:18px 0 8px;">📚 스택 트레이스</h3>
  <pre style="background:#1F2937;color:#D1D5DB;padding:14px;border-radius:8px;font-size:11px;white-space:pre-wrap;word-break:break-all;line-height:1.5;margin:0;max-height:300px;overflow:auto;">${payload.stack}</pre>
  ` : ''}

  <div style="margin-top:24px;padding:12px 14px;background:rgba(245,158,11,0.1);border-left:3px solid #F59E0B;border-radius:6px;">
    <p style="margin:0;font-size:12px;color:#FCD34D;">
      📊 같은 에러 발생 횟수 (24h): <strong>${occurrence}회</strong><br>
      ⏰ 같은 에러 30분 쿨다운 적용 — 중복 알림 차단
    </p>
  </div>

  <hr style="margin:20px 0 14px;border:0;border-top:1px solid #334155;" />
  <p style="font-size:11px;color:#64748B;text-align:center;margin:0;">
    이 알림은 /api/error-report 에 의해 자동 발송되었습니다.<br>
    Kiwooza Heroes · ${process.env.VERCEL_URL || 'localhost'}
  </p>
</div>
  `.trim();

  try {
    const result = await sendEmail({ from, to, subject, html, apiKey });
    recentErrors.set(hash, { lastSentAt: now, count: occurrence });
    return res.status(200).json({ ok: true, sent: true, id: result.id });
  } catch (e) {
    console.error('[error-report] 발송 실패:', e.message);
    return res.status(500).json({ error: 'send failed', message: e.message });
  }
};
