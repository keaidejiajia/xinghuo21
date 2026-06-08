import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css'
import './index.css'
import App from './App'
import { reinitializeFromStorage } from './lib/store'

// ===== Data sync: localStorage ↔ data.json via server API =====

let saveTimer: ReturnType<typeof setTimeout> | null = null;

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

function saveNow() {
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
  saveTimer = setTimeout(saveNow, 1000);
}

const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key: string, value: string) {
  originalSetItem(key, value);
  scheduleSave();
};

const originalRemoveItem = localStorage.removeItem.bind(localStorage);
localStorage.removeItem = function(key: string) {
  originalRemoveItem(key);
  scheduleSave();
};

window.addEventListener('beforeunload', () => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const data = collectAllData();
  navigator.sendBeacon('/api/save', new Blob([JSON.stringify(data)], { type: 'application/json' }));
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveNow();
});

// ===== Load data: GitHub raw → desktop server → localStorage =====
// No direct GitHub URL — use /api/load (Vercel proxy, avoids CORS)

async function loadFromServer(): Promise<void> {
  // 1. Try desktop server (localhost) first — for offline use with 星火燎原.bat
  try {
    const res = await fetch('/api/load');
    if (res.ok) {
      const data: Record<string, unknown> = await res.json();
      if (data && Object.keys(data).length > 0) {
        for (const [key, value] of Object.entries(data)) {
          originalSetItem(key, JSON.stringify(value));
        }
        return;
      }
    }
  } catch {
    // No local server — we're on the web (Vercel)
  }

  // 2. Try /api/load (Vercel proxy — fetches GitHub server-side, no CORS)
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
        console.log('[sync] Loaded fresh data from GitHub via /api/load');
        return;
      }
    }
  } catch {
    // /api/load unavailable — fall through to localStorage
  }

  // 3. Final fallback: use localStorage as-is (desktop first run or offline)
}

// Boot: load data first, then render React
loadFromServer().finally(() => {
  reinitializeFromStorage();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
