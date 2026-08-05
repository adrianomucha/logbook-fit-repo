/* Logbook service worker — notifications only.
 *
 * Deliberately no fetch handler and no caching: the app is server-rendered
 * and session-scoped, and a stale offline cache is exactly how a chat starts
 * showing yesterday's messages. This worker exists to receive push events
 * while the app is closed and to route taps back into the right screen.
 */

// Take over immediately so a freshly registered worker can receive pushes
// without waiting for every tab to close.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Logbook';
  const url = typeof payload.url === 'string' ? payload.url : '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      // Same tag replaces the previous notification from that person instead
      // of stacking a wall of them on the lock screen.
      tag: payload.tag || 'logbook',
      renotify: true,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Reuse an open Logbook window when there is one — opening a second
        // copy of an installed PWA is disorienting.
        for (const client of clientList) {
          if (new URL(client.url).origin === self.location.origin) {
            return client.focus().then((focused) => {
              if (focused && 'navigate' in focused) {
                return focused.navigate(target).catch(() => focused);
              }
              return focused;
            });
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
