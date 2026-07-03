// ============================================
// Push Client — Web Push 구독 관리
// ============================================
// 사용:
//   PushClient.enable()  — 권한 요청 + 구독 + 서버 저장 (알림 토글 ON 시 호출)
//   자동: 페이지 로드 시 이미 권한이 granted 면 조용히 재구독 (idempotent)
//
// 서버: POST /api/push { action:'push-subscribe', employeeId, subscription, lang }
// (vercel.json rewrite → /api/cron-health 에 통합 구현)
// ============================================
(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (location.protocol === 'file:' || location.hostname === 'localhost') return;

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('sop_user') || 'null'); }
    catch (e) { return null; }
  }

  async function subscribeAndSave() {
    const user = getUser();
    const key = (typeof CONFIG !== 'undefined' && CONFIG.VAPID_PUBLIC_KEY) || '';
    if (!user?.id || !key) return { ok: false, reason: 'no user or key' };

    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }

      const lang = localStorage.getItem('sop_lang') || 'ko';
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push-subscribe',
          employeeId: user.id,
          subscription: sub.toJSON(),
          lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        localStorage.setItem('sop_push_subscribed', '1');
        console.log('[Push] ✅ 구독 저장 완료');
        return { ok: true };
      }
      return { ok: false, reason: data.error || 'save failed' };
    } catch (e) {
      console.warn('[Push] 구독 실패:', e.message);
      return { ok: false, reason: e.message };
    }
  }

  // 권한 요청 포함 활성화 (버튼/토글에서 호출)
  async function enable() {
    if (!('Notification' in window)) return { ok: false, reason: 'unsupported' };
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: 'denied' };
    return subscribeAndSave();
  }

  // 이미 권한 granted 인 사용자는 조용히 재구독 (구독 만료/기기 변경 대응)
  // 하루 1회만 시도 (불필요한 네트워크 방지)
  function autoResubscribe() {
    if (Notification.permission !== 'granted') return;
    const today = new Date().toLocaleDateString('en-CA');
    const key = 'sop_push_auto_' + today;
    if (sessionStorage.getItem(key) || localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    // 어제 키 정리
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sop_push_auto_') && k !== key) localStorage.removeItem(k);
      });
    } catch (e) {}
    setTimeout(() => { subscribeAndSave(); }, 2500);
  }

  if (document.readyState === 'complete') autoResubscribe();
  else window.addEventListener('load', autoResubscribe);

  window.PushClient = { enable, subscribeAndSave };
})();
