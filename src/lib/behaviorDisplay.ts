import type { BehaviorDefinition, BehaviorRecord, HomeworkSubject } from '../types/index.js';

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
