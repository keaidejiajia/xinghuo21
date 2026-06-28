import type { BehaviorRecord, TeachingWeek } from '../types';
import { behaviorRecordLocalDate, recordLocalDate } from './utils';

export function findTeachingWeekByDate(teachingWeeks: TeachingWeek[], dateStr: string): TeachingWeek | undefined {
  return teachingWeeks.find(week => dateStr >= week.startDate && dateStr <= week.endDate);
}

export function getLatestCompletedTeachingWeek(teachingWeeks: TeachingWeek[], today: string): TeachingWeek | undefined {
  return [...teachingWeeks]
    .filter(week => week.endDate < today)
    .sort((a, b) => b.weekNumber - a.weekNumber)[0];
}

export function getAutoRuleSettledWeekNumber(
  record: Pick<BehaviorRecord, 'isAutoRule' | 'autoRuleId' | 'settledWeek' | 'remark' | 'createdAt' | 'occurredDate'>,
  teachingWeeks: TeachingWeek[],
): number | undefined {
  if (!record.isAutoRule) return undefined;
  if (Number.isFinite(Number(record.settledWeek))) return Number(record.settledWeek);

  const remark = record.remark || '';
  const settledWeekMatch = remark.match(/settledWeek:(\d+)/) || remark.match(/\u7ed3\u7b97\u7b2c(\d+)\u5468/);
  if (settledWeekMatch) return Number(settledWeekMatch[1]);

  if (remark.includes('\u4e0a\u5468\u7ed3\u7b97')) {
    const createdWeek = findTeachingWeekByDate(teachingWeeks, recordLocalDate(record.createdAt));
    if (createdWeek) return createdWeek.weekNumber - 1;
  }

  return findTeachingWeekByDate(teachingWeeks, behaviorRecordLocalDate(record))?.weekNumber;
}

export function getAutoRuleSettlementDate(
  record: Pick<BehaviorRecord, 'isAutoRule' | 'autoRuleId' | 'settledWeek' | 'remark' | 'createdAt' | 'occurredDate'>,
  teachingWeeks: TeachingWeek[],
): string | undefined {
  const weekNumber = getAutoRuleSettledWeekNumber(record, teachingWeeks);
  return weekNumber === undefined
    ? undefined
    : teachingWeeks.find(week => week.weekNumber === weekNumber)?.endDate;
}

export function isAutoRuleRecordForWeek(
  record: Pick<BehaviorRecord, 'studentId' | 'isAutoRule' | 'autoRuleId' | 'settledWeek' | 'remark' | 'createdAt' | 'occurredDate'>,
  ruleId: string,
  week: TeachingWeek,
  teachingWeeks: TeachingWeek[],
): boolean {
  if (!record.isAutoRule) return false;
  const matchesRule = record.autoRuleId === ruleId || Boolean(record.remark?.includes(`ruleId:${ruleId}`));
  if (!matchesRule) return false;
  return getAutoRuleSettledWeekNumber(record, teachingWeeks) === week.weekNumber;
}
