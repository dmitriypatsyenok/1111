import React, { useState } from 'react';
import { BirthdayItem, DayKey, DutiesStore, DutyZone, Language } from './types';
import { translate, translateZoneName } from './i18n';
import { STANDARD_DUTY_ZONES } from './defaultData';
import { Plus, Search, Trash2, UserPlus, MapPin, User, Edit2, Check } from 'lucide-react';
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
  onUpdateZone: (day: DayKey, zoneId: string, newName: string, students: string[]) => void;
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
  onUpdateZone,
  onRemoveStudent
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Zone Creation Modal State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [customZoneName, setCustomZoneName] = useState('');

  // Multi-Student Assign & Edit Zone Modal State
  const [editingZone, setEditingZone] = useState<DutyZone | null>(null);
  const [editedZoneName, setEditedZoneName] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [rosterFilter, setRosterFilter] = useState('');
  const [manualStudentInput, setManualStudentInput] = useState('');

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

  // Open Multi-Assign & Edit Modal
  const openEditModal = (zone: DutyZone) => {
    setEditingZone(zone);
    setEditedZoneName(translateZoneName(zone.name, lang));
    setSelectedStudents([...zone.students]);
    setRosterFilter('');
    setManualStudentInput('');
    haptic('light');
  };

  // Toggle student selection
  const toggleStudent = (name: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(name)) {
        return prev.filter(s => s !== name);
      } else {
        return [...prev, name];
      }
    });
    haptic('selection');
  };

  const cleanBirthdays = (birthdays || []).filter(b => b && b.name && !b.name.includes('Иванова'));

  const handleSelectAllRoster = () => {
    const allNames = cleanBirthdays.map(b => b.name);
    const merged = Array.from(new Set([...selectedStudents, ...allNames]));
    setSelectedStudents(merged);
    haptic('medium');
  };

  const handleDeselectAllRoster = () => {
    setSelectedStudents([]);
    haptic('light');
  };

  // Save Modal Changes
  const handleSaveEditedZone = () => {
    if (!editingZone) return;
    const finalZoneName = editedZoneName.trim() || editingZone.name;

    let finalStudents = [...selectedStudents];
    if (manualStudentInput.trim()) {
      const added = manualStudentInput
        .split(/[,;\n]+/)
        .map(s => s.trim())
        .filter(Boolean);
      added.forEach(name => {
        if (!finalStudents.includes(name)) {
          finalStudents.push(name);
        }
      });
    }

    onUpdateZone(activeDay, editingZone.id, finalZoneName, finalStudents);
    setEditingZone(null);
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

  // Prepare roster list for edit modal including existing students
  const combinedRoster: BirthdayItem[] = [...cleanBirthdays];
  if (editingZone) {
    selectedStudents.forEach(st => {
      if (!combinedRoster.some(b => b.name === st)) {
        combinedRoster.push({ name: st, date: '' });
      }
    });
  }
  const filteredRoster = combinedRoster.filter(b =>
    b.name.toLowerCase().includes(rosterFilter.trim().toLowerCase())
  );

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={translate('duty_search_placeholder', lang)}
          className="w-full bg-[#121215] border border-[#27272A] rounded-full text-xs text-white pl-10 pr-4 py-3 focus:outline-none focus:border-zinc-400 placeholder:text-[#666]"
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
            <div className="bg-[#121215] border border-[#27272A] rounded-3xl p-8 text-center text-[#888] text-xs">
              {translate('no_duty_found', lang)}
            </div>
          ) : (
            <div className="space-y-2.5">
              {searchResults.map((res, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 bg-[#121215] border border-[#27272A] rounded-2xl p-3.5 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {res.studentName}
                    </div>
                    <div className="text-[11px] text-zinc-300 mt-0.5">
                      {translate('duty_on_days', lang)}{' '}
                      <span className="font-semibold text-white">
                        {res.dayTitle} — {translateZoneName(res.zoneName, lang)}
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
          <div className="flex bg-[#121215] p-1 rounded-2xl border border-[#27272A] gap-1">
            {dayKeys.map(d => (
              <button
                key={d}
                onClick={() => onSelectDay(d)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                  d === activeDay
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-[#888] hover:bg-[#18181C] hover:text-white'
                }`}
              >
                {daysDict?.[d] || d}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-white rounded-full inline-block"></span>
              {fullDaysDict?.[activeDay] || activeDay}
            </div>
            <button
              onClick={() => setIsZoneModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{translate('create_duty_zone', lang)}</span>
            </button>
          </div>

          {/* Zones List */}
          {currentDayZones.length === 0 ? (
            <div className="bg-[#121215] border border-[#27272A] rounded-3xl p-8 text-center text-[#888] text-xs">
              {translate('no_duties_day', lang)}
            </div>
          ) : (
            <div className="space-y-3.5">
              {currentDayZones.map(zone => (
                <div
                  key={zone.id}
                  className="bg-[#121215] border border-[#27272A] rounded-3xl p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[#27272A] pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <MapPin className="w-4 h-4 text-zinc-400" />
                      <span>{translateZoneName(zone.name, lang)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(zone)}
                        className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-all"
                        title={translate('edit', lang)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(translate('confirm_delete_zone', lang))) {
                            onDeleteZone(activeDay, zone.id);
                            haptic('success');
                          }
                        }}
                        className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center hover:bg-rose-500/25 transition-all"
                        title={translate('delete', lang)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                          className="flex items-center justify-between bg-[#18181C] border border-[#27272A] rounded-xl px-3 py-2"
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

                  {/* Multi-Assign & Edit Button */}
                  <button
                    onClick={() => openEditModal(zone)}
                    className="w-full py-2.5 rounded-2xl bg-[#18181C] hover:bg-zinc-800 text-xs font-bold text-white border border-[#27272A] hover:border-zinc-500 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
          <div className="w-full max-w-md bg-[#121215] border border-[#27272A] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slide-up">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-white rounded-full inline-block"></span>
              {translate('create_duty_zone', lang)}
            </h3>

            <div className="text-xs font-bold text-[#888]">
              {translate('choose_zone_preset', lang)}:
            </div>

            <div className="grid grid-cols-2 gap-2">
              {STANDARD_DUTY_ZONES.map(preset => (
                <button
                  key={preset}
                  onClick={() => handleCreateZoneSubmit(translateZoneName(preset, lang))}
                  className="py-2.5 px-3 rounded-2xl bg-[#18181C] border border-[#27272A] hover:border-zinc-500 hover:bg-zinc-800 text-xs text-white font-bold text-left transition-all flex items-center justify-between"
                >
                  <span>{translateZoneName(preset, lang)}</span>
                  <Plus className="w-3.5 h-3.5 text-zinc-400" />
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
              onKeyDown={e => {
                if (e.key === 'Enter' && customZoneName.trim()) {
                  e.preventDefault();
                  handleCreateZoneSubmit(customZoneName);
                }
              }}
              placeholder={translate('zone_name_placeholder', lang)}
              className="w-full bg-[#18181C] border border-[#27272A] rounded-2xl text-xs text-white p-3 focus:outline-none focus:border-zinc-400 placeholder:text-[#666]"
            />

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setIsZoneModalOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-zinc-800 border border-zinc-700 text-xs text-white font-bold hover:bg-zinc-700 transition-all"
              >
                {translate('cancel', lang)}
              </button>
              <button
                onClick={() => handleCreateZoneSubmit(customZoneName)}
                disabled={!customZoneName.trim()}
                className="flex-1 py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-xs text-black font-bold shadow-sm transition-all"
              >
                {translate('save', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ZONE & MULTI-STUDENT ASSIGN MODAL */}
      {editingZone && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#121215] border border-[#27272A] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-white rounded-full inline-block"></span>
                {translate('edit_duty_zone', lang)}
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {translate('selected_count', lang)} {selectedStudents.length}
              </span>
            </h3>

            {/* Zone Name Input */}
            <div>
              <label className="text-[11px] font-bold text-[#888] mb-1 block">
                {lang === 'be' ? 'Назва зоны:' : 'Название зоны:'}
              </label>
              <input
                type="text"
                value={editedZoneName}
                onChange={e => setEditedZoneName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveEditedZone();
                  }
                }}
                placeholder={translate('zone_name_placeholder', lang)}
                className="w-full bg-[#18181C] border border-[#27272A] rounded-2xl text-xs text-white p-3 focus:outline-none focus:border-zinc-400"
              />
            </div>

            {/* Class Roster Multi-Select Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#888] block">
                  {translate('select_students', lang)}
                </label>
                <div className="flex gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={handleSelectAllRoster}
                    className="text-white hover:underline font-semibold"
                  >
                    {translate('select_all', lang)}
                  </button>
                  <span className="text-[#444]">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllRoster}
                    className="text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    {translate('deselect_all', lang)}
                  </button>
                </div>
              </div>

              {/* Roster Search Filter */}
              <input
                type="text"
                value={rosterFilter}
                onChange={e => setRosterFilter(e.target.value)}
                placeholder={lang === 'be' ? 'Пошук па спісе...' : 'Поиск по списку...'}
                className="w-full bg-[#18181C] border border-[#27272A] rounded-xl text-xs text-white px-3 py-2 focus:outline-none focus:border-zinc-400 placeholder:text-[#555]"
              />

              {/* Roster Checkbox List */}
              <div className="max-h-48 overflow-y-auto bg-[#18181C] border border-[#27272A] rounded-2xl p-2 space-y-1 custom-scrollbar">
                {filteredRoster.length === 0 ? (
                  <div className="text-[11px] text-[#666] text-center py-3">
                    {lang === 'be' ? 'Вучні не знойдзены' : 'Ученики не найдены'}
                  </div>
                ) : (
                  filteredRoster.map((b, idx) => {
                    const isSelected = selectedStudents.includes(b.name);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleStudent(b.name)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white text-black font-bold'
                            : 'bg-zinc-800/80 hover:bg-zinc-800 text-[#aaa] border border-transparent'
                        }`}
                      >
                        <span className="text-xs">{b.name}</span>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-black border-black text-white'
                              : 'border-[#444] bg-[#222]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Manual Custom Students */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-[#888] block">
                {translate('add_custom_student', lang)}
              </label>
              <input
                type="text"
                value={manualStudentInput}
                onChange={e => setManualStudentInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveEditedZone();
                  }
                }}
                placeholder={translate('custom_student_ph', lang)}
                className="w-full bg-[#18181C] border border-[#27272A] rounded-2xl text-xs text-white p-3 focus:outline-none focus:border-zinc-400 placeholder:text-[#666]"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setEditingZone(null)}
                className="flex-1 py-2.5 rounded-2xl bg-zinc-800 border border-zinc-700 text-xs text-white font-bold hover:bg-zinc-700 transition-all"
              >
                {translate('cancel', lang)}
              </button>
              <button
                onClick={handleSaveEditedZone}
                className="flex-1 py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-xs text-black font-bold shadow-sm transition-all"
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
