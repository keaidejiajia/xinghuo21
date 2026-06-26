import assert from 'node:assert/strict';
import { createAuditRepairBackupPayload } from '../src/lib/auditBackup';

const students = Array.from({ length: 43 }, (_, index) => ({
  id: String(index + 1),
  name: `学生${index + 1}`,
  number: index + 1,
  cardSide: 'front',
  currentLevel: 1,
  blanksFilled: 0,
  cumulativeChecks: 0,
  heartDemonMarks: 0,
  starShields: 0,
  consecutiveNoViolationDays: 0,
  heritagePoints: 0,
  totalHeritageEarned: 0,
  totalHeritageDonated: 0,
  totalBlanksEverFilled: 0,
  totalHeartDemonsEverGained: 0,
  totalShieldsEverEarned: 0,
  totalShieldsExchanged: 0,
  totalChecksEverEarned: 0,
  weeksAtLevelOne: 0,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
}));

const records = Array.from({ length: 2729 }, (_, index) => ({
  id: String(index + 1),
  studentId: String((index % 43) + 1),
  studentName: `学生${(index % 43) + 1}`,
  direction: 'negative',
  weight: 1,
  description: `很长的行为记录 ${index} ${'x'.repeat(500)}`,
  createdAt: '2026-06-25T09:28:16.350Z',
  recordedBy: '王老师',
  shieldsConsumed: 0,
}));

const correctedStudents = new Map<string, any>([
  ['3', { currentLevel: 5, cumulativeChecks: 20, totalChecksEverEarned: 20 }],
  ['8', { currentLevel: 5, blanksFilled: 5 }],
]);

const recordCorrections = new Map<string, any>([
  ['20', { shieldsConsumed: 4 }],
  ['21', { shieldsConsumed: 6 }],
]);

const payload = createAuditRepairBackupPayload({
  createdAt: '2026-06-26T01:32:40.231Z',
  students: students as any,
  records: records as any,
  appConfig: { version: 1 } as any,
  auditResult: {
    totalStudents: students.length,
    totalRecords: records.length,
    studentsWithIssues: 17,
    discrepancies: Array.from({ length: 39 }, (_, index) => ({ studentId: String(index + 1) })),
    correctedStudents,
    recordCorrections,
    levelChangeMap: new Map(),
  } as any,
});

const serialized = JSON.stringify(payload);

assert.equal(payload.mode, 'patch');
assert.equal(payload.students.length, 2);
assert.equal(payload.records.length, 2);
assert.equal(serialized.includes('很长的行为记录'), false, 'backup must not include full behavior record descriptions');
assert.ok(serialized.length < 20_000, `patch backup should stay small, got ${serialized.length} bytes`);

console.log('audit-backup tests passed');
