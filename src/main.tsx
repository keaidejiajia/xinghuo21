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

// ===== Load data: server first, then embedded (parent mode), then localStorage =====
async function loadFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/load');
    if (res.ok) {
      const data: Record<string, unknown> = await res.json();
      if (data && Object.keys(data).length > 0) {
        for (const [key, value] of Object.entries(data)) {
          originalSetItem(key, JSON.stringify(value));
        }
        return; // Server data loaded successfully
      }
    }
  } catch {
    // No server available
  }

  // Fallback: embedded data (parent mode / Gitee Pages)
  const embedded = (window as any).__EMBEDDED_DATA__;
  if (embedded && typeof embedded === 'object' && Object.keys(embedded).length > 0) {
    for (const [key, value] of Object.entries(embedded)) {
      originalSetItem(key, JSON.stringify(value));
    }
    console.log('[parent-mode] Loaded embedded data');
    return;
  }

  // Final fallback: use localStorage as-is (desktop first run)
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
