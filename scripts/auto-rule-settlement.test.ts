import assert from 'node:assert/strict';
import { formatBehaviorRecordDateLabel } from '../src/lib/behaviorDate';
import {
  getAutoRuleSettledWeekNumber,
  getLatestCompletedTeachingWeek,
  isAutoRuleRecordForWeek,
} from '../src/lib/autoRuleSettlement';

const teachingWeeks = [
  { weekNumber: 16, startDate: '2026-06-15', endDate: '2026-06-19' },
  { weekNumber: 17, startDate: '2026-06-22', endDate: '2026-06-26' },
  { weekNumber: 18, startDate: '2026-06-29', endDate: '2026-07-03' },
];

assert.equal(
  getLatestCompletedTeachingWeek(teachingWeeks as any, '2026-06-28')?.weekNumber,
  17,
  'Sunday after a teaching week should settle the just-finished week',
);

const legacyRecord = {
  id: 'old-auto',
  studentId: '39',
  direction: 'positive',
  weight: 4,
  category: '品行',
  description: '自动规则：一周零违纪',
  remark: 'ruleId:ar-3，上周结算，+4护盾',
  createdAt: '2026-06-22T00:30:06.645Z',
  recordedBy: '系统',
  verified: true,
  shieldsConsumed: 0,
  isHighSensitivity: false,
  isAutoRule: true,
};

assert.equal(
  getAutoRuleSettledWeekNumber(legacyRecord as any, teachingWeeks as any),
  16,
  'legacy auto-rule records created in the next week should be attributed to the previous week',
);

assert.equal(
  isAutoRuleRecordForWeek(legacyRecord as any, 'ar-3', teachingWeeks[0] as any, teachingWeeks as any),
  true,
  'legacy ruleId remark should still support idempotent settlement checks',
);

assert.match(
  formatBehaviorRecordDateLabel(legacyRecord as any, teachingWeeks as any),
  /第16周/,
  'legacy auto-rule record date label should display the settled week, not the creation week',
);

const structuredRecord = {
  ...legacyRecord,
  id: 'new-auto',
  remark: undefined,
  autoRuleId: 'ar-3',
  settledWeek: 17,
  occurredDate: '2026-06-26',
  createdAt: '2026-06-28T10:00:00.000Z',
};

assert.equal(
  isAutoRuleRecordForWeek(structuredRecord as any, 'ar-3', teachingWeeks[1] as any, teachingWeeks as any),
  true,
  'structured autoRuleId and settledWeek should support idempotent settlement checks',
);

console.log('auto-rule-settlement tests passed');
