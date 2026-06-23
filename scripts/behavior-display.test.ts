import assert from 'node:assert/strict';
import {
  buildBehaviorGroupSignature,
  formatBehaviorBaseEffectLabel,
  summarizeBehaviorRecordImpacts,
  formatBehaviorRecordTitle,
  sortBehaviorsForDisplay,
} from '../src/lib/behaviorDisplay.js';
import type { BehaviorDefinition, BehaviorRecord, HomeworkSubject } from '../src/types/index.js';

const behaviors = [
  { id: 'b3', direction: 'negative', category: '学习', weight: 3, name: '三级', description: '三级', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'b1', direction: 'negative', category: '纪律', weight: 1, name: '一级', description: '一级', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'b2', direction: 'negative', category: '学习', weight: 2, name: '二级', description: '二级', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'b1-hygiene', direction: 'negative', category: '卫生', weight: 1, name: '一级卫生', description: '一级卫生', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'b1-study', direction: 'negative', category: '学习', weight: 1, name: '一级学习', description: '一级学习', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
  { id: 'b1-conduct', direction: 'negative', category: '品行', weight: 1, name: '一级品行', description: '一级品行', isHighSensitivity: false, isComposite: false, isInverseSelectable: false },
] satisfies BehaviorDefinition[];

assert.deepEqual(
  sortBehaviorsForDisplay(behaviors).map(b => b.id),
  ['b1', 'b1-study', 'b1-hygiene', 'b1-conduct', 'b2', 'b3'],
  'behaviors should be sorted by weight and then by category order before display',
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

const impactOptions = {
  blankMarkName: '星蚀',
  checkMarkName: '晨辉',
  negativeWeightNames: { 1: '蒙尘', 2: '褪色', 3: '失格' },
  positiveWeightNames: { 1: '微芒', 2: '星光', 3: '闪耀' },
} as const;

const speakingRecord: BehaviorRecord = {
  ...baseRecord,
  id: 'talk-1',
  studentId: 's1',
  weight: 2,
  behaviorId: 'n-d-3',
  category: '纪律',
  description: '课上随意讲话',
  homeworkSubjectId: undefined,
  homeworkTitle: undefined,
  extraWeight: 1,
  penaltyReasons: ['weekly_recorder'],
  studentCardSide: 'front',
};

assert.equal(
  formatBehaviorBaseEffectLabel(speakingRecord, impactOptions),
  '褪色 2星蚀',
  'base behavior label should describe configured behavior level, not inflated penalty result',
);

const impactSummary = summarizeBehaviorRecordImpacts([
  speakingRecord,
  { ...speakingRecord, id: 'talk-2', studentId: 's2', extraWeight: 0, penaltyReasons: undefined, studentCardSide: 'front' },
  { ...speakingRecord, id: 'talk-3', studentId: 's3', extraWeight: 0, penaltyReasons: undefined, studentCardSide: 'back' },
], impactOptions, (id: string) => ({ s1: '徐小乔', s2: '胡荣耀', s3: '蓝义皓' }[id as 's1' | 's2' | 's3'] ?? id));

assert.deepEqual(
  impactSummary.summaryLabels,
  ['记录人加罚 1次', '背面心魔 1次'],
  'collapsed summary should call out special impacts without inventing extra behavior levels',
);

assert.deepEqual(
  impactSummary.detailRows.map(row => `${row.label}：${row.names.join('、')}`),
  ['记录人加罚 +1星蚀：徐小乔', '背面卡片 1心魔：蓝义皓'],
  'expanded details should identify who received recorder penalties and who received heart demon marks',
);

console.log('behavior-display tests passed');
