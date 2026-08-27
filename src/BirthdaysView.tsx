import React from 'react';
import { BirthdayItem, Language } from './types';
import { translate, getStudentDisplayName } from './i18n';
import { getMonthNominal } from './dateFormatter';
import { Cake, Calendar, Gift, Sparkles } from 'lucide-react';

interface BirthdaysViewProps {
  birthdays: BirthdayItem[];
  lang: Language;
}

export const BirthdaysView: React.FC<BirthdaysViewProps> = ({ birthdays, lang }) => {
  const cleanBirthdays = (birthdays || []).filter(b => b && b.name && !b.name.includes('Иванова'));
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;

  const todayBdays = cleanBirthdays.filter(b => {
    if (!b?.date) return false;
    const parts = b.date.trim().split('.');
    if (parts.length < 2) return false;
    return parseInt(parts[0], 10) === d && parseInt(parts[1], 10) === m;
  });

  // Group by month
  const byMonth: Record<number, BirthdayItem[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: []
  };

  cleanBirthdays.forEach(b => {
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
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
            <Cake className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>{translate('today_birthdays', lang)}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div className="text-xs text-white mt-0.5 font-bold">
              {todayBdays.map(b => getStudentDisplayName(b, lang)).join(', ')}
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

          return (
            <div key={monthIdx} className="space-y-2">
              <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>{mName}</span>
              </div>

              <div className="space-y-2">
                {list.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 bg-[#121215] border border-[#27272A] rounded-2xl p-3.5 shadow-sm"
                  >
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
                      <Cake className="w-4 h-4 text-zinc-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {getStudentDisplayName(item, lang)}
                      </div>
                      <div className="text-[11px] text-zinc-300 font-semibold mt-0.5">
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

