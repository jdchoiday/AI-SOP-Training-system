// Service Worker — 오프라인 캐싱 + 자동 업데이트 전략
// CACHE_NAME은 배포마다 변경되어야 함 (Vercel 배포 시 타임스탬프 주입 권장)
const CACHE_VERSION = 'v14-20260421-kill-pexels';
const CACHE_NAME = `sop-training-${CACHE_VERSION}`;
const HTML_CACHE = `sop-html-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/css/style.css',
  '/js/config.js',
  '/js/ai-provider.js',
  '/js/supabase-client.js',
  '/js/sop-content-kids.js',
  '/js/demo-data.js',
  '/js/slide-player.js',
  '/js/xp-system.js',
  '/js/xp-ui.js',
  '/js/i18n-helper.js',
  '/js/image-db.js',
  '/manifest.json',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting(); // 즉시 활성화
});

self.addEventListener('activate', e => {
  // 구 버전 캐시 전부 삭제
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== HTML_CACHE)
            .map(k => { console.log('[SW] 구버전 캐시 삭제:', k); return caches.delete(k); })
      )
    ).then(() => self.clients.claim())
  );
});

// 메시지로 캐시 강제 무효화 (앱에서 수동 업데이트 트리거)
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'CLEAR_CACHE') {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
});

// Push 알림 수신
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'SOP Training', body: '학습 알림' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/assets/icon-192.svg',
    badge: '/assets/icon-192.svg',
    data: { url: data.url || '/app.html' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url));
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // localhost 개발 환경: SW 개입 없음
  if (url.includes('localhost')) return;

  // API/외부 서비스: 항상 네트워크
  if (url.includes('googleapis.com') ||
      url.includes('supabase.co') ||
      url.includes('siliconflow') ||
      url.includes('/api/') ||
      url.includes('speech.platform.bing.com') ||
      url.includes('s3.') ||
      url.includes('temporary/outputs') ||
      url.includes('qrserver.com')) {
    return; // 브라우저 기본 동작
  }

  // HTML 파일: 항상 네트워크 우선 (캐시는 오프라인 폴백만)
  // → 배포 시 즉시 새 버전 반영
  if (url.endsWith('.html') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // 성공 시 캐시에 복사
          const clone = res.clone();
          caches.open(HTML_CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(r => r || new Response('Offline', { status: 503 }))
        )
    );
    return;
  }

  // 정적 자산 (JS/CSS/이미지): 캐시 우선, 백그라운드에서 업데이트
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
