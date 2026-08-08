import React from 'react';
import { Language, PollData, PollStatus, ScreenType } from './types';
import { translate } from './i18n';
import { formatCustomDate, getNextSchoolDay } from './dateFormatter';
import { Vote, BarChart2, CheckCircle2, XCircle, Home, Edit3, ChevronRight } from 'lucide-react';
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
  onCreatePoll: () => void;
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

  if (viewMode === 'menu') {
    return (
      <div className="space-y-3.5 animate-fade-in">
        <div className="space-y-2.5">
          {/* Create Poll Card */}
          <div
            onClick={onCreatePoll}
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

          {/* Vote Button */}
          <div
            onClick={() => {
              if (!isPollActive) {
                alert(translate('poll_not_created_msg', lang));
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
    let allPolls = [...pollHistory];
    if (isPollActive && currentPoll && !allPolls.some(p => p.id === currentPoll.id)) {
      allPolls.unshift(currentPoll);
    }

    return (
      <div className="space-y-3.5 animate-fade-in">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-1">
          {translate('poll_pick_date', lang)}
        </div>

        {allPolls.length === 0 ? (
          <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-8 text-center text-[#888] text-xs">
            {lang === 'be' ? 'Архіў апытанняў пусты' : 'Архив опросов пуст'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {allPolls.map(p => {
              const createdStr = formatCustomDate(p.created, 'day_month_short', lang);
              const targetStr = formatCustomDate(p.date, 'day_month_long', lang);
              const totalVoters = (p.eat || 0) + (p.no || 0) + (p.abs || 0);

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPollDetail(p, targetStr);
                    onNavigate('canteen-result');
                  }}
                  className="flex items-center gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3.5 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.99] group"
                >
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
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Result Mode
  const activePoll = selectedPollDetail || currentPoll;
  const myVoteInPast = (activePoll.voters.find(x => x.name === userName) || {}).status;

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3 text-center">
          <div className="text-xl font-black text-emerald-400">
            {activePoll.eat || 0}
          </div>
          <div className="text-[10px] text-[#888] font-bold uppercase tracking-wider mt-0.5">
            {translate('v_eat_s', lang)}
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3 text-center">
          <div className="text-xl font-black text-rose-400">
            {activePoll.no || 0}
          </div>
          <div className="text-[10px] text-[#888] font-bold uppercase tracking-wider mt-0.5">
            {translate('v_no_s', lang)}
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-3 text-center">
          <div className="text-xl font-black text-[#aaa]">
            {activePoll.abs || 0}
          </div>
          <div className="text-[10px] text-[#888] font-bold uppercase tracking-wider mt-0.5">
            {translate('v_abs_s', lang)}
          </div>
        </div>
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
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 space-y-3">
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

      {/* Voters list */}
      <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 space-y-3">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest">
          {lang === 'be' ? 'Вучні, якія прагаласавалі' : 'Проголосовавшие ученики'}
        </div>

        {(!activePoll.voters || activePoll.voters.length === 0) ? (
          <div className="text-center text-[#888] text-xs py-4">
            {lang === 'be' ? 'Няма тых, хто прагаласаваў' : 'Нет проголосовавших'}
          </div>
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            {activePoll.voters.map((v, i) => {
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
    </div>
  );
};
