import type {
  ParentAccessDailyEntry,
  ParentAccessData,
  ParentAccessEvent,
  ParentAccessDevice,
} from '../types';

const DEFAULT_VIEW_THROTTLE_MINUTES = 10;

type StudentSummarySource = {
  id: string;
  name: string;
  number: number;
};

export type ParentAccessSummaryItem = ParentAccessDailyEntry & {
  studentName: string;
  studentNumber: number;
};

function toLocalDateStr(input: string): string {
  const date = new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDevice(device: ParentAccessDevice | undefined): ParentAccessDevice {
  return device === 'mobile' ? 'mobile' : 'desktop';
}

function shouldCountView(entry: ParentAccessDailyEntry, occurredAt: string, throttleMinutes: number): boolean {
  if (!entry.lastCountedViewAt) return true;
  const elapsedMs = new Date(occurredAt).getTime() - new Date(entry.lastCountedViewAt).getTime();
  return elapsedMs >= throttleMinutes * 60 * 1000;
}

export function upsertParentAccessEvent(
  data: ParentAccessData,
  event: ParentAccessEvent,
  throttleMinutes = DEFAULT_VIEW_THROTTLE_MINUTES,
): ParentAccessData {
  const date = event.date ?? toLocalDateStr(event.occurredAt);
  const id = `${date}-${event.studentId}`;
  const entries = [...(Array.isArray(data.entries) ? data.entries : [])];
  const index = entries.findIndex(entry => entry.id === id);
  const device = normalizeDevice(event.device);

  if (index === -1) {
    entries.push({
      id,
      date,
      studentId: event.studentId,
      parentName: event.parentName,
      firstAccessAt: event.occurredAt,
      lastAccessAt: event.occurredAt,
      loginCount: event.type === 'login' ? 1 : 0,
      viewCount: event.type === 'view' ? 1 : 0,
      lastDevice: device,
      lastCountedViewAt: event.type === 'view' ? event.occurredAt : undefined,
    });
  } else {
    const current = entries[index];
    const countView = event.type === 'view' && shouldCountView(current, event.occurredAt, throttleMinutes);
    entries[index] = {
      ...current,
      parentName: event.parentName || current.parentName,
      firstAccessAt: current.firstAccessAt <= event.occurredAt ? current.firstAccessAt : event.occurredAt,
      lastAccessAt: current.lastAccessAt >= event.occurredAt ? current.lastAccessAt : event.occurredAt,
      loginCount: current.loginCount + (event.type === 'login' ? 1 : 0),
      viewCount: current.viewCount + (countView ? 1 : 0),
      lastDevice: device,
      lastCountedViewAt: countView ? event.occurredAt : current.lastCountedViewAt,
    };
  }

  entries.sort((a, b) => b.date.localeCompare(a.date) || b.lastAccessAt.localeCompare(a.lastAccessAt));
  return { entries, updatedAt: event.occurredAt };
}

export function getParentAccessDailySummary(
  data: ParentAccessData,
  students: StudentSummarySource[],
  date: string,
): { visited: ParentAccessSummaryItem[]; unvisited: StudentSummarySource[] } {
  const byStudent = new Map(
    (Array.isArray(data.entries) ? data.entries : [])
      .filter(entry => entry.date === date)
      .map(entry => [entry.studentId, entry]),
  );

  const visited: ParentAccessSummaryItem[] = [];
  const unvisited: StudentSummarySource[] = [];

  for (const student of [...students].sort((a, b) => a.number - b.number)) {
    const entry = byStudent.get(student.id);
    if (entry) {
      visited.push({ ...entry, studentName: student.name, studentNumber: student.number });
    } else {
      unvisited.push(student);
    }
  }

  return { visited, unvisited };
}
