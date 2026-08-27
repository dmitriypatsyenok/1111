import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase server-side for background automation tasks
const fbApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(fbApp);

async function checkAndSendBirthdayNotifications() {
  try {
    // 1. Fetch Telegram bot configuration from Firestore
    const tgConfigDoc = await getDoc(doc(db, 'app_data', 'tgConfig'));
    const tgData = tgConfigDoc.exists() ? (tgConfigDoc.data()?.content || tgConfigDoc.data()) : null;
    const botToken = tgData?.token || process.env.TG_BOT_TOKEN;
    const chatId = tgData?.chatId || process.env.TG_CHAT_ID;

    if (!botToken || !chatId) {
      return;
    }

    // 2. Format today's date
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const todayDDMM = `${day}.${month}`;
    const year = now.getFullYear();
    const todayYMD = `${year}-${month}-${day}`;

    // 3. Check if already sent today in Firestore lock document
    const notifiedRef = doc(db, 'app_data', 'birthdays_notified');
    const notifiedSnap = await getDoc(notifiedRef);
    const notifiedData = notifiedSnap.exists() ? (notifiedSnap.data()?.content || notifiedSnap.data()) : null;

    if (notifiedData?.lastNotifiedDate === todayYMD) {
      return;
    }

    // 4. Check birthdays list in Firestore
    const bdayRef = doc(db, 'app_data', 'birthdays');
    const bdaySnap = await getDoc(bdayRef);
    const bdayList = bdaySnap.exists() ? (bdaySnap.data()?.content || bdaySnap.data() || []) : [];

    if (!Array.isArray(bdayList) || bdayList.length === 0) {
      return;
    }

    const todayBirthdays = bdayList.filter((b: any) => {
      if (!b || !b.date || (b.name && b.name.includes('Иванова'))) return false;
      const parts = String(b.date).trim().split('.');
      if (parts.length >= 2) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        return `${d}.${m}` === todayDDMM;
      }
      return false;
    });

    if (todayBirthdays.length > 0) {
      const names = todayBirthdays.map((b: any) => {
        const raw = String(b.name || '').trim();
        if (raw.includes(',')) {
          return raw.split(',')[0].trim();
        }
        return raw;
      }).join(', ');
      const text = `<b>🎂 День рождения сегодня!</b>\nСегодня празднует: ${names}! Поздравляем! 🎉`;

      // Set lock in Firestore first to prevent duplicate sends across instances
      await setDoc(notifiedRef, {
        content: {
          lastNotifiedDate: todayYMD,
          notifiedNames: names,
          notifiedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      });

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('[Birthday Cron] Telegram API error:', err);
      } else {
        console.log(`[Birthday Cron] Successfully sent automated birthday notification for: ${names}`);
      }
    }
  } catch (e) {
    console.error('[Birthday Cron] Error checking birthdays:', e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Safe JSON body parser with error handling
  app.use(express.json({ limit: '1mb' }));
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.error('Express body parser error:', err.message);
      return res.status(200).json({ success: false, error: 'Ошибка формата JSON в запросе' });
    }
    next();
  });

  // Express health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Manual trigger / status check for birthday automation
  app.get('/api/check-birthdays', async (req, res) => {
    await checkAndSendBirthdayNotifications();
    res.json({ success: true, timestamp: new Date().toISOString() });
  });

  // Vite development middleware vs Static Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    // Start automated background check on server start and every 10 minutes
    setTimeout(checkAndSendBirthdayNotifications, 3000);
    setInterval(checkAndSendBirthdayNotifications, 10 * 60 * 1000);
  });
}

startServer();

