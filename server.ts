import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

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

  // Check Webhook Info Endpoint
  app.get('/api/telegram-webhook-info', async (req, res) => {
    try {
      const token = (req.query.token as string || '').trim();
      if (!token) {
        return res.status(200).json({ success: false, error: 'Токен не передан' });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const tgRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      const tgData = await tgRes.json();
      res.status(200).json({ success: !!tgData.ok, tgResult: tgData });
    } catch (err: any) {
      res.status(200).json({ success: false, error: err.message || 'Ошибка запроса к Telegram API' });
    }
  });

  // Webhook Setup Endpoint
  app.post('/api/telegram-setup-webhook', async (req, res) => {
    try {
      const { token, appUrl, autoDelete, deleteDelay, clientOrigin, customWebhookUrl } = req.body || {};
      
      const cleanToken = (token || '').toString().trim().replace(/^["']|["']$/g, '');
      if (!cleanToken) {
        return res.status(200).json({
          success: false,
          error: 'Токен бота не передан. Укажите токен в поле Bot Token.'
        });
      }

      // Determine public HTTPS origin
      let origin = '';
      if (clientOrigin && typeof clientOrigin === 'string' && clientOrigin.startsWith('https://')) {
        origin = clientOrigin.replace(/\/$/, '');
      } else {
        let rawHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || '';
        if (rawHost.includes(',')) {
          rawHost = rawHost.split(',')[0].trim();
        }
        if (rawHost && !rawHost.includes('localhost') && !rawHost.includes('127.0.0.1')) {
          origin = `https://${rawHost}`;
        }
      }

      let webhookUrl = (customWebhookUrl || '').toString().trim();
      if (!webhookUrl) {
        if (!origin || !origin.startsWith('https://')) {
          return res.status(200).json({
            success: false,
            error: 'Telegram требует HTTPS адрес. Не удалось определить публичный URL. Укажите clientOrigin или customWebhookUrl.'
          });
        }
        webhookUrl = `${origin}/api/telegram-webhook?token=${encodeURIComponent(cleanToken)}` +
          `&appUrl=${encodeURIComponent(appUrl || '')}` +
          `&autoDelete=${autoDelete !== false}` +
          `&deleteDelay=${deleteDelay || 30}`;
      }

      console.log('Registering Telegram setWebhook URL:', webhookUrl);

      let tgData: any = {};
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            allowed_updates: ['message', 'edited_message']
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const text = await tgRes.text();
        console.log('Telegram setWebhook raw response:', text);
        try {
          tgData = JSON.parse(text);
        } catch {
          tgData = { ok: false, description: text || `HTTP Status ${tgRes.status}` };
        }
      } catch (fetchErr: any) {
        console.error('Fetch error calling Telegram API:', fetchErr);
        tgData = {
          ok: false,
          description: fetchErr.name === 'AbortError'
            ? 'Превышено время ожидания ответа от Telegram API (таймаут 10с)'
            : (fetchErr.message || 'Ошибка соединения с Telegram API')
        };
      }

      let errorMessage = '';
      if (!tgData.ok) {
        if (tgData.description?.includes('Unauthorized') || tgData.error_code === 401) {
          errorMessage = 'Неверный Токен Бота (401 Unauthorized). Проверьте токен, полученный у @BotFather.';
        } else if (tgData.description?.includes('HTTPS') || tgData.description?.includes('url')) {
          errorMessage = `Telegram отклонил URL: ${tgData.description}`;
        } else {
          errorMessage = tgData.description || 'Telegram отклонил Webhook';
        }
      }

      return res.status(200).json({
        success: !!tgData.ok,
        tgResult: tgData,
        webhookUrl,
        error: errorMessage || undefined
      });
    } catch (err: any) {
      console.error('Unhandled error in telegram-setup-webhook route:', err);
      return res.status(200).json({ success: false, error: err.message || 'Неизвестная ошибка сервера' });
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
