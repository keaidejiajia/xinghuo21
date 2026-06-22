import assert from 'node:assert/strict';
import {
  flushPendingParentAccessEvents,
  getPendingParentAccessEvents,
  recordParentAccess,
} from '../src/lib/parentAccessClient.js';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.has(key) ? this.values.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

(globalThis as any).window = {
  matchMedia: () => ({ matches: true }),
};
(globalThis as any).localStorage = new MemoryStorage();

let calls = 0;
(globalThis as any).fetch = async () => {
  calls += 1;
  return new Response(JSON.stringify({ error: 'temporary failure' }), { status: 500 });
};

await recordParentAccess('login', {
  role: 'parent',
  name: '曾馨家长',
  linkedStudentId: '1',
});

assert.equal(calls, 1, 'recordParentAccess should try to send immediately');
assert.equal(getPendingParentAccessEvents().length, 1, 'failed parent access event should stay queued');

let postedBody = '';
(globalThis as any).fetch = async (_url: string, init: RequestInit) => {
  calls += 1;
  postedBody = String(init.body);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

await flushPendingParentAccessEvents();

assert.equal(getPendingParentAccessEvents().length, 0, 'queued parent access event should be removed after successful flush');
assert.match(postedBody, /曾馨家长/, 'queued event should preserve parent name');
assert.match(postedBody, /"studentId":"1"/, 'queued event should preserve linked student id');

console.log('parent-access-client tests passed');
