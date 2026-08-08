import React from 'react';
import { BirthdayItem, Language } from './types';
import { translate } from './i18n';
import { getMonthNominal } from './dateFormatter';

interface BirthdaysViewProps {
  birthdays: BirthdayItem[];
  lang: Language;
}

const MONTH_EMOJIS: Record<number, string> = {
  1: "❄️",
  2: "💕",
  3: "🌸",
  4: "🐰",
  5: "🌷",
  6: "☀️",
  7: "🏖️",
  8: "🌻",
  9: "🍁",
  10: "🎃",
  11: "🍂",
  12: "🎄"
};

export const BirthdaysView: React.FC<BirthdaysViewProps> = ({ birthdays, lang }) => {
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;

  const todayBdays = birthdays.filter(b => {
    if (!b?.date) return false;
    const parts = b.date.trim().split('.');
    if (parts.length < 2) return false;
    return parseInt(parts[0], 10) === d && parseInt(parts[1], 10) === m;
  });

  // Group by month
  const byMonth: Record<number, BirthdayItem[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: []
  };

  birthdays.forEach(b => {
    if (!b?.date) return;
    const parts = b.date.trim().split('.');
    if (parts.length === 2) {
      const monthNum = parseInt(parts[1], 10);
      if (byMonth[monthNum]) {
        byMonth[monthNum].push(b);
      }
    }
  });

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Today Banner */}
      {todayBdays.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="text-3xl">🎂</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {translate('today_birthdays', lang)}
            </div>
            <div className="text-xs text-white mt-0.5 font-bold">
              {todayBdays.map(b => b.name).join(', ')} 🎉
            </div>
          </div>
        </div>
      )}

      {/* Months list */}
      <div className="space-y-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(monthIdx => {
          const list = byMonth[monthIdx] || [];
          if (list.length === 0) return null;

          const mName = getMonthNominal(monthIdx, lang);
          const emoji = MONTH_EMOJIS[monthIdx] || '🎂';

          return (
            <div key={monthIdx} className="space-y-2">
              <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
                {emoji} {mName}
              </div>

              <div className="space-y-2">
                {list.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 shadow-sm"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 text-sm">
                      🎂
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
                        {item.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
