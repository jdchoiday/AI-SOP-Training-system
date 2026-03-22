// Service Worker — 오프라인 캐싱
const CACHE_NAME = 'sop-training-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/chapter.html',
  '/ai-chat.html',
  '/my-results.html',
  '/css/style.css',
  '/js/config.js',
  '/js/ai-provider.js',
  '/js/sop-content-kids.js',
  '/js/demo-data.js',
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

self.addEventListener('fetch', e => {
  // 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
