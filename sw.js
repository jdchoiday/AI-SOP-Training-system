// Service Worker — 오프라인 캐싱
const CACHE_NAME = 'sop-training-v8';
const ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/chapter.html',
  '/ai-chat.html',
  '/my-results.html',
  '/register.html',
  '/change-password.html',
  '/mbti.html',
  '/admin/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/ai-provider.js',
  '/js/supabase-client.js',
  '/js/sop-content-kids.js',
  '/js/demo-data.js',
  '/js/slide-player.js',
  '/manifest.json',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
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

// 알림 클릭 시 해당 페이지 열기
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url));
});

self.addEventListener('fetch', e => {
  // localhost 개발 환경에서는 SW 개입하지 않음
  if (e.request.url.includes('localhost')) {
    return; // 브라우저 기본 동작
  }
  // API 호출은 캐시하지 않음
  if (e.request.url.includes('googleapis.com') ||
      e.request.url.includes('supabase.co') ||
      e.request.url.includes('siliconflow') ||
      e.request.url.includes('/api/') ||
      e.request.url.includes('speech.platform.bing.com') ||
      e.request.url.includes('s3.') ||
      e.request.url.includes('temporary/outputs')) {
    return;
  }
  // 네트워크 우선, 실패 시 캐시 (undefined 방지)
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(r => r || new Response('Offline', { status: 503 }))
    )
  );
});
