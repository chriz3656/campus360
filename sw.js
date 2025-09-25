// sw.js
const CACHE_NAME = 'campus360-v1.0.0'; // Change this version string whenever you update your app's static files
const urlsToCache = [
  '/',
  '/index.html', // Assuming your main page is index.html
  '/adminpanel.html', // Include the admin panel if you want it cached too
  '/manifest.json',
  '/icon/icon-72x72.png',
  '/icon/icon-96x96.png',
  '/icon/icon-128x128.png',
  '/icon/icon-144x144.png',
  '/icon/icon-152x152.png',
  '/icon/icon-192x192.png',
  '/icon/icon-384x384.png',
  '/icon/icon-512x512.png',
  // Add other static assets as needed, e.g., CSS, JS files if hosted locally
  // Example (if you move CSS/JS to local files):
  // '/styles.css',
  // '/app.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', // Cache the Google Fonts CSS
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', // Cache Font Awesome CSS
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css', // Cache Leaflet CSS (if needed offline)
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', // Note: Caching external JS libraries like this might be tricky and isn't always recommended, but you can try.
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js' // Cache Leaflet JS (if needed offline)
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
  console.log('Service Worker: Fetching', event.request.url);

  // Check if the request is for an API call (like Supabase) - we usually don't want to cache these responses aggressively
  // You might need to adjust this condition based on your Supabase URL
  if (event.request.url.includes('supabase.co')) {
    // For API calls, try network first, then serve from cache if network fails (networkFirst strategy)
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Optionally, update the cache with the new response (though this is complex for dynamic data)
          // We'll just return the network response for now.
          return networkResponse;
        })
        .catch((error) => {
          console.warn('Service Worker: Network request failed, attempting to serve from cache:', error);
          // Try to find a cached response for the request
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('Service Worker: Serving from cache (fallback):', event.request.url);
                return cachedResponse;
              }
              // If not found in cache either, return an error or a fallback response
              // Returning an error might be appropriate if the data is critical.
              // A fallback page might be better for non-critical requests.
              // For now, let's try to return the main page cache if the specific API call isn't cached.
              // This is a simple fallback and might not be ideal for all API requests.
              // A better approach might be to cache specific fallback responses for API calls or handle errors gracefully in the app.
              return caches.match('/'); // Or return a specific offline page
            });
        })
    );
  } else {
    // For static assets (HTML, CSS, JS, images, etc.), use cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('Service Worker: Serving from cache:', event.request.url);
            return cachedResponse;
          }
          console.log('Service Worker: Fetching from network:', event.request.url);
          // If not in cache, fetch from network
          return fetch(event.request)
            .then((networkResponse) => {
              // If the network response is valid, cache it for future use
              // Only cache GET requests and successful responses (status 200-299)
              if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                // Clone the response before caching because response body can only be read once
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
              console.error('Service Worker: Network request failed for static asset:', error);
              // If fetching from network fails and it's not in cache, return an error or fallback
              // This might happen for assets not explicitly listed in urlsToCache
              // Returning an error is usually the right thing to do for missing static assets.
              throw error; // Or return a fallback response if appropriate
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
          // Delete old caches that are not the current one
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