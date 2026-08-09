import React, { useState } from 'react';
import { ClassEvent, Language } from './types';
import { translate } from './i18n';
import { formatCustomDate } from './dateFormatter';
import { Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { haptic } from './telegram';

interface EventsViewProps {
  events: ClassEvent[];
  lang: Language;
  onAddEvent: (title: string, date: string, time: string) => void;
  onDeleteEvent: (id: string) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  lang,
  onAddEvent,
  onDeleteEvent
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('12:00');

  const handleSave = () => {
    if (!title.trim() || !date) {
      alert(lang === 'be' ? 'Калі ласка, запоўніце назву і дату!' : 'Пожалуйста, заполните название и дату!');
      return;
    }
    onAddEvent(title.trim(), date, time);
    setTitle('');
    setIsModalOpen(false);
    haptic('success');
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-3.5 animate-fade-in">
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] shadow-md shadow-indigo-500/20 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span>{translate('add_event', lang)}</span>
      </button>

      {sortedEvents.length === 0 ? (
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-8 text-center text-[#888] text-xs">
          {translate('no_events', lang)}
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedEvents.map(ev => {
            const dateStr = formatCustomDate(ev.date, 'day_month_long', lang);

            return (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-3.5 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-4 shadow-sm"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-xs font-bold text-white truncate">
                    {ev.title}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#888]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      {dateStr}
                    </span>
                    {ev.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {ev.time}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onDeleteEvent(ev.id);
                    haptic('success');
                  }}
                  className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center hover:bg-rose-500/25 transition-all shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#0f0f0f] border border-[#2a2a2a] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slide-up">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-4 bg-indigo-500 rounded-full inline-block"></span>
              {translate('add_event', lang)}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#888] mb-1.5 block">
                  {lang === 'be' ? 'Назва мерапрыемства' : 'Название мероприятия'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={
                    lang === 'be'
                      ? 'Напрыклад: Кантрольная праца па фізіцы'
                      : 'Например: Контрольная по физике'
                  }
                  className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl text-xs text-white p-3 focus:outline-none focus:border-indigo-500 placeholder:text-[#666]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#888] mb-1.5 block">
                    {lang === 'be' ? 'Дата' : 'Дата'}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl text-xs text-white p-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#888] mb-1.5 block">
                    {lang === 'be' ? 'Час' : 'Время'}
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl text-xs text-white p-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-white font-bold hover:bg-[#222] transition-all"
              >
                {translate('cancel', lang)}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-600 text-xs text-white font-bold shadow-lg shadow-indigo-500/20 transition-all"
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
