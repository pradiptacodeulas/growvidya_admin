// Growvidya SaaS Admin Service Worker for Web Push Notifications
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Growvidya Support Alert',
    body: 'You have a new support ticket update.',
    icon: '/favicon.jpg',
    badge: '/favicon.jpg',
    data: { url: '/support-tickets' },
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      notificationData = {
        title: parsed.title || notificationData.title,
        body: parsed.body || notificationData.body,
        icon: '/favicon.jpg',
        badge: '/favicon.jpg',
        data: parsed.data || notificationData.data,
        tag: parsed.tag || parsed.data?.tag || null,
      };
    }
  } catch {
    if (event.data) {
      notificationData.body = event.data.text();
    }
  }

  const determinedTag =
    notificationData.tag ||
    notificationData.data?.tag ||
    `saas-support-${notificationData.data?.ticketId || 'alert'}`;

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    data: notificationData.data,
    tag: determinedTag,
    renotify: true,
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notificationData.title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'GROWVIDYA_SAAS_PUSH_RECEIVED',
            payload: notificationData,
          });
        }
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/support-tickets';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.focus();
            return client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
