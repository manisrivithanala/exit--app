// server.js — FCM sender
import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceAccount.json', 'utf-8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const messaging = getMessaging();

const app = express();
app.use(cors());
app.use(express.json());

// ─── Home page (browser test) ───
app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 FCM Server Running</h1>
    <p>Status: <strong style="color:green">LIVE</strong></p>
    <p>Time: ${new Date().toISOString()}</p>
    <hr>
    <h3>Test endpoints:</h3>
    <ul>
      <li><a href="/api/health">/api/health</a></li>
    </ul>
  `);
});

// ─── Health check ───
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ─── Send push ───
app.post('/api/send-push', async (req, res) => {
  const { userId, title, body, link } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: 'userId and title required' });
  }

  try {
    const collections = ['students', 'teachers', 'hods', 'security'];
    let token = null;
    let foundIn = null;

    for (const col of collections) {
      const docSnap = await db.collection(col).doc(userId).get();
      if (docSnap.exists && docSnap.data()?.fcmToken) {
        token = docSnap.data().fcmToken;
        foundIn = col;
        break;
      }
    }

    if (!token) {
      console.log('❌ No FCM token for', userId);
      return res.status(404).json({ error: 'No FCM token for ' + userId });
    }

    await messaging.send({
      token,
      notification: { title, body: body || '' },
      webpush: {
        notification: {
          icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/2991/2991112.png',
          vibrate: [200, 100, 200, 100, 200]
        },
        fcmOptions: { link: link || '/' }
      },
      data: { url: link || '/', title, body: body || '' }
    });

    console.log(`✅ Push sent to ${userId} (${foundIn}) | ${title}`);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Push failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => console.log('🚀 FCM server running at http://localhost:3001'));