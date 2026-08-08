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
    if (tg.expand) {
      try {
        tg.expand();
      } catch (e) {
        // ignore if not supported
      }
    }
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
