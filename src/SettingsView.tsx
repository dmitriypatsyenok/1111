import React, { useRef } from 'react';
import { BirthdayItem, DutiesStore, HomeworkStore, Language, ScheduleProfiles } from './types';
import { translate } from './i18n';
import { haptic } from './telegram';
import { Download, Upload, Trash2, Check } from 'lucide-react';

interface SettingsViewProps {
  lang: Language;
  schedules: ScheduleProfiles;
  homework: HomeworkStore;
  duties: DutiesStore;
  birthdays: BirthdayItem[];
  onSetLang: (lang: Language) => void;
  onImportSchedules: (data: ScheduleProfiles) => void;
  onImportHomework: (data: HomeworkStore) => void;
  onImportDuties: (data: DutiesStore) => void;
  onImportBirthdays: (data: BirthdayItem[]) => void;
  onClearAllHomework: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  schedules,
  homework,
  duties,
  birthdays,
  onSetLang,
  onImportSchedules,
  onImportHomework,
  onImportDuties,
  onImportBirthdays,
  onClearAllHomework
}) => {
  const schedFileRef = useRef<HTMLInputElement>(null);
  const hwFileRef = useRef<HTMLInputElement>(null);
  const dutyFileRef = useRef<HTMLInputElement>(null);
  const bdayFileRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (parsed: any) => void,
    msg: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onSuccess(parsed);
        alert(msg);
        haptic('success');
      } catch (err) {
        alert('Ошибка при чтении файла JSON');
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

      {/* Admin Panel Section */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
          {translate('admin_title', lang)}
        </div>

        <div className="space-y-2.5">
          {/* Export Schedule */}
          <div
            onClick={() => downloadJSON(schedules, 'data_schedules.json')}
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
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-rose-500/30 rounded-2xl p-3.5 cursor-pointer hover:bg-rose-500/10 transition-all active:scale-[0.99] shadow-sm"
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
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={schedFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={e =>
          handleFileChange(
            e,
            onImportSchedules,
            lang === 'be' ? 'Расклад загружаны!' : 'Расписание успешно загружено!'
          )
        }
      />
      <input
        ref={hwFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={e =>
          handleFileChange(
            e,
            onImportHomework,
            lang === 'be' ? 'Заданні загружаны!' : 'Домашние задания восстановлены!'
          )
        }
      />
      <input
        ref={dutyFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={e =>
          handleFileChange(
            e,
            onImportDuties,
            lang === 'be' ? 'Чаргоўства загружана!' : 'График дежурств обновлен!'
          )
        }
      />
      <input
        ref={bdayFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={e =>
          handleFileChange(
            e,
            onImportBirthdays,
            lang === 'be' ? 'Дні нараджэння загружаны!' : 'Список дней рождения обновлен!'
          )
        }
      />
    </div>
  );
};
