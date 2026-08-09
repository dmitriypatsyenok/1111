import React, { useState } from 'react';
import { DayKey, HomeworkItem, HomeworkStore, Language, ProfileKey, ScheduleProfiles, ScreenType } from './types';
import { translate } from './i18n';
import { LESSON_TIMES, SUBJECT_LIST, SUBJECT_DB } from './defaultData';
import { formatCustomDate, getNextLessonDate, parseLessonName } from './dateFormatter';
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
  onSaveHomework: (subjectKey: string, text: string) => void;
  onEditHomework: (subjectKey: string, id: string, newText: string) => void;
  onDeleteHomework: (subjectKey: string, id: string) => void;
}

export const PROFILE_SUBJECT_KEYS = new Set([
  'math', 'algebra', 'geometry', 'chem', 'rus_lang', 'rus_lit', 'physics'
]);

export function getHomeworkStorageKey(subjKey: string, activeProfile: ProfileKey): string {
  const cleanKey = subjKey.replace(/^(base|math|chem|prof)_/, '');

  // Russian language: shared for math & chem profiles (prof_rus_lang), separate for base profile (base_rus_lang)
  if (cleanKey === 'rus_lang') {
    if (activeProfile === 'math' || activeProfile === 'chem') {
      return `prof_${cleanKey}`;
    }
    return `base_${cleanKey}`;
  }

  // Math subjects: profile-specific for math profile
  if (cleanKey === 'math' || cleanKey === 'algebra' || cleanKey === 'geometry') {
    if (activeProfile === 'math') {
      return `math_${cleanKey}`;
    }
    return `base_${cleanKey}`;
  }

  // Chemistry subject: profile-specific for chem profile
  if (cleanKey === 'chem') {
    if (activeProfile === 'chem') {
      return `chem_${cleanKey}`;
    }
    return `base_${cleanKey}`;
  }

  // Physics subject: profile-specific for math profile if needed
  if (cleanKey === 'physics') {
    if (activeProfile === 'math') {
      return `math_${cleanKey}`;
    }
    return `base_${cleanKey}`;
  }

  return cleanKey;
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
  const [editModalItem, setEditModalItem] = useState<HomeworkItem | null>(null);
  const [editText, setEditText] = useState('');

  const dayKeys: DayKey[] = ['pn', 'vt', 'sr', 'cht', 'pt'];
  const daysDict = translate('t_days_s', lang) as any;

  // Profile keys list
  const availableProfileKeys: ProfileKey[] = ['base', 'math', 'chem'];

  // Calculate next lesson date excluding existing homework dates
  const getSubjectNextLessonDate = (subjKey: string) => {
    const storageKey = getHomeworkStorageKey(subjKey, activeProfile);
    const currentList = homeworkStore[storageKey] || homeworkStore[subjKey] || [];
    const existingDueDates = currentList.map(item => item.due).filter(Boolean);
    return getNextLessonDate(subjKey, schedules, activeProfile, existingDueDates);
  };

  if (viewMode === 'main') {
    const rawList = (schedules[activeProfile] || schedules.base || {})[activeHwDay] || [];

    return (
      <div className="space-y-3.5 animate-fade-in">
        {/* Profile Selector at the top of Homework */}
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-3.5 space-y-2">
          <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
            {lang === 'be' ? 'Абярыце профіль' : 'Выберите профиль'}
          </div>
          <div className="flex bg-[#1a1a1a] p-1 rounded-2xl border border-[#2a2a2a] gap-1">
            {availableProfileKeys.map(pKey => {
              const profTitle = schedules[pKey]?.title || (pKey === 'base' ? 'База' : pKey === 'math' ? 'Матем' : 'Химия');
              const isActive = activeProfile === pKey;
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
              const storageKey = getHomeworkStorageKey(subjKey, activeProfile);
              const hwList = homeworkStore[storageKey] || homeworkStore[subjKey] || [];
              const hasHw = hwList.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    onSelectSubject(storageKey);
                    onNavigate('hw-detail');
                  }}
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
      </div>
    );
  }

  if (viewMode === 'subjects') {
    return (
      <div className="space-y-3.5 animate-fade-in">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
          {translate('choose_subject', lang)}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {SUBJECT_LIST.map(s => {
            const storageKey = getHomeworkStorageKey(s.key, activeProfile);
            const list = homeworkStore[storageKey] || homeworkStore[s.key] || [];
            const hasHw = list.length > 0;

            return (
              <div
                key={s.key}
                onClick={() => {
                  onSelectSubject(storageKey);
                  onNavigate('hw-detail');
                }}
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
      </div>
    );
  }

  // Detail Mode
  const baseSubjectKey = activeSubjectKey.replace(/^(base|math|chem|prof)_/, '');
  const storageKey = getHomeworkStorageKey(activeSubjectKey, activeProfile);

  const dbItem = SUBJECT_DB[baseSubjectKey];
  const listFound = SUBJECT_LIST.find(s => s.key === baseSubjectKey);

  const currentHwList = homeworkStore[storageKey] || [];
  const nextLessonISO = getSubjectNextLessonDate(baseSubjectKey);
  const nextLessonFormatted = formatCustomDate(nextLessonISO, 'day_month_long', lang);

  const handleCreateSubmit = () => {
    if (!inputText.trim()) return;
    onSaveHomework(storageKey, inputText.trim());
    setInputText('');
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
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-8 text-center text-[#888] text-xs">
              {translate('no_hw', lang)}
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
                <div className="text-xs text-white leading-relaxed whitespace-pre-wrap font-medium">
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
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {lang === 'be' ? 'На ўрок' : 'На урок'}: {nextLessonFormatted}
            </span>
          </div>

          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={
              lang === 'be'
                ? 'Напрыклад: Стр. 42, №5-8, вывучыць правіла'
                : 'Например: Стр. 42, №5-8, выучить правило'
            }
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl text-xs text-white p-3.5 min-h-[100px] focus:outline-none focus:border-indigo-500 resize-y placeholder:text-[#666]"
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
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl text-xs text-white p-3.5 min-h-[100px] focus:outline-none focus:border-indigo-500 resize-y"
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
    </div>
  );
};
