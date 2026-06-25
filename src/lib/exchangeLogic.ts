import type { BehaviorRecord, CardSide, PositiveWeight, Student } from '../types';

export interface ExchangeInput {
  side: CardSide;
  cost: number;
}

export interface ExchangeRecordInput extends ExchangeInput {
  studentId: string;
  itemName: string;
  recordedBy: string;
  studentCardSide: CardSide;
}

function positiveCost(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function cleanItemName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isExchangeRecord(record: Pick<BehaviorRecord, 'recordType' | 'description' | 'remark'>): boolean {
  return record.recordType === 'exchange' ||
    String(record.remark || '').includes('exchange:') ||
    String(record.description || '').startsWith('兑换：');
}

export function getExchangeCostFromRecord(record: Pick<BehaviorRecord, 'remark' | 'description'>): number {
  const text = `${record.remark || ''} ${record.description || ''}`;
  const structured = text.match(/cost:(\d+)/);
  if (structured) return positiveCost(structured[1]);
  const legacy = text.match(/消耗\s*(\d+)/);
  return legacy ? positiveCost(legacy[1]) : 0;
}

export function getExchangeSideFromRecord(record: Pick<BehaviorRecord, 'remark' | 'studentCardSide'>): CardSide {
  const remark = record.remark || '';
  if (remark.includes('exchange:back')) return 'back';
  if (remark.includes('exchange:front')) return 'front';
  return record.studentCardSide === 'back' ? 'back' : 'front';
}

export function applyExchangeToStudent(student: Student, input: ExchangeInput): Student {
  const cost = positiveCost(input.cost);
  const next = { ...student, updatedAt: new Date().toISOString() };
  if (input.side === 'front') {
    next.starShields = Math.max(0, next.starShields - cost);
    next.totalShieldsExchanged = (next.totalShieldsExchanged || 0) + cost;
  } else {
    next.heritagePoints = Math.max(0, next.heritagePoints - cost);
    next.totalHeritageDonated = (next.totalHeritageDonated || 0) + cost;
  }
  return next;
}

export function revertExchangeFromStudent(student: Student, record: Pick<BehaviorRecord, 'remark' | 'description' | 'studentCardSide'>): Student {
  const cost = getExchangeCostFromRecord(record);
  const side = getExchangeSideFromRecord(record);
  const next = { ...student, updatedAt: new Date().toISOString() };
  if (side === 'front') {
    next.starShields += cost;
    next.totalShieldsExchanged = Math.max(0, (next.totalShieldsExchanged || 0) - cost);
  } else {
    next.heritagePoints += cost;
    next.totalHeritageDonated = Math.max(0, (next.totalHeritageDonated || 0) - cost);
  }
  return next;
}

export function buildExchangeRecord(input: ExchangeRecordInput): Omit<BehaviorRecord, 'id' | 'createdAt'> {
  const itemName = cleanItemName(input.itemName) || '未命名物品';
  const cost = positiveCost(input.cost);
  const currency = input.side === 'front' ? '护盾' : '传承值';
  return {
    studentId: input.studentId,
    direction: 'positive',
    weight: 1 as PositiveWeight,
    category: '品行',
    description: `兑换：${itemName}`,
    remark: `exchange:${input.side},cost:${cost}，消耗${cost}${currency}`,
    recordedBy: input.recordedBy,
    verified: true,
    shieldsConsumed: 0,
    isHighSensitivity: false,
    studentCardSide: input.studentCardSide,
    recordType: 'exchange',
  };
}
