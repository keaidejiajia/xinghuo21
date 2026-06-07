import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AppConfig } from '../types';
import { DEFAULT_APP_CONFIG, CURRENT_CONFIG_VERSION } from '../data/config';

const CONFIG_STORAGE_KEY = 'app-config';

function loadConfig(): AppConfig {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.version === CURRENT_CONFIG_VERSION) {
        // Merge with defaults to pick up any newly added fields
        return { ...DEFAULT_APP_CONFIG, ...parsed };
      }
      // Migration from v1: preserve user customizations, update level defaults
      if (parsed.version === 1) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        // Force updated backLevels/frontLevels (not user-customizable)
        migrated.backLevels = DEFAULT_APP_CONFIG.backLevels;
        migrated.frontLevels = DEFAULT_APP_CONFIG.frontLevels;
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v2: add immortalTitles and immortalDemotionThreshold
      if (parsed.version === 2) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        migrated.immortalTitles = DEFAULT_APP_CONFIG.immortalTitles;
        migrated.immortalDemotionThreshold = DEFAULT_APP_CONFIG.immortalDemotionThreshold;
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v3: update backLevels checksRequired values
      if (parsed.version === 3) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        migrated.backLevels = DEFAULT_APP_CONFIG.backLevels;
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v4: add exchangeItems, limitedEvents, and new negative behavior
      if (parsed.version === 4) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        migrated.exchangeItems = DEFAULT_APP_CONFIG.exchangeItems;
        migrated.limitedEvents = DEFAULT_APP_CONFIG.limitedEvents;
        // Add new "上报不实行为" if no similar behavior already exists
        const hasSimilar = migrated.negativeBehaviors.some((b: any) =>
          b.id === 'n-p-8' || b.name?.includes('不实') || b.name?.includes('撒谎')
        );
        if (!hasSimilar) {
          migrated.negativeBehaviors = [...migrated.negativeBehaviors, ...DEFAULT_APP_CONFIG.negativeBehaviors.filter(b => b.id === 'n-p-8')];
        }
        migrated.versionLogs = DEFAULT_APP_CONFIG.versionLogs;
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v5: add versionLogs
      if (parsed.version === 5) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        migrated.versionLogs = DEFAULT_APP_CONFIG.versionLogs;
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v6: merge autoRule effect types from 5 to 2
      if (parsed.version === 6) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        if (migrated.autoRules) {
          migrated.autoRules = migrated.autoRules.map((rule: any) => {
            if (rule.effectType === 'blank' || rule.effectType === 'heartDemon') {
              return { ...rule, effectType: 'blankAndHeartDemon' };
            } else if (rule.effectType === 'shield' || rule.effectType === 'check') {
              return { ...rule, effectType: 'shieldAndEmber' };
            }
            return rule;
          });
        }
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v7: merge trigger types + ensure effectType migrated
      if (parsed.version === 7) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        if (migrated.autoRules) {
          migrated.autoRules = migrated.autoRules.map((rule: any) => {
            const r = { ...rule };
            if (r.triggerCondition) {
              if (r.triggerCondition.type === 'weekly_homework_complete') {
                r.triggerCondition = { type: 'weekly_no_behavior', behaviorId: 'n-l-1' };
              } else if (r.triggerCondition.type === 'weekly_no_tardiness') {
                r.triggerCondition = { type: 'weekly_no_behavior', behaviorId: 'n-d-1' };
              } else if (r.triggerCondition.type === 'weekly_no_violation') {
                r.triggerCondition = { type: 'weekly_no_behavior' };
              } else if (r.triggerCondition.type === 'consecutive_days') {
                r.triggerCondition = { type: 'weekly_behavior_count', behaviorId: r.triggerCondition.behaviorId, threshold: r.triggerCondition.threshold || 3, period: 'week' };
              }
            }
            if (r.effectType === 'blank' || r.effectType === 'heartDemon') {
              r.effectType = 'blankAndHeartDemon';
            } else if (r.effectType === 'shield' || r.effectType === 'check') {
              r.effectType = 'shieldAndEmber';
            }
            return r;
          });
        }
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v8: update versionLogs
      if (parsed.version === 8) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        migrated.versionLogs = DEFAULT_APP_CONFIG.versionLogs;
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v9: update exchangeItems to v2 pricing
      if (parsed.version === 9) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        // Preserve user-customized exchangeItems if they've already modified them
        // Only update if the list still matches the old defaults (same IDs and count)
        const oldIds = ['ex-f-1','ex-f-2','ex-f-3','ex-f-4','ex-f-5','ex-f-6','ex-f-7','ex-f-8','ex-b-1','ex-b-2','ex-b-3','ex-b-4'];
        const isDefault = migrated.exchangeItems.length === oldIds.length &&
          migrated.exchangeItems.every((item: any, i: number) => item.id === oldIds[i]);
        if (isDefault) {
          migrated.exchangeItems = DEFAULT_APP_CONFIG.exchangeItems;
        }
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v10: update versionLogs to include V1.2.0
      if (parsed.version === 10) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        migrated.versionLogs = DEFAULT_APP_CONFIG.versionLogs;
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v11: add timePeriods and requiresTimePeriod to relevant behaviors
      if (parsed.version === 11) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        migrated.timePeriods = DEFAULT_APP_CONFIG.timePeriods;
        const requiresTimeIds = ['n-d-2', 'n-l-2', 'n-d-3'];
        migrated.negativeBehaviors = migrated.negativeBehaviors.map((b: any) =>
          requiresTimeIds.includes(b.id) ? { ...b, requiresTimePeriod: true } : b
        );
        migrated.positiveBehaviors = migrated.positiveBehaviors.map((b: any) =>
          requiresTimeIds.includes(b.id) ? { ...b, requiresTimePeriod: true } : b
        );
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      // Migration from v12: add group field to timePeriods
      if (parsed.version === 12) {
        const migrated = { ...DEFAULT_APP_CONFIG, ...parsed, version: CURRENT_CONFIG_VERSION };
        // Add group to any timePeriods that don't have it
        if (migrated.timePeriods) {
          migrated.timePeriods = migrated.timePeriods.map((tp: any) => {
            if (!tp.group) {
              // 课间和集体活动 → other, 其余 → course
              return { ...tp, group: (tp.id === 'tp-kejian' || tp.id === 'tp-jiti') ? 'other' : 'course' };
            }
            return tp;
          });
        }
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    // Corrupted data, reset to defaults
  }
  // First load or version mismatch: use defaults
  const defaults = DEFAULT_APP_CONFIG;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

interface ConfigContextValue {
  config: AppConfig;
  updateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
  resetConfig: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(loadConfig);

  const updateConfig = useCallback((updater: (prev: AppConfig) => AppConfig) => {
    setConfig(prev => {
      const next = updater(prev);
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    const defaults = { ...DEFAULT_APP_CONFIG };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(defaults));
    setConfig(defaults);
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === CONFIG_STORAGE_KEY && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <ConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): AppConfig {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx.config;
}

export function useConfigUpdater() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfigUpdater must be used within ConfigProvider');
  return { updateConfig: ctx.updateConfig, resetConfig: ctx.resetConfig };
}
