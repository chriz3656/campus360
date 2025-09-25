const CACHE_NAME = 'campus360-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon/icon-72x72.png',
    '/icon/icon-96x96.png',
    '/icon/icon-128x128.png',
    '/icon/icon-144x144.png',
    '/icon/icon-152x152.png',
    '/icon/icon-192x192.png',
    '/icon/icon-384x384.png',
    '/icon/icon-512x512.png',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('supabase.co')) {
        event.respondWith(
            fetch(event.request)
                .then(response => response)
                .catch(() => caches.match('/'))
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(name => {
                    if (name !== CACHE_NAME) return caches.delete(name);
                })
            );
        })
    );
});
