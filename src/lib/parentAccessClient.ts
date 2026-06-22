import type { ParentAccessDevice, ParentAccessEvent, UserRole } from '../types/index.js';

type ParentUser = {
  role: UserRole;
  name: string;
  linkedStudentId?: string;
};

const PENDING_PARENT_ACCESS_KEY = 'xinghuo_parent_access_pending';

function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function detectParentAccessDevice(): ParentAccessDevice {
  return window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
}

function readQueue(): ParentAccessEvent[] {
  try {
    const raw = localStorage.getItem(PENDING_PARENT_ACCESS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(events: ParentAccessEvent[]): void {
  try {
    if (events.length === 0) {
      localStorage.removeItem(PENDING_PARENT_ACCESS_KEY);
      return;
    }
    localStorage.setItem(PENDING_PARENT_ACCESS_KEY, JSON.stringify(events.slice(-50)));
  } catch {
    // Telemetry queue must never block the app.
  }
}

function enqueueParentAccessEvent(event: ParentAccessEvent): void {
  const queue = readQueue();
  queue.push(event);
  writeQueue(queue);
}

export function getPendingParentAccessEvents(): ParentAccessEvent[] {
  return readQueue();
}

let flushPromise: Promise<void> | null = null;

export async function flushPendingParentAccessEvents(): Promise<void> {
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    const queue = readQueue();
    const remaining: ParentAccessEvent[] = [];

    for (const event of queue) {
      try {
        const response = await fetch('/api/parent-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
          keepalive: true,
        });
        if (!response.ok) {
          remaining.push(event);
        }
      } catch {
        remaining.push(event);
      }
    }

    writeQueue(remaining);
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
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

  enqueueParentAccessEvent(event);
  await flushPendingParentAccessEvents();
}

if (typeof window !== 'undefined') {
  window.addEventListener?.('online', () => {
    void flushPendingParentAccessEvents();
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void flushPendingParentAccessEvents();
    }
  });
}
