import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Webhook Setup Endpoint
  app.post('/api/telegram-setup-webhook', async (req, res) => {
    try {
      const { token, appUrl, autoDelete, deleteDelay } = req.body || {};
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      // Determine public origin
      const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
      const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
      const origin = `${protocol}://${host}`;

      const webhookUrl = `${origin}/api/telegram-webhook?token=${encodeURIComponent(token)}` +
        `&appUrl=${encodeURIComponent(appUrl || '')}` +
        `&autoDelete=${autoDelete !== false}` +
        `&deleteDelay=${deleteDelay || 30}`;

      console.log('Setting Telegram Webhook URL:', webhookUrl);

      const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'edited_message']
        })
      });

      const tgData = await tgRes.json();
      res.json({ success: tgData.ok, tgResult: tgData, webhookUrl });
    } catch (err: any) {
      console.error('Error setting Telegram webhook:', err);
      res.status(500).json({ error: err.message || 'Webhook setup failed' });
    }
  });

  // Webhook Handler for Telegram updates
  app.post('/api/telegram-webhook', async (req, res) => {
    // Return 200 OK immediately so Telegram doesn't timeout
    res.status(200).send('OK');

    try {
      const { token, appUrl, autoDelete, deleteDelay } = req.query;
      const update = req.body;

      if (!update || !update.message) return;

      const message = update.message;
      const text = message.text || message.caption || '';
      const chatId = message.chat?.id;
      const messageId = message.message_id;

      if (!chatId || !text) return;

      // Check if message starts with /app
      const cleanText = text.trim();
      const isAppCommand =
        cleanText.startsWith('/app') ||
        cleanText.startsWith('/start app') ||
        cleanText === '/app';

      if (!isAppCommand) return;

      const botToken = (token as string) || process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.warn('Telegram webhook received /app but bot token is missing');
        return;
      }

      const targetAppUrl = (appUrl as string) || 'https://t.me/ierihon_testbot/app';
      const shouldAutoDelete = autoDelete !== 'false';
      const delaySec = Number(deleteDelay) || 30;

      // 1. Delete user's /app command message
      if (shouldAutoDelete) {
        fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId
          })
        }).catch(err => console.error('Error deleting user command message:', err));
      }

      // 2. Send bot reply with button to Telegram Mini App
      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '🚀 Открыть приложение',
              url: targetAppUrl
            }
          ]
        ]
      };

      const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '📱 *Иерихон3* — Нажмите кнопку ниже, чтобы открыть приложение:',
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        })
      });

      const sendData = await sendRes.json();

      // 3. Schedule auto-delete of bot response message if enabled
      if (shouldAutoDelete && sendData.ok && sendData.result?.message_id) {
        const sentMsgId = sendData.result.message_id;
        setTimeout(() => {
          fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: sentMsgId
            })
          }).catch(err => console.error('Error deleting bot response message:', err));
        }, delaySec * 1000);
      }
    } catch (err) {
      console.error('Error handling Telegram webhook:', err);
    }
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
