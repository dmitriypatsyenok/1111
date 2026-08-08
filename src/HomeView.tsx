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
    const matches = birthdays.filter(b => {
      if (!b?.date) return false;
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
      const sched = (schedules[activeProfile] || schedules.base || {})[dayKey] || [];

      if (!sched.length) {
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

      if (currentMinutes < timeTable[0].start) {
        const meta = parseLessonName(sched[0] || '', SUBJECT_DB);
        setWidgetData({
          icon: '🌅',
          title: lang === 'be' ? 'Урокі яшчэ не пачаліся' : 'Уроки еще не начались',
          sub: `${lang === 'be' ? 'Першы ўрок у 08:00: ' : 'Первый урок в 08:00: '}${meta[lang] || sched[0]}`
        });
        return;
      }

      if (currentMinutes > timeTable[timeTable.length - 1].end) {
        setWidgetData({
          icon: '🎉',
          title: lang === 'be' ? 'Урокі завершаны!' : 'Уроки завершены!',
          sub: lang === 'be' ? 'Добрага адпачынку!' : 'Хорошего отдыха!'
        });
        return;
      }

      for (let i = 0; i < timeTable.length; i++) {
        const slot = timeTable[i];
        if (currentMinutes >= slot.start && currentMinutes <= slot.end) {
          const left = slot.end - currentMinutes;
          const meta = parseLessonName(sched[slot.num - 1] || '', SUBJECT_DB);
          setWidgetData({
            icon: '🔔',
            title: `${lang === 'be' ? 'Зараз урок' : 'Сейчас урок'} ${slot.num}: ${meta[lang] || sched[slot.num - 1]}`,
            sub: `${lang === 'be' ? 'Да канца ўрока' : 'До конца урока'}: ${left} ${lang === 'be' ? 'хв' : 'мин'}`
          });
          return;
        }

        if (i < timeTable.length - 1) {
          const nextSlot = timeTable[i + 1];
          if (currentMinutes > slot.end && currentMinutes < nextSlot.start) {
            const left = nextSlot.start - currentMinutes;
            const meta = parseLessonName(sched[nextSlot.num - 1] || '', SUBJECT_DB);
            setWidgetData({
              icon: '☕',
              title: `${lang === 'be' ? 'Перапынак! Наступны' : 'Перемена! Следующий'} №${nextSlot.num}: ${meta[lang] || sched[nextSlot.num - 1]}`,
              sub: `${lang === 'be' ? 'Да ўрока засталося' : 'До урока осталось'}: ${left} ${lang === 'be' ? 'хв' : 'мин'}`
            });
            return;
          }
        }
      }
    }

    updateWidget();
    const timer = setInterval(updateWidget, 10000);
    return () => clearInterval(timer);
  }, [activeProfile, schedules, lang]);

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Hero Header */}
      <div className="flex items-baseline justify-between px-1 py-0.5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {translate('hi', lang)} <span className="text-indigo-400">👋</span>
          </h2>
          <p className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mt-0.5">
            {lang === 'be' ? 'Панель кіравання класам' : 'Панель управления классом'}
          </p>
        </div>
        <div className="text-xs text-[#888] capitalize font-medium">
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

      {/* Live Lesson Widget - Bento Card */}
      <div
        id="lesson-widget"
        onClick={() => onNavigate('schedule-days')}
        className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 flex items-center gap-3.5 cursor-pointer hover:border-indigo-500/50 hover:bg-[#141414] transition-all active:scale-[0.99] shadow-lg shadow-indigo-500/5"
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
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-amber-500/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
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
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-emerald-500/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
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
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-purple-500/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
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
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-rose-500/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
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
          className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 min-h-[105px] flex flex-col justify-between cursor-pointer hover:bg-[#141414] hover:border-[#333] transition-all active:scale-[0.98] group"
        >
          <div className="w-9 h-9 rounded-2xl bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-[#aaa] group-hover:bg-[#333] group-hover:text-white transition-all">
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
