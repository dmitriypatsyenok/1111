import React from 'react';
import { DayKey, Language, ProfileKey, ScheduleProfiles, ScreenType } from './types';
import { translate } from './i18n';
import { LESSON_TIMES, SUBJECT_DB } from './defaultData';
import { parseLessonName } from './dateFormatter';
import { ChevronRight, Ruler, BookOpen, FlaskConical } from 'lucide-react';

interface ScheduleViewProps {
  viewMode: 'profiles' | 'days';
  schedules: ScheduleProfiles;
  activeProfile: ProfileKey;
  activeDay: DayKey;
  lang: Language;
  onSelectProfile: (p: ProfileKey) => void;
  onSelectDay: (d: DayKey) => void;
  onNavigate: (s: ScreenType) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  viewMode,
  schedules,
  activeProfile,
  activeDay,
  lang,
  onSelectProfile,
  onSelectDay
}) => {
  const profileKeys: ProfileKey[] = ['base', 'math', 'chem'];
  const dayKeys: DayKey[] = ['pn', 'vt', 'sr', 'cht', 'pt'];

  if (viewMode === 'profiles') {
    return (
      <div className="space-y-3.5 animate-fade-in">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
          {translate('choose_profile', lang)}
        </div>
        <div className="space-y-2.5">
          {profileKeys.map(pKey => {
            const getIcon = () => {
              if (pKey === 'math') return <Ruler className="w-5 h-5 text-indigo-400" />;
              if (pKey === 'chem') return <FlaskConical className="w-5 h-5 text-purple-400" />;
              return <BookOpen className="w-5 h-5 text-emerald-400" />;
            };

            const profilesDict = translate('profiles', lang) as any;
            const name = profilesDict?.[pKey] || pKey;

            return (
              <div
                key={pKey}
                onClick={() => onSelectProfile(pKey)}
                className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.99] group shadow-sm"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0 group-hover:bg-indigo-600/20 group-hover:border-indigo-500/40 transition-all">
                  {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {name}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#555] group-hover:text-indigo-400 transition-colors" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Days View
  const daysDict = translate('t_days_s', lang) as any;
  const fullDaysDict = translate('t_days', lang) as any;
  const rawList = (schedules[activeProfile] || schedules.base || {})[activeDay] || [];

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Segmented Control for Days */}
      <div className="flex bg-[#1a1a1a] p-1 rounded-2xl border border-[#2a2a2a] gap-1">
        {dayKeys.map(d => (
          <button
            key={d}
            onClick={() => onSelectDay(d)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              d === activeDay
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                : 'text-[#888] hover:bg-[#252525] hover:text-white'
            }`}
          >
            {daysDict?.[d] || d}
          </button>
        ))}
      </div>

      <div className="text-sm font-bold text-white px-1 flex items-center gap-2">
        <span className="w-2 h-4 bg-indigo-500 rounded-full inline-block"></span>
        {fullDaysDict?.[activeDay] || activeDay}
      </div>

      {rawList.length === 0 ? (
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-8 text-center text-[#888] text-xs">
          {translate('no_lessons', lang)}
        </div>
      ) : (
        <div className="space-y-2.5">
          {rawList.map((item, idx) => {
            let num = idx + 1;
            let nameStr = item;
            const matchNum = item.match(/^(\d+)[\.\s]+(.*)/);
            if (matchNum) {
              num = parseInt(matchNum[1], 10);
              nameStr = matchNum[2];
            }

            const meta = parseLessonName(nameStr, SUBJECT_DB);
            const displayName = meta[lang] || nameStr;
            const timeStr = LESSON_TIMES[num - 1] || '';

            return (
              <div
                key={idx}
                className="flex items-start gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 hover:border-indigo-500/30 transition-all"
              >
                <div className="w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="truncate">{displayName}</span>
                    <span className="text-sm shrink-0">{meta.ic}</span>
                  </div>
                  {timeStr && (
                    <div className="text-[11px] text-[#888] mt-0.5 font-medium">
                      {timeStr}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
