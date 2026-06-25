import assert from 'node:assert/strict';
import {
  checkHeartDemonAutoClear,
  processPositiveBehavior,
} from '../src/lib/cardLogic';
import type { BackLevel, BehaviorRecord, Student, TeachingWeek } from '../src/types/index';

const backLevels: BackLevel[] = [
  { level: 1, name: '冰封心火', imagery: '', checksRequired: 0, description: '' },
  { level: 2, name: '火光初燃', imagery: '', checksRequired: 10, description: '' },
  { level: 3, name: '烛火摇曳', imagery: '', checksRequired: 20, description: '' },
  { level: 4, name: '篝火渐明', imagery: '', checksRequired: 35, description: '' },
  { level: 5, name: '熔炉之心', imagery: '', checksRequired: 55, description: '' },
  { level: 6, name: '不朽晨辉', imagery: '', checksRequired: 80, description: '' },
];

const teachingWeeks: TeachingWeek[] = [
  { weekNumber: 16, startDate: '2026-06-15', endDate: '2026-06-19' },
  { weekNumber: 17, startDate: '2026-06-22', endDate: '2026-06-26' },
];

const backStudent: Student = {
  id: 's1',
  name: '测试同学',
  number: 1,
  cardSide: 'back',
  currentLevel: 2,
  blanksFilled: 0,
  cumulativeChecks: 0,
  heartDemonMarks: 5,
  starShields: 0,
  heritagePoints: 0,
  totalHeritageEarned: 0,
  totalHeritageDonated: 0,
  totalBlanksEverFilled: 0,
  totalHeartDemonsEverGained: 5,
  totalShieldsEverEarned: 0,
  totalChecksEverEarned: 0,
  totalShieldsExchanged: 0,
  consecutiveNoViolationDays: 0,
  weeksAtLevelOne: 0,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const result = processPositiveBehavior(backStudent, 3, backLevels, {
  shiningBehavior: { minWeight: 3, clearCount: 2 },
});

assert.equal(result.heartDemonsCleared, 2, 'shining behavior should use configured clear count');
assert.equal(result.student.heartDemonMarks, 3, 'shining behavior should clear two heart demons when configured');

const zeroViolationResult = checkHeartDemonAutoClear(
  backStudent,
  [],
  teachingWeeks,
  { zeroViolation: { weeksRequired: 1, clearCount: 3 } },
  '2026-06-25',
);

assert.equal(zeroViolationResult.cleared, true, 'one completed teaching week with no violations should clear when configured');
assert.equal(zeroViolationResult.clearedCount, 3, 'zero-violation rule should use configured clear count');
assert.equal(zeroViolationResult.student.heartDemonMarks, 2, 'zero-violation rule should clear three heart demons');

const currentWeekViolation: BehaviorRecord = {
  id: 'r1',
  studentId: 's1',
  direction: 'negative',
  weight: 1,
  category: '纪律',
  description: '本周违纪',
  recordedBy: '王老师',
  verified: true,
  shieldsConsumed: 0,
  isHighSensitivity: false,
  occurredDate: '2026-06-23',
  createdAt: '2026-06-23T08:00:00.000Z',
};

const currentWeekIgnored = checkHeartDemonAutoClear(
  backStudent,
  [currentWeekViolation],
  teachingWeeks,
  { zeroViolation: { weeksRequired: 1, clearCount: 3 } },
  '2026-06-25',
);

assert.equal(
  currentWeekIgnored.cleared,
  true,
  'current unfinished week should not block settlement of already completed teaching weeks',
);

console.log('heart-demon-rules tests passed');
