const CACHE_NAME = 'wallet-app-v2';

// اكتب الملفات الموجودة عندك فعلياً فقط
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app_2.js'
];

// 1. التثبيت بأمان (لو ملف فشل الباقي يكمل عادي)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`فشل كاش الملف: ${asset}`, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. التفعيل وحذف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. التشغيل بدون إنترنت (Offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});