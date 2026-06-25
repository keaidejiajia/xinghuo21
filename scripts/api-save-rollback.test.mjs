import assert from 'node:assert/strict';
import { checkRollbackRisk } from '../api/save.js';

function makeRecord(id) {
  return {
    id: String(id),
    studentId: String(id),
    studentName: `学生${id}`,
    direction: 'negative',
    weight: 1,
    description: '作业/定时任务未按时上交，或未按要求完成',
    createdAt: `2026-06-25T08:${String(id % 60).padStart(2, '0')}:00.000Z`,
    occurredDate: '2026-06-25',
    recordedBy: '王老师',
  };
}

const cloudRecords = Array.from({ length: 80 }, (_, index) => makeRecord(index + 1));
const deletedIds = cloudRecords.slice(0, 28).map(record => record.id);
const incomingRecords = cloudRecords.filter(record => !deletedIds.includes(record.id));

const currentData = { students: [], 'behavior-records': cloudRecords };
const incomingData = { students: [], 'behavior-records': incomingRecords };

const rejectedWithoutExplicitDeletion = checkRollbackRisk(currentData, incomingData);
assert.equal(
  rejectedWithoutExplicitDeletion.stale,
  true,
  'large deletion without explicit delete metadata should still be protected',
);

const allowedWithExplicitDeletion = checkRollbackRisk(currentData, incomingData, {
  explicitDeletedRecordIds: deletedIds,
});
assert.equal(
  allowedWithExplicitDeletion.stale,
  false,
  'explicit teacher deletion of a large batch should be allowed',
);

const staleCache = checkRollbackRisk(currentData, incomingData, {
  explicitDeletedRecordIds: deletedIds.slice(0, 10),
});
assert.equal(
  staleCache.stale,
  true,
  'delete metadata must cover all removed records before bypassing rollback protection',
);

console.log('api-save-rollback tests passed');
