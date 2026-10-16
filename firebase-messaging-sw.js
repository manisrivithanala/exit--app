importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCbLaMMyURD7j6l84qnbDi9Eaol9oABiVE",
  authDomain: "student-permissions-web.firebaseapp.com",
  projectId: "student-permissions-web",
  storageBucket: "student-permissions-web.firebasestorage.app",
  messagingSenderId: "717967595505",
  appId: "1:717967595505:web:2c3cc66527b23a6b5c1650"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message:', payload);
  const title = payload.notification?.title || 'College Notification';
  const body  = payload.notification?.body  || 'You have a new update';
  const url   = payload.data?.url || '/';

  self.registration.showNotification(title, {
    body,
    icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'cps-' + Date.now(),
    data: { url }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});