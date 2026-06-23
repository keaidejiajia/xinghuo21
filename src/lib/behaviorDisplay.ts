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

export interface BehaviorImpactDetailRow {
  label: string;
  names: string[];
  tone: 'warning' | 'back';
}

export interface BehaviorImpactSummary {
  summaryLabels: string[];
  detailRows: BehaviorImpactDetailRow[];
}

function countNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return Array.from(counts.entries()).map(([name, count]) => count > 1 ? `${name}×${count}` : name);
}

function addImpact(map: Map<string, string[]>, label: string, name: string) {
  if (!map.has(label)) map.set(label, []);
  map.get(label)!.push(name);
}

function getWeightName(record: BehaviorRecord, options: BehaviorImpactDisplayOptions): string {
  return record.direction === 'negative'
    ? options.negativeWeightNames[record.weight as NegativeWeight]
    : options.positiveWeightNames[record.weight as PositiveWeight];
}

export function formatBehaviorBaseEffectLabel(record: BehaviorRecord, options: BehaviorImpactDisplayOptions): string {
  const unit = record.direction === 'negative' ? options.blankMarkName : '护盾';
  return `${getWeightName(record, options)} ${record.weight}${unit}`;
}

export function summarizeBehaviorRecordImpacts(
  records: BehaviorRecord[],
  options: BehaviorImpactDisplayOptions,
  getStudentName: (studentId: string) => string,
): BehaviorImpactSummary {
  const penaltyRows = new Map<string, string[]>();
  const backRows = new Map<string, string[]>();
  let recorderPenaltyCount = 0;
  let oldHabitCount = 0;
  let otherPenaltyCount = 0;
  let backImpactCount = 0;

  for (const record of records) {
    const name = getStudentName(record.studentId);
    const extraWeight = record.extraWeight ?? 0;
    const actualUnit = record.direction === 'negative'
      ? (record.studentCardSide === 'back' ? '心魔' : options.blankMarkName)
      : (record.studentCardSide === 'back' ? options.checkMarkName : '护盾');

    if (extraWeight > 0) {
      if (record.penaltyReasons?.includes('weekly_recorder')) {
        recorderPenaltyCount += 1;
        addImpact(penaltyRows, `记录人加罚 +${extraWeight}${actualUnit}`, name);
      } else if (record.penaltyReasons?.includes('old_habit_recurrence')) {
        oldHabitCount += 1;
        addImpact(penaltyRows, `旧习复发 +${extraWeight}${actualUnit}`, name);
      } else {
        otherPenaltyCount += 1;
        addImpact(penaltyRows, `额外加罚 +${extraWeight}${actualUnit}`, name);
      }
    }

    if (record.studentCardSide === 'back') {
      backImpactCount += 1;
      const actualValue = record.direction === 'negative'
        ? 1 + extraWeight
        : (record.weight as number) + extraWeight;
      addImpact(backRows, `背面卡片 ${actualValue}${actualUnit}`, name);
    }
  }

  const summaryLabels = [
    recorderPenaltyCount > 0 ? `记录人加罚 ${recorderPenaltyCount}次` : '',
    oldHabitCount > 0 ? `旧习复发 ${oldHabitCount}次` : '',
    otherPenaltyCount > 0 ? `额外加罚 ${otherPenaltyCount}次` : '',
    backImpactCount > 0 ? `背面${records[0]?.direction === 'negative' ? '心魔' : options.checkMarkName} ${backImpactCount}次` : '',
  ].filter(Boolean);

  const detailRows: BehaviorImpactDetailRow[] = [
    ...Array.from(penaltyRows.entries()).map(([label, names]) => ({
      label,
      names: countNames(names),
      tone: 'warning' as const,
    })),
    ...Array.from(backRows.entries()).map(([label, names]) => ({
      label,
      names: countNames(names),
      tone: 'back' as const,
    })),
  ];

  return { summaryLabels, detailRows };
}
