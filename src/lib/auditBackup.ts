import type { AuditResult } from './audit';
import type { AppConfig, BehaviorRecord, Student } from '../types';

const AUDIT_BACKUP_PREFIX = 'xinghuo_audit_backup_';
const MAX_AUDIT_BACKUPS = 3;

type FieldSnapshot = Record<string, unknown>;

export type AuditRepairBackup = {
  createdAt: string;
  reason: 'data-audit-before-fix';
  mode: 'patch';
  auditSummary: {
    totalStudents: number;
    totalRecords: number;
    studentsWithIssues: number;
    discrepancies: number;
  };
  appConfigVersion?: number;
  students: Array<{
    id: string;
    name: string;
    number: number;
    before: FieldSnapshot;
    after: FieldSnapshot;
  }>;
  records: Array<{
    id: string;
    studentId: string;
    studentName?: string;
    before: FieldSnapshot;
    after: FieldSnapshot;
  }>;
};

function pickChangedFields<T extends Record<string, unknown>>(source: T, patch: Partial<T>): FieldSnapshot {
  const snapshot: FieldSnapshot = {};
  for (const key of Object.keys(patch)) {
    if (key === 'id') continue;
    snapshot[key] = source[key];
  }
  return snapshot;
}

function omitId<T extends Record<string, unknown>>(patch: Partial<T>): FieldSnapshot {
  const snapshot: FieldSnapshot = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'id') continue;
    snapshot[key] = value;
  }
  return snapshot;
}

export function createAuditRepairBackupPayload(params: {
  createdAt: string;
  students: Student[];
  records: BehaviorRecord[];
  appConfig: AppConfig;
  auditResult: AuditResult;
}): AuditRepairBackup {
  const studentsById = new Map(params.students.map(student => [student.id, student]));
  const recordsById = new Map(params.records.map(record => [record.id, record]));

  const studentSnapshots = Array.from(params.auditResult.correctedStudents.entries()).flatMap(([id, correction]) => {
    const student = studentsById.get(id);
    if (!student) return [];
    return [{
      id,
      name: student.name,
      number: student.number,
      before: pickChangedFields(student as unknown as Record<string, unknown>, correction as Record<string, unknown>),
      after: omitId(correction as Record<string, unknown>),
    }];
  });

  const recordSnapshots = Array.from(params.auditResult.recordCorrections.entries()).flatMap(([id, correction]) => {
    const record = recordsById.get(id);
    if (!record) return [];
    const student = studentsById.get(record.studentId);
    return [{
      id,
      studentId: record.studentId,
      studentName: student?.name,
      before: pickChangedFields(record as unknown as Record<string, unknown>, correction as Record<string, unknown>),
      after: omitId(correction as Record<string, unknown>),
    }];
  });

  return {
    createdAt: params.createdAt,
    reason: 'data-audit-before-fix',
    mode: 'patch',
    auditSummary: {
      totalStudents: params.auditResult.totalStudents,
      totalRecords: params.auditResult.totalRecords,
      studentsWithIssues: params.auditResult.studentsWithIssues,
      discrepancies: params.auditResult.discrepancies.length,
    },
    appConfigVersion: params.appConfig.version,
    students: studentSnapshots,
    records: recordSnapshots,
  };
}

function cleanupOldAuditBackups(storage: Storage, keepKey: string) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith(AUDIT_BACKUP_PREFIX) && key !== keepKey) keys.push(key);
  }
  keys.sort().slice(0, Math.max(0, keys.length - MAX_AUDIT_BACKUPS + 1)).forEach(key => {
    try { storage.removeItem(key); } catch { /* ignore cleanup errors */ }
  });
}

export function persistAuditRepairBackup(storage: Storage, key: string, payload: AuditRepairBackup): boolean {
  const serialized = JSON.stringify(payload);
  cleanupOldAuditBackups(storage, key);
  try {
    storage.setItem(key, serialized);
    return true;
  } catch {
    cleanupOldAuditBackups(storage, key);
    try {
      storage.setItem(key, serialized);
      return true;
    } catch {
      return false;
    }
  }
}
