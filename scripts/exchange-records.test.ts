import assert from 'node:assert/strict';
import type { Student } from '../src/types';
import {
  applyExchangeToStudent,
  buildExchangeRecord,
  getExchangeCostFromRecord,
  isExchangeRecord,
  revertExchangeFromStudent,
} from '../src/lib/exchangeLogic';

const baseStudent: Student = {
  id: 's1',
  name: '测试学生',
  number: 1,
  cardSide: 'front',
  currentLevel: 1,
  blanksFilled: 0,
  cumulativeChecks: 0,
  heartDemonMarks: 0,
  starShields: 20,
  consecutiveNoViolationDays: 0,
  heritagePoints: 3,
  totalHeritageEarned: 3,
  totalHeritageDonated: 0,
  totalBlanksEverFilled: 0,
  totalHeartDemonsEverGained: 0,
  totalShieldsEverEarned: 20,
  totalShieldsExchanged: 5,
  totalChecksEverEarned: 0,
  weeksAtLevelOne: 0,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const exchanged = applyExchangeToStudent(baseStudent, { side: 'front', cost: 7 });
assert.equal(exchanged.starShields, 13, 'front exchange should deduct available shields');
assert.equal(exchanged.totalShieldsExchanged, 12, 'front exchange should add exchanged shields total');
assert.equal(exchanged.totalShieldsEverEarned, 20, 'front exchange must not count as newly earned shields');
assert.equal(exchanged.blanksFilled, 0, 'front exchange must not affect blanks');

const record = buildExchangeRecord({
  studentId: baseStudent.id,
  side: 'front',
  itemName: '中性笔',
  cost: 7,
  recordedBy: '王老师',
  studentCardSide: 'front',
});

assert.equal(record.recordType, 'exchange', 'exchange record should be marked as account event');
assert.equal(record.direction, 'positive', 'exchange keeps legacy direction only for compatibility');
assert.equal(record.weight, 1, 'exchange record weight is inert and should not be treated as reward');
assert.equal(record.description, '兑换：中性笔');
assert.equal(isExchangeRecord(record), true);
assert.equal(getExchangeCostFromRecord(record), 7);

const reverted = revertExchangeFromStudent(exchanged, record);
assert.equal(reverted.starShields, 20, 'deleting front exchange should restore shields');
assert.equal(reverted.totalShieldsExchanged, 5, 'deleting front exchange should restore exchanged total');
assert.equal(reverted.totalShieldsEverEarned, 20, 'deleting front exchange should not alter earned total');

const backStudent = { ...baseStudent, cardSide: 'back' as const, currentLevel: 6, heritagePoints: 6, totalHeritageDonated: 2 };
const backExchanged = applyExchangeToStudent(backStudent, { side: 'back', cost: 4 });
assert.equal(backExchanged.heritagePoints, 2, 'back exchange should deduct heritage balance');
assert.equal(backExchanged.totalHeritageDonated, 6, 'back exchange should track spent heritage total');

console.log('exchange-records tests passed');
