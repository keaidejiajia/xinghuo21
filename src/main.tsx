import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css'
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
    };
  }
}

const LOCAL_ONLY_KEYS = new Set([
  'demo_user',
  'xinghuo_auth_user',
  'xinghuo_auth_remembered',
  'last_recorder',
  'app_mobile_view',
  'app_version_seen',
  'app_sort_mode',
]);

let syncState: SyncState = { status: 'idle', message: '待同步' };

function shouldSyncKey(key: string): boolean {
  return !LOCAL_ONLY_KEYS.has(key);
}

function setSyncState(next: SyncState) {
  syncState = next;
  window.dispatchEvent(new CustomEvent('xinghuo-sync-state', { detail: next }));
}

function collectAllData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && shouldSyncKey(key)) {
      try { data[key] = JSON.parse(localStorage.getItem(key)!); } catch { /* skip */ }
    }
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
  console.log('[sync] Save started:', Object.keys(data));
  setSyncState({ status: 'saving', message: '正在同步...', updatedAt: new Date().toISOString() });

  const request = fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    .then(async r => {
      const text = await r.text();
      let payload: unknown = null;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
      if (!r.ok) {
        const detail = typeof payload === 'string' ? payload : JSON.stringify(payload);
        throw new Error(`HTTP ${r.status}: ${detail.slice(0, 300)}`);
      }
      console.log('[sync] Saved to cloud:', payload);
      setSyncState({ status: 'saved', message: '已同步', updatedAt: new Date().toISOString() });
    })
    .catch(e => {
      const message = e instanceof Error ? e.message : String(e);
      console.error('[sync] Save failed:', e);
      setSyncState({ status: 'error', message: '同步失败', error: message, updatedAt: new Date().toISOString() });
      throw e;
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
};

// 拦截 localStorage 操作 → 触发云端保存
localStorage.setItem = function(key: string, value: string) {
  originalSetItem(key, value);
  if (!isLoading && shouldSyncKey(key)) scheduleSave();
};

localStorage.removeItem = function(key: string) {
  originalRemoveItem(key);
  if (!isLoading && shouldSyncKey(key)) scheduleSave();
};

// 页面关闭前紧急保存
window.addEventListener('beforeunload', () => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const data = collectAllData();
  navigator.sendBeacon('/api/save', new Blob([JSON.stringify(data)], { type: 'application/json' }));
});

// 页面切到后台时保存
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveToCloud().catch(() => { /* status already updated */ });
});

// === 加载逻辑 ===

async function loadFromServer(): Promise<void> {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  // 1. 桌面版：仅在 localhost 时尝试本地服务器
  if (isLocal) {
    try {
      const res = await fetch('http://localhost:8421/api/load');
      if (res.ok) {
        const data: Record<string, unknown> = await res.json();
        if (data && Object.keys(data).length > 0) {
          restoreSyncedData(data);
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
    const res = await fetch('/api/load');
    if (res.ok) {
      const raw = await res.text();
      const data = JSON.parse(raw.replace(/^﻿/, ''));
      if (data && Object.keys(data).length > 0) {
        restoreSyncedData(data);
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
