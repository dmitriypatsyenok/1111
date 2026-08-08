export type Language = 'ru' | 'be';

export type ProfileKey = 'base' | 'math' | 'chem';
export type DayKey = 'pn' | 'vt' | 'sr' | 'cht' | 'pt';

export interface SubjectMeta {
  key: string;
  ru: string;
  be: string;
  ic: string;
}

export interface HomeworkItem {
  id: string;
  text: string;
  due: string; // YYYY-MM-DD
  created: string; // YYYY-MM-DD
}

export interface HomeworkStore {
  [subjectKey: string]: HomeworkItem[];
}

export interface DutyZone {
  id: string;
  name: string; // e.g. "1 этаж", "2 этаж", "3 этаж", "Столовая", or custom
  students: string[]; // ["Дятлов Влад", "Комар Влад"]
}

export interface DutiesStore {
  [dayKey: string]: DutyZone[];
}

export interface BirthdayItem {
  name: string;
  date: string; // "DD.MM"
}

export interface ClassEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
}

export type PollStatus = 'eat' | 'no' | 'abs';

export interface PollVoter {
  name: string;
  status: PollStatus;
}

export interface PollData {
  id: string;
  created: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  eat: number;
  no: number;
  abs: number;
  voters: PollVoter[];
}

export interface DaySchedules {
  pn: string[];
  vt: string[];
  sr: string[];
  cht: string[];
  pt: string[];
}

export interface ScheduleProfiles {
  base: DaySchedules & { title?: string };
  math: DaySchedules & { title?: string };
  chem: DaySchedules & { title?: string };
}

export type ScreenType =
  | 'home'
  | 'schedule'
  | 'schedule-days'
  | 'hw'
  | 'hw-subjects'
  | 'hw-detail'
  | 'canteen'
  | 'canteen-poll'
  | 'canteen-history'
  | 'canteen-result'
  | 'events'
  | 'class'
  | 'duties'
  | 'birthdays'
  | 'settings';
