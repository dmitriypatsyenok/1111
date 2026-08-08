import React, { useState, useEffect } from 'react';
import {
  BirthdayItem,
  ClassEvent,
  DayKey,
  DutiesStore,
  HomeworkStore,
  Language,
  PollData,
  PollStatus,
  ProfileKey,
  ScheduleProfiles,
  ScreenType
} from './types';
import {
  DEFAULT_SCHEDULES,
  INITIAL_BIRTHDAYS,
  INITIAL_DUTIES,
  INITIAL_HW
} from './defaultData';
import { initTelegramApp, haptic, tg, getTelegramUserName, sendNotification } from './telegram';
import { Topbar } from './Topbar';
import { HomeView } from './HomeView';
import { ScheduleView } from './ScheduleView';
import { HomeworkView } from './HomeworkView';
import { CanteenView } from './CanteenView';
import { EventsView } from './EventsView';
import { DutiesView } from './DutiesView';
import { BirthdaysView } from './BirthdaysView';
import { SettingsView } from './SettingsView';
import { translate } from './i18n';
import { Users, Calendar } from 'lucide-react';
import { getNextSchoolDay } from './dateFormatter';
import { subscribeToDoc, updateDocData } from './firebase';

export default function App() {
  // Telegram setup
  useEffect(() => {
    initTelegramApp();
  }, []);

  // Persistent State
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('ierihon_lang');
    if (saved === 'ru' || saved === 'be') return saved;
    if (tg?.initDataUnsafe?.user?.language_code === 'be') return 'be';
    return 'ru';
  });

  const [activeProfile, setActiveProfile] = useState<ProfileKey>(() => {
    const saved = localStorage.getItem('ierihon_profile');
    if (saved === 'base' || saved === 'math' || saved === 'chem') return saved;
    return 'base';
  });

  const getTodayDayKey = (): DayKey => {
    const day = new Date().getDay();
    const dayMap: DayKey[] = ['pn', 'pn', 'vt', 'sr', 'cht', 'pt', 'pn'];
    return dayMap[day] || 'pn';
  };

  const [activeDay, setActiveDay] = useState<DayKey>(getTodayDayKey);
  const [activeHwDay, setActiveHwDay] = useState<DayKey>(getTodayDayKey);
  const [activeDutyDay, setActiveDutyDay] = useState<DayKey>(getTodayDayKey);
  const [activeSubjectKey, setActiveSubjectKey] = useState<string>('math');

  // Schedules
  const [schedules, setSchedules] = useState<ScheduleProfiles>(() => {
    const saved = localStorage.getItem('ierihon_schedules');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return DEFAULT_SCHEDULES;
  });

  // Homework
  const [homework, setHomework] = useState<HomeworkStore>(() => {
    const saved = localStorage.getItem('ierihon_homework');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_HW;
  });

  // Duties
  const [duties, setDuties] = useState<DutiesStore>(() => {
    const saved = localStorage.getItem('ierihon_duties');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed.pn)) {
          return parsed;
        }
      } catch (e) { /* ignore */ }
    }
    return INITIAL_DUTIES;
  });

  // Birthdays
  const [birthdays, setBirthdays] = useState<BirthdayItem[]>(() => {
    const saved = localStorage.getItem('ierihon_birthdays');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { /* ignore */ }
    }
    return INITIAL_BIRTHDAYS;
  });

  // Events
  const [events, setEvents] = useState<ClassEvent[]>(() => {
    const saved = localStorage.getItem('ierihon_events');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      {
        id: '1',
        title: 'Классный час',
        date: new Date().toISOString().slice(0, 10),
        time: '14:40'
      }
    ];
  });

  // Polls
  const [isPollActive, setIsPollActive] = useState<boolean>(() => {
    return localStorage.getItem('ierihon_poll_active') === 'true';
  });

  const [pollHistory, setPollHistory] = useState<PollData[]>(() => {
    const saved = localStorage.getItem('ierihon_poll_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  const [currentPoll, setCurrentPoll] = useState<PollData>(() => {
    const saved = localStorage.getItem('ierihon_current_poll');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      id: 'poll_init',
      created: new Date().toISOString().slice(0, 10),
      date: new Date().toISOString().slice(0, 10),
      eat: 0,
      no: 0,
      abs: 0,
      voters: []
    };
  });

  const [tgConfig, setTgConfig] = useState<{ token: string; chatId: string }>(() => ({
    token: localStorage.getItem('ierihon_tg_token') || '',
    chatId: localStorage.getItem('ierihon_tg_chat_id') || ''
  }));

  // Real-time Firebase Synchronization across devices
  useEffect(() => {
    const unsubSchedules = subscribeToDoc<ScheduleProfiles>(
      'schedules',
      data => { if (data && typeof data === 'object') setSchedules(data); },
      () => updateDocData('schedules', schedules)
    );
    const unsubHomework = subscribeToDoc<HomeworkStore>(
      'homework',
      data => { if (data && typeof data === 'object') setHomework(data); },
      () => updateDocData('homework', homework)
    );
    const unsubDuties = subscribeToDoc<DutiesStore>(
      'duties',
      data => { if (data && typeof data === 'object') setDuties(data); },
      () => updateDocData('duties', duties)
    );
    const unsubBirthdays = subscribeToDoc<BirthdayItem[]>(
      'birthdays',
      data => { if (Array.isArray(data)) setBirthdays(data); },
      () => updateDocData('birthdays', birthdays)
    );
    const unsubEvents = subscribeToDoc<ClassEvent[]>(
      'events',
      data => { if (Array.isArray(data)) setEvents(data); },
      () => updateDocData('events', events)
    );
    const unsubPoll = subscribeToDoc<PollData>(
      'currentPoll',
      data => { if (data && typeof data === 'object') setCurrentPoll(data); },
      () => updateDocData('currentPoll', currentPoll)
    );
    const unsubPollHistory = subscribeToDoc<PollData[]>(
      'pollHistory',
      data => { if (Array.isArray(data)) setPollHistory(data); },
      () => updateDocData('pollHistory', pollHistory)
    );
    const unsubIsPollActive = subscribeToDoc<boolean>(
      'isPollActive',
      data => { if (typeof data === 'boolean') setIsPollActive(data); },
      () => updateDocData('isPollActive', isPollActive)
    );
    const unsubTgConfig = subscribeToDoc<{ token: string; chatId: string }>(
      'tgConfig',
      data => {
        if (data && typeof data === 'object') {
          setTgConfig(data);
          if (data.token) localStorage.setItem('ierihon_tg_token', data.token);
          if (data.chatId) localStorage.setItem('ierihon_tg_chat_id', data.chatId);
        }
      },
      () => updateDocData('tgConfig', tgConfig)
    );

    return () => {
      unsubSchedules();
      unsubHomework();
      unsubDuties();
      unsubBirthdays();
      unsubEvents();
      unsubPoll();
      unsubPollHistory();
      unsubIsPollActive();
      unsubTgConfig();
    };
  }, []);

  const handleSaveTgConfig = (token: string, chatId: string) => {
    const newConfig = { token: token.trim(), chatId: chatId.trim() };
    setTgConfig(newConfig);
    localStorage.setItem('ierihon_tg_token', newConfig.token);
    localStorage.setItem('ierihon_tg_chat_id', newConfig.chatId);
    updateDocData('tgConfig', newConfig);
  };

  const [selectedPollDetail, setSelectedPollDetail] = useState<PollData | null>(null);
  const [selectedPollDateStr, setSelectedPollDateStr] = useState<string>('');
  const [isEditingPast, setIsEditingPast] = useState<boolean>(false);

  // Navigation Stack
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(['home']);
  const currentScreen = screenHistory[screenHistory.length - 1];

  // Sync to localStorage as offline fallback
  useEffect(() => {
    localStorage.setItem('ierihon_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('ierihon_profile', activeProfile);
  }, [activeProfile]);

  useEffect(() => {
    localStorage.setItem('ierihon_schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('ierihon_homework', JSON.stringify(homework));
  }, [homework]);

  useEffect(() => {
    localStorage.setItem('ierihon_duties', JSON.stringify(duties));
  }, [duties]);

  useEffect(() => {
    localStorage.setItem('ierihon_birthdays', JSON.stringify(birthdays));

    if (birthdays && birthdays.length > 0) {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const todayDDMM = `${day}.${month}`;
      const todayYMD = now.toISOString().slice(0, 10);

      const lastNotified = localStorage.getItem('ierihon_last_bday_notified');
      if (lastNotified !== todayYMD) {
        const todayBirthdays = birthdays.filter(b => {
          if (!b.date) return false;
          const parts = b.date.trim().split('.');
          if (parts.length >= 2) {
            const d = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            return `${d}.${m}` === todayDDMM;
          }
          return false;
        });

        if (todayBirthdays.length > 0) {
          const names = todayBirthdays.map(b => b.name).join(', ');
          sendNotification(
            lang === 'be' ? '🎂 Дзень нараджэння сёння!' : '🎂 День рождения сегодня!',
            lang === 'be'
              ? `Сёння святкуе: ${names}! Паздраўляем! 🎉`
              : `Сегодня празднует: ${names}! Поздравляем! 🎉`
          );
          localStorage.setItem('ierihon_last_bday_notified', todayYMD);
        }
      }
    }
  }, [birthdays, lang]);

  useEffect(() => {
    localStorage.setItem('ierihon_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('ierihon_poll_active', String(isPollActive));
  }, [isPollActive]);

  useEffect(() => {
    localStorage.setItem('ierihon_poll_history', JSON.stringify(pollHistory));
  }, [pollHistory]);

  useEffect(() => {
    localStorage.setItem('ierihon_current_poll', JSON.stringify(currentPoll));
  }, [currentPoll]);

  // Telegram Back Button Hook
  useEffect(() => {
    if (tg?.BackButton) {
      if (screenHistory.length > 1) {
        tg.BackButton.show();
        const handleTelegramBack = () => handleBack();
        tg.BackButton.onClick(handleTelegramBack);
        return () => {
          tg.BackButton.offClick(handleTelegramBack);
        };
      } else {
        tg.BackButton.hide();
      }
    }
  }, [screenHistory]);

  // Navigation Handlers
  const handleNavigate = (screen: ScreenType) => {
    setScreenHistory(prev => [...prev, screen]);
    haptic('light');
  };

  const handleBack = () => {
    if (screenHistory.length <= 1) return;
    setScreenHistory(prev => prev.slice(0, prev.length - 1));
    haptic('light');
  };

  // Language setter
  const handleSetLang = (newLang: Language) => {
    setLangState(newLang);
    haptic('selection');
  };

  // DUTY ZONE HANDLERS (2-level system)
  const handleCreateZone = (dayKey: DayKey, zoneName: string) => {
    setDuties(prev => {
      const dayZones = prev[dayKey] || [];
      const newZone = {
        id: 'zone_' + Date.now(),
        name: zoneName,
        students: []
      };
      const nextDuties = {
        ...prev,
        [dayKey]: [...dayZones, newZone]
      };
      updateDocData('duties', nextDuties);
      return nextDuties;
    });

    sendNotification(
      lang === 'be' ? '🧹 Новая зона чаргоўства' : '🧹 Новая зона дежурства',
      zoneName
    );
  };

  const handleDeleteZone = (dayKey: DayKey, zoneId: string) => {
    setDuties(prev => {
      const dayZones = prev[dayKey] || [];
      const nextDuties = {
        ...prev,
        [dayKey]: dayZones.filter(z => z.id !== zoneId)
      };
      updateDocData('duties', nextDuties);
      return nextDuties;
    });
  };

  const handleAssignStudentToZone = (
    dayKey: DayKey,
    zoneId: string,
    studentName: string
  ) => {
    setDuties(prev => {
      const dayZones = prev[dayKey] || [];
      const updatedZones = dayZones.map(z => {
        if (z.id === zoneId) {
          if (z.students.includes(studentName)) return z;
          return {
            ...z,
            students: [...z.students, studentName]
          };
        }
        return z;
      });
      const nextDuties = {
        ...prev,
        [dayKey]: updatedZones
      };
      updateDocData('duties', nextDuties);
      return nextDuties;
    });
  };

  const handleRemoveStudentFromZone = (
    dayKey: DayKey,
    zoneId: string,
    studentIndex: number
  ) => {
    setDuties(prev => {
      const dayZones = prev[dayKey] || [];
      const updatedZones = dayZones.map(z => {
        if (z.id === zoneId) {
          const nextStudents = [...z.students];
          nextStudents.splice(studentIndex, 1);
          return {
            ...z,
            students: nextStudents
          };
        }
        return z;
      });
      const nextDuties = {
        ...prev,
        [dayKey]: updatedZones
      };
      updateDocData('duties', nextDuties);
      return nextDuties;
    });
  };

  // HOMEWORK HANDLERS
  const handleSaveHomework = (subjectKey: string, text: string) => {
    setHomework(prev => {
      const currentList = prev[subjectKey] || [];
      const dueISO = getNextSchoolDay(new Date()).toISOString().slice(0, 10);
      const newItem = {
        id: Date.now().toString(),
        text,
        due: dueISO,
        created: new Date().toISOString().slice(0, 10)
      };
      const nextHw = {
        ...prev,
        [subjectKey]: [...currentList, newItem]
      };
      updateDocData('homework', nextHw);
      return nextHw;
    });

    sendNotification(
      lang === 'be' ? '📚 Новае дамашняе заданне' : '📚 Новое домашнее задание',
      text
    );
  };

  const handleEditHomework = (subjectKey: string, id: string, newText: string) => {
    setHomework(prev => {
      const currentList = prev[subjectKey] || [];
      const nextHw = {
        ...prev,
        [subjectKey]: currentList.map(item =>
          item.id === id ? { ...item, text: newText } : item
        )
      };
      updateDocData('homework', nextHw);
      return nextHw;
    });
  };

  const handleDeleteHomework = (subjectKey: string, id: string) => {
    setHomework(prev => {
      const currentList = prev[subjectKey] || [];
      const nextHw = {
        ...prev,
        [subjectKey]: currentList.filter(item => item.id !== id)
      };
      updateDocData('homework', nextHw);
      return nextHw;
    });
  };

  const handleClearAllHomework = () => {
    if (confirm(translate('confirm_clear_hw_all', lang))) {
      const emptyHw = {};
      setHomework(emptyHw);
      updateDocData('homework', emptyHw);
      haptic('success');
      alert(lang === 'be' ? 'Усе заданні ачышчаны.' : 'Все домашние задания очищены.');
    }
  };

  const handleClearAllData = () => {
    if (confirm(translate('confirm_clear_all_data', lang))) {
      const emptyHw = {};
      const emptyDuties = { zones: [] };
      const emptyEvents: ClassEvent[] = [];
      const emptyPoll: PollData = {
        id: '1',
        created: '',
        date: '',
        eat: 0,
        no: 0,
        abs: 0,
        voters: []
      };
      const emptyPollHistory: PollData[] = [];

      setHomework(emptyHw);
      setDuties(emptyDuties);
      setEvents(emptyEvents);
      setCurrentPoll(emptyPoll);
      setPollHistory(emptyPollHistory);
      setIsPollActive(false);

      updateDocData('homework', emptyHw);
      updateDocData('duties', emptyDuties);
      updateDocData('events', emptyEvents);
      updateDocData('currentPoll', emptyPoll);
      updateDocData('pollHistory', emptyPollHistory);
      updateDocData('isPollActive', false);

      haptic('success');
      alert(lang === 'be' ? 'Усе дадзеныя прыкладання абнулены!' : 'Все данные приложения успешно обнулены!');
    }
  };

  // CANTEEN POLL HANDLERS
  const handleCreatePoll = () => {
    const today = new Date();
    const targetDate = getNextSchoolDay(today).toISOString().slice(0, 10);

    let updatedHistory = pollHistory;
    if (currentPoll && currentPoll.voters && currentPoll.voters.length > 0 && currentPoll.id !== '1') {
      const idx = pollHistory.findIndex(p => p.id === currentPoll.id);
      if (idx >= 0) {
        updatedHistory = [...pollHistory];
        updatedHistory[idx] = { ...currentPoll };
      } else {
        updatedHistory = [currentPoll, ...pollHistory];
      }
      setPollHistory(updatedHistory);
      updateDocData('pollHistory', updatedHistory);
    }

    const newPoll: PollData = {
      id: 'poll_' + Date.now(),
      created: today.toISOString().slice(0, 10),
      date: targetDate,
      eat: 0,
      no: 0,
      abs: 0,
      voters: []
    };

    setCurrentPoll(newPoll);
    updateDocData('currentPoll', newPoll);
    setIsPollActive(true);
    updateDocData('isPollActive', true);
    handleNavigate('canteen-poll');

    sendNotification(
      lang === 'be' ? '🍽️ Новае апытанне сталовай' : '🍽️ Новый опрос столовой',
      (lang === 'be' ? 'Запушчана апытанне на ' : 'Запущен опрос на ') + targetDate
    );
  };

  const handleVote = (status: PollStatus) => {
    if (!isPollActive || !currentPoll) return;
    const userName = getTelegramUserName(lang);

    const voters = [...currentPoll.voters];
    const existingIdx = voters.findIndex(v => v.name === userName);

    let newEat = currentPoll.eat;
    let newNo = currentPoll.no;
    let newAbs = currentPoll.abs;

    if (existingIdx >= 0) {
      const oldStatus = voters[existingIdx].status;
      if (oldStatus === status) return; // no change

      if (oldStatus === 'eat' && newEat > 0) newEat--;
      if (oldStatus === 'no' && newNo > 0) newNo--;
      if (oldStatus === 'abs' && newAbs > 0) newAbs--;

      voters[existingIdx] = { name: userName, status };
    } else {
      voters.push({ name: userName, status });
    }

    if (status === 'eat') newEat++;
    if (status === 'no') newNo++;
    if (status === 'abs') newAbs++;

    const updatedPoll: PollData = {
      ...currentPoll,
      eat: newEat,
      no: newNo,
      abs: newAbs,
      voters
    };

    setCurrentPoll(updatedPoll);
    updateDocData('currentPoll', updatedPoll);

    haptic('medium');
  };

  const handleVotePastPoll = (status: PollStatus) => {
    if (!selectedPollDetail) return;
    const userName = getTelegramUserName(lang);

    const voters = [...selectedPollDetail.voters];
    const existingIdx = voters.findIndex(v => v.name === userName);

    let newEat = selectedPollDetail.eat;
    let newNo = selectedPollDetail.no;
    let newAbs = selectedPollDetail.abs;

    if (existingIdx >= 0) {
      const oldStatus = voters[existingIdx].status;
      if (oldStatus === status) return;

      if (oldStatus === 'eat' && newEat > 0) newEat--;
      if (oldStatus === 'no' && newNo > 0) newNo--;
      if (oldStatus === 'abs' && newAbs > 0) newAbs--;

      voters[existingIdx] = { name: userName, status };
    } else {
      voters.push({ name: userName, status });
    }

    if (status === 'eat') newEat++;
    if (status === 'no') newNo++;
    if (status === 'abs') newAbs++;

    const updatedPoll: PollData = {
      ...selectedPollDetail,
      eat: newEat,
      no: newNo,
      abs: newAbs,
      voters
    };

    setSelectedPollDetail(updatedPoll);

    const updatedHistory = pollHistory.map(p => (p.id === updatedPoll.id ? updatedPoll : p));
    setPollHistory(updatedHistory);
    updateDocData('pollHistory', updatedHistory);

    if (currentPoll.id === updatedPoll.id) {
      setCurrentPoll(updatedPoll);
      updateDocData('currentPoll', updatedPoll);
    }

    haptic('medium');
  };

  // EVENTS HANDLERS
  const handleAddEvent = (title: string, date: string, time: string) => {
    const newEvent: ClassEvent = {
      id: Date.now().toString(),
      title,
      date,
      time
    };
    setEvents(prev => {
      const nextEvents = [...prev, newEvent];
      updateDocData('events', nextEvents);
      return nextEvents;
    });

    sendNotification(
      lang === 'be' ? '📅 Новае мерапрыемства класа' : '📅 Новое мероприятие класса',
      `${title} (${date} ${time})`
    );
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => {
      const nextEvents = prev.filter(e => e.id !== id);
      updateDocData('events', nextEvents);
      return nextEvents;
    });
  };

  // IMPORT HANDLERS
  const handleImportSchedules = (data: ScheduleProfiles) => {
    setSchedules(data);
    updateDocData('schedules', data);
  };

  const handleImportHomework = (data: HomeworkStore) => {
    setHomework(data);
    updateDocData('homework', data);
  };

  const handleImportDuties = (data: DutiesStore) => {
    setDuties(data);
    updateDocData('duties', data);
  };

  const handleImportBirthdays = (data: BirthdayItem[]) => {
    setBirthdays(data);
    updateDocData('birthdays', data);
  };

  // Render Screen Content
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeView
            birthdays={birthdays}
            schedules={schedules}
            activeProfile={activeProfile}
            lang={lang}
            onNavigate={handleNavigate}
          />
        );

      case 'schedule':
        return (
          <ScheduleView
            viewMode="profiles"
            schedules={schedules}
            activeProfile={activeProfile}
            activeDay={activeDay}
            lang={lang}
            onSelectProfile={p => {
              setActiveProfile(p);
              handleNavigate('schedule-days');
            }}
            onSelectDay={setActiveDay}
            onNavigate={handleNavigate}
          />
        );

      case 'schedule-days':
        return (
          <ScheduleView
            viewMode="days"
            schedules={schedules}
            activeProfile={activeProfile}
            activeDay={activeDay}
            lang={lang}
            onSelectProfile={setActiveProfile}
            onSelectDay={setActiveDay}
            onNavigate={handleNavigate}
          />
        );

      case 'hw':
        return (
          <HomeworkView
            viewMode="main"
            homeworkStore={homework}
            schedules={schedules}
            activeProfile={activeProfile}
            activeSubjectKey={activeSubjectKey}
            activeHwDay={activeHwDay}
            lang={lang}
            onSelectProfile={setActiveProfile}
            onSelectSubject={setActiveSubjectKey}
            onSelectHwDay={setActiveHwDay}
            onNavigate={handleNavigate}
            onSaveHomework={handleSaveHomework}
            onEditHomework={handleEditHomework}
            onDeleteHomework={handleDeleteHomework}
          />
        );

      case 'hw-subjects':
        return (
          <HomeworkView
            viewMode="subjects"
            homeworkStore={homework}
            schedules={schedules}
            activeProfile={activeProfile}
            activeSubjectKey={activeSubjectKey}
            activeHwDay={activeHwDay}
            lang={lang}
            onSelectProfile={setActiveProfile}
            onSelectSubject={setActiveSubjectKey}
            onSelectHwDay={setActiveHwDay}
            onNavigate={handleNavigate}
            onSaveHomework={handleSaveHomework}
            onEditHomework={handleEditHomework}
            onDeleteHomework={handleDeleteHomework}
          />
        );

      case 'hw-detail':
        return (
          <HomeworkView
            viewMode="detail"
            homeworkStore={homework}
            schedules={schedules}
            activeProfile={activeProfile}
            activeSubjectKey={activeSubjectKey}
            activeHwDay={activeHwDay}
            lang={lang}
            onSelectProfile={setActiveProfile}
            onSelectSubject={setActiveSubjectKey}
            onSelectHwDay={setActiveHwDay}
            onNavigate={handleNavigate}
            onSaveHomework={handleSaveHomework}
            onEditHomework={handleEditHomework}
            onDeleteHomework={handleDeleteHomework}
          />
        );

      case 'canteen':
        return (
          <CanteenView
            viewMode="menu"
            currentPoll={currentPoll}
            pollHistory={pollHistory}
            isPollActive={isPollActive}
            selectedPollDetail={selectedPollDetail}
            selectedPollDateStr={selectedPollDateStr}
            isEditingPast={isEditingPast}
            lang={lang}
            onNavigate={handleNavigate}
            onCreatePoll={handleCreatePoll}
            onVote={handleVote}
            onSelectPollDetail={(poll, dateStr) => {
              setSelectedPollDetail(poll);
              setSelectedPollDateStr(dateStr);
              setIsEditingPast(false);
            }}
            onToggleEditPast={() => setIsEditingPast(!isEditingPast)}
            onVotePastPoll={handleVotePastPoll}
          />
        );

      case 'canteen-poll':
        return (
          <CanteenView
            viewMode="poll"
            currentPoll={currentPoll}
            pollHistory={pollHistory}
            isPollActive={isPollActive}
            selectedPollDetail={selectedPollDetail}
            selectedPollDateStr={selectedPollDateStr}
            isEditingPast={isEditingPast}
            lang={lang}
            onNavigate={handleNavigate}
            onCreatePoll={handleCreatePoll}
            onVote={handleVote}
            onSelectPollDetail={(poll, dateStr) => {
              setSelectedPollDetail(poll);
              setSelectedPollDateStr(dateStr);
              setIsEditingPast(false);
            }}
            onToggleEditPast={() => setIsEditingPast(!isEditingPast)}
            onVotePastPoll={handleVotePastPoll}
          />
        );

      case 'canteen-history':
        return (
          <CanteenView
            viewMode="history"
            currentPoll={currentPoll}
            pollHistory={pollHistory}
            isPollActive={isPollActive}
            selectedPollDetail={selectedPollDetail}
            selectedPollDateStr={selectedPollDateStr}
            isEditingPast={isEditingPast}
            lang={lang}
            onNavigate={handleNavigate}
            onCreatePoll={handleCreatePoll}
            onVote={handleVote}
            onSelectPollDetail={(poll, dateStr) => {
              setSelectedPollDetail(poll);
              setSelectedPollDateStr(dateStr);
              setIsEditingPast(false);
            }}
            onToggleEditPast={() => setIsEditingPast(!isEditingPast)}
            onVotePastPoll={handleVotePastPoll}
          />
        );

      case 'canteen-result':
        return (
          <CanteenView
            viewMode="result"
            currentPoll={currentPoll}
            pollHistory={pollHistory}
            isPollActive={isPollActive}
            selectedPollDetail={selectedPollDetail}
            selectedPollDateStr={selectedPollDateStr}
            isEditingPast={isEditingPast}
            lang={lang}
            onNavigate={handleNavigate}
            onCreatePoll={handleCreatePoll}
            onVote={handleVote}
            onSelectPollDetail={(poll, dateStr) => {
              setSelectedPollDetail(poll);
              setSelectedPollDateStr(dateStr);
              setIsEditingPast(false);
            }}
            onToggleEditPast={() => setIsEditingPast(!isEditingPast)}
            onVotePastPoll={handleVotePastPoll}
          />
        );

      case 'events':
        return (
          <EventsView
            events={events}
            lang={lang}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        );

      case 'class':
        return (
          <div className="space-y-3 animate-fade-in">
            <div
              onClick={() => handleNavigate('duties')}
              className="flex items-center gap-3 bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">
                  {translate('duties_title', lang)}
                </div>
                <div className="text-xs text-[#888] mt-0.5">
                  {translate('duties_desc', lang)}
                </div>
              </div>
            </div>

            <div
              onClick={() => handleNavigate('birthdays')}
              className="flex items-center gap-3 bg-[#0f0f0f] border border-[#1f1f1f] rounded-3xl p-4 cursor-pointer hover:bg-[#141414] hover:border-indigo-500/50 transition-all active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-2xl bg-pink-500/15 text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">
                  {translate('birthdays_title', lang)}
                </div>
                <div className="text-xs text-[#888] mt-0.5">
                  {translate('birthdays_desc', lang)}
                </div>
              </div>
            </div>
          </div>
        );

      case 'duties':
        return (
          <DutiesView
            duties={duties}
            birthdays={birthdays}
            activeDay={activeDutyDay}
            lang={lang}
            onSelectDay={setActiveDutyDay}
            onCreateZone={handleCreateZone}
            onDeleteZone={handleDeleteZone}
            onAssignStudent={handleAssignStudentToZone}
            onRemoveStudent={handleRemoveStudentFromZone}
          />
        );

      case 'birthdays':
        return <BirthdaysView birthdays={birthdays} lang={lang} />;

      case 'settings':
        return (
          <SettingsView
            lang={lang}
            schedules={schedules}
            homework={homework}
            duties={duties}
            birthdays={birthdays}
            tgConfig={tgConfig}
            onSetLang={handleSetLang}
            onImportSchedules={handleImportSchedules}
            onImportHomework={handleImportHomework}
            onImportDuties={handleImportDuties}
            onImportBirthdays={handleImportBirthdays}
            onClearAllHomework={handleClearAllHomework}
            onClearAllData={handleClearAllData}
            onSaveTgConfig={handleSaveTgConfig}
          />
        );

      default:
        return null;
    }
  };

  const getProfileName = (): string => {
    const profilesDict = translate('profiles', lang) as any;
    return profilesDict?.[activeProfile] || activeProfile;
  };

  return (
    <div className="max-w-[500px] mx-auto min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col font-sans select-none pb-safe">
      <Topbar
        currentScreen={currentScreen}
        screenHistory={screenHistory}
        profileName={getProfileName()}
        activeSubjectKey={activeSubjectKey}
        activePollDate={selectedPollDateStr}
        lang={lang}
        onBack={handleBack}
      />

      <main className="flex-1 p-3 pb-6">{renderScreen()}</main>
    </div>
  );
}
