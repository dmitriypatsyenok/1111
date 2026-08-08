import { Language } from './types';

const MONTHS_RU_NOM = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const MONTHS_RU_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const WEEKDAYS_RU = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

const MONTHS_BE_NOM = ["студзень","люты","сакавік","красавік","май","чэрвень","ліпень","жнівень","верасень","кастрычнік","лістапад","снежань"];
const MONTHS_BE_GEN = ["студзеня","лютага","сакавіка","красавіка","мая","чэрвеня","ліпеня","жніўня","верасня","кастрычніка","лістапада","снежня"];
const WEEKDAYS_BE = ["нядзеля","панядзелак","аўторак","серада","чацвер","пятніца","субота"];

export function formatCustomDate(
  dateObjOrString: Date | string,
  formatType: 'weekday_day_month' | 'day_month_long' | 'day_month_short' | 'full',
  lang: Language = 'ru'
): string {
  const d = new Date(dateObjOrString);
  if (isNaN(d.getTime())) return String(dateObjOrString);

  const dayNum = d.getDate();
  const monthIdx = d.getMonth();
  const yearNum = d.getFullYear();
  const weekdayIdx = d.getDay();
  const isBe = lang === 'be';

  if (formatType === 'weekday_day_month') {
    const w = isBe ? WEEKDAYS_BE[weekdayIdx] : WEEKDAYS_RU[weekdayIdx];
    const m = isBe ? MONTHS_BE_GEN[monthIdx] : MONTHS_RU_GEN[monthIdx];
    return `${w}, ${dayNum} ${m}`;
  }
  if (formatType === 'day_month_long') {
    const m = isBe ? MONTHS_BE_GEN[monthIdx] : MONTHS_RU_GEN[monthIdx];
    return `${dayNum} ${m}`;
  }
  if (formatType === 'day_month_short') {
    const dd = String(dayNum).padStart(2, '0');
    const mm = String(monthIdx + 1).padStart(2, '0');
    return `${dd}.${mm}`;
  }
  const dd = String(dayNum).padStart(2, '0');
  const mm = String(monthIdx + 1).padStart(2, '0');
  return `${dd}.${mm}.${yearNum}`;
}

export function getMonthNominal(monthNumber: number, lang: Language): string {
  const isBe = lang === 'be';
  const list = isBe ? MONTHS_BE_NOM : MONTHS_RU_NOM;
  const name = list[monthNumber - 1] || '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function parseLessonName(rawName: string, subjectDb: Record<string, any>) {
  if (!rawName) return { key: 'math', ru: '', be: '', ic: '📘' };
  const n = rawName.toLowerCase();
  for (let key in subjectDb) {
    const item = subjectDb[key];
    if (n.includes(item.ru.toLowerCase()) || n.includes(item.be.toLowerCase()) || n.includes(key)) {
      return item;
    }
  }
  return { key: 'math', ru: rawName, be: rawName, ic: "📘" };
}

export function getNextSchoolDay(startDateObj: Date): Date {
  let d = new Date(startDateObj);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

import { SUBJECT_DB } from './defaultData';

export function getNextLessonDate(
  subjKey: string,
  schedules: any,
  activeProfile: string
): string {
  const cleanKey = subjKey.replace(/^(base|math|chem)_/, '');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayKeysMap: Array<'pn' | 'vt' | 'sr' | 'cht' | 'pt'> = ['pn', 'vt', 'sr', 'cht', 'pt'];
  const sched = schedules[activeProfile] || schedules.base || {};

  for (let i = 1; i <= 21; i++) {
    const candidate = new Date(today);
    candidate.setDate(candidate.getDate() + i);
    const dayOfWeek = candidate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dayKey = dayKeysMap[dayOfWeek - 1];
    const dayLessons: string[] = sched[dayKey] || [];

    const hasSubject = dayLessons.some(item => {
      const meta = parseLessonName(item, SUBJECT_DB);
      return meta.key === cleanKey;
    });

    if (hasSubject) {
      return candidate.toISOString().slice(0, 10);
    }
  }

  const fallback = getNextSchoolDay(today);
  return fallback.toISOString().slice(0, 10);
}
