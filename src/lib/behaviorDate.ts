import type { BehaviorRecord, TeachingWeek } from '../types/index.js';
import { addDays, behaviorRecordLocalDate, toLocalDateStr } from './utils.js';

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export interface WeekdayOption {
  date: string;
  weekdayName: string;
  shortDate: string;
  weekNumber?: number;
  isSelected: boolean;
  isToday: boolean;
}

function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function getWeekdayName(dateStr: string): string {
  return WEEKDAY_NAMES[parseLocalDate(dateStr).getDay()] ?? '';
}

function formatShortDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function getBehaviorRecordDate(record: Pick<BehaviorRecord, 'createdAt' | 'occurredDate'>): string {
  return behaviorRecordLocalDate(record);
}

export function findBehaviorTeachingWeek(
  teachingWeeks: TeachingWeek[],
  dateStr: string,
): TeachingWeek | undefined {
  return teachingWeeks.find(week => dateStr >= week.startDate && dateStr <= week.endDate);
}

function getFallbackWeekStart(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  return toLocalDateStr(date);
}

export function buildWeekdayOptions(
  teachingWeeks: TeachingWeek[],
  selectedDate: string,
  today: string = toLocalDateStr(),
  selectedWeekNumber?: number,
): WeekdayOption[] {
  const week = selectedWeekNumber
    ? teachingWeeks.find(item => item.weekNumber === selectedWeekNumber)
    : findBehaviorTeachingWeek(teachingWeeks, selectedDate);
  const weekStart = week?.startDate ?? getFallbackWeekStart(selectedDate);
  const weekEnd = week?.endDate ?? addDays(weekStart, 6);
  const dates: string[] = [];
  let cursor = weekStart;
  while (cursor <= weekEnd && dates.length < 14) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates.map(date => {
    return {
      date,
      weekdayName: getWeekdayName(date),
      shortDate: formatShortDate(date),
      weekNumber: week?.weekNumber,
      isSelected: date === selectedDate,
      isToday: date === today,
    };
  });
}

export function formatBehaviorDateLabel(dateStr: string, teachingWeeks: TeachingWeek[]): string {
  const week = findBehaviorTeachingWeek(teachingWeeks, dateStr);
  const prefix = week ? `第${week.weekNumber}周 ` : '';
  return `${prefix}${getWeekdayName(dateStr)} ${formatShortDate(dateStr)}`;
}

export function formatBehaviorRecordDateLabel(
  record: Pick<BehaviorRecord, 'createdAt' | 'occurredDate'>,
  teachingWeeks: TeachingWeek[],
): string {
  return formatBehaviorDateLabel(getBehaviorRecordDate(record), teachingWeeks);
}
