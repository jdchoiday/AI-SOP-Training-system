// ============================================
// /api/cron-health — Vercel Cron 자동 호출
// ============================================
// vercel.json 의 crons 설정에 의해 매일 1회 실행 (Hobby 플랜 제약).
// 더 잦은 모니터링이 필요하면 외부 cron-job.org 등으로 ?force=1 호출.
// /api/health 호출 → 실패 시 Resend 로 관리자 이메일 발송.
//
// 필요 env:
//   CRON_SECRET          — Vercel Cron 인증 (자동 설정)
//   RESEND_API_KEY       — https://resend.com (무료 월 3,000건)
//   ALERT_EMAIL          — 알림 수신 (쉼표로 복수 가능)
//   ALERT_FROM           — 발신 이메일 (도메인 검증된 주소, 기본값 onboarding@resend.dev)
//   VERCEL_URL           — 자동 주입 (현재 배포 도메인)
//
// ============================================

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

  return res.status(200).json(result);
};
