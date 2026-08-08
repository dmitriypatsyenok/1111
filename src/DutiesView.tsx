import React, { useState } from 'react';
import { BirthdayItem, DayKey, DutiesStore, DutyZone, Language } from './types';
import { translate } from './i18n';
import { STANDARD_DUTY_ZONES } from './defaultData';
import { Plus, Search, Trash2, UserPlus, MapPin, User, ChevronDown } from 'lucide-react';
import { haptic } from './telegram';

interface DutiesViewProps {
  duties: DutiesStore;
  birthdays: BirthdayItem[];
  activeDay: DayKey;
  lang: Language;
  onSelectDay: (day: DayKey) => void;
  onCreateZone: (day: DayKey, zoneName: string) => void;
  onDeleteZone: (day: DayKey, zoneId: string) => void;
  onAssignStudent: (day: DayKey, zoneId: string, studentName: string) => void;
  onRemoveStudent: (day: DayKey, zoneId: string, studentIndex: number) => void;
}

export const DutiesView: React.FC<DutiesViewProps> = ({
  duties,
  birthdays,
  activeDay,
  lang,
  onSelectDay,
  onCreateZone,
  onDeleteZone,
  onAssignStudent,
  onRemoveStudent
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Zone Creation Modal State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [customZoneName, setCustomZoneName] = useState('');

  // Student Assign Modal State
  const [assignTargetZone, setAssignTargetZone] = useState<DutyZone | null>(null);
  const [selectedRosterStudent, setSelectedRosterStudent] = useState('');
  const [customStudentName, setCustomStudentName] = useState('');

  const dayKeys: DayKey[] = ['pn', 'vt', 'sr', 'cht', 'pt'];
  const daysDict = translate('t_days_s', lang) as any;
  const fullDaysDict = translate('t_days', lang) as any;

  // Handle Zone Creation
  const handleCreateZoneSubmit = (zoneName: string) => {
    const finalName = zoneName.trim();
    if (!finalName) return;
    onCreateZone(activeDay, finalName);
    setCustomZoneName('');
    setIsZoneModalOpen(false);
    haptic('success');
  };

  // Handle Assign Student Submit
  const handleAssignStudentSubmit = () => {
    const finalName = (customStudentName || selectedRosterStudent).trim();
    if (!finalName || !assignTargetZone) return;
    onAssignStudent(activeDay, assignTargetZone.id, finalName);
    setAssignTargetZone(null);
    setSelectedRosterStudent('');
    setCustomStudentName('');
    haptic('success');
  };

  // Search Results calculation
  const queryClean = searchQuery.trim().toLowerCase();
  const searchResults: Array<{
    studentName: string;
    dayKey: DayKey;
    dayTitle: string;
    zoneName: string;
  }> = [];

  if (queryClean) {
    dayKeys.forEach(dKey => {
      const zones = duties[dKey] || [];
      const dayTitleStr = fullDaysDict?.[dKey] || dKey;

      zones.forEach(z => {
        z.students.forEach(sName => {
          if (sName.toLowerCase().includes(queryClean)) {
            searchResults.push({
              studentName: sName,
              dayKey: dKey,
              dayTitle: dayTitleStr,
              zoneName: z.name
            });
          }
        });
      });
    });
  }

  const currentDayZones = duties[activeDay] || [];

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={translate('duty_search_placeholder', lang)}
          className="w-full bg-[#161616] border border-[#2a2a2a] rounded-full text-xs text-white pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 placeholder:text-[#666]"
        />
        <Search className="w-4 h-4 text-[#888] absolute left-3.5 top-3.5" />
      </div>

      {queryClean ? (
        /* SEARCH RESULTS VIEW */
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
            {translate('search_results', lang)}
          </div>

          {searchResults.length === 0 ? (
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-8 text-center text-[#888] text-xs">
              {translate('no_duty_found', lang)}
            </div>
          ) : (
            <div className="space-y-2.5">
              {searchResults.map((res, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {res.studentName}
                    </div>
                    <div className="text-[11px] text-indigo-400 mt-0.5">
                      {translate('duty_on_days', lang)}{' '}
                      <span className="font-semibold text-white">
                        {res.dayTitle} — {res.zoneName}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 2-LEVEL DUTY VIEW */
        <div className="space-y-3.5">
          {/* Day Tabs */}
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

          <div className="flex items-center justify-between px-1">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-4 bg-indigo-500 rounded-full inline-block"></span>
              {fullDaysDict?.[activeDay] || activeDay}
            </div>
            <button
              onClick={() => setIsZoneModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{translate('create_duty_zone', lang)}</span>
            </button>
          </div>

          {/* Zones List */}
          {currentDayZones.length === 0 ? (
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-8 text-center text-[#888] text-xs">
              {translate('no_duties_day', lang)}
            </div>
          ) : (
            <div className="space-y-3.5">
              {currentDayZones.map(zone => (
                <div
                  key={zone.id}
                  className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                      <MapPin className="w-4 h-4 text-indigo-400" />
                      <span>{zone.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(translate('confirm_delete_zone', lang))) {
                          onDeleteZone(activeDay, zone.id);
                          haptic('success');
                        }
                      }}
                      className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center hover:bg-rose-500/25 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Assigned Students */}
                  {zone.students.length === 0 ? (
                    <div className="text-[11px] text-[#666] italic py-1">
                      {lang === 'be' ? 'Няма прызначаных вучняў' : 'Нет назначенных учеников'}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {zone.students.map((st, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-[#161616] border border-[#222] rounded-xl px-3 py-2"
                        >
                          <span className="text-xs text-white font-medium">
                            {st}
                          </span>
                          <button
                            onClick={() => {
                              onRemoveStudent(activeDay, zone.id, idx);
                              haptic('light');
                            }}
                            className="text-rose-400 hover:text-white p-0.5 text-xs font-bold transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Assign Student Button */}
                  <button
                    onClick={() => {
                      setAssignTargetZone(zone);
                      setSelectedRosterStudent('');
                      setCustomStudentName('');
                    }}
                    className="w-full py-2.5 rounded-2xl bg-[#161616] hover:bg-[#1f1f1f] text-xs font-bold text-indigo-400 border border-[#2a2a2a] hover:border-indigo-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{translate('assign_student', lang)}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE ZONE MODAL */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#0f0f0f] border border-[#2a2a2a] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slide-up">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-4 bg-indigo-500 rounded-full inline-block"></span>
              {translate('create_duty_zone', lang)}
            </h3>

            <div className="text-xs font-bold text-[#888]">
              {translate('choose_zone_preset', lang)}:
            </div>

            <div className="grid grid-cols-2 gap-2">
              {STANDARD_DUTY_ZONES.map(preset => (
                <button
                  key={preset}
                  onClick={() => handleCreateZoneSubmit(preset)}
                  className="py-2.5 px-3 rounded-2xl bg-[#161616] border border-[#2a2a2a] hover:border-indigo-500/50 hover:bg-[#1f1f1f] text-xs text-white font-bold text-left transition-all flex items-center justify-between"
                >
                  <span>{preset}</span>
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              ))}
            </div>

            <div className="text-xs font-bold text-[#888] pt-1">
              {translate('or_custom_zone', lang)}:
            </div>

            <input
              type="text"
              value={customZoneName}
              onChange={e => setCustomZoneName(e.target.value)}
              placeholder={translate('zone_name_placeholder', lang)}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl text-xs text-white p-3 focus:outline-none focus:border-indigo-500 placeholder:text-[#666]"
            />

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setIsZoneModalOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-white font-bold hover:bg-[#222] transition-all"
              >
                {translate('cancel', lang)}
              </button>
              <button
                onClick={() => handleCreateZoneSubmit(customZoneName)}
                disabled={!customZoneName.trim()}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-600 disabled:opacity-40 text-xs text-white font-bold shadow-lg shadow-indigo-500/20 transition-all"
              >
                {translate('save', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN STUDENT MODAL */}
      {assignTargetZone && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#0f0f0f] border border-[#2a2a2a] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-4 bg-indigo-500 rounded-full inline-block"></span>
              {translate('assign_student', lang)} ({assignTargetZone.name})
            </h3>

            <div>
              <label className="text-[11px] font-bold text-[#888] mb-1.5 block">
                {lang === 'be' ? 'Выбраць са спісу класа' : 'Выбрать из списка класса'}
              </label>
              <div className="relative">
                <select
                  value={selectedRosterStudent}
                  onChange={e => {
                    setSelectedRosterStudent(e.target.value);
                    if (e.target.value) setCustomStudentName('');
                  }}
                  className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl text-xs text-white p-3 pr-8 appearance-none focus:outline-none focus:border-indigo-500"
                >
                  <option value="">
                    -- {lang === 'be' ? 'Выберите вучня' : 'Выберите ученика'} --
                  </option>
                  {birthdays.map((b, idx) => (
                    <option key={idx} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#888] absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div className="text-xs font-bold text-[#888] pt-1">
              {lang === 'be' ? 'або ўвядзіце ўручную' : 'или введите вручную'}:
            </div>

            <input
              type="text"
              value={customStudentName}
              onChange={e => {
                setCustomStudentName(e.target.value);
                if (e.target.value) setSelectedRosterStudent('');
              }}
              placeholder={lang === 'be' ? 'Імя і Прозвішча' : 'Имя и Фамилия'}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl text-xs text-white p-3 focus:outline-none focus:border-indigo-500 placeholder:text-[#666]"
            />

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setAssignTargetZone(null)}
                className="flex-1 py-2.5 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-white font-bold hover:bg-[#222] transition-all"
              >
                {translate('cancel', lang)}
              </button>
              <button
                onClick={handleAssignStudentSubmit}
                disabled={!selectedRosterStudent && !customStudentName.trim()}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-600 disabled:opacity-40 text-xs text-white font-bold shadow-lg shadow-indigo-500/20 transition-all"
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
