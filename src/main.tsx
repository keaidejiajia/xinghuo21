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
  }).catch(() => {});
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
const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/keaidejiajia/xinghuo21/pages/data.json';

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

  // 2. Try GitHub raw (live data for xinghuo21.xin) — add timestamp to bust CDN cache
  try {
    const res = await fetch(GITHUB_DATA_URL + '?t=' + Date.now());
    if (res.ok) {
      const raw = await res.text();
      const data = JSON.parse(raw.replace(/^﻿/, ''));
      if (data && Object.keys(data).length > 0) {
        for (const [key, value] of Object.entries(data)) {
          originalSetItem(key, JSON.stringify(value));
        }
        return;
      }
    }
  } catch {
    // GitHub unavailable — fall through to localStorage
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
