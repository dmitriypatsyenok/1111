declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export const tg = window.Telegram?.WebApp || null;

export function initTelegramApp() {
  if (tg) {
    tg.ready?.();
    // tg.expand() is intentionally omitted so the app opens as a compact bottom sheet in Telegram
  }
}

export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection') {
  if (!tg?.HapticFeedback) return;
  try {
    if (type === 'selection') {
      tg.HapticFeedback.selectionChanged();
    } else if (type === 'success' || type === 'error') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch (e) {
    // ignore
  }
}

export function getTelegramUserName(defaultLang: 'ru' | 'be'): string {
  if (tg?.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    const parts = [u.first_name, u.last_name].filter(Boolean);
    const name = parts.join(' ');
    const username = u.username ? ` (@${u.username})` : '';
    return name ? `${name}${username}` : (defaultLang === 'be' ? 'Вучань' : 'Ученик');
  }
  return defaultLang === 'be' ? 'Вучань' : 'Ученик';
}

export async function sendNotification(title: string, message: string) {
  haptic('success');

  // 1. Web Push Notification (Browser)
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body: message, icon: '/favicon.ico' });
      } catch (e) {
        console.warn('Browser notification error:', e);
      }
    } else if (Notification.permission !== 'denied') {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body: message, icon: '/favicon.ico' });
        }
      } catch (e) {
        console.warn('Notification permission request error:', e);
      }
    }
  }

  // 2. Telegram Bot API call (if configured in settings or localStorage)
  const botToken = localStorage.getItem('ierihon_tg_token');
  const chatId = localStorage.getItem('ierihon_tg_chat_id');

  if (botToken && chatId) {
    try {
      const text = `<b>${title}</b>\n${message}`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });
    } catch (e) {
      console.warn('Telegram Bot API notify error:', e);
    }
  }

  // 3. Telegram WebApp Haptic / Popup feedback
  if (tg) {
    try {
      if (tg.showPopup) {
        // Subtle non-blocking popup if needed or let Telegram WebApp handle it
      }
    } catch (e) {
      // ignore
    }
  }
}

