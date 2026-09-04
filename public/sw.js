const CACHE_NAME = 'veltis-cache-v1';
const QUEUE_DB_NAME = 'veltis-sync-queue';
const QUEUE_STORE_NAME = 'requests';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Setup IndexedDB for offline queue
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        db.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function saveRequestToQueue(request) {
  const db = await openDB();
  const serialized = {
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers.entries()),
    body: await request.clone().text(),
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE_NAME);
    const req = store.add(serialized);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function flushQueue() {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE_NAME, 'readonly');
  const store = tx.objectStore(QUEUE_STORE_NAME);
  
  const requests = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (requests.length === 0) return;

  for (const req of requests) {
    try {
      const headers = new Headers();
      req.headers.forEach(([key, value]) => headers.append(key, value));
      
      const fetchReq = new Request(req.url, {
        method: req.method,
        headers,
        body: req.body
      });

      await fetch(fetchReq);
      
      // If successful, remove from queue
      const delTx = db.transaction(QUEUE_STORE_NAME, 'readwrite');
      delTx.objectStore(QUEUE_STORE_NAME).delete(req.id);
    } catch (err) {
      console.error('Failed to sync queued request:', err);
      // Stop flushing on first network failure
      break; 
    }
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Intercept POST/PUT/PATCH/DELETE API requests
  if (request.url.includes('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    event.respondWith(
      fetch(request.clone()).catch(async (error) => {
        // If offline, save to queue and return a mock success response
        await saveRequestToQueue(request.clone());
        return new Response(JSON.stringify({ offline: true, queued: true }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Fallback for normal requests (simple network-first)
  event.respondWith(
    fetch(request).catch(() => {
      return new Response("Offline");
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(flushQueue());
  }
});
