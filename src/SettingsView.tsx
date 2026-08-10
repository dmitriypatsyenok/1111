import React, { useRef, useState } from 'react';
import { BirthdayItem, DayKey, DutiesStore, HomeworkStore, Language, PollData, ProfileKey, ScheduleProfiles } from './types';
import { translate, getProfileFullTitle } from './i18n';
import { haptic } from './telegram';
import { Download, Upload, Trash2, Check, Bell, Save, BookOpen, Ruler, FlaskConical } from 'lucide-react';

interface SettingsViewProps {
  lang: Language;
  schedules: ScheduleProfiles;
  activeProfile: ProfileKey;
  homework: HomeworkStore;
  duties: DutiesStore;
  birthdays: BirthdayItem[];
  currentPoll?: PollData;
  pollHistory?: PollData[];
  tgConfig?: {
    token: string;
    chatId: string;
    appUrl?: string;
  };
  onSetLang: (lang: Language) => void;
  onSetProfile: (profile: ProfileKey) => void;
  onImportSchedules: (data: ScheduleProfiles) => void;
  onImportHomework: (data: HomeworkStore) => void;
  onImportDuties: (data: DutiesStore) => void;
  onImportBirthdays: (data: BirthdayItem[]) => void;
  onClearAllHomework: () => void;
  onDeletePoll?: (pollId: string) => void;
  onClearAllData: () => void;
  onSaveTgConfig?: (
    token: string,
    chatId: string,
    appUrl?: string
  ) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  schedules,
  activeProfile,
  homework,
  duties,
  birthdays,
  currentPoll,
  pollHistory = [],
  tgConfig,
  onSetLang,
  onSetProfile,
  onImportSchedules,
  onImportHomework,
  onImportDuties,
  onImportBirthdays,
  onClearAllHomework,
  onDeletePoll,
  onClearAllData,
  onSaveTgConfig
}) => {
  const schedFileRef = useRef<HTMLInputElement>(null);
  const hwFileRef = useRef<HTMLInputElement>(null);
  const dutyFileRef = useRef<HTMLInputElement>(null);
  const bdayFileRef = useRef<HTMLInputElement>(null);

  const [tgToken, setTgToken] = useState(() => tgConfig?.token || localStorage.getItem('ierihon_tg_token') || '');
  const [tgChatId, setTgChatId] = useState(() => tgConfig?.chatId || localStorage.getItem('ierihon_tg_chat_id') || '');
  const [tgAppUrl, setTgAppUrl] = useState(() => tgConfig?.appUrl || localStorage.getItem('ierihon_tg_app_url') || 'https://t.me/ierihon_testbot/app');
  const [savedTgMsg, setSavedTgMsg] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<{ success: boolean; msg: string } | null>(null);

  // Collect all valid polls (current and historical)
  const allPolls: PollData[] = [];
  if (currentPoll && (currentPoll.date || currentPoll.created || currentPoll.id)) {
    allPolls.push(currentPoll);
  }
  pollHistory.forEach(p => {
    if (p.id && !allPolls.some(ap => ap.id === p.id)) {
      allPolls.push(p);
    }
  });

  const [selectedDeletePollId, setSelectedDeletePollId] = useState<string>(() => allPolls[0]?.id || '');

  React.useEffect(() => {
    if (allPolls.length > 0 && !allPolls.some(p => p.id === selectedDeletePollId)) {
      setSelectedDeletePollId(allPolls[0].id);
    }
  }, [allPolls, selectedDeletePollId]);

  React.useEffect(() => {
    if (tgConfig) {
      if (tgConfig.token !== undefined) setTgToken(tgConfig.token);
      if (tgConfig.chatId !== undefined) setTgChatId(tgConfig.chatId);
      if (tgConfig.appUrl !== undefined) setTgAppUrl(tgConfig.appUrl);
    }
  }, [tgConfig]);

  const handleSaveTg = () => {
    const token = tgToken.trim();
    const chatId = tgChatId.trim();
    const appUrl = tgAppUrl.trim();
    localStorage.setItem('ierihon_tg_token', token);
    localStorage.setItem('ierihon_tg_chat_id', chatId);
    localStorage.setItem('ierihon_tg_app_url', appUrl);
    if (onSaveTgConfig) {
      onSaveTgConfig(token, chatId, appUrl);
    }
    setSavedTgMsg(true);
    haptic('success');
    setTimeout(() => setSavedTgMsg(false), 3000);
  };

  const formatScheduleForExport = (scheds: ScheduleProfiles) => {
    const dayKeys: DayKey[] = ['pn', 'vt', 'sr', 'cht', 'pt'];
    const allKeys = Object.keys(scheds || {});
    const sortedKeys = [
      ...['base', 'math', 'chem'].filter(k => allKeys.includes(k)),
      ...allKeys.filter(k => !['base', 'math', 'chem'].includes(k))
    ];

    const formatted: Record<string, any> = {};
    sortedKeys.forEach(pKey => {
      const pData: any = scheds[pKey] || {};
      const profileObj: Record<string, any> = {};
      if (pData.title) profileObj.title = pData.title;
      dayKeys.forEach(dKey => {
        profileObj[dKey] = pData[dKey] || [];
      });
      formatted[pKey] = profileObj;
    });
    return formatted;
  };

  const downloadJSON = (data: any, filename: string) => {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    haptic('success');
  };

  const [fileErrorMsg, setFileErrorMsg] = useState<string | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (content: any) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileErrorMsg(null);
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        onSuccess(text);
      } catch (err: any) {
        setFileErrorMsg(err?.message || (lang === 'be' ? 'Памылка пры чытанні файла' : 'Ошибка при чтении файла'));
        haptic('error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Language Section */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
          {translate('lang_title', lang)}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Russian */}
          <div
            onClick={() => onSetLang('ru')}
            className={`flex items-center justify-between bg-[#0f0f0f] border rounded-2xl p-3.5 cursor-pointer transition-all active:scale-[0.99] shadow-sm ${
              lang === 'ru' ? 'border-indigo-500 bg-indigo-600/15' : 'border-[#1f1f1f] hover:border-[#333]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🇷🇺</span>
              <span className="text-xs font-bold text-white">Русский</span>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                lang === 'ru' ? 'border-indigo-500 bg-indigo-600' : 'border-[#333]'
              }`}
            >
              {lang === 'ru' && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>

          {/* Belarusian */}
          <div
            onClick={() => onSetLang('be')}
            className={`flex items-center justify-between bg-[#0f0f0f] border rounded-2xl p-3.5 cursor-pointer transition-all active:scale-[0.99] shadow-sm ${
              lang === 'be' ? 'border-indigo-500 bg-indigo-600/15' : 'border-[#1f1f1f] hover:border-[#333]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🇧🇾</span>
              <span className="text-xs font-bold text-white">Беларуская</span>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                lang === 'be' ? 'border-indigo-500 bg-indigo-600' : 'border-[#333]'
              }`}
            >
              {lang === 'be' && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Selection */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
          {translate('main_profile_title', lang)}
        </div>
        <div className="space-y-2">
          {(() => {
            const allProfileKeys = Object.keys(schedules || {});
            const profileKeys = [
              ...['base', 'math', 'chem'].filter(k => allProfileKeys.includes(k)),
              ...allProfileKeys.filter(k => !['base', 'math', 'chem'].includes(k))
            ] as ProfileKey[];

            return profileKeys.map(pKey => {
              const isSelected = activeProfile === pKey;
              const title = getProfileFullTitle(pKey, schedules, lang);
              const getIcon = () => {
                if (pKey === 'math') return <Ruler className="w-4 h-4 text-indigo-400" />;
                if (pKey === 'chem') return <FlaskConical className="w-4 h-4 text-purple-400" />;
                return <BookOpen className="w-4 h-4 text-emerald-400" />;
              };

              return (
                <div
                  key={pKey}
                  onClick={() => {
                    onSetProfile(pKey);
                    haptic('light');
                  }}
                  className={`flex items-center justify-between bg-[#0f0f0f] border rounded-2xl p-3.5 cursor-pointer transition-all active:scale-[0.99] shadow-sm ${
                    isSelected ? 'border-indigo-500 bg-indigo-600/15' : 'border-[#1f1f1f] hover:border-[#333]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                      {getIcon()}
                    </div>
                    <span className="text-xs font-bold text-white">{title}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-indigo-500 bg-indigo-600' : 'border-[#333]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Admin Panel Section */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
          {translate('admin_title', lang)}
        </div>

        <div className="space-y-2.5">
          {/* Export Schedule */}
          <div
            onClick={() => downloadJSON(formatScheduleForExport(schedules), 'data_schedules.json')}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.99] shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                {translate('export_schedule', lang)}
              </div>
              <div className="text-[11px] text-[#888]">
                {translate('export_schedule_d', lang)}
              </div>
            </div>
          </div>

          {/* Import Schedule */}
          <div
            onClick={() => schedFileRef.current?.click()}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.99] shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                {translate('upload_schedule', lang)}
              </div>
              <div className="text-[11px] text-[#888]">
                {translate('upload_schedule_d', lang)}
              </div>
            </div>
          </div>

          {/* Export Homework */}
          <div
            onClick={() => downloadJSON(homework, 'data_homework.json')}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-emerald-500/50 transition-all active:scale-[0.99] shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                {translate('export_hw', lang)}
              </div>
              <div className="text-[11px] text-[#888]">
                {translate('export_hw_d', lang)}
              </div>
            </div>
          </div>

          {/* Import Homework */}
          <div
            onClick={() => hwFileRef.current?.click()}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-emerald-500/50 transition-all active:scale-[0.99] shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                {translate('import_hw', lang)}
              </div>
              <div className="text-[11px] text-[#888]">
                {translate('import_hw_d', lang)}
              </div>
            </div>
          </div>

          {/* Export Duties */}
          <div
            onClick={() => downloadJSON(duties, 'data_duties.json')}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-rose-500/50 transition-all active:scale-[0.99] shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                {translate('export_duties', lang)}
              </div>
              <div className="text-[11px] text-[#888]">
                {translate('export_duties_d', lang)}
              </div>
            </div>
          </div>

          {/* Import Duties */}
          <div
            onClick={() => dutyFileRef.current?.click()}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-rose-500/50 transition-all active:scale-[0.99] shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                {translate('import_duties', lang)}
              </div>
              <div className="text-[11px] text-[#888]">
                {translate('import_duties_d', lang)}
              </div>
            </div>
          </div>

          {/* Export Birthdays */}
          <div
            onClick={() => downloadJSON(birthdays, 'data_birthdays.json')}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-amber-500/50 transition-all active:scale-[0.99] shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                {translate('export_bdays', lang)}
              </div>
              <div className="text-[11px] text-[#888]">
                {translate('export_bdays_d', lang)}
              </div>
            </div>
          </div>

          {/* Import Birthdays */}
          <div
            onClick={() => bdayFileRef.current?.click()}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-amber-500/50 transition-all active:scale-[0.99] shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">
                {translate('import_bdays', lang)}
              </div>
              <div className="text-[11px] text-[#888]">
                {translate('import_bdays_d', lang)}
              </div>
            </div>
          </div>

          {/* Clear all HW */}
          <div
            onClick={onClearAllHomework}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-rose-500/20 rounded-2xl p-3.5 cursor-pointer hover:bg-rose-500/10 transition-all active:scale-[0.99] shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-rose-400">
                {translate('clear_hw_all', lang)}
              </div>
              <div className="text-[11px] text-[#888]">
                {translate('clear_hw_all_d', lang)}
              </div>
            </div>
          </div>

          {/* Delete Canteen Poll */}
          <div className="bg-[#0f0f0f] border border-rose-500/30 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-rose-400">
                  {translate('delete_poll', lang)}
                </div>
                <div className="text-[11px] text-[#888]">
                  {translate('delete_poll_d', lang)}
                </div>
              </div>
            </div>

            {allPolls.length === 0 ? (
              <div className="text-[11px] text-[#666] italic px-1">
                {lang === 'be' ? 'Няма даступных апытанняў' : 'Нет доступных опросов'}
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedDeletePollId}
                  onChange={e => setSelectedDeletePollId(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {allPolls.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.date ? `${lang === 'be' ? 'Апытанне' : 'Опрос'} (${p.date})` : `ID: ${p.id}`}
                      {p.id === currentPoll?.id ? ` [${lang === 'be' ? 'Бягучае' : 'Текущий'}]` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (selectedDeletePollId && onDeletePoll) {
                      onDeletePoll(selectedDeletePollId);
                    }
                  }}
                  className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs transition-all active:scale-95 shrink-0"
                >
                  {lang === 'be' ? 'Выдаліць' : 'Удалить'}
                </button>
              </div>
            )}
          </div>

          {/* Clear ALL App Data */}
          <div
            onClick={onClearAllData}
            className="flex items-center gap-3.5 bg-gradient-to-r from-rose-950/40 to-red-950/40 border border-rose-500/50 rounded-2xl p-3.5 cursor-pointer hover:border-rose-500 transition-all active:scale-[0.99] shadow-md shadow-rose-900/10"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/25 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-rose-400">
                {translate('clear_all_data', lang)}
              </div>
              <div className="text-[11px] text-rose-300/70">
                {translate('clear_all_data_d', lang)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Notifications Config */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1 flex items-center gap-1.5">
          <Bell className="w-3 h-3 text-indigo-400" />
          {translate('tg_bot_title', lang)}
        </div>

        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-[#888] block mb-1">
              Bot Token (Telegram):
            </label>
            <input
              type="text"
              value={tgToken}
              onChange={e => setTgToken(e.target.value)}
              placeholder={translate('tg_bot_token_ph', lang)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#888] block mb-1">
              Chat / Channel ID (для уведомлений):
            </label>
            <input
              type="text"
              value={tgChatId}
              onChange={e => setTgChatId(e.target.value)}
              placeholder={translate('tg_chat_id_ph', lang)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleSaveTg}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md shadow-indigo-600/20"
            >
              <Save className="w-3.5 h-3.5" />
              {lang === 'be' ? 'Захаваць налады' : 'Сохранить настройки'}
            </button>
          </div>

          {savedTgMsg && (
            <div className="text-center text-xs text-emerald-400 font-medium animate-fade-in">
              ✓ {translate('tg_bot_saved', lang)}
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={schedFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={e => handleFileChange(e, onImportSchedules)}
      />
      <input
        ref={hwFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={e => handleFileChange(e, onImportHomework)}
      />
      <input
        ref={dutyFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={e => handleFileChange(e, onImportDuties)}
      />
      <input
        ref={bdayFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={e => handleFileChange(e, onImportBirthdays)}
      />
    </div>
  );
};
