import React, { useState, useEffect } from 'react';
import { Language, PollData, PollStatus, ScreenType } from './types';
import { translate } from './i18n';
import { formatCustomDate, getNextSchoolDay } from './dateFormatter';
import { Vote, BarChart2, CheckCircle2, XCircle, Home, Edit3, ChevronRight, Calendar, TrendingUp, PieChart, Users, Award, Filter, Sparkles } from 'lucide-react';
import { haptic, getTelegramUserName } from './telegram';

interface CanteenViewProps {
  viewMode: 'menu' | 'poll' | 'history' | 'result';
  currentPoll: PollData;
  pollHistory: PollData[];
  isPollActive: boolean;
  selectedPollDetail: PollData | null;
  selectedPollDateStr: string;
  isEditingPast: boolean;
  lang: Language;
  onNavigate: (s: ScreenType) => void;
  onCreatePoll: (customDate?: string) => void;
  onVote: (status: PollStatus) => void;
  onSelectPollDetail: (poll: PollData, dateStr: string) => void;
  onToggleEditPast: () => void;
  onVotePastPoll: (status: PollStatus) => void;
}

export const CanteenView: React.FC<CanteenViewProps> = ({
  viewMode,
  currentPoll,
  pollHistory,
  isPollActive,
  selectedPollDetail,
  selectedPollDateStr,
  isEditingPast,
  lang,
  onNavigate,
  onCreatePoll,
  onVote,
  onSelectPollDetail,
  onToggleEditPast,
  onVotePastPoll
}) => {
  const userName = getTelegramUserName(lang);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [canteenMsg, setCanteenMsg] = useState<string | null>(null);
  const [customPollDate, setCustomPollDate] = useState('');
  const [voterFilter, setVoterFilter] = useState<'all' | 'eat' | 'no' | 'abs'>('all');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [analyticsCategory, setAnalyticsCategory] = useState<'eat' | 'no' | 'abs'>('eat');
  const [showVoterMenu, setShowVoterMenu] = useState(false);

  // Automatically reset modal / dropdown / filter states when navigating between view modes or poll details
  useEffect(() => {
    setShowAnalyticsModal(false);
    setExpandedStudent(null);
    setShowVoterMenu(false);
    setVoterFilter('all');
  }, [viewMode, selectedPollDetail]);

  // Compute aggregated stats for analytics
  const allPollsMap = new Map<string, PollData>();
  if (currentPoll && currentPoll.id) allPollsMap.set(currentPoll.id, currentPoll);
  pollHistory.forEach(p => { if (p && p.id) allPollsMap.set(p.id, p); });
  const allPolls = Array.from(allPollsMap.values()).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  // Extract available months for dropdown selector
  const monthsSet = new Set<string>();
  allPolls.forEach(p => {
    if (p.date && p.date.length >= 7) {
      monthsSet.add(p.date.slice(0, 7));
    }
  });
  const availableMonths = Array.from(monthsSet).sort().reverse();

  // Filter polls for analytics modal
  const filteredPollsForAnalytics = allPolls.filter(p => {
    if (selectedMonthKey === 'all') return true;
    return p.date && p.date.startsWith(selectedMonthKey);
  });

  // Build per-student stats
  interface StudentStat {
    name: string;
    tag: string;
    eatCount: number;
    noCount: number;
    absCount: number;
    totalVotes: number;
    eatDates: string[];
    noDates: string[];
    absDates: string[];
  }

  const studentStatsMap = new Map<string, StudentStat>();
  filteredPollsForAnalytics.forEach(poll => {
    const pollDateStr = poll.date ? formatCustomDate(poll.date, 'day_month_short', lang) : '';
    (poll.voters || []).forEach(v => {
      if (!v || !v.name) return;
      const name = v.name.trim();
      if (!name) return;

      if (!studentStatsMap.has(name)) {
        const cleanTag = name.startsWith('@') ? name : `@${name.replace(/\s+/g, '_')}`;
        studentStatsMap.set(name, {
          name,
          tag: cleanTag,
          eatCount: 0,
          noCount: 0,
          absCount: 0,
          totalVotes: 0,
          eatDates: [],
          noDates: [],
          absDates: []
        });
      }

      const stat = studentStatsMap.get(name)!;
      stat.totalVotes += 1;
      if (v.status === 'eat') {
        stat.eatCount += 1;
        if (pollDateStr) stat.eatDates.push(pollDateStr);
      } else if (v.status === 'no') {
        stat.noCount += 1;
        if (pollDateStr) stat.noDates.push(pollDateStr);
      } else if (v.status === 'abs') {
        stat.absCount += 1;
        if (pollDateStr) stat.absDates.push(pollDateStr);
      }
    });
  });

  const allVoterStatsForPeriod = Array.from(studentStatsMap.values())
    .sort((a, b) => b.totalVotes - a.totalVotes || a.name.localeCompare(b.name));

  const queryClean = studentSearchQuery.toLowerCase().trim();
  const studentStatsList = allVoterStatsForPeriod
    .filter(s => {
      if (!queryClean) return true;
      return s.name.toLowerCase().includes(queryClean) || s.tag.toLowerCase().includes(queryClean);
    });

  const totalEatVotes = Array.from(studentStatsMap.values()).reduce((acc, s) => acc + s.eatCount, 0);
  const totalNoVotes = Array.from(studentStatsMap.values()).reduce((acc, s) => acc + s.noCount, 0);
  const totalAbsVotes = Array.from(studentStatsMap.values()).reduce((acc, s) => acc + s.absCount, 0);

  const periodTotalMeals = filteredPollsForAnalytics.reduce((acc, p) => acc + (p.eat || 0), 0);
  const periodTotalPolls = filteredPollsForAnalytics.length;
  const topEater = studentStatsList.length > 0 && studentStatsList[0].eatCount > 0 ? studentStatsList[0] : null;

  const calcDefaultPollDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingPollDates: Date[] = [];
    if (currentPoll && currentPoll.date) {
      const d = new Date(currentPoll.date);
      if (!isNaN(d.getTime())) existingPollDates.push(d);
    }
    pollHistory.forEach(p => {
      if (p.date) {
        const d = new Date(p.date);
        if (!isNaN(d.getTime())) existingPollDates.push(d);
      }
    });

    const validFutureDates = existingPollDates.filter(d => d >= today);
    let baseDate = today;
    if (validFutureDates.length > 0) {
      baseDate = new Date(Math.max(...validFutureDates.map(d => d.getTime())));
    }
    return getNextSchoolDay(baseDate).toISOString().slice(0, 10);
  };

  const handleOpenCreateModal = () => {
    const def = calcDefaultPollDate();
    setCustomPollDate(def);
    setShowCreateModal(true);
    haptic('light');
  };

  if (viewMode === 'menu') {
    return (
      <div className="space-y-3.5 animate-fade-in">
        <div className="space-y-2.5">
          {/* Create Poll Card */}
          <div
            onClick={handleOpenCreateModal}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 cursor-pointer hover:bg-[#141414] hover:border-amber-500/50 transition-all active:scale-[0.99] group shadow-sm"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Vote className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">
                {translate('poll_create', lang)}
              </div>
              <div className="text-xs text-[#888] mt-0.5">
                {translate('poll_create_d', lang)}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#555] group-hover:text-amber-400 transition-colors" />
          </div>

          {canteenMsg && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-300 font-medium animate-fade-in flex items-center justify-between">
              <span>⚠️ {canteenMsg}</span>
              <button onClick={() => setCanteenMsg(null)} className="text-amber-400 font-bold px-1.5 cursor-pointer">✕</button>
            </div>
          )}

          {/* Vote Button */}
          <div
            onClick={() => {
              if (!isPollActive) {
                setCanteenMsg(translate('poll_not_created_msg', lang));
                haptic('error');
                return;
              }
              onNavigate('canteen-poll');
            }}
            className={`flex items-center gap-3.5 border rounded-3xl p-4 cursor-pointer transition-all active:scale-[0.99] group ${
              isPollActive
                ? 'bg-[#0f0f0f] border-[#1f1f1f] hover:border-emerald-500/50 hover:bg-[#141414]'
                : 'bg-[#0f0f0f]/60 border-[#1f1f1f] opacity-75'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                isPollActive
                  ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/20 text-rose-400'
              }`}
            >
              <Edit3 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">
                {translate('poll_vote', lang)}
              </div>
              <div className="text-xs text-[#888] mt-0.5">
                {translate('poll_vote_d', lang)}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#555] group-hover:text-emerald-400 transition-colors" />
          </div>

          {/* Results Archive Button */}
          <div
            onClick={() => onNavigate('canteen-history')}
            className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.99] group shadow-sm"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">
                {translate('poll_results', lang)}
              </div>
              <div className="text-xs text-[#888] mt-0.5">
                {translate('poll_results_d', lang)}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#555] group-hover:text-indigo-400 transition-colors" />
          </div>
        </div>

        {/* Create Poll Date Selection Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-md bg-[#0f0f0f] border border-[#2a2a2a] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slide-up">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Vote className="w-4 h-4 text-amber-400" />
                <span>{lang === 'be' ? 'Стварыць апытанне ў сталовай' : 'Создать опрос в столовой'}</span>
              </h3>

              <div className="space-y-2 bg-[#161616] p-3.5 rounded-2xl border border-[#2a2a2a]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#888] uppercase tracking-wider">
                    {lang === 'be' ? 'Дата апытання' : 'Дата опроса'}:
                  </span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                    {formatCustomDate(customPollDate || calcDefaultPollDate(), 'weekday_day_month', lang)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-[#222]">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <input
                    type="date"
                    value={customPollDate || calcDefaultPollDate()}
                    onChange={e => setCustomPollDate(e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-xs text-white p-2 focus:outline-none focus:border-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-[#1a1a1a] hover:bg-[#222] text-xs font-bold text-[#aaa] border border-[#2a2a2a] cursor-pointer"
                >
                  {translate('cancel', lang)}
                </button>
                <button
                  onClick={() => {
                    onCreatePoll(customPollDate || calcDefaultPollDate());
                    setShowCreateModal(false);
                    haptic('success');
                  }}
                  className="flex-1 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {lang === 'be' ? 'Запусціць' : 'Запустить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'poll') {
    const createdStr = formatCustomDate(currentPoll.created, 'day_month_short', lang);
    const targetStr = formatCustomDate(currentPoll.date, 'day_month_long', lang);
    const myVote = (currentPoll.voters.find(x => x.name === userName) || {}).status;

    return (
      <div className="space-y-3.5 animate-fade-in">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
          {translate('poll_for', lang)} {targetStr} ({translate('created', lang)} {createdStr})
        </div>

        <div className="space-y-2.5">
          {/* Eat */}
          <div
            onClick={() => onVote('eat')}
            className={`flex items-center justify-between bg-[#0f0f0f] border rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.99] ${
              myVote === 'eat'
                ? 'border-indigo-500 bg-indigo-600/15 shadow-md shadow-indigo-500/10'
                : 'border-[#1f1f1f] hover:bg-[#141414] hover:border-indigo-500/30'
            }`}
          >
            <div className="flex items-center gap-3 text-xs font-bold text-white">
              <span className="text-xl">🍽</span>
              <span>{translate('v_eat', lang)}</span>
            </div>
            <div className={`text-xs font-bold px-2.5 py-1 rounded-xl ${myVote === 'eat' ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] text-[#888]'}`}>
              {currentPoll.eat || 0}
            </div>
          </div>

          {/* No */}
          <div
            onClick={() => onVote('no')}
            className={`flex items-center justify-between bg-[#0f0f0f] border rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.99] ${
              myVote === 'no'
                ? 'border-indigo-500 bg-indigo-600/15 shadow-md shadow-indigo-500/10'
                : 'border-[#1f1f1f] hover:bg-[#141414] hover:border-indigo-500/30'
            }`}
          >
            <div className="flex items-center gap-3 text-xs font-bold text-white">
              <span className="text-xl">🚫</span>
              <span>{translate('v_no', lang)}</span>
            </div>
            <div className={`text-xs font-bold px-2.5 py-1 rounded-xl ${myVote === 'no' ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] text-[#888]'}`}>
              {currentPoll.no || 0}
            </div>
          </div>

          {/* Absent */}
          <div
            onClick={() => onVote('abs')}
            className={`flex items-center justify-between bg-[#0f0f0f] border rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.99] ${
              myVote === 'abs'
                ? 'border-indigo-500 bg-indigo-600/15 shadow-md shadow-indigo-500/10'
                : 'border-[#1f1f1f] hover:bg-[#141414] hover:border-indigo-500/30'
            }`}
          >
            <div className="flex items-center gap-3 text-xs font-bold text-white">
              <span className="text-xl">🏠</span>
              <span>{translate('v_abs', lang)}</span>
            </div>
            <div className={`text-xs font-bold px-2.5 py-1 rounded-xl ${myVote === 'abs' ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] text-[#888]'}`}>
              {currentPoll.abs || 0}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'history') {
    let allPollsHistory = [...pollHistory];
    if (isPollActive && currentPoll && !allPollsHistory.some(p => p.id === currentPoll.id)) {
      allPollsHistory.unshift(currentPoll);
    }

    return (
      <div className="space-y-3.5 animate-fade-in">
        {/* Analytics Button placed in History Screen */}
        <button
          onClick={() => {
            setShowAnalyticsModal(true);
            haptic('medium');
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#0f0f0f] border border-[#222] hover:bg-[#141414] hover:border-indigo-500/40 text-xs font-bold text-white transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm active:scale-[0.99]"
        >
          <div className="w-7 h-7 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span>{translate('canteen_analytics_btn', lang)}</span>
          <ChevronRight className="w-4 h-4 text-[#777] ml-auto" />
        </button>

        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
          {translate('poll_pick_date', lang)}
        </div>

        {allPollsHistory.length === 0 ? (
          <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-8 text-center text-[#888] text-xs">
            {lang === 'be' ? 'Архіў апытанняў пусты' : 'Архив опросов пуст'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {allPollsHistory.map(p => {
              const createdStr = formatCustomDate(p.created, 'day_month_short', lang);
              const targetStr = formatCustomDate(p.date, 'day_month_long', lang);
              const totalVoters = (p.eat || 0) + (p.no || 0) + (p.abs || 0);

              const ePct = totalVoters > 0 ? Math.round(((p.eat || 0) / totalVoters) * 100) : 0;
              const nPct = totalVoters > 0 ? Math.round(((p.no || 0) / totalVoters) * 100) : 0;
              const aPct = totalVoters > 0 ? (100 - ePct - nPct) : 0;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPollDetail(p, targetStr);
                    onNavigate('canteen-result');
                  }}
                  className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.99] group space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      📅
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {translate('poll_for', lang)} {targetStr}
                      </div>
                      <div className="text-[11px] text-[#888] mt-0.5">
                        {translate('created', lang)} {createdStr}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-indigo-400 bg-indigo-600/15 border border-indigo-500/30 px-2.5 py-1 rounded-xl">
                      {totalVoters} 👥
                    </div>
                  </div>

                  {/* Mini visual ratio bar */}
                  {totalVoters > 0 && (
                    <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden flex">
                      <div style={{ width: `${ePct}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${nPct}%` }} className="bg-rose-500 h-full" />
                      <div style={{ width: `${aPct}%` }} className="bg-slate-500 h-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Analytics Modal */}
        {showAnalyticsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-[#0f0f0f] border border-[#222] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between shrink-0 bg-[#121212]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {translate('canteen_analytics_modal_title', lang)}
                    </h3>
                    <p className="text-[10px] text-[#888]">
                      {translate('canteen_analytics_desc', lang)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnalyticsModal(false)}
                  className="w-8 h-8 rounded-xl bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#aaa] hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
                {/* Period Filter & Search Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#777] uppercase tracking-wider block px-1">
                      {translate('month_period', lang)}
                    </label>
                    <select
                      value={selectedMonthKey}
                      onChange={e => setSelectedMonthKey(e.target.value)}
                      className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="all">{translate('all_time', lang)}</option>
                      {availableMonths.map(m => {
                        const [yyyy, mm] = m.split('-');
                        const monthDate = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
                        const monthName = monthDate.toLocaleString(lang === 'be' ? 'be-BY' : 'ru-RU', { month: 'long', year: 'numeric' });
                        return (
                          <option key={m} value={m}>
                            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-[#777] uppercase tracking-wider block px-1">
                      {translate('search_student', lang)}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={studentSearchQuery}
                          onChange={e => setStudentSearchQuery(e.target.value)}
                          placeholder={translate('search_student', lang)}
                          className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl pl-3 pr-8 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-indigo-500"
                        />
                        {studentSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setStudentSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#777] hover:text-white cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Small Menu Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowVoterMenu(!showVoterMenu);
                          haptic('light');
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                          showVoterMenu
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-[#161616] border-[#2a2a2a] text-[#aaa] hover:text-white hover:border-[#444]'
                        }`}
                        title={lang === 'be' ? 'Спіс прагаласаваўшых' : 'Список проголосовавших'}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{allVoterStatsForPeriod.length}</span>
                      </button>
                    </div>

                    {/* Popover Menu with Voter Names & Tags */}
                    {showVoterMenu && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[#161616] border border-[#2a2a2a] rounded-2xl p-3 shadow-2xl space-y-2 animate-fade-in">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">
                            {lang === 'be' ? 'Прагаласаваўшыя вучні і тэгі:' : 'Проголосовавшие ученики и теги:'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowVoterMenu(false)}
                            className="text-[10px] text-[#777] hover:text-white font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        {allVoterStatsForPeriod.length === 0 ? (
                          <div className="text-[10px] text-[#777] p-2 text-center">
                            {lang === 'be' ? 'Няма прагаласаваўшых' : 'Нет проголосовавших'}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                            {allVoterStatsForPeriod.map(st => {
                              const isSelected =
                                studentSearchQuery.toLowerCase().trim() === st.name.toLowerCase() ||
                                studentSearchQuery.toLowerCase().trim() === st.tag.toLowerCase();
                              return (
                                <button
                                  key={st.name}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setStudentSearchQuery('');
                                    } else {
                                      setStudentSearchQuery(st.name);
                                    }
                                    setShowVoterMenu(false);
                                    haptic('light');
                                  }}
                                  className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/30'
                                      : 'bg-[#202020] text-[#ccc] border-[#333] hover:border-indigo-500/50 hover:text-white'
                                  }`}
                                >
                                  <span>{st.name}</span>
                                  <span className={`text-[9px] font-mono ${isSelected ? 'text-indigo-200' : 'text-indigo-400'}`}>
                                    {st.tag}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Action Filter Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAnalyticsCategory('eat'); haptic('light'); }}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      analyticsCategory === 'eat'
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                        : 'bg-[#141414] border-[#222] text-[#888] hover:border-[#333] hover:text-white'
                    }`}
                  >
                    <span className="text-xl">🍽️</span>
                    <span className="text-xs font-bold leading-tight">
                      {translate('stat_eat', lang)}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      analyticsCategory === 'eat' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-[#222] text-[#777]'
                    }`}>
                      {totalEatVotes}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAnalyticsCategory('no'); haptic('light'); }}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      analyticsCategory === 'no'
                        ? 'bg-rose-500/15 border-rose-500/60 text-rose-300 shadow-lg shadow-rose-500/10 scale-[1.02]'
                        : 'bg-[#141414] border-[#222] text-[#888] hover:border-[#333] hover:text-white'
                    }`}
                  >
                    <span className="text-xl">🚫</span>
                    <span className="text-xs font-bold leading-tight">
                      {translate('stat_no', lang)}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      analyticsCategory === 'no' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-[#222] text-[#777]'
                    }`}>
                      {totalNoVotes}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAnalyticsCategory('abs'); haptic('light'); }}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      analyticsCategory === 'abs'
                        ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-lg shadow-amber-500/10 scale-[1.02]'
                        : 'bg-[#141414] border-[#222] text-[#888] hover:border-[#333] hover:text-white'
                    }`}
                  >
                    <span className="text-xl">🏠</span>
                    <span className="text-xs font-bold leading-tight">
                      {translate('stat_abs', lang)}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      analyticsCategory === 'abs' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-[#222] text-[#777]'
                    }`}>
                      {totalAbsVotes}
                    </span>
                  </button>
                </div>

                {/* Category List of Voters with Dates */}
                {(() => {
                  const activeStudents = studentStatsList.filter(s => {
                    if (analyticsCategory === 'eat') return s.eatCount > 0;
                    if (analyticsCategory === 'no') return s.noCount > 0;
                    return s.absCount > 0;
                  });

                  const categoryLabel =
                    analyticsCategory === 'eat' ? translate('stat_eat', lang) :
                    analyticsCategory === 'no' ? translate('stat_no', lang) :
                    translate('stat_abs', lang);

                  const themeBadgeClass =
                    analyticsCategory === 'eat' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                    analyticsCategory === 'no' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
                    'bg-amber-500/10 border-amber-500/20 text-amber-300';

                  const themeAvatarBg =
                    analyticsCategory === 'eat' ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-300' :
                    analyticsCategory === 'no' ? 'bg-rose-600/15 border-rose-500/30 text-rose-300' :
                    'bg-amber-600/15 border-amber-500/30 text-amber-300';

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">
                          {categoryLabel} ({activeStudents.length})
                        </span>
                      </div>

                      {activeStudents.length === 0 ? (
                        <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 text-center text-xs text-[#777]">
                          {lang === 'be' ? 'Няма вучняў па гэтым варыянце' : 'Нет проголосовавших за данный вариант'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeStudents.map((st) => {
                            const count = analyticsCategory === 'eat' ? st.eatCount : analyticsCategory === 'no' ? st.noCount : st.absCount;
                            const dates = analyticsCategory === 'eat' ? st.eatDates : analyticsCategory === 'no' ? st.noDates : st.absDates;

                            return (
                              <div
                                key={st.name}
                                className="bg-[#141414] border border-[#222] rounded-2xl p-3.5 space-y-2.5 transition-all shadow-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl border font-bold text-xs flex items-center justify-center shrink-0 ${themeAvatarBg}`}>
                                      {st.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-white truncate">{st.name}</div>
                                      <div className="text-[10px] text-[#888]">
                                        {count} {lang === 'be' ? 'раз(ы)' : 'раз(а)'}
                                      </div>
                                    </div>
                                  </div>

                                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${themeBadgeClass}`}>
                                    {count} {lang === 'be' ? 'дзён' : 'дней'}
                                  </span>
                                </div>

                                {/* List of exact dates when voted this way */}
                                {dates.length > 0 && (
                                  <div className="pt-2 border-t border-[#1f1f1f] space-y-1.5">
                                    <span className="text-[10px] font-bold text-[#777] block uppercase tracking-wider">
                                      {lang === 'be' ? 'Даты:' : 'Даты проголосовано:'}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {dates.map((d, idx) => (
                                        <span
                                          key={idx}
                                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${themeBadgeClass}`}
                                        >
                                          📅 {d}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Result Mode
  const activePoll = selectedPollDetail || currentPoll;
  const myVoteInPast = (activePoll.voters?.find(x => x.name === userName) || {}).status;

  const totalPollVotes = (activePoll.eat || 0) + (activePoll.no || 0) + (activePoll.abs || 0);
  const pEatPct = totalPollVotes > 0 ? Math.round(((activePoll.eat || 0) / totalPollVotes) * 100) : 0;
  const pNoPct = totalPollVotes > 0 ? Math.round(((activePoll.no || 0) / totalPollVotes) * 100) : 0;
  const pAbsPct = totalPollVotes > 0 ? (100 - pEatPct - pNoPct) : 0;

  const filteredVoters = (activePoll.voters || []).filter(v => {
    if (voterFilter === 'all') return true;
    return v.status === voterFilter;
  });

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Visual Breakdown Bar */}
      <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-emerald-400">🍽️ {activePoll.eat || 0} ({pEatPct}%)</span>
          <span className="text-rose-400">🚫 {activePoll.no || 0} ({pNoPct}%)</span>
          <span className="text-[#aaa]">🏠 {activePoll.abs || 0} ({pAbsPct}%)</span>
        </div>
        <div className="w-full h-2.5 bg-[#222] rounded-full overflow-hidden flex">
          <div style={{ width: `${pEatPct}%` }} className="bg-emerald-500 h-full transition-all duration-300" />
          <div style={{ width: `${pNoPct}%` }} className="bg-rose-500 h-full transition-all duration-300" />
          <div style={{ width: `${pAbsPct}%` }} className="bg-slate-500 h-full transition-all duration-300" />
        </div>
      </div>

      {/* Interactive Category Filter Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setVoterFilter(voterFilter === 'eat' ? 'all' : 'eat');
            haptic('light');
          }}
          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] ${
            voterFilter === 'eat'
              ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-500/10 scale-[1.02]'
              : 'bg-[#0f0f0f] border-[#1f1f1f] text-[#888] hover:border-[#333] hover:text-white'
          }`}
        >
          <div className="text-xl font-black text-emerald-400">
            {activePoll.eat || 0}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider">
            {translate('v_eat_s', lang)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setVoterFilter(voterFilter === 'no' ? 'all' : 'no');
            haptic('light');
          }}
          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] ${
            voterFilter === 'no'
              ? 'bg-rose-500/15 border-rose-500/60 text-rose-300 shadow-md shadow-rose-500/10 scale-[1.02]'
              : 'bg-[#0f0f0f] border-[#1f1f1f] text-[#888] hover:border-[#333] hover:text-white'
          }`}
        >
          <div className="text-xl font-black text-rose-400">
            {activePoll.no || 0}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider">
            {translate('v_no_s', lang)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setVoterFilter(voterFilter === 'abs' ? 'all' : 'abs');
            haptic('light');
          }}
          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] ${
            voterFilter === 'abs'
              ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10 scale-[1.02]'
              : 'bg-[#0f0f0f] border-[#1f1f1f] text-[#888] hover:border-[#333] hover:text-white'
          }`}
        >
          <div className="text-xl font-black text-[#aaa]">
            {activePoll.abs || 0}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider">
            {translate('v_abs_s', lang)}
          </div>
        </button>
      </div>

      <button
        onClick={onToggleEditPast}
        className="w-full py-2.5 rounded-2xl bg-[#161616] border border-[#2a2a2a] text-xs font-bold text-white hover:bg-[#222] hover:border-indigo-500/40 transition-all cursor-pointer"
      >
        {isEditingPast
          ? translate('btn_lock_past', lang)
          : translate('btn_edit_past', lang)}
      </button>

      {isEditingPast && (
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 space-y-3 animate-fade-in">
          <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest">
            {translate('poll_change_vote', lang)}
          </div>
          <div className="space-y-2">
            <div
              onClick={() => onVotePastPoll('eat')}
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                myVoteInPast === 'eat'
                  ? 'border-indigo-500 bg-indigo-600/15 text-white'
                  : 'border-[#2a2a2a] bg-[#161616] text-[#888] hover:text-white'
              }`}
            >
              🍽 {translate('v_eat', lang)}
            </div>
            <div
              onClick={() => onVotePastPoll('no')}
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                myVoteInPast === 'no'
                  ? 'border-indigo-500 bg-indigo-600/15 text-white'
                  : 'border-[#2a2a2a] bg-[#161616] text-[#888] hover:text-white'
              }`}
            >
              🚫 {translate('v_no', lang)}
            </div>
            <div
              onClick={() => onVotePastPoll('abs')}
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                myVoteInPast === 'abs'
                  ? 'border-indigo-500 bg-indigo-600/15 text-white'
                  : 'border-[#2a2a2a] bg-[#161616] text-[#888] hover:text-white'
              }`}
            >
              🏠 {translate('v_abs', lang)}
            </div>
          </div>
        </div>
      )}

      {/* Voters list without redundant bottom filter pills */}
      <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest">
            {lang === 'be' ? 'Вучні, якія прагаласавалі' : 'Проголосовавшие ученики'} ({filteredVoters.length})
          </div>
          {voterFilter !== 'all' && (
            <button
              type="button"
              onClick={() => {
                setVoterFilter('all');
                haptic('light');
              }}
              className="text-[10px] font-bold text-indigo-400 hover:underline cursor-pointer"
            >
              {lang === 'be' ? 'Паказаць усіх' : 'Показать всех'} ({activePoll.voters?.length || 0})
            </button>
          )}
        </div>

        {filteredVoters.length === 0 ? (
          <div className="text-center text-[#888] text-xs py-4">
            {lang === 'be' ? 'Няма тых, хто прагаласаваў' : 'Нет проголосовавших'}
          </div>
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            {filteredVoters.map((v, i) => {
              const stLbl =
                v.status === 'eat'
                  ? translate('v_eat_s', lang)
                  : v.status === 'no'
                  ? translate('v_no_s', lang)
                  : translate('v_abs_s', lang);

              const colorClass =
                v.status === 'eat'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : v.status === 'no'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-[#222] text-[#aaa] border border-[#333]';

              return (
                <div key={i} className="py-2.5 flex items-center justify-between text-xs text-white">
                  <span className="font-semibold">{v.name}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg ${colorClass}`}>
                    {stLbl}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Analytics Modal */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between shrink-0 bg-[#121212]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {translate('canteen_analytics_modal_title', lang)}
                  </h3>
                  <p className="text-[10px] text-[#888]">
                    {translate('canteen_analytics_desc', lang)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="w-8 h-8 rounded-xl bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#aaa] hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {/* Period Filter & Search Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#777] uppercase tracking-wider block px-1">
                    {translate('month_period', lang)}
                  </label>
                  <select
                    value={selectedMonthKey}
                    onChange={e => setSelectedMonthKey(e.target.value)}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">{translate('all_time', lang)}</option>
                    {availableMonths.map(m => {
                      const [yyyy, mm] = m.split('-');
                      const monthDate = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
                      const monthName = monthDate.toLocaleString(lang === 'be' ? 'be-BY' : 'ru-RU', { month: 'long', year: 'numeric' });
                      return (
                        <option key={m} value={m}>
                          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#777] uppercase tracking-wider block px-1">
                    {translate('search_student', lang)}
                  </label>
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={e => setStudentSearchQuery(e.target.value)}
                    placeholder={translate('search_student', lang)}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Summary Stats in Selected Period */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#141414] border border-[#222] rounded-2xl p-2.5 text-center">
                  <div className="text-base font-black text-amber-400">{periodTotalMeals}</div>
                  <div className="text-[9px] font-bold text-[#888] uppercase tracking-wider mt-0.5">
                    {translate('total_meals', lang)}
                  </div>
                </div>

                <div className="bg-[#141414] border border-[#222] rounded-2xl p-2.5 text-center">
                  <div className="text-base font-black text-indigo-400">{periodTotalPolls}</div>
                  <div className="text-[9px] font-bold text-[#888] uppercase tracking-wider mt-0.5">
                    {translate('total_polls', lang)}
                  </div>
                </div>

                <div className="bg-[#141414] border border-[#222] rounded-2xl p-2.5 text-center">
                  <div className="text-xs font-black text-emerald-400 truncate">
                    {topEater ? topEater.name : '—'}
                  </div>
                  <div className="text-[9px] font-bold text-[#888] uppercase tracking-wider mt-0.5">
                    👑 {lang === 'be' ? 'Лідар' : 'Лидер'}
                  </div>
                </div>
              </div>

              {/* Student Cards List */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
                  {translate('student_stats_title', lang)} ({studentStatsList.length})
                </div>

                {studentStatsList.length === 0 ? (
                  <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 text-center text-xs text-[#777]">
                    {lang === 'be' ? 'Няма даных па абраным фільтры' : 'Нет данных по выбранному фильтру'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {studentStatsList.map((st) => {
                      const isExpanded = expandedStudent === st.name;
                      const eatPct = st.totalVotes > 0 ? Math.round((st.eatCount / st.totalVotes) * 100) : 0;
                      const noPct = st.totalVotes > 0 ? Math.round((st.noCount / st.totalVotes) * 100) : 0;
                      const absPct = st.totalVotes > 0 ? (100 - eatPct - noPct) : 0;

                      return (
                        <div
                          key={st.name}
                          className="bg-[#141414] border border-[#222] hover:border-indigo-500/40 rounded-2xl p-3.5 space-y-2.5 transition-all shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {st.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">{st.name}</div>
                                <div className="text-[10px] text-[#888]">
                                  {lang === 'be' ? 'Опросов' : 'Опросов'}: {st.totalVotes}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                {eatPct}% {lang === 'be' ? 'есць' : 'ест'}
                              </span>
                              <button
                                onClick={() => setExpandedStudent(isExpanded ? null : st.name)}
                                className="text-[10px] font-bold text-[#888] hover:text-white bg-[#1f1f1f] px-2 py-1 rounded-lg cursor-pointer transition-colors"
                              >
                                {isExpanded ? (lang === 'be' ? 'Згарнуць' : 'Свернуть') : (lang === 'be' ? 'Дні' : 'Дни')}
                              </button>
                            </div>
                          </div>

                          {/* Ratio Bar */}
                          <div className="space-y-1">
                            <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden flex">
                              <div style={{ width: `${eatPct}%` }} className="bg-emerald-500 h-full" />
                              <div style={{ width: `${noPct}%` }} className="bg-rose-500 h-full" />
                              <div style={{ width: `${absPct}%` }} className="bg-slate-500 h-full" />
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-emerald-400">🍽️ {translate('stat_eat', lang)}: {st.eatCount}</span>
                              <span className="text-rose-400">🚫 {translate('stat_no', lang)}: {st.noCount}</span>
                              <span className="text-[#888]">🏠 {translate('stat_abs', lang)}: {st.absCount}</span>
                            </div>
                          </div>

                          {/* Expanded dates breakdown */}
                          {isExpanded && (
                            <div className="pt-2 border-t border-[#222] space-y-2 text-[10px] animate-fade-in">
                              {st.eatDates.length > 0 && (
                                <div>
                                  <span className="font-bold text-emerald-400 block mb-1">
                                    🍽️ {translate('stat_eat', lang)} ({st.eatDates.length}):
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {st.eatDates.map((d, idx) => (
                                      <span key={idx} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                                        {d}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {st.noDates.length > 0 && (
                                <div>
                                  <span className="font-bold text-rose-400 block mb-1">
                                    🚫 {translate('stat_no', lang)} ({st.noDates.length}):
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {st.noDates.map((d, idx) => (
                                      <span key={idx} className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2 py-0.5 rounded-md font-semibold">
                                        {d}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {st.absDates.length > 0 && (
                                <div>
                                  <span className="font-bold text-[#aaa] block mb-1">
                                    🏠 {translate('stat_abs', lang)} ({st.absDates.length}):
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {st.absDates.map((d, idx) => (
                                      <span key={idx} className="bg-[#222] border border-[#333] text-[#aaa] px-2 py-0.5 rounded-md font-semibold">
                                        {d}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

