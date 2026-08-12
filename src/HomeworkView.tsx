import React, { useState } from 'react';
import { DayKey, HomeworkItem, HomeworkStore, Language, ProfileKey, ScheduleProfiles, ScreenType } from './types';
import { translate, getProfileTitle } from './i18n';
import { LESSON_TIMES, SUBJECT_LIST, SUBJECT_DB } from './defaultData';
import { formatCustomDate, getNextLessonDate, parseLessonName, extractSubjectKey } from './dateFormatter';
import { Search, ChevronRight, Edit2, Trash2, Calendar, Plus } from 'lucide-react';
import { haptic } from './telegram';

interface HomeworkViewProps {
  viewMode: 'main' | 'subjects' | 'detail';
  homeworkStore: HomeworkStore;
  schedules: ScheduleProfiles;
  activeProfile: ProfileKey;
  activeSubjectKey: string;
  activeHwDay: DayKey;
  lang: Language;
  onSelectProfile: (profile: ProfileKey) => void;
  onSelectSubject: (key: string) => void;
  onSelectHwDay: (day: DayKey) => void;
  onNavigate: (s: ScreenType) => void;
  onSaveHomework: (subjectKey: string, text: string, customDueDate?: string) => void;
  onEditHomework: (subjectKey: string, id: string, newText: string) => void;
  onDeleteHomework: (subjectKey: string, id: string) => void;
}

export const PROFILE_SUBJECT_KEYS = new Set([
  'math', 'algebra', 'geometry', 'chem', 'rus_lang', 'rus_lit', 'physics'
]);

export function getHomeworkStorageKey(subjKey: string, activeProfile: ProfileKey): string {
  const cleanKey = extractSubjectKey(subjKey);

  // Russian language: profile subject for math & chem profiles (shared prof_rus_lang)
  if (cleanKey === 'rus_lang') {
    if (activeProfile === 'math' || activeProfile === 'chem') {
      return 'prof_rus_lang';
    }
    return 'base_rus_lang';
  }

  // Math profile subjects: math, algebra, geometry
  if (['math', 'algebra', 'geometry'].includes(cleanKey)) {
    if (activeProfile === 'math') {
      return `math_${cleanKey}`;
    }
    return `base_${cleanKey}`;
  }

  // Chemistry profile subject: chem
  if (cleanKey === 'chem') {
    if (activeProfile === 'chem') {
      return `chem_${cleanKey}`;
    }
    return `base_${cleanKey}`;
  }

  // All other subjects are non-profile and stay base/common for all profiles
  return `base_${cleanKey}`;
}

export function getSubjectHwList(subjKey: string, activeProfile: ProfileKey, homeworkStore: HomeworkStore): HomeworkItem[] {
  const cleanKey = extractSubjectKey(subjKey);
  const primaryKey = getHomeworkStorageKey(cleanKey, activeProfile);

  if (homeworkStore[primaryKey] && homeworkStore[primaryKey].length > 0) {
    return homeworkStore[primaryKey];
  }

  // Fallback to clean key ONLY for non-profile subjects or legacy base homework
  if (homeworkStore[cleanKey] && homeworkStore[cleanKey].length > 0) {
    return homeworkStore[cleanKey];
  }

  return [];
}

export const HomeworkView: React.FC<HomeworkViewProps> = ({
  viewMode,
  homeworkStore,
  schedules,
  activeProfile,
  activeSubjectKey,
  activeHwDay,
  lang,
  onSelectProfile,
  onSelectSubject,
  onSelectHwDay,
  onNavigate,
  onSaveHomework,
  onEditHomework,
  onDeleteHomework
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'create'>('history');
  const [inputText, setInputText] = useState('');
  const [customDueDate, setCustomDueDate] = useState('');
  const [editModalItem, setEditModalItem] = useState<HomeworkItem | null>(null);
  const [editText, setEditText] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [showForeignModal, setShowForeignModal] = useState(false);

  const dayKeys: DayKey[] = ['pn', 'vt', 'sr', 'cht', 'pt'];
  const daysDict = translate('t_days_s', lang) as any;

  // Profile keys list
  const availableProfileKeys = (schedules && Object.keys(schedules).length > 0) ? (Object.keys(schedules) as ProfileKey[]) : ['base'];
  const effectiveProfile = availableProfileKeys.includes(activeProfile) ? activeProfile : availableProfileKeys[0];

  const getSubjectHwListLocal = (subjKey: string) => {
    return getSubjectHwList(subjKey, effectiveProfile, homeworkStore);
  };

  const handleSubjectSelect = (subjKey: string) => {
    const cleanKey = extractSubjectKey(subjKey);
    if (['foreign_lang', 'eng_lang', 'ger_lang'].includes(cleanKey)) {
      setShowForeignModal(true);
      haptic('light');
      return;
    }
    onSelectSubject(cleanKey);
    onNavigate('hw-detail');
    haptic('light');
  };

  // Calculate next lesson date excluding existing homework dates
  const getSubjectNextLessonDate = (subjKey: string) => {
    const cleanKey = extractSubjectKey(subjKey);
    const currentList = getSubjectHwListLocal(subjKey);
    const existingDueDates = currentList.map(item => item.due).filter(Boolean);
    return getNextLessonDate(cleanKey, schedules, effectiveProfile, existingDueDates);
  };

  const renderForeignModal = () => {
    if (!showForeignModal) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full max-w-md bg-[#0f0f0f] border border-[#2a2a2a] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xl shrink-0">
              🌍
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'be' ? 'Замежная мова' : 'Иностранный язык'}
              </h3>
              <p className="text-[11px] text-[#888] mt-0.5">
                {lang === 'be' ? 'Абярыце мову для дамашняга задання:' : 'Выберите язык для домашнего задания:'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* English */}
            {(() => {
              const engCount = getSubjectHwListLocal('eng_lang').length;
              return (
                <button
                  onClick={() => {
                    setShowForeignModal(false);
                    onSelectSubject('eng_lang');
                    onNavigate('hw-detail');
                    haptic('selection');
                  }}
                  className="w-full bg-[#161616] border border-[#2a2a2a] hover:border-indigo-500/50 hover:bg-[#1c1c1c] rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇬🇧</span>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {lang === 'be' ? 'Англійская мова' : 'Английский язык'}
                      </div>
                      <div className="text-[10px] text-[#777] mt-0.5">
                        {engCount > 0
                          ? (lang === 'be' ? `Заданняў: ${engCount}` : `Заданий: ${engCount}`)
                          : (lang === 'be' ? 'Немае заданняў' : 'Нет заданий')}
                      </div>
                    </div>
                  </div>
                  {engCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  )}
                </button>
              );
            })()}

            {/* German */}
            {(() => {
              const gerCount = getSubjectHwListLocal('ger_lang').length;
              return (
                <button
                  onClick={() => {
                    setShowForeignModal(false);
                    onSelectSubject('ger_lang');
                    onNavigate('hw-detail');
                    haptic('selection');
                  }}
                  className="w-full bg-[#161616] border border-[#2a2a2a] hover:border-indigo-500/50 hover:bg-[#1c1c1c] rounded-2xl p-3.5 flex items-center justify-between text-left transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇩🇪</span>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {lang === 'be' ? 'Нямецкая мова' : 'Немецкий язык'}
                      </div>
                      <div className="text-[10px] text-[#777] mt-0.5">
                        {gerCount > 0
                          ? (lang === 'be' ? `Заданняў: ${gerCount}` : `Заданий: ${gerCount}`)
                          : (lang === 'be' ? 'Немае заданняў' : 'Нет заданий')}
                      </div>
                    </div>
                  </div>
                  {gerCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  )}
                </button>
              );
            })()}
          </div>

          <button
            onClick={() => setShowForeignModal(false)}
            className="w-full py-2.5 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-[#aaa] hover:text-white font-bold hover:bg-[#222] transition-all cursor-pointer"
          >
            {translate('cancel', lang)}
          </button>
        </div>
      </div>
    );
  };

  if (viewMode === 'main') {
    const activeSched = schedules[effectiveProfile] || schedules.base || Object.values(schedules || {})[0] || {};
    const rawList = activeSched[activeHwDay] || [];

    return (
      <div className="space-y-3.5 animate-fade-in">
        {/* Profile Selector at the top of Homework */}
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-3.5 space-y-2">
          <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
            {lang === 'be' ? 'Абярыце профіль' : 'Выберите профиль'}
          </div>
          <div className="flex bg-[#1a1a1a] p-1 rounded-2xl border border-[#2a2a2a] gap-1">
            {availableProfileKeys.map(pKey => {
              const profTitle = getProfileTitle(pKey, schedules, lang);
              const isActive = effectiveProfile === pKey;
              return (
                <button
                  key={pKey}
                  onClick={() => {
                    onSelectProfile(pKey);
                    haptic('light');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                      : 'text-[#888] hover:bg-[#252525] hover:text-white'
                  }`}
                >
                  {profTitle}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Subject Action Card */}
        <div
          onClick={() => onNavigate('hw-subjects')}
          className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.99] group shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">
              {translate('search_subject', lang)}
            </div>
            <div className="text-xs text-[#888] mt-0.5">
              {translate('search_subject_d', lang)}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#555] group-hover:text-indigo-400 transition-colors" />
        </div>

        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
          {translate('hw_by_days', lang)}
        </div>

        {/* Segmented Control for Days */}
        <div className="flex bg-[#1a1a1a] p-1 rounded-2xl border border-[#2a2a2a] gap-1">
          {dayKeys.map(d => (
            <button
              key={d}
              onClick={() => onSelectHwDay(d)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                d === activeHwDay
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                  : 'text-[#888] hover:bg-[#252525] hover:text-white'
              }`}
            >
              {daysDict?.[d] || d}
            </button>
          ))}
        </div>

        {/* Lesson List */}
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
              const subjKey = meta.key || 'math';
              const isForeign = ['foreign_lang', 'eng_lang', 'ger_lang'].includes(subjKey);
              const hwList = getSubjectHwListLocal(subjKey);
              const hasHw = isForeign
                ? getSubjectHwListLocal('eng_lang').length > 0 || getSubjectHwListLocal('ger_lang').length > 0 || hwList.length > 0
                : hwList.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => handleSubjectSelect(subjKey)}
                  className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.99] group"
                >
                  <div className="w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
                    {num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="truncate">{displayName}</span>
                      <span className="text-sm shrink-0">{meta.ic}</span>
                      {hasHw && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] shrink-0 ml-1" />
                      )}
                    </div>
                    {timeStr && (
                      <div className="text-[11px] text-[#888] mt-0.5">
                        {timeStr}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-indigo-400 transition-colors" />
                </div>
              );
            })}
          </div>
        )}
        {renderForeignModal()}
      </div>
    );
  }

  if (viewMode === 'subjects') {
    const filteredSubjects = SUBJECT_LIST.filter(s =>
      s[lang].toLowerCase().includes(subjectSearch.trim().toLowerCase()) ||
      s.ru.toLowerCase().includes(subjectSearch.trim().toLowerCase()) ||
      s.be.toLowerCase().includes(subjectSearch.trim().toLowerCase())
    );

    return (
      <div className="space-y-3.5 animate-fade-in">
        <div className="flex items-center justify-between px-1">
          <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest">
            {translate('choose_subject', lang)}
          </div>
        </div>

        {/* Search Subject Input Bar */}
        <div className="relative">
          <input
            type="text"
            value={subjectSearch}
            onChange={e => setSubjectSearch(e.target.value)}
            placeholder={lang === 'be' ? 'Пошук прадмета па назве...' : 'Поиск предмета по названию...'}
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-full text-xs text-white pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 placeholder:text-[#666]"
          />
          <Search className="w-4 h-4 text-[#888] absolute left-3.5 top-3.5" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {filteredSubjects.map(s => {
            const list = getSubjectHwListLocal(s.key);
            const isForeign = ['foreign_lang', 'eng_lang', 'ger_lang'].includes(s.key);
            const hasHw = isForeign
              ? getSubjectHwListLocal('eng_lang').length > 0 || getSubjectHwListLocal('ger_lang').length > 0 || list.length > 0
              : list.length > 0;

            return (
              <div
                key={s.key}
                onClick={() => handleSubjectSelect(s.key)}
                className="relative bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.98] group"
              >
                {hasHw && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                )}
                <div className="text-xs font-bold text-white pr-3 group-hover:text-indigo-300 transition-colors">
                  {s[lang]}
                </div>
              </div>
            );
          })}
        </div>
        {renderForeignModal()}
      </div>
    );
  }

  // Detail Mode
  const baseSubjectKey = extractSubjectKey(activeSubjectKey);
  const storageKey = getHomeworkStorageKey(baseSubjectKey, effectiveProfile);

  const dbItem = SUBJECT_DB[baseSubjectKey];
  const listFound = SUBJECT_LIST.find(s => s.key === baseSubjectKey);

  const currentHwList = getSubjectHwListLocal(baseSubjectKey);
  const nextLessonISO = getSubjectNextLessonDate(baseSubjectKey);
  const effectiveDueDate = customDueDate || nextLessonISO;
  const effectiveDueDateFormatted = formatCustomDate(effectiveDueDate, 'day_month_long', lang);

  const handleCreateSubmit = () => {
    if (!inputText.trim()) return;
    onSaveHomework(storageKey, inputText.trim(), effectiveDueDate);
    setInputText('');
    setCustomDueDate('');
    setActiveTab('history');
    haptic('success');
  };

  const handleEditSubmit = () => {
    if (!editModalItem || !editText.trim()) return;
    onEditHomework(storageKey, editModalItem.id, editText.trim());
    setEditModalItem(null);
    setEditText('');
    haptic('success');
  };

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Subject Banner */}
      <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 text-xl">
          {dbItem?.ic || '📚'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">
            {dbItem ? dbItem[lang] : (listFound ? listFound[lang] : baseSubjectKey)}
          </div>
          <div className="text-[11px] text-[#888] mt-0.5">
            {translate('t_hw', lang)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#1a1a1a] p-1 rounded-2xl border border-[#2a2a2a] gap-1">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
              : 'text-[#888] hover:bg-[#252525] hover:text-white'
          }`}
        >
          {translate('hw_history', lang)}
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'create'
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
              : 'text-[#888] hover:bg-[#252525] hover:text-white'
          }`}
        >
          {translate('hw_create', lang)}
        </button>
      </div>

      {activeTab === 'history' && (
        <div className="space-y-3">
          {currentHwList.length === 0 ? (
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-8 text-center space-y-3">
              <div className="text-[#888] text-xs">
                {translate('no_hw', lang)}
              </div>
              <button
                onClick={() => {
                  setActiveTab('create');
                  haptic('light');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-600/30 transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{translate('hw_create', lang)}</span>
              </button>
            </div>
          ) : (
            currentHwList.map(item => (
              <div
                key={item.id}
                className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 space-y-3 shadow-sm"
              >
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {translate('next_lesson', lang)}{' '}
                    {formatCustomDate(item.due, 'day_month_short', lang)}
                  </span>
                </div>
                <div className="text-xs text-white leading-relaxed whitespace-pre-wrap font-medium select-text">
                  {item.text}
                </div>
                <div className="flex gap-2 pt-2 border-t border-[#1f1f1f]">
                  <button
                    onClick={() => {
                      setEditModalItem(item);
                      setEditText(item.text);
                    }}
                    className="flex-1 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#222] text-xs font-bold text-white border border-[#2a2a2a] flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{translate('edit', lang)}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(translate('confirm_delete_hw', lang))) {
                        onDeleteHomework(storageKey, item.id);
                        haptic('success');
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 border border-rose-500/30 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{translate('delete', lang)}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 space-y-3.5">
          <div className="flex flex-col gap-2 bg-[#161616] p-3 rounded-2xl border border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#888] uppercase tracking-wider">
                {lang === 'be' ? 'Дата здачы' : 'Дата сдачи'}:
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
                {effectiveDueDateFormatted}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-[#222]">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <input
                type="date"
                value={effectiveDueDate}
                onChange={e => setCustomDueDate(e.target.value)}
                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-xs text-white px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 w-full cursor-pointer"
              />
            </div>
          </div>

          <textarea
            autoFocus
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (inputText.trim()) {
                  handleCreateSubmit();
                }
              }
            }}
            placeholder={
              lang === 'be'
                ? 'Напрыклад: с. 42, №5'
                : 'Например: с. 42, №5'
            }
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl text-xs text-white p-3.5 min-h-[100px] focus:outline-none focus:border-indigo-500 resize-y placeholder:text-[#666] select-text pointer-events-auto"
          />

          <button
            onClick={handleCreateSubmit}
            disabled={!inputText.trim()}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{translate('save_hw_btn', lang)}</span>
          </button>
        </div>
      )}

      {/* Edit Homework Modal */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#0f0f0f] border border-[#2a2a2a] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slide-up">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-4 bg-indigo-500 rounded-full inline-block"></span>
              {translate('hw_edit_title', lang)}
            </h3>
            <textarea
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (editText.trim()) {
                    handleEditSubmit();
                  }
                }
              }}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl text-xs text-white p-3.5 min-h-[100px] focus:outline-none focus:border-indigo-500 resize-y select-text pointer-events-auto"
            />
            <div className="flex gap-2.5">
              <button
                onClick={() => setEditModalItem(null)}
                className="flex-1 py-2.5 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-white font-bold hover:bg-[#222] transition-all"
              >
                {translate('cancel', lang)}
              </button>
              <button
                onClick={handleEditSubmit}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold shadow-lg shadow-indigo-500/20 transition-all"
              >
                {translate('save', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
      {renderForeignModal()}
    </div>
  );
};
