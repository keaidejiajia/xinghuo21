import assert from 'node:assert/strict';
import {
  buildBehaviorGroupSignature,
  formatBehaviorRecordTitle,
  sortBehaviorsForDisplay,
} from '../src/lib/behaviorDisplay.js';
import type { BehaviorDefinition, BehaviorRecord, HomeworkSubject } from '../src/types/index.js';

const behaviors = [
  { id: 'b3', direction: 'negative', category: '学习', weight: 3, name: '三级', description: '三级', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'b1', direction: 'negative', category: '纪律', weight: 1, name: '一级', description: '一级', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'b2', direction: 'negative', category: '学习', weight: 2, name: '二级', description: '二级', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
] satisfies BehaviorDefinition[];

assert.deepEqual(
  sortBehaviorsForDisplay(behaviors).map(b => b.id),
  ['b1', 'b2', 'b3'],
  'behaviors should be sorted by weight before display',
);

const homeworkSubjects = [
  { id: 'hw-yuwen', name: '语文' },
  { id: 'hw-shuxue', name: '数学' },
] satisfies HomeworkSubject[];

const baseRecord: BehaviorRecord = {
  id: '1',
  studentId: 's1',
  direction: 'negative',
  weight: 1,
  behaviorId: 'n-l-1',
  category: '学习',
  description: '作业未按时上交',
  recordedBy: '班委',
  verified: true,
  shieldsConsumed: 0,
  isHighSensitivity: false,
  homeworkSubjectId: 'hw-yuwen',
  homeworkTitle: '练习册第12页',
  createdAt: '2026-06-22T08:00:00.000Z',
};

assert.equal(
  formatBehaviorRecordTitle(baseRecord, homeworkSubjects),
  '作业未交：语文 · 练习册第12页',
  'homework records should expose independently configured homework subject and homework title',
);

assert.notEqual(
  buildBehaviorGroupSignature(baseRecord),
  buildBehaviorGroupSignature({ ...baseRecord, id: '2', homeworkTitle: '默写订正' }),
  'different homework titles should not be grouped together',
);

console.log('behavior-display tests passed');
