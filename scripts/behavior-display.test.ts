import assert from 'node:assert/strict';
import {
  buildBehaviorGroupSignature,
  formatBehaviorBaseEffectLabel,
  formatBehaviorConsequence,
  formatRecordGroupExpandLabel,
  summarizeStudentBehaviorConsequences,
  stripConsequenceRemarkParts,
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
  '褪色',
  'base behavior label should only show the ceremonial level name without repeating points or units',
);

assert.equal(
  formatBehaviorBaseEffectLabel({ ...baseRecord, direction: 'positive', weight: 3, extraWeight: 0, description: '突出贡献' }, impactOptions),
  '闪耀',
  'positive behavior label should also only show the level name',
);

const oldHabitBackRecord: BehaviorRecord = {
  ...speakingRecord,
  id: 'talk-back-old-habit',
  studentId: 's1',
  extraWeight: 1,
  penaltyReasons: ['old_habit_recurrence'],
  studentCardSide: 'back',
  remark: '第2次；被老师点名；旧习复发：心魔+1',
};

assert.deepEqual(
  formatBehaviorConsequence(oldHabitBackRecord, impactOptions),
  {
    resultLabel: '增加2心魔',
    reasonLabels: ['旧习复发+1'],
    fullLabel: '增加2心魔（旧习复发+1）',
    isSpecial: true,
  },
  'student card consequence should omit redundant back-card wording while keeping actual penalty reasons',
);

assert.equal(
  stripConsequenceRemarkParts(oldHabitBackRecord.remark),
  '被老师点名',
  'remarks should keep teacher-written context but remove automatic count prefixes and represented consequence phrases',
);

assert.equal(
  stripConsequenceRemarkParts('第1次：被老师点名'),
  '被老师点名',
  'inline automatic count prefixes should be removed without deleting the useful remark',
);

assert.equal(
  stripConsequenceRemarkParts('ruleId:zero-violation，上周结算，+4护盾'),
  '',
  'automatic rule settlement text should not be shown as a teacher remark',
);

const fullyShieldedFrontRecord: BehaviorRecord = {
  ...speakingRecord,
  id: 'fully-shielded-front',
  studentId: 's5',
  extraWeight: 0,
  penaltyReasons: undefined,
  studentCardSide: 'front',
  shieldsConsumed: 4,
};

assert.deepEqual(
  formatBehaviorConsequence(fullyShieldedFrontRecord, impactOptions),
  {
    resultLabel: '消耗4护盾',
    reasonLabels: [],
    fullLabel: '消耗4护盾',
    isSpecial: true,
  },
  'fully shielded negative records should show shield consumption instead of adding zero marks',
);

const fullyShieldedWeeklyRecorder: BehaviorRecord = {
  ...speakingRecord,
  id: 'fully-shielded-weekly-recorder',
  studentId: 's6',
  extraWeight: 1,
  penaltyReasons: ['weekly_recorder'],
  studentCardSide: 'front',
  shieldsConsumed: 6,
};

assert.deepEqual(
  formatBehaviorConsequence(fullyShieldedWeeklyRecorder, impactOptions),
  {
    resultLabel: '消耗6护盾',
    reasonLabels: ['记录人惩罚+1'],
    fullLabel: '记录人惩罚+1：消耗6护盾',
    isSpecial: true,
  },
  'fully shielded recorder penalties should explain the penalty reason without saying zero marks were added',
);

const studentConsequenceRows = summarizeStudentBehaviorConsequences([
  oldHabitBackRecord,
  { ...speakingRecord, id: 'talk-weekly-recorder', studentId: 's4', extraWeight: 1, penaltyReasons: ['weekly_recorder'], studentCardSide: 'front' },
  { ...speakingRecord, id: 'talk-normal', studentId: 's2', extraWeight: 0, penaltyReasons: undefined, studentCardSide: 'front' },
], impactOptions, (id: string) => ({ s1: '徐小乔', s2: '胡荣耀', s4: '袁俪玮' }[id as 's1' | 's2' | 's4'] ?? id));

assert.deepEqual(
  studentConsequenceRows.map(row => `${row.name}：${row.consequence.fullLabel}`),
  ['徐小乔：增加2心魔（旧习复发+1）', '袁俪玮：增加3星蚀（记录人惩罚+1）'],
  'record-page expanded details should be organized by student and omit normal students',
);

assert.equal(formatRecordGroupExpandLabel(1), '共1人');
assert.equal(formatRecordGroupExpandLabel(3), '共3人');

console.log('behavior-display tests passed');
