import { Language } from './types';

const MONTHS_RU_NOM = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const MONTHS_RU_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const WEEKDAYS_RU = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

const MONTHS_BE_NOM = ["студзень","люты","сакавік","красавік","травень","чэрвень","ліпень","жніўень","верасень","кастрычнік","лістапад","снежань"];
const MONTHS_BE_GEN = ["студзеня","лютага","сакавіка","красавіка","траўня","чэрвеня","ліпеня","жніўня","верасня","кастрычніка","лістапада","снежня"];
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

import { DayKey, ScheduleProfiles } from './types';
import { SUBJECT_DB } from './defaultData';

export function extractSubjectKey(subjKey: string, subjectDb: Record<string, any> = SUBJECT_DB): string {
  if (!subjKey) return 'math';
  if (subjectDb[subjKey]) return subjKey;

  const parts = subjKey.split('_');
  for (let i = 1; i < parts.length; i++) {
    const candidate = parts.slice(i).join('_');
    if (subjectDb[candidate]) {
      return candidate;
    }
  }

  return subjKey.replace(/^[^_]+_/, '');
}

export function parseLessonName(rawName: string, subjectDb: Record<string, any> = SUBJECT_DB) {
  if (!rawName || !rawName.trim()) return { key: 'window', ru: 'Окно', be: 'Аконька', ic: '☕' };
  const n = rawName.toLowerCase();
  for (let key in subjectDb) {
    const item = subjectDb[key];
    if (!item) continue;
    if (n.includes(item.ru.toLowerCase()) || n.includes(item.be.toLowerCase()) || n.includes(key)) {
      return item;
    }
  }
  return { key: 'custom', ru: rawName, be: rawName, ic: "📘" };
}

export function getNextSchoolDay(startDateObj: Date = new Date()): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let d = new Date(startDateObj);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);

  while (d <= today || d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function getNextLessonDate(
  subjKey: string,
  schedules: any,
  activeProfile: string,
  existingDueDates: string[] = []
): string {
  const cleanKey = extractSubjectKey(subjKey, SUBJECT_DB);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Determine starting point: after the latest existing due date if in future, else after today
  let startFromDate = new Date(today);
  const validDueDates = existingDueDates
    .map(d => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      return dt;
    })
    .filter(dt => !isNaN(dt.getTime()));

  const futureDueDates = validDueDates.filter(dt => dt >= today);
  if (futureDueDates.length > 0) {
    const maxDue = new Date(Math.max(...futureDueDates.map(dt => dt.getTime())));
    if (maxDue >= today) {
      startFromDate = maxDue;
    }
  }

  const dayKeysMap: Array<'pn' | 'vt' | 'sr' | 'cht' | 'pt'> = ['pn', 'vt', 'sr', 'cht', 'pt'];
  const primarySched = (schedules && schedules[activeProfile]) || (schedules && schedules.base) || (schedules ? Object.values(schedules)[0] : {}) || {};

  // Search up to 90 days ahead starting from startFromDate + 1 day
  for (let i = 1; i <= 90; i++) {
    const candidate = new Date(startFromDate);
    candidate.setDate(candidate.getDate() + i);
    candidate.setHours(0, 0, 0, 0);

    // Strictly skip today or past dates
    if (candidate <= today) continue;

    const dayOfWeek = candidate.getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dayKey = dayKeysMap[dayOfWeek - 1];
    let dayLessons: string[] = (primarySched as any)[dayKey] || [];

    let hasSubject = dayLessons.some(item => {
      const meta = parseLessonName(item, SUBJECT_DB);
      return meta.key === cleanKey;
    });

    if (!hasSubject && schedules && typeof schedules === 'object') {
      for (const pKey in schedules) {
        const profSched = schedules[pKey];
        if (profSched && profSched[dayKey]) {
          const profLessons: string[] = profSched[dayKey] || [];
          if (profLessons.some(item => parseLessonName(item, SUBJECT_DB).key === cleanKey)) {
            hasSubject = true;
            break;
          }
        }
      }
    }

    if (hasSubject) {
      return candidate.toISOString().slice(0, 10);
    }
  }

  let fallback = getNextSchoolDay(startFromDate);
  if (fallback <= today) {
    fallback = getNextSchoolDay(today);
  }
  return fallback.toISOString().slice(0, 10);
}

export function parseAndNormalizeSchedule(rawInput: any): ScheduleProfiles {
  let parsed: any = rawInput;

  if (typeof rawInput === 'string') {
    let cleaned = rawInput.trim();
    if (cleaned.charCodeAt(0) === 0xFEFF) {
      cleaned = cleaned.slice(1);
    }
    // Remove JS comments if present
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    // Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      try {
        const relaxed = cleaned.replace(/'/g, '"');
        parsed = JSON.parse(relaxed);
      } catch (err) {
        throw new Error('Некорректный синтаксис JSON файла.');
      }
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Файл расписания должен быть JSON объектом.');
  }

  // Unwrap common wrapper keys if user exported or formatted inside a parent field
  if (parsed.schedules && typeof parsed.schedules === 'object' && !Array.isArray(parsed.schedules)) {
    parsed = parsed.schedules;
  } else if (parsed.profiles && typeof parsed.profiles === 'object' && !Array.isArray(parsed.profiles)) {
    parsed = parsed.profiles;
  } else if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
    parsed = parsed.data;
  }

  const result: ScheduleProfiles = {};
  const dayKeys: DayKey[] = ['pn', 'vt', 'sr', 'cht', 'pt'];

  const keys = Object.keys(parsed);
  if (keys.length === 0) {
    throw new Error('В файле расписания нет сохраненных профилей.');
  }

  keys.forEach(pKey => {
    const item = parsed[pKey];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const profileTitle = typeof item.title === 'string' && item.title.trim()
        ? item.title.trim()
        : (pKey === 'base' ? 'База' : pKey === 'math' ? 'Математика' : pKey === 'chem' ? 'Химия' : pKey);

      const profileObj: any = {
        title: profileTitle
      };

      dayKeys.forEach(dKey => {
        if (Array.isArray(item[dKey])) {
          profileObj[dKey] = item[dKey].map((s: any) => String(s));
        } else if (typeof item[dKey] === 'string') {
          profileObj[dKey] = item[dKey].split('\n').filter((s: string) => s.trim());
        } else {
          profileObj[dKey] = [];
        }
      });

      result[pKey] = profileObj;
    }
  });

  if (Object.keys(result).length === 0) {
    throw new Error('Не удалось прочитать структуры профилей из файла.');
  }

  return result;
}
