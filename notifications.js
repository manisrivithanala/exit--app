/* notifications.js — local push + toast (no vibe) */
(function (global) {
  'use strict';

  const ICON_URL  = 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png';
  const BADGE_URL = 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png';

  // Register local push SW
  if ('serviceWorker' in navigator && !global.__cpsSWRegistered) {
    global.__cpsSWRegistered = true;
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('✅ SW registered'))
      .catch(err => console.warn('SW registration failed:', err));
  }

  // Register FCM SW (for background push from server.js)
  if ('serviceWorker' in navigator && !global.__cpsFcmSWRegistered) {
    global.__cpsFcmSWRegistered = true;
    navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope'
    })
      .then(() => console.log('✅ FCM SW registered'))
      .catch(err => console.warn('FCM SW registration failed:', err));
  }

  async function requestPermission(silent = false) {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied')  return false;

    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      localStorage.setItem('cps_notifEnabled', 'true');
      if (!silent) push('🎓 Notifications Enabled', 'You will receive alerts.');
      return true;
    }
    return false;
  }

  function push(title, body, url = null, extra = {}) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const options = Object.assign({
      body,
      icon: ICON_URL,
      badge: BADGE_URL,
      vibrate: [200, 100, 200, 100, 200],
      tag: 'cps-' + Date.now(),
      data: { url: url || location.href }
    }, extra);

    try {
      const n = new Notification(title, options);
      if (url) n.onclick = (e) => { e.preventDefault(); global.focus(); location.href = url; };
      setTimeout(() => n.close(), 8000);
    } catch (err) {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
      }
    }
  }

  function toast(message, type = 'success') {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
      document.body.appendChild(c);
    }
    const el = document.createElement('div');
    el.style.cssText =
      'min-width:250px;padding:14px 18px;border-radius:12px;color:#fff;' +
      'font-size:0.95rem;font-weight:500;box-shadow:0 10px 25px rgba(0,0,0,.15);' +
      'display:flex;align-items:center;gap:10px;opacity:0;transition:opacity .3s;' +
      'background:' + (type === 'success' ? '#10b981' : '#ef4444') + ';';
    el.innerHTML = (type === 'success' ? '✅ ' : '⚠️ ') + message;
    c.appendChild(el);
    requestAnimationFrame(() => el.style.opacity = '1');
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 2700);
  }

  if (!localStorage.getItem('cps_notifAsked')) {
    const handler = () => {
      localStorage.setItem('cps_notifAsked', 'true');
      requestPermission(false);
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler, { once: true });
  }

  global.CPSNotify = {
    push,
    toast,
    requestPermission,
    showNotification: toast,
    pushNotify: push
  };
  global.pushNotify = push;
  global.showNotification = toast;

  console.log('🔔 notifications.js loaded');
})(window);