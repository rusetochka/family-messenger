// KinCircle Service Worker — handles Web Push notifications

// Activate immediately so updated SW takes over all tabs without waiting
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(
  self.clients.claim().then(() =>
    // Tell all open tabs/windows to reload so they pick up the new frontend
    // bundle. This is belt-and-suspenders alongside the statechange listener
    // in pwa.ts — whichever fires first wins.
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'SW_ACTIVATED' }));
    })
  )
));

// ── IDB helpers for persisting the badge count across SW restarts ────────────
const IDB_NAME = 'kc-sw';
const IDB_STORE = 'meta';
const BADGE_KEY = 'badgeCount';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function incrementBadge() {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(BADGE_KEY);
      getReq.onsuccess = () => {
        const next = (getReq.result ?? 0) + 1;
        store.put(next, BADGE_KEY);
        tx.oncomplete = () => resolve(next);
        tx.onerror = () => resolve(next);
      };
      getReq.onerror = () => resolve(1);
    });
  } catch {
    return 1;
  }
}

async function clearBadgeCount() {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(0, BADGE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'KinCircle', body: '', url: '/' };
  try { data = { ...data, ...event.data.json() }; } catch {}

  const isCall = data.tag === 'incoming-call';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // Suppress regular notifications when the app is focused;
      // always show call notifications so the user is alerted even in-app
      if (!isCall && clientList.some((c) => c.focused)) return;

      // Increment the persisted badge count and update the home-screen icon.
      // The exact unread count will be overwritten when the user opens the app.
      const count = await incrementBadge();
      if ('setAppBadge' in self.navigator) {
        await self.navigator.setAppBadge(count).catch(() => {});
      }

      return self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192.svg',
        badge: '/icons/badge-72.svg',
        tag: data.tag || undefined,
        data: { url: data.url },
        vibrate: isCall ? [500, 200, 500, 200, 500] : [200, 100, 200],
        requireInteraction: !!isCall,
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url ?? '/';

  // Only allow same-origin navigations to prevent open-redirect via push data
  function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    // Relative paths are always safe
    if (url.startsWith('/') && !url.startsWith('//')) return true;
    try {
      return new URL(url).origin === self.location.origin;
    } catch {
      return false;
    }
  }
  const url = isSafeUrl(rawUrl) ? rawUrl : '/';

  // Clear the persisted badge count and the OS badge — the app will re-set it
  // accurately once it loads and the store has the real unread total.
  clearBadgeCount();
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Focus existing window if open
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
