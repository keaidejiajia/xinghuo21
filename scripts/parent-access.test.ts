import assert from 'node:assert/strict';
import {
  getParentAccessDailySummary,
  upsertParentAccessEvent,
} from '../src/lib/parentAccess';
import type { ParentAccessData, ParentAccessEvent } from '../src/types';

const empty: ParentAccessData = { entries: [] };
const firstLogin: ParentAccessEvent = {
  type: 'login',
  studentId: 's1',
  parentName: '张三家长',
  occurredAt: '2026-06-22T08:00:00.000Z',
  device: 'mobile',
};

const afterLogin = upsertParentAccessEvent(empty, firstLogin);
assert.equal(afterLogin.entries.length, 1);
assert.equal(afterLogin.entries[0].loginCount, 1);
assert.equal(afterLogin.entries[0].viewCount, 0);

const firstView = upsertParentAccessEvent(afterLogin, {
  ...firstLogin,
  type: 'view',
  occurredAt: '2026-06-22T08:02:00.000Z',
});
assert.equal(firstView.entries[0].viewCount, 1);

const duplicateRefresh = upsertParentAccessEvent(firstView, {
  ...firstLogin,
  type: 'view',
  occurredAt: '2026-06-22T08:05:00.000Z',
});
assert.equal(duplicateRefresh.entries[0].viewCount, 1, 'view refreshes inside throttle window should not increment count');

const laterView = upsertParentAccessEvent(duplicateRefresh, {
  ...firstLogin,
  type: 'view',
  occurredAt: '2026-06-22T08:20:00.000Z',
});
assert.equal(laterView.entries[0].viewCount, 2);

const summary = getParentAccessDailySummary(laterView, [
  { id: 's1', name: '张三', number: 1 },
  { id: 's2', name: '李四', number: 2 },
], '2026-06-22');

assert.deepEqual(summary.visited.map(item => item.studentId), ['s1']);
assert.deepEqual(summary.unvisited.map(item => item.id), ['s2']);

console.log('parent-access tests passed');
