// Service Worker for SimplePro Moving Company Management System
const CACHE_NAME = 'simplepro-v1.0.0';
const STATIC_CACHE_NAME = 'simplepro-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'simplepro-dynamic-v1.0.0';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html'
];

// Cache patterns for different resource types
const CACHE_PATTERNS = [
  {
    pattern: /\.(js|css|woff2?|ttf|eot)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: STATIC_CACHE_NAME,
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
  },
  {
    pattern: /\.(png|jpg|jpeg|gif|svg|webp|avif)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: STATIC_CACHE_NAME,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  {
    pattern: /\/api\//,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: DYNAMIC_CACHE_NAME,
    maxAge: 5 * 60 * 1000 // 5 minutes
  }
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      console.log('[SW] Static assets cached');

      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const deletions = cacheNames
        .filter(name => name !== STATIC_CACHE_NAME && name !== DYNAMIC_CACHE_NAME)
        .map(name => caches.delete(name));

      await Promise.all(deletions);
      console.log('[SW] Old caches cleaned up');

      // Take control of all pages
      self.clients.claim();
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  const pattern = findMatchingPattern(url.pathname + url.search);

  if (pattern) {
    event.respondWith(handleRequest(event.request, pattern));
  }
});

// Find matching cache pattern for request
function findMatchingPattern(path) {
  return CACHE_PATTERNS.find(pattern => pattern.pattern.test(path));
}

// Handle request based on caching strategy
async function handleRequest(request, pattern) {
  const { strategy, cacheName, maxAge } = pattern;

  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cacheName, maxAge);

    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cacheName, maxAge);

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cacheName, maxAge);

    default:
      return fetch(request);
  }
}

// Cache First Strategy
async function cacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached && !isExpired(cached, maxAge)) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cached) {
      console.log('[SW] Serving stale cache due to network error:', error);
      return cached;
    }
    throw error;
  }
}

// Network First Strategy
async function networkFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached && !isExpired(cached, maxAge)) {
      console.log('[SW] Serving cache due to network error:', error);
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always try to update cache in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    console.log('[SW] Background fetch failed:', error);
  });

  // Return cached version immediately if available and not expired
  if (cached && !isExpired(cached, maxAge)) {
    return cached;
  }

  // Otherwise wait for network
  return fetchPromise;
}

// Check if cached response is expired
function isExpired(response, maxAge) {
  if (!maxAge) return false;

  const cachedTime = new Date(response.headers.get('date') || Date.now());
  const now = new Date();

  return (now - cachedTime) > maxAge;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'upload-pending-data') {
    event.waitUntil(uploadPendingData());
  }
});

// Upload any pending data when back online
async function uploadPendingData() {
  try {
    const pendingData = await getStoredData('pending-uploads');
    if (pendingData && pendingData.length > 0) {
      for (const data of pendingData) {
        await uploadData(data);
      }
      await clearStoredData('pending-uploads');
      console.log('[SW] Pending data uploaded successfully');
    }
  } catch (error) {
    console.error('[SW] Failed to upload pending data:', error);
  }
}

// IndexedDB operations for offline data
async function getStoredData(key) {
  // Implementation would use IndexedDB to store/retrieve data
  return [];
}

async function clearStoredData(key) {
  // Implementation would clear IndexedDB data
}

async function uploadData(data) {
  // Implementation would upload data to server
  return fetch('/api/upload', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'simplepro-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SimplePro', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      // eslint-disable-next-line no-undef
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service Worker loaded');