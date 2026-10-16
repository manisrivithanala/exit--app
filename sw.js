/* sw.js — Service Worker for background push */
self.addEventListener('install',  e => self.skipWaiting());
self.addEventListener('activate', e => e.clients.claim());

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'College Notification', {
      body: data.body || 'You have a new update',
      icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png',
      vibrate: [200, 100, 200],
      tag: 'cps-' + Date.now(),
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url));
});