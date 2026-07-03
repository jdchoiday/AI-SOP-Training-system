// ============================================
// /api/cron-health — Vercel Cron 자동 호출 + Web Push 허브
// ============================================
// vercel.json 의 crons 설정에 의해 매일 1회 실행 (Hobby 플랜 제약).
// 더 잦은 모니터링이 필요하면 외부 cron-job.org 등으로 ?force=1 호출.
// /api/health 호출 → 실패 시 Resend 로 관리자 이메일 발송.
//
// ★ Web Push 통합 (Vercel Hobby 12 함수 한도 → 별도 함수 대신 여기에 통합)
//   vercel.json rewrite: /api/push → /api/cron-health
//   POST { action: 'push-subscribe', employeeId, subscription, lang }  — 구독 저장
//   POST { action: 'push-notify', type:'praise', to, fromName }        — 칭찬 즉시 푸시
//   매일 cron 실행 시: 헬스체크 + 전체 구독자 아침 학습 리마인드 푸시
//
// 필요 env:
//   CRON_SECRET          — Vercel Cron 인증 (자동 설정)
//   RESEND_API_KEY       — https://resend.com (무료 월 3,000건)
//   ALERT_EMAIL          — 알림 수신 (쉼표로 복수 가능)
//   ALERT_FROM           — 발신 이메일 (도메인 검증된 주소, 기본값 onboarding@resend.dev)
//   VERCEL_URL           — 자동 주입 (현재 배포 도메인)
//   VAPID_PUBLIC_KEY     — Web Push 공개키 (js/config.js 값과 쌍)
//   VAPID_PRIVATE_KEY    — Web Push 비밀키 (클라이언트 노출 금지)
//   VAPID_SUBJECT        — mailto:관리자주소 (기본 mailto:jd.choi@kiwooza.com)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — 구독 저장소 접근
// ============================================

// ===== Web Push 헬퍼 =====
let webpush = null;
try { webpush = require('web-push'); } catch (e) { /* 미설치 시 푸시 스킵 */ }

const SB_URL = process.env.SUPABASE_URL || 'https://xbcdzkrhtjgxdwfqqugc.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function vapidReady() {
  return !!(webpush && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let _vapidInited = false;
function initVapid() {
  if (!vapidReady()) return false;
  if (!_vapidInited) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:jd.choi@kiwooza.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    _vapidInited = true;
  }
  return true;
}

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

// 구독 목록에 푸시 발송 + 만료 구독(410/404) 자동 정리
async function sendPushTo(subs, payload) {
  if (!initVapid() || !subs || subs.length === 0) return { sent: 0, removed: 0 };
  let sent = 0, removed = 0;
  const gone = [];
  await Promise.allSettled(subs.map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify(payload));
      sent++;
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) gone.push(row.endpoint);
    }
  }));
  if (gone.length > 0 && SB_KEY) {
    try {
      for (const ep of gone) {
        await sbFetch(`push_subscriptions?endpoint=eq.${encodeURIComponent(ep)}`, { method: 'DELETE' });
        removed++;
      }
    } catch (e) { /* 정리 실패 무시 */ }
  }
  return { sent, removed };
}

// 언어별 푸시 메시지 템플릿
const PUSH_MSGS = {
  daily: {
    ko: { title: '키우자 히어로즈 🌱', body: '오늘의 학습 5분이면 끝! 출석 보너스 +30 XP 받아가세요 🔥' },
    en: { title: 'Kiwooza Heroes 🌱', body: '5 minutes of learning today! Grab your +30 XP check-in bonus 🔥' },
    vi: { title: 'Kiwooza Heroes 🌱', body: 'Chỉ 5 phút học hôm nay! Nhận +30 XP điểm danh 🔥' },
  },
  praise: {
    ko: (from) => ({ title: '🙌 칭찬 도착!', body: `${from}님이 칭찬을 보냈어요! 확인해보세요.` }),
    en: (from) => ({ title: '🙌 You got praised!', body: `${from} sent you a boost! Check it out.` }),
    vi: (from) => ({ title: '🙌 Có lời khen!', body: `${from} đã gửi lời khen cho bạn!` }),
  },
};

// push-notify 남용 방지 — 같은 수신자 30초 쿨다운 (콜드스타트 시 초기화)
const notifyCooldown = new Map();

// ===== push 액션 핸들러 (POST body.action) =====
async function handlePushAction(req, res, body) {
  if (!SB_KEY) return res.status(200).json({ ok: true, skipped: 'no supabase key' });

  if (body.action === 'push-subscribe') {
    const { employeeId, subscription, lang } = body;
    if (!employeeId || !subscription?.endpoint || !String(subscription.endpoint).startsWith('https://')) {
      return res.status(400).json({ ok: false, error: 'invalid subscription' });
    }
    try {
      await sbFetch('push_subscriptions?on_conflict=endpoint', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          employee_id: employeeId,
          endpoint: subscription.endpoint,
          subscription,
          lang: ['ko', 'en', 'vi'].includes(lang) ? lang : 'ko',
          user_agent: (req.headers['user-agent'] || '').slice(0, 300),
          updated_at: new Date().toISOString(),
        }),
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[push-subscribe] 실패:', e.message);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (body.action === 'push-notify') {
    const { type, to, fromName } = body;
    if (type !== 'praise' || !to) return res.status(400).json({ ok: false, error: 'invalid notify' });
    // 수신자별 30초 쿨다운 (스팸 방지)
    const last = notifyCooldown.get(to) || 0;
    if (Date.now() - last < 30_000) return res.status(200).json({ ok: true, deduped: true });
    notifyCooldown.set(to, Date.now());
    try {
      const subs = await sbFetch(`push_subscriptions?employee_id=eq.${encodeURIComponent(to)}&select=endpoint,subscription,lang`);
      if (!subs || subs.length === 0) return res.status(200).json({ ok: true, sent: 0 });
      let totalSent = 0;
      for (const lg of ['ko', 'en', 'vi']) {
        const group = subs.filter(s => (s.lang || 'ko') === lg);
        if (group.length === 0) continue;
        const msg = PUSH_MSGS.praise[lg](String(fromName || '동료').slice(0, 40));
        const r = await sendPushTo(group, { ...msg, url: '/praise.html' });
        totalSent += r.sent;
      }
      return res.status(200).json({ ok: true, sent: totalSent });
    } catch (e) {
      console.error('[push-notify] 실패:', e.message);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(400).json({ ok: false, error: 'unknown action' });
}

// cron 실행 시 전체 구독자에게 아침 학습 리마인드
async function sendDailyPush() {
  if (!SB_KEY || !vapidReady()) return { sent: 0, skipped: 'not configured' };
  try {
    const subs = await sbFetch('push_subscriptions?select=endpoint,subscription,lang');
    if (!subs || subs.length === 0) return { sent: 0 };
    let totalSent = 0, totalRemoved = 0;
    for (const lg of ['ko', 'en', 'vi']) {
      const group = subs.filter(s => (s.lang || 'ko') === lg);
      if (group.length === 0) continue;
      const r = await sendPushTo(group, { ...PUSH_MSGS.daily[lg], url: '/app.html' });
      totalSent += r.sent;
      totalRemoved += r.removed;
    }
    console.log(`[push-daily] 발송 ${totalSent}건, 만료 정리 ${totalRemoved}건`);
    return { sent: totalSent, removed: totalRemoved };
  } catch (e) {
    console.error('[push-daily] 실패:', e.message);
    return { sent: 0, error: e.message };
  }
}

// 최근 알림 상태 저장 (콜드 스타트 시 초기화됨 — DB 없이 중복 방지만 목적)
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30분 쿨다운 (수동 ?force=1 연속 호출 시 스팸 방지)

async function sendAlert(healthData, originUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL;
  const from = process.env.ALERT_FROM || 'onboarding@resend.dev'; // Resend 샌드박스 기본값

  if (!apiKey || !to) {
    console.warn('[cron-health] RESEND_API_KEY 또는 ALERT_EMAIL 미설정 — 알림 스킵');
    return { sent: false, reason: 'missing env' };
  }

  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) {
    console.log('[cron-health] 쿨다운 중 (30분 내 이미 알림 발송) — 스킵');
    return { sent: false, reason: 'cooldown' };
  }

  const recipients = to.split(',').map((e) => e.trim()).filter(Boolean);

  const failureLines = [];
  const { checks } = healthData;
  if (!checks.gemini.ok) failureLines.push(`• Gemini: ${checks.gemini.error || 'FAIL'}${checks.gemini.expired ? ' ⚠️ KEY EXPIRED' : ''}`);
  if (!checks.edgeTts.ok) failureLines.push(`• Edge TTS: ${checks.edgeTts.error || 'FAIL'}`);
  if (!checks.supabase.ok && !checks.supabase.warnOnly) failureLines.push(`• Supabase: ${checks.supabase.error || 'FAIL'}`);
  if (!checks.env.ok) failureLines.push(`• 필수 env 누락: ${checks.env.missing.join(', ')}`);

  const subject = `🚨 [SOP Training] 헬스체크 실패 (${failureLines.length}개 항목)`;
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#dc2626;">🚨 헬스체크 실패 감지</h2>
  <p><strong>시각:</strong> ${healthData.timestamp}</p>
  <p><strong>배포:</strong> ${originUrl}</p>
  <h3 style="color:#991b1b;">실패 항목</h3>
  <pre style="background:#fee2e2;padding:12px;border-radius:6px;white-space:pre-wrap;">${failureLines.join('\n')}</pre>
  <h3>전체 체크 결과</h3>
  <pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:12px;white-space:pre-wrap;">${JSON.stringify(healthData, null, 2)}</pre>
  <hr style="margin:24px 0;border:0;border-top:1px solid #e5e7eb;" />
  <p style="font-size:12px;color:#6b7280;">
    이 알림은 /api/cron-health 에 의해 자동 발송되었습니다.<br>
    30분 쿨다운 — 중복 알림 방지.
  </p>
</div>
  `.trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: recipients, subject, html }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[cron-health] Resend 실패:', data);
      return { sent: false, reason: 'resend error', detail: data };
    }
    lastAlertTime = now;
    console.log('[cron-health] ✅ 알림 발송:', recipients.join(', '));
    return { sent: true, id: data.id };
  } catch (e) {
    console.error('[cron-health] 알림 발송 예외:', e.message);
    return { sent: false, reason: e.message };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // ★ Web Push 액션 라우팅 (rewrite /api/push → 여기) — cron 인증 불필요
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (e) {}
  if (req.method === 'POST' && body && typeof body.action === 'string' && body.action.startsWith('push-')) {
    return handlePushAction(req, res, body);
  }

  // Vercel Cron 은 Authorization 헤더에 CRON_SECRET 전송
  // (로컬 테스트 or 수동 호출 시에는 body.force=true 로 우회 가능)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isForce = (req.query && req.query.force === '1') || (req.body && req.body.force === true);

  if (!isCron && !isForce) {
    return res.status(401).json({ error: 'Unauthorized (cron only, add ?force=1 for manual test)' });
  }

  // 자체 /api/health 호출 (같은 배포에서 실행)
  const host = req.headers.host || process.env.VERCEL_URL || 'localhost';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const healthUrl = `${proto}://${host}/api/health`;

  let healthData;
  try {
    const r = await fetch(healthUrl);
    healthData = await r.json();
  } catch (e) {
    console.error('[cron-health] /api/health 호출 실패:', e.message);
    return res.status(500).json({ error: '/api/health fetch failed', message: e.message });
  }

  const result = { triggered: true, source: isCron ? 'cron' : 'manual', health: healthData };

  // 실패 시 알림 발송
  if (!healthData.ok) {
    result.alert = await sendAlert(healthData, `${proto}://${host}`);
  } else {
    result.alert = { sent: false, reason: 'health ok' };
  }

  // ★ 아침 학습 리마인드 푸시 — cron 실행 시 자동, 수동 테스트는 ?push=1
  if (isCron || (req.query && req.query.push === '1')) {
    result.dailyPush = await sendDailyPush();
  }

  return res.status(200).json(result);
};
