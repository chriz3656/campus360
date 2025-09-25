const CACHE_NAME = 'campus360-v1.1.0'; // Increment version when updating
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
    // Add other critical static assets here if needed
];

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing....');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell...');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache app shell:', error);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // console.log('Service Worker: Fetching', event.request.url);

    // Check if the request is for an external API (like Supabase, Leaflet, Fonts, Icons)
    if (event.request.url.includes('supabase.co') || 
        event.request.url.includes('unpkg.com') || 
        event.request.url.includes('fonts.googleapis.com') || 
        event.request.url.includes('cdnjs.cloudflare.com')) {
        
        // For external resources, try network first, fallback to cache, then fail gracefully
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Optionally, update the cache with the new response (for static external assets)
                    // For dynamic API calls, this might not be desirable.
                    // We'll just return the network response for now.
                    return networkResponse;
                })
                .catch((error) => {
                    console.warn('Service Worker: Network request failed for external resource, attempting to serve from cache:', event.request.url, error);
                    return caches.match(event.request)
                        .then((cachedResponse) => {
                            if (cachedResponse) {
                                console.log('Service Worker: Serving external resource from cache:', event.request.url);
                                return cachedResponse;
                            }
                            // If not in cache, return a network error or a fallback response
                            // For critical resources, you might want to return a placeholder.
                            // For non-critical ones (like icons), you might return a generic response.
                            // Returning a 504 Gateway Timeout-like response might be appropriate.
                            return new Response('Offline', { status: 504, statusText: 'Gateway Timeout' });
                        });
                })
        );
    } else {
        // For local static assets (HTML, CSS, JS, images), use cache-first strategy
        event.respondWith(
            caches.match(event.request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('Service Worker: Serving from cache:', event.request.url);
                        return cachedResponse;
                    }
                    console.log('Service Worker: Fetching from network:', event.request.url);
                    return fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                                const responseToCache = networkResponse.clone();
                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        console.log('Service Worker: Caching new resource:', event.request.url);
                                        cache.put(event.request, responseToCache);
                                    });
                            }
                            return networkResponse;
                        })
                        .catch((error) => {
                            console.error('Service Worker: Network request failed for static asset:', event.request.url, error);
                            // If fetching from network fails and it's not in cache, return an error
                            // This is critical for static assets that are essential for the app to run.
                            // Returning an error page might be better than a generic response.
                            return caches.match('/');
                        });
                })
        );
    }
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating....');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Claim clients to take control immediately
    return self.clients.claim();
});
