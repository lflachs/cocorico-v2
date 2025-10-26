/**
 * Custom Service Worker Enhancements
 * Handles notification clicks and custom PWA features
 */

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === self.registration.scope + url.substring(1) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle push notifications (for future backend integration)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Cocorico';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    data: data.data || {},
    ...data.options,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
