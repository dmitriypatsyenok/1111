import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { ScreenType, Language } from './types';
import { translate } from './i18n';
import { SUBJECT_LIST, SUBJECT_DB } from './defaultData';
import { extractSubjectKey } from './dateFormatter';

interface TopbarProps {
  currentScreen: ScreenType;
  screenHistory: ScreenType[];
  profileName?: string;
  activeSubjectKey?: string;
  activePollDate?: string;
  lang: Language;
  onBack: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentScreen,
  screenHistory,
  profileName,
  activeSubjectKey,
  activePollDate,
  lang,
  onBack
}) => {
  const showBack = screenHistory.length > 1;

  const getTitle = (): string => {
    switch (currentScreen) {
      case 'home':
        return translate('app_title', lang);
      case 'schedule':
        return translate('t_schedule', lang);
      case 'schedule-days':
        return profileName || translate('t_schedule', lang);
      case 'hw':
        return translate('t_hw', lang);
      case 'hw-subjects':
        return translate('search_subject', lang);
      case 'hw-detail': {
        const cleanKey = extractSubjectKey(activeSubjectKey || '');
        const dbItem = SUBJECT_DB[cleanKey];
        if (dbItem) {
          return `${dbItem.ic} ${dbItem[lang]}`;
        }
        const found = SUBJECT_LIST.find(s => s.key === cleanKey);
        if (found) {
          return found[lang];
        }
        return translate('t_hw', lang);
      }
      case 'canteen':
        return translate('t_food', lang);
      case 'canteen-poll':
        return translate('poll_vote', lang);
      case 'canteen-history':
        return translate('poll_results', lang);
      case 'canteen-result':
        return activePollDate || translate('poll_results', lang);
      case 'events':
        return translate('t_events', lang);
      case 'class':
        return translate('t_class', lang);
      case 'duties':
        return translate('t_duties', lang);
      case 'birthdays':
        return translate('t_birthdays', lang);
      case 'settings':
        return translate('t_settings', lang);
      default:
        return 'Ierihon3 Mini App';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-[#1f1f1f] select-none">
      <button
        id="topbar-back-btn"
        onClick={onBack}
        className={`w-9 h-9 rounded-xl flex items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a] text-[#ededed] hover:border-indigo-500/50 hover:text-white transition-all active:scale-95 cursor-pointer ${
          showBack ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        aria-label="Назад"
      >
        <ChevronLeft className="w-5 h-5 text-gray-300" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-[17px] font-bold text-white tracking-tight truncate flex items-center gap-2">
          <span className="w-2 h-4 bg-indigo-500 rounded-full inline-block"></span>
          {getTitle()}
        </h1>
      </div>
    </header>
  );
};
