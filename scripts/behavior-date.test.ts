import assert from 'node:assert/strict';
import {
  buildWeekdayOptions,
  formatBehaviorDateLabel,
  getBehaviorRecordDate,
} from '../src/lib/behaviorDate.js';
import type { BehaviorRecord, TeachingWeek } from '../src/types/index.js';

const weeks: TeachingWeek[] = [
  { weekNumber: 14, startDate: '2026-06-15', endDate: '2026-06-19' },
];

const baseRecord: BehaviorRecord = {
  id: '1',
  studentId: 's1',
  direction: 'negative',
  weight: 1,
  category: '学习',
  description: '作业未按时上交',
  recordedBy: '班委',
  verified: true,
  shieldsConsumed: 0,
  isHighSensitivity: false,
  createdAt: '2026-06-20T08:00:00.000Z',
};

assert.equal(
  getBehaviorRecordDate({ ...baseRecord, occurredDate: '2026-06-17' }),
  '2026-06-17',
  'behavior date should prefer occurredDate over createdAt',
);

assert.equal(
  getBehaviorRecordDate(baseRecord),
  '2026-06-20',
  'old records should fall back to the local date derived from createdAt',
);

assert.deepEqual(
  buildWeekdayOptions(weeks, '2026-06-17').map(option => ({
    date: option.date,
    weekday: option.weekdayName,
    week: option.weekNumber,
    selected: option.isSelected,
  })),
  [
    { date: '2026-06-15', weekday: '周一', week: 14, selected: false },
    { date: '2026-06-16', weekday: '周二', week: 14, selected: false },
    { date: '2026-06-17', weekday: '周三', week: 14, selected: true },
    { date: '2026-06-18', weekday: '周四', week: 14, selected: false },
    { date: '2026-06-19', weekday: '周五', week: 14, selected: false },
  ],
  'current teaching week should expose the configured teaching-week date range',
);

const extendedWeek: TeachingWeek[] = [
  { weekNumber: 18, startDate: '2026-06-22', endDate: '2026-06-27' },
];

assert.deepEqual(
  buildWeekdayOptions(extendedWeek, '2026-06-23', '2026-06-23', 18).map(option => option.date),
  [
    '2026-06-22',
    '2026-06-23',
    '2026-06-24',
    '2026-06-25',
    '2026-06-26',
    '2026-06-27',
  ],
  'selected teaching week should expose every configured day, including a Saturday makeup day',
);

assert.equal(
  formatBehaviorDateLabel('2026-06-17', weeks),
  '第14周 周三 6/17',
  'behavior date label should stay compact for record history and student cards',
);

const mondayStartWeek: TeachingWeek[] = [
  { weekNumber: 15, startDate: '2026-06-08', endDate: '2026-06-12' },
];

assert.equal(
  formatBehaviorDateLabel('2026-06-07', mondayStartWeek),
  '第15周 周日 6/7',
  'the Sunday before a configured Monday-start teaching week should still show the upcoming teaching week',
);

assert.equal(
  formatBehaviorDateLabel('2026-06-21', weeks),
  '第14周 周日 6/21',
  'weekend dates immediately after a configured teaching week should still show that teaching week',
);

console.log('behavior-date tests passed');
