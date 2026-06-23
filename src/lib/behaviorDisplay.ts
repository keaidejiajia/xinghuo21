import type { BehaviorDefinition, BehaviorRecord, HomeworkSubject, NegativeWeight, PositiveWeight } from '../types/index.js';

const CATEGORY_DISPLAY_ORDER = ['纪律', '学习', '卫生', '品行'];

function getCategoryRank(category: unknown): number {
  if (typeof category !== 'string') return CATEGORY_DISPLAY_ORDER.length;
  const rank = CATEGORY_DISPLAY_ORDER.indexOf(category);
  return rank === -1 ? CATEGORY_DISPLAY_ORDER.length : rank;
}

export function sortBehaviorsForDisplay<T extends Pick<BehaviorDefinition, 'weight'> & Partial<Pick<BehaviorDefinition, 'category'>>>(behaviors: T[]): T[] {
  return behaviors
    .map((behavior, index) => ({ behavior, index }))
    .sort((a, b) => {
      const weightDiff = Number(a.behavior.weight) - Number(b.behavior.weight);
      if (weightDiff !== 0) return weightDiff;
      const categoryDiff = getCategoryRank(a.behavior.category) - getCategoryRank(b.behavior.category);
      if (categoryDiff !== 0) return categoryDiff;
      return a.index - b.index;
    })
    .map(item => item.behavior);
}

function normalizeHomeworkText(value: string | undefined): string {
  return (value ?? '').trim();
}

function normalizeSubjectName(name: string): string {
  return name.replace(/课$/, '').trim();
}

function fallbackSubjectNameFromId(subjectId: string): string {
  const text = subjectId.replace(/^tp-/, '').replace(/^hw-/, '');
  const known: Record<string, string> = {
    yuwen: '语文',
    shuxue: '数学',
    yingyu: '英语',
    zhengzhi: '政治',
    lishi: '历史',
    tiyu: '体育',
    dili: '地理',
    shengwu: '生物',
    meishu: '美术',
    yinyue: '音乐',
    xinxi: '信息',
    xinli: '心理',
    zixi: '自习',
    banhui: '班会',
    kouyu: '英语口语',
  };
  return known[text] ?? subjectId;
}

export function getHomeworkSubjectName(subjectId: string | undefined, homeworkSubjects: HomeworkSubject[]): string {
  if (!subjectId) return '';
  const subject = homeworkSubjects.find(item => item.id === subjectId);
  return subject ? normalizeSubjectName(subject.name) : fallbackSubjectNameFromId(subjectId);
}

export function formatBehaviorRecordTitle(record: BehaviorRecord, homeworkSubjects: HomeworkSubject[]): string {
  const homeworkTitle = normalizeHomeworkText(record.homeworkTitle);
  if (!homeworkTitle) return record.description;

  const subject = getHomeworkSubjectName(record.homeworkSubjectId, homeworkSubjects);
  return subject ? `作业未交：${subject} · ${homeworkTitle}` : `作业未交：${homeworkTitle}`;
}

export function buildBehaviorGroupSignature(record: BehaviorRecord): string {
  return [
    record.description,
    record.homeworkSubjectId ?? '',
    normalizeHomeworkText(record.homeworkTitle),
  ].join('|');
}

export interface BehaviorImpactDisplayOptions {
  blankMarkName: string;
  checkMarkName: string;
  negativeWeightNames: Record<NegativeWeight, string>;
  positiveWeightNames: Record<PositiveWeight, string>;
}

export interface BehaviorConsequenceDisplay {
  resultLabel: string;
  reasonLabels: string[];
  fullLabel: string;
  isSpecial: boolean;
}

export interface StudentBehaviorConsequenceRow {
  studentId: string;
  name: string;
  consequence: BehaviorConsequenceDisplay;
}

function getWeightName(record: BehaviorRecord, options: BehaviorImpactDisplayOptions): string {
  return record.direction === 'negative'
    ? options.negativeWeightNames[record.weight as NegativeWeight]
    : options.positiveWeightNames[record.weight as PositiveWeight];
}

export function formatBehaviorBaseEffectLabel(record: BehaviorRecord, options: BehaviorImpactDisplayOptions): string {
  return getWeightName(record, options);
}

export function formatRecordGroupExpandLabel(uniqueStudentCount: number): string {
  return `共${uniqueStudentCount}人`;
}

function getKnownPenaltyReasonCount(record: BehaviorRecord): number {
  let count = 0;
  if (record.penaltyReasons?.includes('weekly_recorder')) count += 1;
  if (record.penaltyReasons?.includes('old_habit_recurrence')) count += 1;
  return count;
}

function getConsequenceReasons(record: BehaviorRecord): string[] {
  const extraWeight = record.extraWeight ?? 0;
  const reasons: string[] = [];
  const knownReasonCount = getKnownPenaltyReasonCount(record);
  const otherExtraWeight = Math.max(0, extraWeight - knownReasonCount);

  if (record.penaltyReasons?.includes('old_habit_recurrence')) reasons.push('旧习复发+1');
  if (record.penaltyReasons?.includes('weekly_recorder')) reasons.push('记录人惩罚+1');
  if (otherExtraWeight > 0) reasons.push(`额外+${otherExtraWeight}`);
  if (record.shieldsConsumed > 0) reasons.push(`消耗${record.shieldsConsumed}护盾`);

  return reasons;
}

export function formatBehaviorConsequence(record: BehaviorRecord, options: BehaviorImpactDisplayOptions): BehaviorConsequenceDisplay {
  const extraWeight = record.extraWeight ?? 0;
  const baseAmount = (record.weight as number) + extraWeight;
  let resultLabel: string;

  if (record.direction === 'negative') {
    if (record.studentCardSide === 'back') {
      resultLabel = `增加${1 + extraWeight}心魔`;
    } else {
      const shieldOffset = record.shieldsConsumed > 0 ? Math.floor(record.shieldsConsumed / 2) : 0;
      const actualAmount = Math.max(0, baseAmount - shieldOffset);
      resultLabel = `增加${actualAmount}${options.blankMarkName}`;
    }
  } else {
    resultLabel = record.studentCardSide === 'back'
      ? `获得${baseAmount}${options.checkMarkName}`
      : `获得${baseAmount}护盾`;
  }

  const reasonLabels = getConsequenceReasons(record);
  return {
    resultLabel,
    reasonLabels,
    fullLabel: reasonLabels.length > 0 ? `${resultLabel}（${reasonLabels.join('；')}）` : resultLabel,
    isSpecial: reasonLabels.length > 0,
  };
}

export function summarizeStudentBehaviorConsequences(
  records: BehaviorRecord[],
  options: BehaviorImpactDisplayOptions,
  getStudentName: (studentId: string) => string,
): StudentBehaviorConsequenceRow[] {
  return records
    .map(record => ({
      studentId: record.studentId,
      name: getStudentName(record.studentId),
      consequence: formatBehaviorConsequence(record, options),
    }))
    .filter(row => row.consequence.isSpecial);
}

export function stripConsequenceRemarkParts(remark: string | undefined): string {
  return (remark ?? '')
    .replace(/^ruleId:[^,，]+[,，]\s*/, '')
    .split(/[；;]/)
    .map(part => part.trim())
    .map(part => part.replace(/^第\d+次[:：]\s*/, '').trim())
    .filter(part => part.length > 0)
    .filter(part => !/^第\d+次$/.test(part))
    .filter(part => !/^旧习复发[:：]/.test(part))
    .filter(part => !/^本周记录人[:：]/.test(part))
    .filter(part => !/^额外\+\d+/.test(part))
    .join('；');
}
