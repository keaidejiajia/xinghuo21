import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css'
import 'lxgw-wenkai-webfont/lxgwwenkai-bold.css'
import './index.css'
import App from './App'
import { reinitializeFromStorage } from './lib/store'

// ===== Data sync: localStorage ↔ GitHub via server API =====

const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);

let isLoading = true; // prevents save during initial data load

type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';
type SyncState = {
  status: SyncStatus;
  message: string;
  updatedAt?: string;
  error?: string;
};

declare global {
  interface Window {
    xinghuoSync?: {
      saveNow: () => Promise<void>;
      retry: () => Promise<void>;
      getState: () => SyncState;
      hasPendingChanges: () => boolean;
    };
  }
}

const SYNC_DATA_KEYS = new Set([
  'students',
  'behavior-records',
  'app-config',
  'seat-history',
  'seat-data-migrated-v2',
  'seat_skipped',
  'seat-assignments',
  'seat-grid-layout',
]);

const PENDING_SYNC_KEY = 'xinghuo_pending_sync_payload';
const SAVE_TIMEOUT_MS = 30_000;
const LOAD_TIMEOUT_MS = 15_000;

let syncState: SyncState = { status: 'idle', message: '待同步' };
let hasUnsavedChanges = Boolean(localStorage.getItem(PENDING_SYNC_KEY));

function shouldSyncKey(key: string): boolean {
  return SYNC_DATA_KEYS.has(key);
}

function setSyncState(next: SyncState) {
  syncState = next;
  window.dispatchEvent(new CustomEvent('xinghuo-sync-state', { detail: next }));
}

function collectAllData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of SYNC_DATA_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try { data[key] = JSON.parse(raw); } catch { /* skip invalid local values */ }
  }
  return data;
}

function restoreSyncedData(data: Record<string, unknown>) {
  const currentUser = localStorage.getItem('demo_user');
  const rememberedUser = localStorage.getItem('xinghuo_auth_user');
  const rememberedFlag = localStorage.getItem('xinghuo_auth_remembered');

  for (const [key, value] of Object.entries(data)) {
    if (!shouldSyncKey(key)) continue;
    originalSetItem(key, JSON.stringify(value));
  }

  if (currentUser) originalSetItem('demo_user', currentUser);
  if (rememberedUser) originalSetItem('xinghuo_auth_user', rememberedUser);
  if (rememberedFlag) originalSetItem('xinghuo_auth_remembered', rememberedFlag);
}

function readPendingSync(): { updatedAt?: string; error?: string } | null {
  const raw = localStorage.getItem(PENDING_SYNC_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return {}; }
}

function markPendingSync(data: Record<string, unknown>, error: string) {
  hasUnsavedChanges = true;
  try {
    originalSetItem(PENDING_SYNC_KEY, JSON.stringify({
      data,
      error,
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // localStorage may be full; the business data is still in its normal keys.
  }
}

function clearPendingSync() {
  hasUnsavedChanges = false;
  originalRemoveItem(PENDING_SYNC_KEY);
}

function hasPendingSync(): boolean {
  return hasUnsavedChanges || Boolean(localStorage.getItem(PENDING_SYNC_KEY));
}

function formatPayloadSize(data: Record<string, unknown>): string {
  const bytes = new Blob([JSON.stringify(data)]).size;
  return `${Math.round(bytes / 1024)}KB`;
}

function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = LOAD_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timeout);
  });
}

// === 保存逻辑（唯一入口）===

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightSave: Promise<void> | null = null;
let pendingSaveAfterInFlight = false;

async function saveToCloud(): Promise<void> {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (isLoading) return;
  if (inFlightSave) {
    pendingSaveAfterInFlight = true;
    await inFlightSave;
    return saveToCloud();
  }

  const data = collectAllData();
  pendingSaveAfterInFlight = false;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);
  console.log('[sync] Save started:', { keys: Object.keys(data), size: formatPayloadSize(data) });
  setSyncState({ status: 'saving', message: '正在同步...', updatedAt: new Date().toISOString() });

  const request = fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    })
    .then(async r => {
      const text = await r.text();
      let payload: unknown = null;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
      if (!r.ok) {
        const detail = typeof payload === 'string' ? payload : JSON.stringify(payload);
        throw new Error(`HTTP ${r.status}: ${detail.slice(0, 300)}`);
      }
      clearPendingSync();
      console.log('[sync] Saved to cloud:', { payload, ms: Date.now() - startedAt });
      setSyncState({ status: 'saved', message: '已同步', updatedAt: new Date().toISOString() });
    })
    .catch(e => {
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      const message = aborted
        ? `同步超时：${Math.round(SAVE_TIMEOUT_MS / 1000)}秒内未完成，请稍后重试`
        : e instanceof Error ? e.message : String(e);
      markPendingSync(data, message);
      console.error('[sync] Save failed:', { error: e, ms: Date.now() - startedAt });
      setSyncState({ status: 'error', message: '同步失败', error: message, updatedAt: new Date().toISOString() });
      throw e;
    })
    .finally(() => {
      window.clearTimeout(timeout);
    });

  inFlightSave = request.finally(() => {
    inFlightSave = null;
  });

  await inFlightSave;
  if (pendingSaveAfterInFlight) {
    return saveToCloud();
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveToCloud().catch(() => { /* status already updated */ });
  }, 1000);
}

window.xinghuoSync = {
  saveNow: saveToCloud,
  retry: saveToCloud,
  getState: () => syncState,
  hasPendingChanges: hasPendingSync,
};

// 拦截 localStorage 操作 → 触发云端保存
localStorage.setItem = function(key: string, value: string) {
  originalSetItem(key, value);
  if (!isLoading && shouldSyncKey(key)) {
    hasUnsavedChanges = true;
    scheduleSave();
  }
};

localStorage.removeItem = function(key: string) {
  originalRemoveItem(key);
  if (!isLoading && shouldSyncKey(key)) {
    hasUnsavedChanges = true;
    scheduleSave();
  }
};

// 页面关闭前紧急保存
window.addEventListener('beforeunload', () => {
  if (!hasPendingSync()) return;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const data = collectAllData();
  navigator.sendBeacon('/api/save', new Blob([JSON.stringify(data)], { type: 'application/json' }));
});

// 页面切到后台时保存
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && hasPendingSync()) {
    saveToCloud().catch(() => { /* status already updated */ });
  }
});

// === 加载逻辑 ===

async function loadFromServer(): Promise<void> {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const pending = readPendingSync();
  if (pending) {
    const when = pending.updatedAt ? new Date(pending.updatedAt).toLocaleString('zh-CN') : '未知时间';
    setSyncState({
      status: 'error',
      message: '有未同步数据',
      error: `本机仍有未同步数据（${when}），请点“重试”同步，已暂缓云端覆盖。`,
      updatedAt: new Date().toISOString(),
    });
    console.warn('[sync] Pending local changes found, skip cloud restore:', pending);
    return;
  }

  // 1. 桌面版：仅在 localhost 时尝试本地服务器
  if (isLocal) {
    try {
      const res = await fetchWithTimeout('http://localhost:8421/api/load', {}, 3_000);
      if (res.ok) {
        const data: Record<string, unknown> = await res.json();
        if (data && Object.keys(data).length > 0) {
          restoreSyncedData(data);
          setSyncState({ status: 'saved', message: '已读取本机数据', updatedAt: new Date().toISOString() });
          console.log('[sync] Loaded from desktop server');
          return;
        }
      }
    } catch {
      // 桌面服务器未启动 — 继续尝试 Vercel API
    }
  }

  // 2. 网页版（或桌面服务器不可用时）：通过 Vercel 代理从 GitHub 加载
  try {
    const res = await fetchWithTimeout('/api/load', { cache: 'no-store' });
    if (res.ok) {
      const raw = await res.text();
      const data = JSON.parse(raw.replace(/^﻿/, ''));
      if (data && Object.keys(data).length > 0) {
        restoreSyncedData(data);
        setSyncState({ status: 'saved', message: '已同步', updatedAt: new Date().toISOString() });
        console.log('[sync] Loaded from cloud via /api/load');
        return;
      }
    } else {
      console.warn('[sync] /api/load returned', res.status);
    }
  } catch (e) {
    console.warn('[sync] /api/load failed:', e);
  }

  // 3. 回退：使用现有 localStorage（桌面首次运行或离线）
  setSyncState({ status: 'idle', message: '使用本机数据', updatedAt: new Date().toISOString() });
  console.log('[sync] Using localStorage fallback');
}

// Boot: load data first, then render React
loadFromServer().finally(() => {
  isLoading = false; // 解锁保存——只有用户操作才会触发保存
  reinitializeFromStorage();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
