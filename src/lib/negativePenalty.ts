import type { BehaviorDefinition, BehaviorRecord, PenaltyReason, Student } from '../types';

export interface NegativePenaltyResult {
  effectiveFrontWeight: number;
  backHeartDemonAmount: number;
  extraWeight: number;
  penaltyReasons: PenaltyReason[];
  remarkSuffix: string;
}

function normalizeBehaviorText(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/课堂上|上课时|上课|课上/g, '')
    .replace(/[，,。；;：:（）()《》“”"']/g, '');
}

function extractBehaviorPhrases(text: string): string[] {
  const normalized = normalizeBehaviorText(text);
  return normalized
    .split(/[、/／|或]+/)
    .map(part => part.trim())
    .filter(part => part.length >= 2);
}

function textLooksLikeSameBehavior(recordText: string, behavior: BehaviorDefinition): boolean {
  const behaviorTexts = [behavior.name, behavior.description, ...(behavior.aliases ?? [])].filter(Boolean);
  const normalizedRecord = normalizeBehaviorText(recordText);

  for (const text of behaviorTexts) {
    const normalizedBehavior = normalizeBehaviorText(text);
    if (normalizedRecord === normalizedBehavior) return true;
    if (normalizedRecord.length >= 4 && normalizedBehavior.includes(normalizedRecord)) return true;
    if (normalizedBehavior.length >= 4 && normalizedRecord.includes(normalizedBehavior)) return true;

    const recordPhrases = extractBehaviorPhrases(recordText);
    const behaviorPhrases = extractBehaviorPhrases(text);
    const shared = recordPhrases.filter(recordPhrase =>
      behaviorPhrases.some(behaviorPhrase =>
        recordPhrase === behaviorPhrase
        || (recordPhrase.length >= 4 && behaviorPhrase.includes(recordPhrase))
        || (behaviorPhrase.length >= 4 && recordPhrase.includes(behaviorPhrase))
      )
    );

    if (shared.some(phrase => phrase.length >= 4) || shared.length >= 2) return true;
  }

  return false;
}

function sameNegativeBehavior(record: BehaviorRecord, behavior: BehaviorDefinition): boolean {
  if (record.behaviorId && record.behaviorId === behavior.id) return true;
  if (record.direction !== behavior.direction || record.category !== behavior.category) return false;
  if (behavior.category === '限时活动') {
    if (record.behaviorId) {
      return !!behavior.seriesId && record.behaviorSeriesId === behavior.seriesId;
    }
    return textLooksLikeSameBehavior(record.description, behavior);
  }
  if (record.behaviorId) return false;
  return textLooksLikeSameBehavior(record.description, behavior);
}

function hasFrontStageHistory(student: Student, behavior: BehaviorDefinition, records: BehaviorRecord[]): boolean {
  return records.some(record =>
    record.studentId === student.id
    && record.direction === 'negative'
    && !record.isAutoRule
    && (record.studentCardSide === 'front' || record.studentCardSide == null)
    && sameNegativeBehavior(record, behavior)
  );
}

export function calculateNegativePenalty(
  student: Student,
  behavior: BehaviorDefinition,
  records: BehaviorRecord[],
  weeklyRecorderNames: string[],
): NegativePenaltyResult {
  const baseExtra = behavior.extraWeight ?? 0;
  const normalizedRecorders = new Set(weeklyRecorderNames.map(name => name.trim()).filter(Boolean));
  const isWeeklyRecorder = normalizedRecorders.has(student.name.trim());
  const isOldHabitRecurrence = student.cardSide === 'back' && hasFrontStageHistory(student, behavior, records);

  const penaltyReasons: PenaltyReason[] = [];
  if (isWeeklyRecorder) penaltyReasons.push('weekly_recorder');
  if (isOldHabitRecurrence) penaltyReasons.push('old_habit_recurrence');

  const ruleExtra = penaltyReasons.length;
  const extraWeight = baseExtra + ruleExtra;
  const isBack = student.cardSide === 'back';
  const remarkParts: string[] = [];

  if (baseExtra > 0) remarkParts.push(`额外+${baseExtra}`);
  if (isWeeklyRecorder) remarkParts.push(`本周记录人：${isBack ? '心魔' : '星蚀'}+1`);
  if (isOldHabitRecurrence) remarkParts.push('旧习复发：心魔+1');

  return {
    effectiveFrontWeight: (behavior.weight as number) + extraWeight,
    backHeartDemonAmount: 1 + extraWeight,
    extraWeight,
    penaltyReasons,
    remarkSuffix: remarkParts.join('；'),
  };
}
