import type { ParentAccessDevice, ParentAccessEvent, UserRole } from '../types';

type ParentUser = {
  role: UserRole;
  name: string;
  linkedStudentId?: string;
};

function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function detectParentAccessDevice(): ParentAccessDevice {
  return window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
}

export async function recordParentAccess(type: ParentAccessEvent['type'], user: ParentUser | null): Promise<void> {
  if (!user || user.role !== 'parent' || !user.linkedStudentId) return;
  const now = new Date();
  const event: ParentAccessEvent = {
    type,
    studentId: user.linkedStudentId,
    parentName: user.name,
    occurredAt: now.toISOString(),
    date: toLocalDateStr(now),
    device: detectParentAccessDevice(),
  };

  try {
    await fetch('/api/parent-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch {
    // Parent access telemetry must never block login or card viewing.
  }
}
