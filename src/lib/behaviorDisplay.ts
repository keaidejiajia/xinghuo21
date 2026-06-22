import type { BehaviorDefinition, BehaviorRecord, TimePeriod } from '../types/index.js';

export function sortBehaviorsForDisplay<T extends Pick<BehaviorDefinition, 'weight'>>(behaviors: T[]): T[] {
  return behaviors
    .map((behavior, index) => ({ behavior, index }))
    .sort((a, b) => {
      const weightDiff = Number(a.behavior.weight) - Number(b.behavior.weight);
      if (weightDiff !== 0) return weightDiff;
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

export function getHomeworkSubjectName(subjectId: string | undefined, timePeriods: TimePeriod[]): string {
  if (!subjectId) return '';
  const period = timePeriods.find(item => item.id === subjectId);
  return period ? normalizeSubjectName(period.name) : subjectId;
}

export function formatBehaviorRecordTitle(record: BehaviorRecord, timePeriods: TimePeriod[]): string {
  const homeworkTitle = normalizeHomeworkText(record.homeworkTitle);
  if (!homeworkTitle) return record.description;

  const subject = getHomeworkSubjectName(record.homeworkSubjectId, timePeriods);
  return subject ? `作业未交：${subject} · ${homeworkTitle}` : `作业未交：${homeworkTitle}`;
}

export function buildBehaviorGroupSignature(record: BehaviorRecord): string {
  return [
    record.description,
    record.homeworkSubjectId ?? '',
    normalizeHomeworkText(record.homeworkTitle),
  ].join('|');
}
