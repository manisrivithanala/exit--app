// ================================================================
// firebase-boot.js
// Firebase sync (Firestore) + FCM token registration
// No vibe-message — cross-device push goes via server.js
// ================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported as fcmIsSupported
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

// ================================================================
// 1. Firebase config
// ================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCbLaMMyURD7j6l84qnbDi9Eaol9oABiVE",
  authDomain: "student-permissions-web.firebaseapp.com",
  projectId: "student-permissions-web",
  storageBucket: "student-permissions-web.firebasestorage.app",
  messagingSenderId: "717967595505",
  appId: "1:717967595505:web:2c3cc66527b23a6b5c1650"
};

const VAPID_KEY = "BDiJmkevr_HPOjJdEQk9tySWP16bObFiQ8le8oOZVOQ7p89KzrPr_JYLLPz3VqJrErTfnWVH9HKpnCL9xtO4Pus";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ================================================================
// 2. Stub for Vibe registration (cross-device now via server.js)
// ================================================================
window.CPS_registerVibeDevice = function(user) {
  if (user) {
    const id = user.regNo || user.teacherId || user.hodId || user.securityId;
    console.log('ℹ️ Device registered for FCM push:', id);
  }
};

// ================================================================
// 3. localStorage keys we sync
// ================================================================
const SYNCED_KEYS = [
  'cps_students',
  'cps_teachers',
  'cps_hods',
  'cps_security',
  'cps_permissions',
  'cps_gateLog',
  'cps_auditLog'
];

function keyToCollection(key) {
  return key.replace('cps_', '');
}

let suppressRemoteUntil = 0;
function suppressRemoteFor(ms = 800) {
  suppressRemoteUntil = Date.now() + ms;
}

// ================================================================
// 4. Bootstrap: pull from Firestore into localStorage
// ================================================================
async function bootstrapFromFirestore() {
  console.log('%c🔥 Firebase boot: loading data...', 'color:#f59e0b;font-weight:bold;');

  try {
    const snap = await getDocs(collection(db, 'students'));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (rows.length > 0) {
      localStorage.setItem('cps_students', JSON.stringify(rows));
    } else if (!localStorage.getItem('cps_students')) {
      localStorage.setItem('cps_students', '[]');
    }
    console.log(`  ✓ cps_students: ${rows.length} records`);
  } catch (err) {
    console.warn('  ⚠️ cps_students load failed:', err.message);
  }

  const otherKeys = ['cps_teachers', 'cps_hods', 'cps_security', 'cps_permissions', 'cps_gateLog', 'cps_auditLog'];
  await Promise.all(otherKeys.map(async (key) => {
    try {
      const colName = keyToCollection(key);
      const snap = await getDocs(collection(db, colName));
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (rows.length > 0) {
        localStorage.setItem(key, JSON.stringify(rows));
      } else if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
      console.log(`  ✓ ${key}: ${rows.length} records`);
    } catch (err) {
      console.warn(`  ⚠️ ${key} load failed:`, err.message);
    }
  }));

  window.CPS_BOOT_DONE = true;
  window.dispatchEvent(new Event('cps-boot-ready'));
  console.log('%c✅ Firebase boot: ready', 'color:#10b981;font-weight:bold;');

  startRealtimeListeners();

  // If a user is already logged in, register FCM token now
  try {
    const userJson = localStorage.getItem('cps_currentUser');
    if (userJson) {
      const user = JSON.parse(userJson);
      initFCM(user);
    }
  } catch (e) { /* ignore */ }
}

// ================================================================
// 5. Push to Firestore (background)
// ================================================================
async function pushToFirestore(key, value) {
  try {
    suppressRemoteFor(1200);
    const colName = keyToCollection(key);
    const rows = JSON.parse(value || '[]');

    const snap = await getDocs(collection(db, colName));
    const existingIds = snap.docs.map(d => d.id);
    const newIds = new Set();

    for (const row of rows) {
      let docId = row.id || makeDocId(row);
      newIds.add(docId);
      const { id, ...dataToSave } = row;
      await setDoc(doc(db, colName, docId), dataToSave, { merge: true });
    }

    for (const id of existingIds) {
      if (!newIds.has(id)) {
        await deleteDoc(doc(db, colName, id));
      }
    }
  } catch (err) {
    console.warn('Firestore push failed for', key, err.message);
  }
}

function makeDocId(row) {
  if (row.permissionId) return row.permissionId;
  if (row.regNo) return row.regNo;
  if (row.teacherId) return row.teacherId;
  if (row.hodId) return row.hodId;
  if (row.securityId) return row.securityId;
  return 'doc_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ================================================================
// 6. Hook localStorage.setItem to auto-push
// ================================================================
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  originalSetItem(key, value);
  if (SYNCED_KEYS.includes(key)) {
    pushToFirestore(key, value).catch(() => {});
  }
};

const originalRemoveItem = localStorage.removeItem.bind(localStorage);
localStorage.removeItem = function(key) {
  originalRemoveItem(key);
  if (SYNCED_KEYS.includes(key)) {
    pushToFirestore(key, '[]').catch(() => {});
  }
};

// ================================================================
// 7. Real-time listeners
// ================================================================
let listenersStarted = false;
function startRealtimeListeners() {
  if (listenersStarted) return;
  listenersStarted = true;

  for (const key of SYNCED_KEYS) {
    const colName = keyToCollection(key);
    try {
      onSnapshot(collection(db, colName), (snap) => {
        if (Date.now() < suppressRemoteUntil) return;

        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const json = JSON.stringify(rows);

        const current = localStorage.getItem(key) || '[]';
        if (current !== json) {
          originalSetItem(key, json);
          window.dispatchEvent(new CustomEvent('cps-data-updated', {
            detail: { key, colName, count: rows.length }
          }));
        }
      }, (err) => {
        console.warn(`onSnapshot error for ${colName}:`, err.message);
      });
    } catch (err) {
      console.warn(`Failed to start listener for ${colName}:`, err.message);
    }
  }

  console.log('%c📡 Real-time listeners active', 'color:#3b82f6;font-weight:bold;');
}

// ================================================================
// 8. FCM — Firebase Cloud Messaging (get token + foreground handler)
// ================================================================
let messaging = null;
let currentFcmToken = null;

async function initFCM(user) {
  try {
    const supported = await fcmIsSupported();
    if (!supported) {
      console.warn('⚠️ FCM not supported in this browser');
      return;
    }
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported');
      return;
    }
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        console.warn('⚠️ Notification permission denied');
        return;
      }
    }
    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Notifications not permitted');
      return;
    }

    messaging = getMessaging(app);
    currentFcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (!currentFcmToken) {
      console.warn('⚠️ No FCM token received');
      return;
    }
    console.log('%c📱 FCM token received', 'color:#10b981;font-weight:bold;');

    // Save token into user record
    if (user) saveTokenForUser(currentFcmToken, user);

    // Foreground messages
    onMessage(messaging, (payload) => {
      console.log('📩 FCM foreground message:', payload);
      const title = payload.notification?.title || 'College Notification';
      const body  = payload.notification?.body  || '';
      const url   = payload.data?.url || null;

      if (typeof window.pushNotify === 'function') {
        window.pushNotify(title, body, url);
      } else {
        try {
          const n = new Notification(title, {
            body,
            icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png',
            vibrate: [200, 100, 200]
          });
          if (url) n.onclick = () => { window.focus(); window.location.href = url; };
        } catch (e) {}
      }
    });

    window.CPS_FCM_TOKEN = currentFcmToken;
  } catch (err) {
    console.warn('FCM init failed:', err.message || err);
  }
}

function saveTokenForUser(token, user) {
  try {
    user = user || JSON.parse(localStorage.getItem('cps_currentUser') || 'null');
    if (!user || !user.role) return;

    user.fcmToken = token;
    user.fcmUpdatedAt = new Date().toISOString();
    localStorage.setItem('cps_currentUser', JSON.stringify(user));

    const roleKeyMap = {
      student:  'cps_students',
      teacher:  'cps_teachers',
      hod:      'cps_hods',
      security: 'cps_security'
    };
    const idFieldMap = {
      student:  'regNo',
      teacher:  'teacherId',
      hod:      'hodId',
      security: 'securityId'
    };
    const key = roleKeyMap[user.role];
    const idField = idFieldMap[user.role];
    if (!key || !idField) return;

    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex(r => r[idField] === user[idField]);
    if (idx !== -1) {
      list[idx].fcmToken = token;
      list[idx].fcmUpdatedAt = user.fcmUpdatedAt;
      localStorage.setItem(key, JSON.stringify(list));
      console.log(`✅ FCM token saved to ${key} for`, user[idField]);
    } else {
      console.log(`⚠️ User not found in ${key}, skipping mirror`);
    }
  } catch (err) {
    console.warn('Failed to save FCM token:', err);
  }
}

// Expose refresh for login
window.CPS_refreshFcmToken = function() {
  if (currentFcmToken) {
    saveTokenForUser(currentFcmToken);
  } else {
    const user = JSON.parse(localStorage.getItem('cps_currentUser') || 'null');
    initFCM(user);
  }
};
window.CPS_getFcmToken = function() { return currentFcmToken; };

// ================================================================
// 9. Boot sequence
// ================================================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await bootstrapFromFirestore();
  }
});

signInAnonymously(auth).catch(err => {
  console.error('Anonymous auth failed:', err);
  window.CPS_BOOT_DONE = true;
  window.dispatchEvent(new Event('cps-boot-ready'));
});

window.CPS_FIREBASE = { db, auth };