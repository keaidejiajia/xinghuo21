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

function collectAllData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      try { data[key] = JSON.parse(localStorage.getItem(key)!); } catch { /* skip */ }
    }
  }
  return data;
}

// === 保存逻辑（唯一入口）===

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveToCloud() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const data = collectAllData();
  fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json().then(d => {
    console.log('[sync] Saved to cloud:', d);
  })).catch(e => {
    console.error('[sync] Save failed:', e);
  });
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToCloud, 1000);
}

// 拦截 localStorage 操作 → 触发云端保存
localStorage.setItem = function(key: string, value: string) {
  originalSetItem(key, value);
  if (!isLoading) scheduleSave();
};

localStorage.removeItem = function(key: string) {
  originalRemoveItem(key);
  if (!isLoading) scheduleSave();
};

// 页面关闭前紧急保存
window.addEventListener('beforeunload', () => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const data = collectAllData();
  navigator.sendBeacon('/api/save', new Blob([JSON.stringify(data)], { type: 'application/json' }));
});

// 页面切到后台时保存
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveToCloud();
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
          for (const [key, value] of Object.entries(data)) {
            originalSetItem(key, JSON.stringify(value));
          }
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
        const currentUser = localStorage.getItem('demo_user');
        for (const [key, value] of Object.entries(data)) {
          if (key === 'demo_user') continue;
          originalSetItem(key, JSON.stringify(value));
        }
        if (currentUser) originalSetItem('demo_user', currentUser);
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
