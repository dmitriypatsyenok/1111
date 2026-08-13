import React, { useState, useEffect } from 'react';
import { BirthdayItem, Language, ProfileKey, ScheduleProfiles, ScreenType } from './types';
import { translate } from './i18n';
import { formatCustomDate, parseLessonName } from './dateFormatter';
import { SUBJECT_DB } from './defaultData';
import { BookOpen, Calendar, Settings, Users, Utensils, Ruler } from 'lucide-react';

interface HomeViewProps {
  birthdays: BirthdayItem[];
  schedules: ScheduleProfiles;
  activeProfile: ProfileKey;
  lang: Language;
  onNavigate: (screen: ScreenType) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  birthdays,
  schedules,
  activeProfile,
  lang,
  onNavigate
}) => {
  const [todayBdays, setTodayBdays] = useState<BirthdayItem[]>([]);
  const [widgetData, setWidgetData] = useState<{ icon: string; title: string; sub: string }>({
    icon: '🔔',
    title: 'Загрузка...',
    sub: ''
  });

  // Calculate today's birthdays
  useEffect(() => {
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth() + 1;
    const matches = (birthdays || []).filter(b => {
      if (!b?.date || (b.name && b.name.includes('Иванова'))) return false;
      const parts = b.date.trim().split('.');
      if (parts.length < 2) return false;
      return parseInt(parts[0], 10) === d && parseInt(parts[1], 10) === m;
    });
    setTodayBdays(matches);
  }, [birthdays]);

  // Update Live Lesson Widget
  useEffect(() => {
    function updateWidget() {
      const now = new Date();
      const dayOfWeek = now.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setWidgetData({
          icon: '🏖️',
          title: lang === 'be' ? 'Выхадны дзень' : 'Выходной день',
          sub: lang === 'be' ? 'Заняткаў няма, адпачывайце!' : 'Занятий нет, отдыхайте!'
        });
        return;
      }

      const dayKeysMap: Array<'pn' | 'vt' | 'sr' | 'cht' | 'pt'> = ['pn', 'vt', 'sr', 'cht', 'pt'];
      const dayKey = dayKeysMap[dayOfWeek - 1];
      const sched = (schedules[activeProfile] || schedules.base || Object.values(schedules || {})[0] || {})[dayKey] || [];

      let lastLessonIdx = -1;
      for (let i = sched.length - 1; i >= 0; i--) {
        if (sched[i] && typeof sched[i] === 'string' && sched[i].trim()) {
          lastLessonIdx = i;
          break;
        }
      }

      if (lastLessonIdx === -1) {
        setWidgetData({
          icon: '💤',
          title: translate('no_lessons', lang),
          sub: lang === 'be' ? 'На сёння ўрокаў няма' : 'На сегодня уроков нет'
        });
        return;
      }

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const timeTable = [
        { num: 1, start: 8 * 60, end: 8 * 60 + 45 },
        { num: 2, start: 8 * 60 + 55, end: 9 * 60 + 40 },
        { num: 3, start: 9 * 60 + 55, end: 10 * 60 + 40 },
        { num: 4, start: 10 * 60 + 55, end: 11 * 60 + 40 },
        { num: 5, start: 11 * 60 + 55, end: 12 * 60 + 40 },
        { num: 6, start: 12 * 60 + 50, end: 13 * 60 + 35 },
        { num: 7, start: 13 * 60 + 45, end: 14 * 60 + 30 },
        { num: 8, start: 14 * 60 + 40, end: 15 * 60 + 25 }
      ];

      const lastSlotIdx = Math.min(lastLessonIdx, timeTable.length - 1);
      const lastSlotEnd = timeTable[lastSlotIdx].end;

      if (currentMinutes < timeTable[0].start) {
        const firstLessonStr = sched[0] || '';
        const meta = parseLessonName(firstLessonStr, SUBJECT_DB);
        const nameText = meta[lang] || firstLessonStr;
        setWidgetData({
          icon: '🌅',
          title: lang === 'be' ? 'Урокі яшчэ не пачаліся' : 'Уроки еще не начались',
          sub: `${lang === 'be' ? 'Першы ўрок у 08:00: ' : 'Первый урок в 08:00: '}${nameText}`
        });
        return;
      }

      if (currentMinutes > lastSlotEnd) {
        setWidgetData({
          icon: '🎉',
          title: lang === 'be' ? 'Урокі завершаны!' : 'Уроки завершены!',
          sub: lang === 'be' ? 'Добрага адпачынку!' : 'Хорошего отдыха!'
        });
        return;
      }

      for (let i = 0; i <= lastSlotIdx; i++) {
        const slot = timeTable[i];
        if (currentMinutes >= slot.start && currentMinutes <= slot.end) {
          const left = slot.end - currentMinutes;
          const lessonStr = sched[i] || '';
          if (!lessonStr.trim()) {
            setWidgetData({
              icon: '☕',
              title: `${lang === 'be' ? 'Аконька (урок' : 'Окно (урок'} ${slot.num})`,
              sub: `${lang === 'be' ? 'Да канца' : 'До конца'}: ${left} ${lang === 'be' ? 'хв' : 'мин'}`
            });
          } else {
            const meta = parseLessonName(lessonStr, SUBJECT_DB);
            const nameText = meta[lang] || lessonStr;
            setWidgetData({
              icon: '🔔',
              title: `${lang === 'be' ? 'Зараз урок' : 'Сейчас урок'} ${slot.num}: ${nameText}`,
              sub: `${lang === 'be' ? 'Да канца ўрока' : 'До конца урока'}: ${left} ${lang === 'be' ? 'хв' : 'мин'}`
            });
          }
          return;
        }

        if (i < lastSlotIdx) {
          const nextSlot = timeTable[i + 1];
          if (currentMinutes > slot.end && currentMinutes < nextSlot.start) {
            const left = nextSlot.start - currentMinutes;
            const nextLessonStr = sched[i + 1] || '';
            const meta = parseLessonName(nextLessonStr, SUBJECT_DB);
            const nameText = meta[lang] || nextLessonStr || (lang === 'be' ? 'Аконька' : 'Окно');
            setWidgetData({
              icon: '☕',
              title: `${lang === 'be' ? 'Перапынак! Наступны' : 'Перемена! Следующий'} №${nextSlot.num}: ${nameText}`,
              sub: `${lang === 'be' ? 'Да ўрока засталося' : 'До урока осталось'}: ${left} ${lang === 'be' ? 'хв' : 'мин'}`
            });
            return;
          }
        }
      }

      setWidgetData({
        icon: '🎉',
        title: lang === 'be' ? 'Урокі завершаны!' : 'Уроки завершены!',
        sub: lang === 'be' ? 'Добрага адпачынку!' : 'Хорошего отдыха!'
      });
    }

    updateWidget();
    const timer = setInterval(updateWidget, 10000);
    return () => clearInterval(timer);
  }, [activeProfile, schedules, lang]);

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Hero Header */}
      <div className="flex items-center justify-between px-1 py-0.5">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-extrabold tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 uppercase">
              Ierihon
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {translate('hi', lang)}
          </h2>
        </div>
        <div className="text-xs text-[#888] capitalize font-medium text-right">
          {formatCustomDate(new Date(), 'weekday_day_month', lang)}
        </div>
      </div>

      {/* Birthday Banner if today is someone's birthday */}
      {todayBdays.length > 0 && (
        <div
          id="home-bday-banner"
          onClick={() => onNavigate('birthdays')}
          className="bg-pink-500/10 border border-pink-500/30 rounded-3xl p-4 flex items-center gap-3 cursor-pointer hover:bg-pink-500/15 transition-all shadow-lg shadow-pink-500/5"
        >
          <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-xl shrink-0">
            🎂
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-pink-400 uppercase tracking-wide">
              {translate('today_birthdays', lang)}
            </div>
            <div className="text-xs text-white mt-0.5 font-medium truncate">
              {todayBdays.map(b => b.name).join(', ')} 🎉
            </div>
          </div>
        </div>
      )}

      {/* Live Lesson Widget - Bento Display Screen */}
      <div
        id="lesson-widget"
        className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 flex items-center gap-3.5 shadow-lg shadow-indigo-500/5 select-none"
      >
        <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0 text-indigo-400 shadow-md shadow-indigo-500/10">
          {widgetData.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-indigo-400 truncate tracking-wide">
            {widgetData.title}
          </div>
          <div className="text-xs text-[#888] mt-0.5 truncate">
            {widgetData.sub}
          </div>
        </div>
      </div>

      {/* Main Grid Navigation - Bento Tiles */}
      <div className="grid grid-cols-2 gap-3 pt-0.5">
        {/* Schedule */}
        <div
          id="nav-card-schedule"
          onClick={() => onNavigate('schedule')}
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {translate('menu_schedule', lang)}
            </div>
            <div className="text-[11px] text-[#888] mt-0.5">
              {translate('menu_schedule_d', lang)}
            </div>
          </div>
        </div>

        {/* Canteen */}
        <div
          id="nav-card-canteen"
          onClick={() => onNavigate('canteen')}
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {translate('menu_food', lang)}
            </div>
            <div className="text-[11px] text-[#888] mt-0.5">
              {translate('menu_food_d', lang)}
            </div>
          </div>
        </div>

        {/* Homework */}
        <div
          id="nav-card-hw"
          onClick={() => onNavigate('hw')}
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {translate('menu_hw', lang)}
            </div>
            <div className="text-[11px] text-[#888] mt-0.5">
              {translate('menu_hw_d', lang)}
            </div>
          </div>
        </div>

        {/* Events */}
        <div
          id="nav-card-events"
          onClick={() => onNavigate('events')}
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {translate('menu_events', lang)}
            </div>
            <div className="text-[11px] text-[#888] mt-0.5">
              {translate('menu_events_d', lang)}
            </div>
          </div>
        </div>

        {/* Class Life */}
        <div
          id="nav-card-class"
          onClick={() => onNavigate('class')}
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {translate('menu_class', lang)}
            </div>
            <div className="text-[11px] text-[#888] mt-0.5">
              {translate('menu_class_d', lang)}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div
          id="nav-card-settings"
          onClick={() => onNavigate('settings')}
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#888] group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {translate('menu_settings', lang)}
            </div>
            <div className="text-[11px] text-[#888] mt-0.5">
              {translate('menu_settings_d', lang)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
