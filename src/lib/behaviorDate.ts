import type { BehaviorRecord, TeachingWeek } from '../types';
import { addDays, behaviorRecordLocalDate, toLocalDateStr } from './utils';
import { getAutoRuleSettlementDate } from './autoRuleSettlement';

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

function dayDiff(laterDateStr: string, earlierDateStr: string): number {
  return Math.round((parseLocalDate(laterDateStr).getTime() - parseLocalDate(earlierDateStr).getTime()) / 86400000);
}

function distanceToTeachingWeek(dateStr: string, week: TeachingWeek): number {
  if (dateStr < week.startDate) return dayDiff(week.startDate, dateStr);
  if (dateStr > week.endDate) return dayDiff(dateStr, week.endDate);
  return 0;
}

function findDisplayTeachingWeek(teachingWeeks: TeachingWeek[], dateStr: string): TeachingWeek | undefined {
  const direct = findBehaviorTeachingWeek(teachingWeeks, dateStr);
  if (direct) return direct;

  const nextTeachingWeek = teachingWeeks.find(week => dayDiff(week.startDate, dateStr) === 1);
  if (nextTeachingWeek) return nextTeachingWeek;

  const previousTeachingWeek = teachingWeeks.find(week => {
    const diff = dayDiff(dateStr, week.endDate);
    return diff >= 1 && diff <= 2;
  });
  if (previousTeachingWeek) return previousTeachingWeek;

  return [...teachingWeeks].sort((a, b) => distanceToTeachingWeek(dateStr, a) - distanceToTeachingWeek(dateStr, b))[0];
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
  const week = findDisplayTeachingWeek(teachingWeeks, dateStr);
  const prefix = week ? `第${week.weekNumber}周 ` : '';
  return `${prefix}${getWeekdayName(dateStr)} ${formatShortDate(dateStr)}`;
}

export function formatBehaviorRecordDateLabel(
  record: Pick<BehaviorRecord, 'createdAt' | 'occurredDate' | 'isAutoRule' | 'autoRuleId' | 'settledWeek' | 'remark'>,
  teachingWeeks: TeachingWeek[],
): string {
  return formatBehaviorDateLabel(getAutoRuleSettlementDate(record, teachingWeeks) ?? getBehaviorRecordDate(record), teachingWeeks);
}
