import { useState, Component } from 'react';
import { useConfig, useConfigUpdater } from '../contexts/ConfigContext';
import { useStudents } from '../lib/store';
import { useToast } from '../hooks/useToast';
import { useMobile } from '../hooks/useMobile';
import type { BehaviorDefinition, LevelEffect, TeachingWeek, Category, ExchangeItem, LimitedEvent } from '../types';
import { ClipboardList, Star, Calendar, Users, Settings, Plus, Trash2, RotateCcw, X, Download, Upload, ShoppingBag, Flame, BookOpen, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { D, INK, SCROLL_CARD, INK_INPUT, INK_OPTION } from '../data/theme';
import { toLocalDateStr } from '../lib/utils';
import { recomputeAllStudents, type AuditResult } from '../lib/audit';

// Error boundary to catch render errors
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div style={{ padding: 24, color: INK.flameCinnabar, fontSize: 14, whiteSpace: 'pre-wrap' }}>
        <b>渲染错误：</b>{this.state.error.message}
        <br /><br />
        <pre style={{ fontSize: 11, color: INK.textSecondary }}>{this.state.error.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}

const TAB_ITEMS = [
  { key: 'behaviors', label: '行为管理', icon: ClipboardList },
  { key: 'levels', label: '等级与特权', icon: Star },
  { key: 'calendar', label: '日历与教学周', icon: Calendar },
  { key: 'exchange', label: '兑换商店', icon: ShoppingBag },
  { key: 'limited-events', label: '限时活动', icon: Flame },
  { key: 'version-logs', label: '版本公告', icon: BookOpen },
  { key: 'students', label: '学生管理', icon: Users },
  { key: 'system', label: '系统参数', icon: Settings },
] as const;

type TabKey = typeof TAB_ITEMS[number]['key'];

// ===== Shared styles =====
const S = {
  container: { minHeight: '100vh', padding: '24px', position: 'relative' as const, background: 'transparent' },
  title: { fontSize: 22, fontWeight: 700, color: INK.textPrimary, marginBottom: 24, fontFamily: "'LXGW WenKai', 'Cinzel', serif" },
  tabRow: { display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${D.borderHover}`, paddingBottom: 8, flexWrap: 'wrap' as const },
  tab: (active: boolean) => ({
    padding: '8px 16px', borderRadius: D.radiusXs + ' ' + D.radiusXs + ' 0 0', fontSize: 13, fontWeight: active ? 600 : 400,
    background: active ? INK.starGoldFaint : 'transparent',
    border: 'none', color: active ? INK.starGold : INK.textMuted, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif",
  }),
  card: { padding: 16, borderRadius: D.radiusSm, background: SCROLL_CARD.background, border: SCROLL_CARD.border, marginBottom: 12, backdropFilter: D.glassBlur },
  label: { display: 'block', fontSize: 12, color: INK.textSecondary, marginBottom: 4, fontFamily: "'LXGW WenKai', 'Cinzel', serif" },
  input: { width: '100%', boxSizing: 'border-box' as const, padding: '8px 12px', borderRadius: INK_INPUT.borderRadius, background: INK_INPUT.background, border: INK_INPUT.border, color: INK_INPUT.color, fontSize: 13, lineHeight: 1.35, outline: INK_INPUT.outline, fontFamily: INK_INPUT.fontFamily },
  select: { width: '100%', boxSizing: 'border-box' as const, padding: '8px 28px 8px 12px', borderRadius: INK_INPUT.borderRadius, background: INK_INPUT.background, border: INK_INPUT.border, color: INK_INPUT.color, fontSize: 13, outline: INK_INPUT.outline, fontFamily: INK_INPUT.fontFamily, appearance: 'auto' as any },
  btnPrimary: { padding: '8px 16px', borderRadius: D.radiusSm, background: INK.starGoldFaint, border: `1px solid ${INK.borderStrong}`, color: INK.starGold, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, whiteSpace: 'nowrap' as const, fontFamily: "'LXGW WenKai', 'Cinzel', serif", boxShadow: D.goldGlow },
  btnDanger: { padding: '4px 8px', borderRadius: D.radiusSm, background: INK.flameFaint, border: `1px solid rgba(196,65,37,0.3)`, color: INK.flameCinnabar, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontFamily: "'LXGW WenKai', 'Cinzel', serif" },
  badge: (bg: string, fg: string) => ({ padding: '2px 8px', borderRadius: D.radiusSm, fontSize: 11, background: bg, color: fg, display: 'inline-block', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }),
  row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as const },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  tag: (bg: string, fg: string) => ({ padding: '1px 6px', borderRadius: D.radiusXs, fontSize: 10, background: bg, color: fg, border: `1px solid ${fg}33`, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }),
};

function mergeAliases(existing: string[] | undefined, ...values: Array<string | undefined>): string[] | undefined {
  const aliases = [...(existing ?? [])];
  for (const value of values) {
    const text = value?.trim();
    if (text && !aliases.includes(text)) aliases.push(text);
  }
  return aliases.length > 0 ? aliases : undefined;
}

function withTextAliases<T extends { name: string; description?: string; aliases?: string[] }>(
  item: T,
  changes: Partial<T>
): T {
  const nameChanged = typeof changes.name === 'string' && changes.name.trim() !== item.name.trim();
  const oldDescription = item.description || '';
  const nextDescription = typeof changes.description === 'string' ? changes.description : oldDescription;
  const descriptionChanged = typeof changes.description === 'string' && nextDescription.trim() !== oldDescription.trim();
  const aliases = (nameChanged || descriptionChanged)
    ? mergeAliases(item.aliases, item.name, item.description)
    : item.aliases;
  return { ...item, ...changes, aliases };
}

function LevelOneTitleRow({ idx, title, totalWeeks, updateConfig }: {
  idx: number;
  title: { weeksRequired: number; name: string; description: string };
  totalWeeks: number;
  updateConfig: (updater: (prev: import('../types').AppConfig) => import('../types').AppConfig) => void;
}) {
  const [unit, setUnit] = useState<'周' | '学期'>(() => {
    const halfSemester = totalWeeks > 0 ? Math.round(totalWeeks / 2) : 10;
    return (title.weeksRequired >= halfSemester && title.weeksRequired % halfSemester === 0) ? '学期' : '周';
  });
  const halfSemester = totalWeeks > 0 ? Math.round(totalWeeks / 2) : 10;
  const displayValue = unit === '学期' ? title.weeksRequired / halfSemester : title.weeksRequired;

  return (
    <div style={S.row}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 130 }}>
        <input
          type="number"
          value={displayValue}
          min={unit === '周' ? 1 : 0.5}
          max={unit === '周' ? totalWeeks : 2}
          step={unit === '周' ? 1 : 0.5}
          onChange={e => {
            const val = Number(e.target.value);
            const weeks = unit === '学期' ? Math.round(val * halfSemester) : val;
            updateConfig(prev => ({
              ...prev,
              levelOneTitles: prev.levelOneTitles.map((t, i) => i === idx ? { ...t, weeksRequired: Math.max(1, weeks) } : t),
            }));
          }}
          style={{ ...S.input, width: 55 }}
        />
        <select
          value={unit}
          onChange={e => setUnit(e.target.value as '周' | '学期')}
          style={{ ...S.select, width: 58, padding: '8px 4px' }}
        >
          <option value="周" style={INK_OPTION}>周</option>
          <option value="学期" style={INK_OPTION}>学期</option>
        </select>
      </div>
      <input value={title.name} onChange={e => updateConfig(prev => ({
        ...prev,
        levelOneTitles: prev.levelOneTitles.map((t, i) => i === idx ? { ...t, name: e.target.value } : t),
      }))} style={{ ...S.input, width: 100 }} />
      <input value={title.description} onChange={e => updateConfig(prev => ({
        ...prev,
        levelOneTitles: prev.levelOneTitles.map((t, i) => i === idx ? { ...t, description: e.target.value } : t),
      }))} style={S.input} />
    </div>
  );
}

export default function SettingsPage() {
  const config = useConfig();
  const { updateConfig, resetConfig } = useConfigUpdater();
  const { students, updateStudent, addStudent, removeStudent, batchImportStudents, resetAllStudents, updateStudentNumber } = useStudents();
  const { showToast } = useToast();
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<TabKey>('behaviors');

  const handleReset = () => {
    if (window.confirm('确定恢复所有默认设置？此操作不可撤销。')) {
      resetConfig();
      showToast('已恢复默认设置');
    }
  };

  const handleResetAllStudents = () => {
    if (window.confirm('确定重置所有学生状态？\n\n所有学生将恢复为正面等级1，所有行为记录将被清空。\n此操作不可撤销！')) {
      resetAllStudents();
      showToast('已重置所有学生状态');
    }
  };

  return (
    <div className={isMobile ? 'settings-mobile' : undefined} style={{ ...S.container, padding: isMobile ? '10px 10px calc(92px + env(safe-area-inset-bottom))' : S.container.padding, overflowX: 'hidden' }}>
      {isMobile && (
        <style>{`
          .settings-mobile * {
            box-sizing: border-box;
            max-width: 100%;
          }
          .settings-mobile input,
          .settings-mobile select,
          .settings-mobile textarea {
            min-width: 0 !important;
            line-height: 1.35 !important;
          }
          .settings-mobile input[type="date"],
          .settings-mobile input[type="number"],
          .settings-mobile select {
            min-height: 44px !important;
            font-size: 16px !important;
            padding-top: 10px !important;
            padding-bottom: 10px !important;
          }
          .settings-mobile input[type="date"] {
            width: 100% !important;
            min-width: 100% !important;
            color-scheme: dark;
          }
          .settings-mobile input[type="date"]::-webkit-date-and-time-value {
            min-height: 22px;
            text-align: left;
          }
          .settings-mobile input[style*="width:"],
          .settings-mobile select[style*="width:"],
          .settings-mobile textarea[style*="width:"] {
            width: 100% !important;
          }
          .settings-mobile [style*="width: 55px"],
          .settings-mobile [style*="width: 58px"],
          .settings-mobile [style*="width: 60px"],
          .settings-mobile [style*="width: 72px"],
          .settings-mobile [style*="width: 80px"],
          .settings-mobile [style*="width: 90px"],
          .settings-mobile [style*="width: 100px"],
          .settings-mobile [style*="width: 120px"],
          .settings-mobile [style*="width: 130px"],
          .settings-mobile [style*="width: 150px"],
          .settings-mobile [style*="width: 180px"],
          .settings-mobile [style*="width: 200px"] {
            width: 100% !important;
            min-width: 0 !important;
            flex: 1 1 100% !important;
          }
          .settings-mobile [style*="display: flex"][style*="justify-content: space-between"] {
            gap: 10px !important;
            align-items: stretch !important;
            flex-wrap: wrap !important;
          }
          .settings-mobile [style*="display: flex"][style*="align-items: center"] {
            min-width: 0 !important;
            flex-wrap: wrap !important;
          }
          .settings-mobile [style*="display: flex"][style*="gap: 16px"] {
            gap: 8px !important;
          }
          .settings-mobile button {
            min-height: 34px;
            justify-content: center;
          }
          .settings-mobile [style*="font-family: Consolas"] {
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }
          .settings-mobile [style*="max-height: 500px"] {
            max-height: none !important;
            overflow-y: visible !important;
          }
          .settings-mobile [style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          .settings-mobile [style*="grid-template-columns: 1fr 1fr"],
          .settings-mobile [style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        `}</style>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? 12 : 24, gap: 10 }}>
        <h2 style={{ ...S.title, fontSize: isMobile ? 18 : S.title.fontSize, marginBottom: 0 }}>系统设置</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: 'flex-end' }}>
          <button onClick={handleResetAllStudents} style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', background: 'rgba(212,122,40,0.12)', border: '1px solid rgba(212,122,40,0.3)', color: INK.flameEmber, borderRadius: D.radiusSm, display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
            <RotateCcw size={12} /> 重置全部学生
          </button>
          <button onClick={handleReset} style={{ ...S.btnDanger, padding: '6px 12px', fontSize: 12 }}>
            <RotateCcw size={12} /> 恢复默认
          </button>
        </div>
      </div>

      {/* Tab row */}
      <div style={{
        ...S.tabRow,
        display: isMobile ? 'grid' : S.tabRow.display,
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : undefined,
        gap: isMobile ? 8 : S.tabRow.gap,
        flexWrap: isMobile ? undefined : S.tabRow.flexWrap,
        overflowX: undefined,
        paddingBottom: isMobile ? 0 : S.tabRow.paddingBottom,
        marginBottom: isMobile ? 16 : S.tabRow.marginBottom,
        borderBottom: isMobile ? 'none' : S.tabRow.borderBottom,
        position: undefined,
        top: undefined,
        zIndex: undefined,
        background: undefined,
        backdropFilter: undefined,
      }}>
        {TAB_ITEMS.map(({ key, label, icon: Icon }) => (
          <button key={key} style={{
            ...S.tab(activeTab === key),
            borderRadius: isMobile ? D.radiusSm : S.tab(activeTab === key).borderRadius,
            justifyContent: isMobile ? 'flex-start' : undefined,
            padding: isMobile ? '10px 12px' : S.tab(activeTab === key).padding,
            minHeight: isMobile ? 42 : undefined,
            whiteSpace: isMobile ? 'normal' : 'nowrap',
            width: isMobile ? '100%' : undefined,
          }} onClick={() => setActiveTab(key)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <ErrorBoundary>
        {activeTab === 'behaviors' && <BehaviorsTab config={config} updateConfig={updateConfig} />}
        {activeTab === 'levels' && <LevelsTab config={config} updateConfig={updateConfig} />}
        {activeTab === 'calendar' && <CalendarTab config={config} updateConfig={updateConfig} />}
        {activeTab === 'exchange' && <ExchangeTab config={config} updateConfig={updateConfig} />}
        {activeTab === 'limited-events' && <LimitedEventsTab config={config} updateConfig={updateConfig} />}
        {activeTab === 'version-logs' && <VersionLogsTab config={config} updateConfig={updateConfig} />}
        {activeTab === 'students' && <StudentsTab students={students} updateStudent={updateStudent} addStudent={addStudent} removeStudent={removeStudent} batchImportStudents={batchImportStudents} updateStudentNumber={updateStudentNumber} config={config} updateConfig={updateConfig} />}
        {activeTab === 'system' && <SystemTab config={config} updateConfig={updateConfig} />}
      </ErrorBoundary>
    </div>
  );
}

// ===== Behaviors Tab =====
function BehaviorsTab({ config, updateConfig }: { config: ReturnType<typeof useConfig>; updateConfig: (fn: (prev: typeof config) => typeof config) => void }) {
  const [subTab, setSubTab] = useState<'negative' | 'positive'>('negative');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBlacklistId, setEditingBlacklistId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBehavior, setNewBehavior] = useState<Partial<BehaviorDefinition>>({
    direction: 'negative', category: config.categories[0] as Category, weight: 1,
    name: '', description: '', isHighSensitivity: false, isComposite: false, isInverseSelectable: false, requiresTimePeriod: false,
  });
  const isMobile = useMobile();

  const students = useStudents().students;

  const behaviors = subTab === 'negative' ? config.negativeBehaviors : config.positiveBehaviors;
  const weightNames = subTab === 'negative' ? config.negativeWeightNames : config.positiveWeightNames;
  const nextId = subTab === 'negative' ? `n-custom-${Date.now()}` : `p-custom-${Date.now()}`;

  const displayedBehaviors = categoryFilter === 'all'
    ? [...behaviors].sort((a, b) => a.weight - b.weight)
    : behaviors.filter(b => b.category === categoryFilter).sort((a, b) => a.weight - b.weight);

  const updateBehavior = (id: string, changes: Partial<BehaviorDefinition>) => {
    const key = subTab === 'negative' ? 'negativeBehaviors' : 'positiveBehaviors';
    updateConfig(prev => ({
      ...prev,
      [key]: prev[key].map((b: BehaviorDefinition) => b.id === id ? withTextAliases(b, changes) : b),
    }));
  };

  const deleteBehavior = (id: string) => {
    if (!window.confirm('确定删除此行为？')) return;
    const key = subTab === 'negative' ? 'negativeBehaviors' : 'positiveBehaviors';
    updateConfig(prev => ({
      ...prev,
      [key]: prev[key].filter((b: BehaviorDefinition) => b.id !== id),
    }));
  };

  const addBehavior = () => {
    if (!newBehavior.name?.trim()) return;
    const key = subTab === 'negative' ? 'negativeBehaviors' : 'positiveBehaviors';
    const behavior: BehaviorDefinition = {
      id: nextId,
      direction: subTab,
      category: (newBehavior.category || config.categories[0]) as Category,
      weight: (newBehavior.weight || 1) as 1 | 2 | 3,
      name: newBehavior.name.trim(),
      description: newBehavior.description || newBehavior.name.trim(),
      isHighSensitivity: newBehavior.isHighSensitivity || false,
      isComposite: newBehavior.isComposite || false,
      isInverseSelectable: newBehavior.isInverseSelectable || false,
      compositeThreshold: newBehavior.compositeThreshold,
      compositePenalty: newBehavior.compositePenalty,
      affectsFlag: newBehavior.affectsFlag || false,
      requiresTimePeriod: newBehavior.requiresTimePeriod || false,
    };
    updateConfig(prev => ({ ...prev, [key]: [...prev[key], behavior] }));
    setNewBehavior({ direction: subTab, category: config.categories[0] as Category, weight: 1, name: '', description: '', isHighSensitivity: false, isComposite: false, isInverseSelectable: false, affectsFlag: false, requiresTimePeriod: false });
    setShowAddForm(false);
  };

  // Category management
  const [newCategory, setNewCategory] = useState('');

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name || config.categories.includes(name)) return;
    updateConfig(prev => ({ ...prev, categories: [...prev.categories, name] }));
    setNewCategory('');
  };

  const removeCategory = (cat: string) => {
    // Check if any behavior uses this category
    const inUse = [...config.negativeBehaviors, ...config.positiveBehaviors].some(b => b.category === cat);
    if (inUse) { alert('该类别下还有行为，无法删除'); return; }
    updateConfig(prev => ({ ...prev, categories: prev.categories.filter(c => c !== cat) }));
  };

  const CATEGORY_COLORS: Record<string, string> = { '纪律': INK.starBlue, '学习': '#8baa7a', '卫生': INK.flameEmber, '品行': INK.flameCinnabar };
  const getCatColor = (cat: string) => CATEGORY_COLORS[cat] || INK.textSecondary;

  return (
    <div>
      {/* Sub-tab */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, max-content)', gap: 8, marginBottom: 16 }}>
        <button onClick={() => { setSubTab('negative'); setEditingId(null); setShowAddForm(false); setCategoryFilter('all'); }} style={{
          ...S.tab(subTab === 'negative'), borderRadius: D.radiusSm, background: subTab === 'negative' ? INK.flameFaint : 'transparent',
          color: subTab === 'negative' ? INK.flameCinnabar : INK.textMuted,
        }}>负面行为（星蚀/心魔）</button>
        <button onClick={() => { setSubTab('positive'); setEditingId(null); setShowAddForm(false); setCategoryFilter('all'); }} style={{
          ...S.tab(subTab === 'positive'), borderRadius: D.radiusSm, background: subTab === 'positive' ? INK.starGoldFaint : 'transparent',
          color: subTab === 'positive' ? INK.starGold : INK.textMuted,
        }}>正面行为（护盾/火种）</button>
      </div>

      {/* Category filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setCategoryFilter('all')} style={{
          padding: '4px 12px', borderRadius: D.radiusXs, fontSize: 12,
          background: categoryFilter === 'all' ? INK.starGoldFaint : 'transparent',
          border: `1px solid ${categoryFilter === 'all' ? INK.starGold : INK.borderHover}`,
          color: categoryFilter === 'all' ? INK.starGold : INK.textMuted, cursor: 'pointer',
          fontFamily: "'LXGW WenKai', 'Cinzel', serif",
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          全部 <span style={{ fontSize: 10, background: categoryFilter === 'all' ? INK.starGold : INK.textMuted, color: categoryFilter === 'all' ? '#fff' : 'rgba(255,255,255,0.8)', borderRadius: 8, padding: '0 5px', lineHeight: '16px' }}>{behaviors.length}</span>
        </button>
        {config.categories.map(cat => {
          const count = behaviors.filter(b => b.category === cat).length;
          return (
            <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
              padding: '4px 12px', borderRadius: D.radiusXs, fontSize: 12,
              background: categoryFilter === cat ? `${getCatColor(cat)}20` : 'transparent',
              border: `1px solid ${categoryFilter === cat ? getCatColor(cat) : INK.borderHover}`,
              color: categoryFilter === cat ? getCatColor(cat) : INK.textMuted, cursor: 'pointer',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {cat} <span style={{ fontSize: 10, background: categoryFilter === cat ? getCatColor(cat) : INK.textMuted, color: categoryFilter === cat ? '#fff' : 'rgba(255,255,255,0.8)', borderRadius: 8, padding: '0 5px', lineHeight: '16px' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Category management */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>行为类别</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {config.categories.map(cat => (
            <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: D.radiusXs, background: `${getCatColor(cat)}15`, border: `1px solid ${getCatColor(cat)}33`, color: getCatColor(cat), fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
              {cat}
              <button onClick={() => removeCategory(cat)} style={{ background: 'none', border: 'none', color: getCatColor(cat), cursor: 'pointer', padding: 0, opacity: 0.6 }}><X size={10} /></button>
            </span>
          ))}
          <div style={{ display: 'flex', gap: 6, width: isMobile ? '100%' : undefined }}>
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="新类别" style={{ ...S.input, width: isMobile ? '100%' : 80, padding: isMobile ? '9px 10px' : '4px 8px', fontSize: isMobile ? 14 : 12 }} onKeyDown={e => e.key === 'Enter' && addCategory()} />
            <button onClick={addCategory} style={{ ...S.btnPrimary, padding: isMobile ? '8px 12px' : '4px 8px', fontSize: isMobile ? 12 : 11, flexShrink: 0 }}><Plus size={10} /></button>
          </div>
        </div>
      </div>

      {/* Behavior list */}
      {displayedBehaviors.map(b => (
        <div key={b.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : undefined, gap: isMobile ? 10 : undefined, marginBottom: editingId === b.id ? 12 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              <span style={S.tag(`${getCatColor(b.category)}20`, getCatColor(b.category))}>{b.category}</span>
              <span style={{ color: INK.textPrimary, fontSize: 14, fontWeight: 500, fontFamily: "'LXGW WenKai', 'Cinzel', serif", overflowWrap: 'break-word' }}>{b.name}</span>
              <span style={S.badge(subTab === 'negative' ? INK.flameFaint : INK.starGoldFaint, subTab === 'negative' ? INK.flameCinnabar : INK.starGold)}>
                {weightNames[b.weight]} {b.weight}{subTab === 'negative' ? '星蚀/心魔' : '护盾/火种'}
              </span>
              {b.isComposite && <span style={S.tag('rgba(232,197,90,0.15)', INK.flameGold)}>复合</span>}
              {b.isInverseSelectable && <span style={S.tag('rgba(123,139,181,0.15)', INK.starBlue)}>反选</span>}
              {b.isHighSensitivity && <span style={S.tag(INK.flameFaint, INK.flameCinnabar)}>高敏感</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setEditingId(editingId === b.id ? null : b.id)} style={{ ...S.btnPrimary, padding: '4px 8px', flex: isMobile ? '1 1 100px' : undefined }}>
                {editingId === b.id ? '收起' : '编辑'}
              </button>
              <button onClick={() => deleteBehavior(b.id)} style={{ ...S.btnDanger, flex: isMobile ? '0 0 44px' : undefined, justifyContent: 'center' }}><Trash2 size={10} /></button>
            </div>
          </div>
          {editingId === b.id && (
            <div style={{ borderTop: `1px solid ${INK.border}`, paddingTop: 12 }}>
              <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 10 : S.row.gap }}>
                <div style={{ flex: 1, width: isMobile ? '100%' : undefined }}>
                  <label style={S.label}>名称</label>
                  <input value={b.name} onChange={e => updateBehavior(b.id, { name: e.target.value })} style={S.input} />
                </div>
                <div style={{ width: isMobile ? '100%' : 100 }}>
                  <label style={S.label}>类别</label>
                  <select value={b.category} onChange={e => updateBehavior(b.id, { category: e.target.value as Category })} style={S.select}>
                    {config.categories.map(c => <option key={c} value={c} style={INK_OPTION}>{c}</option>)}
                  </select>
                </div>
                <div style={{ width: isMobile ? '100%' : 80 }}>
                  <label style={S.label}>权重</label>
                  <select value={b.weight} onChange={e => updateBehavior(b.id, { weight: Number(e.target.value) as 1|2|3 })} style={S.select}>
                    <option value={1} style={INK_OPTION}>1 - {weightNames[1]}</option>
                    <option value={2} style={INK_OPTION}>2 - {weightNames[2]}</option>
                    <option value={3} style={INK_OPTION}>3 - {weightNames[3]}</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={S.label}>描述</label>
                <input value={b.description} onChange={e => updateBehavior(b.id, { description: e.target.value })} style={S.input} />
              </div>
              <div style={{ ...S.row, alignItems: isMobile ? 'stretch' : 'flex-end', flexDirection: isMobile ? 'column' : undefined, gap: isMobile ? 10 : S.row.gap }}>
                <div style={{ width: isMobile ? '100%' : 100 }}>
                  <label style={S.label}>每日上限</label>
                  <input type="number" min={0} value={b.maxDailyCount || ''} placeholder="不限"
                    onChange={e => updateBehavior(b.id, { maxDailyCount: e.target.value ? Number(e.target.value) : undefined })}
                    style={S.input} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: INK.textSecondary }}>黑名单: {(b.behaviorBlacklist || []).length}人</span>
                  <button onClick={() => setEditingBlacklistId(editingBlacklistId === b.id ? null : b.id)}
                    style={{ ...S.btnPrimary, padding: '2px 8px', fontSize: 11 }}>管理</button>
                </div>
              </div>
              {editingBlacklistId === b.id && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: D.radiusXs, background: 'rgba(15,23,42,0.5)', border: `1px solid ${INK.border}` }}>
                  <div style={{ fontSize: 12, color: INK.textSecondary, marginBottom: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>黑名单学生</div>
                  {(b.behaviorBlacklist || []).length > 0 ? (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                      {(b.behaviorBlacklist || []).map(studentId => {
                        const student = students.find(s => s.id === studentId);
                        return (
                          <span key={studentId} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: D.radiusXs, background: INK.flameFaint, border: `1px solid rgba(196,65,37,0.3)`, color: INK.flameCinnabar, fontSize: 11, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                            {student?.name || studentId}
                            <button onClick={() => updateBehavior(b.id, { behaviorBlacklist: (b.behaviorBlacklist || []).filter(id => id !== studentId) })} style={{ background: 'none', border: 'none', color: INK.flameCinnabar, cursor: 'pointer', padding: 0, opacity: 0.7 }}><X size={10} /></button>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: INK.textMuted, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>暂无黑名单学生</div>
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select onChange={e => {
                      if (!e.target.value) return;
                      const current = b.behaviorBlacklist || [];
                      if (!current.includes(e.target.value)) {
                        updateBehavior(b.id, { behaviorBlacklist: [...current, e.target.value] });
                      }
                      e.target.value = '';
                    }} style={{ ...S.select, flex: 1 }} defaultValue="">
                      <option value="" disabled style={INK_OPTION}>选择学生添加...</option>
                      {students.filter(s => !(b.behaviorBlacklist || []).includes(s.id)).map(s => (
                        <option key={s.id} value={s.id} style={INK_OPTION}>{s.number} {s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: INK.textSecondary, cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  <input type="checkbox" checked={b.isHighSensitivity} onChange={e => updateBehavior(b.id, { isHighSensitivity: e.target.checked })} /> 高敏感
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: INK.textSecondary, cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  <input type="checkbox" checked={b.isComposite} onChange={e => updateBehavior(b.id, { isComposite: e.target.checked })} /> 复合规则
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: INK.textSecondary, cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  <input type="checkbox" checked={b.isInverseSelectable} onChange={e => updateBehavior(b.id, { isInverseSelectable: e.target.checked })} /> 可反选
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#E8A030', cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  <input type="checkbox" checked={!!b.requiresTimePeriod} onChange={e => updateBehavior(b.id, { requiresTimePeriod: e.target.checked })} /> 需选择时间
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#dc503c', cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  <input type="checkbox" checked={!!b.affectsFlag} onChange={e => updateBehavior(b.id, { affectsFlag: e.target.checked })} /> 影响流动红旗
                </label>
              </div>
              {b.isComposite && (
                <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 10 : S.row.gap }}>
                  <div style={{ width: isMobile ? '100%' : 100 }}>
                    <label style={S.label}>阈值（次/周）</label>
                    <input type="number" value={b.compositeThreshold ?? 3} onChange={e => updateBehavior(b.id, { compositeThreshold: Number(e.target.value) })} style={S.input} />
                  </div>
                  <div style={{ width: isMobile ? '100%' : 100 }}>
                    <label style={S.label}>额外惩罚</label>
                    <input type="number" value={b.compositePenalty ?? 1} onChange={e => updateBehavior(b.id, { compositePenalty: Number(e.target.value) })} style={S.input} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add behavior */}
      {showAddForm ? (
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>添加行为</div>
          <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 10 : S.row.gap }}>
            <div style={{ flex: 1, width: isMobile ? '100%' : undefined }}>
              <label style={S.label}>名称</label>
              <input value={newBehavior.name} onChange={e => setNewBehavior(p => ({ ...p, name: e.target.value }))} style={S.input} placeholder="行为名称" />
            </div>
            <div style={{ width: isMobile ? '100%' : 100 }}>
              <label style={S.label}>类别</label>
              <select value={newBehavior.category} onChange={e => setNewBehavior(p => ({ ...p, category: e.target.value as Category }))} style={S.select}>
                {config.categories.map(c => <option key={c} value={c} style={INK_OPTION}>{c}</option>)}
              </select>
            </div>
            <div style={{ width: isMobile ? '100%' : 80 }}>
              <label style={S.label}>权重</label>
              <select value={newBehavior.weight} onChange={e => setNewBehavior(p => ({ ...p, weight: Number(e.target.value) as 1|2|3 }))} style={S.select}>
                <option value={1} style={INK_OPTION}>1 - {weightNames[1]}</option>
                <option value={2} style={INK_OPTION}>2 - {weightNames[2]}</option>
                <option value={3} style={INK_OPTION}>3 - {weightNames[3]}</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={S.label}>描述</label>
            <input value={newBehavior.description} onChange={e => setNewBehavior(p => ({ ...p, description: e.target.value }))} style={S.input} placeholder="行为描述（可选）" />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#E8A030', cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
              <input type="checkbox" checked={!!newBehavior.requiresTimePeriod} onChange={e => setNewBehavior(p => ({ ...p, requiresTimePeriod: e.target.checked }))} /> 需选择时间
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#dc503c', cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
              <input type="checkbox" checked={!!newBehavior.affectsFlag} onChange={e => setNewBehavior(p => ({ ...p, affectsFlag: e.target.checked }))} /> 影响流动红旗
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={addBehavior} style={{ ...S.btnPrimary, flex: isMobile ? '1 1 140px' : undefined }}><Plus size={12} /> 确认添加</button>
            <button onClick={() => setShowAddForm(false)} style={{ ...S.btnPrimary, flex: isMobile ? '1 1 100px' : undefined, background: 'rgba(107,103,96,0.15)', border: `1px solid ${INK.borderHover}`, color: INK.textMuted }}>取消</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddForm(true)} style={{ ...S.btnPrimary, width: isMobile ? '100%' : undefined }}><Plus size={14} /> 添加行为</button>
      )}

      {/* Weight names */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>权重名称</div>
        <div style={S.row}>
          {Object.entries(weightNames).map(([w, name]) => (
            <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: INK.textMuted, fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>权重{w}:</span>
              <input value={name} onChange={e => {
                const key = subTab === 'negative' ? 'negativeWeightNames' : 'positiveWeightNames';
                updateConfig(prev => ({ ...prev, [key]: { ...prev[key as 'negativeWeightNames' | 'positiveWeightNames'], [w]: e.target.value } }));
              }} style={{ ...S.input, width: 60, padding: '4px 8px' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Levels Tab =====
function LevelsTab({ config, updateConfig }: { config: ReturnType<typeof useConfig>; updateConfig: (fn: (prev: typeof config) => typeof config) => void }) {
  const [editingSide, setEditingSide] = useState<'front' | 'back'>('front');

  const levels = editingSide === 'front' ? config.frontLevels : config.backLevels;
  const effects = editingSide === 'front' ? config.frontLevelEffects : config.backLevelEffects;

  const updateLevel = (level: number, changes: Record<string, unknown>) => {
    const key = editingSide === 'front' ? 'frontLevels' : 'backLevels';
    updateConfig(prev => ({
      ...prev,
      [key]: (prev[key as 'frontLevels' | 'backLevels']).map((l: typeof levels[0]) => l.level === level ? { ...l, ...changes } : l),
    }));
  };

  const updateEffectItem = (level: number, idx: number, value: string) => {
    const key = editingSide === 'front' ? 'frontLevelEffects' : 'backLevelEffects';
    updateConfig(prev => ({
      ...prev,
      [key]: (prev[key as 'frontLevelEffects' | 'backLevelEffects']).map((e: LevelEffect) =>
        e.level === level ? { ...e, items: e.items.map((item, i) => i === idx ? value : item) } : e
      ),
    }));
  };

  const addEffectItem = (level: number) => {
    const key = editingSide === 'front' ? 'frontLevelEffects' : 'backLevelEffects';
    updateConfig(prev => ({
      ...prev,
      [key]: (prev[key as 'frontLevelEffects' | 'backLevelEffects']).map((e: LevelEffect) =>
        e.level === level ? { ...e, items: [...e.items, '新条目'] } : e
      ),
    }));
  };

  const removeEffectItem = (level: number, idx: number) => {
    const key = editingSide === 'front' ? 'frontLevelEffects' : 'backLevelEffects';
    updateConfig(prev => ({
      ...prev,
      [key]: (prev[key as 'frontLevelEffects' | 'backLevelEffects']).map((e: LevelEffect) =>
        e.level === level ? { ...e, items: e.items.filter((_, i) => i !== idx) } : e
      ),
    }));
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setEditingSide('front')} style={{
          ...S.tab(editingSide === 'front'), borderRadius: D.radiusSm,
          background: editingSide === 'front' ? INK.starGoldFaint : 'transparent',
          color: editingSide === 'front' ? INK.starGold : INK.textMuted,
        }}>正面·律己之路</button>
        <button onClick={() => setEditingSide('back')} style={{
          ...S.tab(editingSide === 'back'), borderRadius: D.radiusSm,
          background: editingSide === 'back' ? 'rgba(212,122,40,0.12)' : 'transparent',
          color: editingSide === 'back' ? INK.flameEmber : INK.textMuted,
        }}>背面·新生之路</button>
      </div>

      {levels.map(lvl => {
        const effect = effects.find(e => e.level === lvl.level);
        return (
          <div key={lvl.level} style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ ...S.badge(INK.starGoldFaint, INK.starGold), fontWeight: 600 }}>Lv.{lvl.level}</span>
              <input value={lvl.name} onChange={e => updateLevel(lvl.level, { name: e.target.value })} style={{ ...S.input, fontWeight: 600, fontSize: 15, width: 150 }} />
            </div>
            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>意象</label>
                <input value={lvl.imagery} onChange={e => updateLevel(lvl.level, { imagery: e.target.value })} style={S.input} />
              </div>
              {editingSide === 'front' ? (
                <div style={{ width: 100 }}>
                  <label style={S.label}>{config.blankMarkName}阈值</label>
                  <input type="number" value={(lvl as typeof config.frontLevels[0]).blanks} onChange={e => updateLevel(lvl.level, { blanks: Number(e.target.value) })} style={S.input} />
                </div>
              ) : lvl.level === 1 ? (
                <div style={{ width: 180 }}>
                  <label style={S.label}>{config.checkMarkName}需求</label>
                  <div style={{ ...S.input, color: INK.textMuted, fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                    翻面自动获得，无需{config.checkMarkName}
                  </div>
                </div>
              ) : lvl.level === 6 ? (
                <div style={{ width: 100 }}>
                  <label style={S.label}>{config.checkMarkName}需求</label>
                  <input type="number" value={(lvl as typeof config.backLevels[0]).checksRequired} onChange={e => updateLevel(lvl.level, { checksRequired: Number(e.target.value) })} style={S.input} />
                </div>
              ) : (
                <div style={{ width: 100 }}>
                  <label style={S.label}>{config.checkMarkName}需求</label>
                  <input type="number" value={(lvl as typeof config.backLevels[0]).checksRequired} onChange={e => updateLevel(lvl.level, { checksRequired: Number(e.target.value) })} style={S.input} />
                </div>
              )}
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={S.label}>描述</label>
              <textarea value={lvl.description} onChange={e => updateLevel(lvl.level, { description: e.target.value })} rows={2} style={{ ...S.input, resize: 'vertical' }} />
            </div>
            {effect && (
              <div>
                <div style={{ fontSize: 12, color: effect.type === 'privilege' ? '#8baa7a' : INK.flameCinnabar, fontWeight: 600, marginBottom: 4, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  {effect.type === 'privilege' ? '特权' : '限制'}
                </div>
                {effect.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    <input value={item} onChange={e => updateEffectItem(lvl.level, idx, e.target.value)} style={S.input} />
                    <button onClick={() => removeEffectItem(lvl.level, idx)} style={S.btnDanger}><Trash2 size={10} /></button>
                  </div>
                ))}
                <button onClick={() => addEffectItem(lvl.level)} style={{ ...S.btnPrimary, padding: '4px 8px', fontSize: 11 }}><Plus size={10} /> 添加条目</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== Calendar Tab =====
function CalendarTab({ config, updateConfig }: { config: ReturnType<typeof useConfig>; updateConfig: (fn: (prev: typeof config) => typeof config) => void }) {
  const [newWeekCount, setNewWeekCount] = useState(20);
  const isMobile = useMobile();

  const generateWeeks = () => {
    if (!config.semesterStartDate) return;
    const start = new Date(config.semesterStartDate);
    const weeks: TeachingWeek[] = [];
    for (let i = 0; i < newWeekCount; i++) {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 4);
      weeks.push({ weekNumber: i + 1, startDate: weekStart.toISOString().slice(0, 10), endDate: weekEnd.toISOString().slice(0, 10) });
    }
    updateConfig(prev => ({ ...prev, teachingWeeks: weeks }));
  };

  const updateWeek = (weekNumber: number, changes: Partial<TeachingWeek>) => {
    updateConfig(prev => ({
      ...prev,
      teachingWeeks: prev.teachingWeeks.map(w => w.weekNumber === weekNumber ? { ...w, ...changes } : w),
    }));
  };

  const now = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div style={S.card}>
        <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 10 : S.row.gap }}>
          <div style={{ width: isMobile ? '100%' : undefined }}>
            <label style={S.label}>学期起始日期</label>
            <input type="date" value={config.semesterStartDate} onChange={e => updateConfig(prev => ({ ...prev, semesterStartDate: e.target.value }))} style={{ ...S.input, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 16 : S.input.fontSize }} />
          </div>
          <div style={{ width: isMobile ? '100%' : undefined }}>
            <label style={S.label}>生成周数</label>
            <input type="number" value={newWeekCount} onChange={e => setNewWeekCount(Number(e.target.value))} style={{ ...S.input, width: isMobile ? '100%' : 60, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 16 : S.input.fontSize }} />
          </div>
          <div style={{ alignSelf: 'flex-end', width: isMobile ? '100%' : undefined }}>
            <button onClick={generateWeeks} style={{ ...S.btnPrimary, width: isMobile ? '100%' : undefined }}>按起始日期生成教学周</button>
          </div>
        </div>
      </div>

      <div style={{ maxHeight: isMobile ? undefined : 500, overflowY: isMobile ? 'visible' : 'auto' }}>
        {config.teachingWeeks.map(week => {
          const isCurrent = now >= week.startDate && now <= week.endDate;
          return (
            <div key={week.weekNumber} style={{
              ...S.card,
              display: isMobile ? 'grid' : 'flex',
              gridTemplateColumns: isMobile ? '1fr' : undefined,
              alignItems: isMobile ? 'stretch' : 'center',
              gap: isMobile ? 10 : 12,
              background: D.bgGlass,
              borderLeft: isCurrent ? `3px solid ${INK.starGold}` : undefined,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: isCurrent ? INK.starGold : INK.textMuted, fontSize: 14, fontWeight: 600, width: isMobile ? 'auto' : 40, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>第{week.weekNumber}周</span>
                {isCurrent && <span style={S.tag(INK.starGoldFaint, INK.starGold)}>当前</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '130px auto 130px', alignItems: 'center', gap: 8, flex: 1 }}>
                <div>
                  {isMobile && <label style={S.label}>开始日期</label>}
                  <input type="date" value={week.startDate} onChange={e => updateWeek(week.weekNumber, { startDate: e.target.value })} style={{ ...S.input, width: isMobile ? '100%' : 130, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 16 : S.input.fontSize }} />
                </div>
                <span style={{ color: INK.textMuted, textAlign: 'center', display: isMobile ? 'none' : undefined }}>→</span>
                <div>
                  {isMobile && <label style={S.label}>结束日期</label>}
                  <input type="date" value={week.endDate} onChange={e => updateWeek(week.weekNumber, { endDate: e.target.value })} style={{ ...S.input, width: isMobile ? '100%' : 130, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 16 : S.input.fontSize }} />
                </div>
              </div>
              <input value={week.label || ''} onChange={e => updateWeek(week.weekNumber, { label: e.target.value || undefined })} placeholder="备注" style={{ ...S.input, width: isMobile ? '100%' : 120 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Exchange Tab =====
function ExchangeTab({ config, updateConfig }: { config: ReturnType<typeof useConfig>; updateConfig: (fn: (prev: typeof config) => typeof config) => void }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ side: 'front' as 'front' | 'back', cost: 10, name: '', description: '', isActive: true, startDate: undefined as string | undefined, endDate: undefined as string | undefined });

  const frontItems = config.exchangeItems.filter(i => i.side === 'front').sort((a, b) => a.cost - b.cost);
  const backItems = config.exchangeItems.filter(i => i.side === 'back').sort((a, b) => a.cost - b.cost);

  const addItem = () => {
    if (!newItem.name.trim()) return;
    const item: ExchangeItem = {
      id: `ex-${Date.now()}`,
      side: newItem.side,
      cost: newItem.cost,
      name: newItem.name.trim(),
      description: newItem.description || undefined,
      isActive: newItem.isActive,
      startDate: newItem.startDate,
      endDate: newItem.endDate,
    };
    updateConfig(prev => ({ ...prev, exchangeItems: [...prev.exchangeItems, item] }));
    setNewItem({ side: 'front', cost: 10, name: '', description: '', isActive: true, startDate: undefined, endDate: undefined });
    setShowAddForm(false);
  };

  const updateItem = (id: string, changes: Partial<ExchangeItem>) => {
    updateConfig(prev => ({
      ...prev,
      exchangeItems: prev.exchangeItems.map(i => i.id === id ? { ...i, ...changes } : i),
    }));
  };

  const deleteItem = (id: string) => {
    if (!window.confirm('确定删除此兑换项？')) return;
    updateConfig(prev => ({ ...prev, exchangeItems: prev.exchangeItems.filter(i => i.id !== id) }));
  };

  const renderSection = (label: string, items: ExchangeItem[], sideColor: string, sideBg: string) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: sideColor, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{label}</div>
      {items.length === 0 && (
        <div style={{ fontSize: 12, color: INK.textMuted, padding: '8px 0', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>暂无兑换项</div>
      )}
      {items.map(item => {
        const isEditing = editingId === item.id;
        return (
          <div key={item.id} style={{ ...S.card, marginBottom: 8, borderLeft: item.isActive ? `3px solid ${sideColor}` : `3px dashed ${INK.textMuted}`, opacity: item.isActive ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: INK.textPrimary, fontSize: 14, fontWeight: 500, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{item.name}</span>
                <span style={S.badge(sideBg, sideColor)}>{item.cost} {item.side === 'front' ? '护盾' : '传承值'}</span>
                {item.description && <span style={{ fontSize: 11, color: INK.textSecondary, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{item.description}</span>}{(item.startDate || item.endDate) && <span style={{ fontSize: 10, color: '#E8A030', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{item.startDate || '即日'} ~ {item.endDate || '长期'}</span>}
                <span style={S.tag(sideColor === INK.starGold ? INK.starGoldFaint : 'rgba(212,122,40,0.12)', sideColor)}>{item.side === 'front' ? '正面' : '背面'}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: INK.textSecondary, cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  <input type="checkbox" checked={item.isActive} onChange={e => updateItem(item.id, { isActive: e.target.checked })} /> 启用
                </label>
                <button onClick={() => setEditingId(isEditing ? null : item.id)} style={{ ...S.btnPrimary, padding: '2px 8px', fontSize: 11 }}>
                  {isEditing ? '收起' : '编辑'}
                </button>
                <button onClick={() => deleteItem(item.id)} style={S.btnDanger}><Trash2 size={10} /></button>
              </div>
            </div>
            {isEditing && (
              <div style={{ marginTop: 8, borderTop: `1px solid ${INK.border}`, paddingTop: 8 }}>
                <div style={S.row}>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>名称</label>
                    <input value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })} style={S.input} />
                  </div>
                  <div style={{ width: 80 }}>
                    <label style={S.label}>消耗</label>
                    <input type="number" min={1} value={item.cost} onChange={e => updateItem(item.id, { cost: Number(e.target.value) })} style={S.input} />
                  </div>
                  <div style={{ width: 100 }}>
                    <label style={S.label}>适用面</label>
                    <select value={item.side} onChange={e => updateItem(item.id, { side: e.target.value as 'front' | 'back' })} style={S.select}>
                      <option value="front" style={INK_OPTION}>正面</option>
                      <option value="back" style={INK_OPTION}>背面</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={S.label}>描述</label>
                  <input value={item.description || ''} onChange={e => updateItem(item.id, { description: e.target.value || undefined })} style={S.input} placeholder="可选描述" />
                </div>
                <div style={S.row}>
                  <div style={{ width: 130 }}>
                    <label style={S.label}>开始日期（可选）</label>
                    <input type="date" value={item.startDate || ''} onChange={e => updateItem(item.id, { startDate: e.target.value || undefined })} style={S.input} />
                  </div>
                  <div style={{ width: 130 }}>
                    <label style={S.label}>结束日期（可选）</label>
                    <input type="date" value={item.endDate || ''} onChange={e => updateItem(item.id, { endDate: e.target.value || undefined })} style={S.input} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: INK.textSecondary, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
          共 {config.exchangeItems.length} 个兑换项（正面 {frontItems.length} / 背面 {backItems.length}）
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} style={S.btnPrimary}><Plus size={14} /> 添加兑换项</button>
      </div>

      {showAddForm && (
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>新增兑换项</div>
          <div style={S.row}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>名称</label>
              <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} style={S.input} placeholder="兑换项名称" />
            </div>
            <div style={{ width: 80 }}>
              <label style={S.label}>消耗{newItem.side === 'front' ? '护盾' : '传承值'}</label>
              <input type="number" min={1} value={newItem.cost} onChange={e => setNewItem(p => ({ ...p, cost: Number(e.target.value) }))} style={S.input} />
            </div>
            <div style={{ width: 100 }}>
              <label style={S.label}>适用面</label>
              <select value={newItem.side} onChange={e => setNewItem(p => ({ ...p, side: e.target.value as 'front' | 'back' }))} style={S.select}>
                <option value="front" style={INK_OPTION}>正面</option>
                <option value="back" style={INK_OPTION}>背面</option>
              </select>
            </div>
          </div>
          <div style={S.row}>
            <div style={{ width: 130 }}>
              <label style={S.label}>开始日期（可选）</label>
              <input type="date" value={newItem.startDate || ''} onChange={e => setNewItem(p => ({ ...p, startDate: e.target.value || undefined }))} style={S.input} />
            </div>
            <div style={{ width: 130 }}>
              <label style={S.label}>结束日期（可选）</label>
              <input type="date" value={newItem.endDate || ''} onChange={e => setNewItem(p => ({ ...p, endDate: e.target.value || undefined }))} style={S.input} />
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={S.label}>描述（可选）</label>
            <input value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} style={S.input} placeholder="兑换项描述" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addItem} style={S.btnPrimary}><Plus size={12} /> 确认添加</button>
            <button onClick={() => setShowAddForm(false)} style={{ ...S.btnPrimary, background: 'rgba(107,103,96,0.15)', border: `1px solid ${INK.borderHover}`, color: INK.textMuted }}>取消</button>
          </div>
        </div>
      )}

      {renderSection('正面兑换项', frontItems, INK.starGold, INK.starGoldFaint)}
      {renderSection('背面兑换项', backItems, INK.flameEmber, 'rgba(212,122,40,0.12)')}
    </div>
  );
}

// ===== Version Logs Tab =====
function VersionLogsTab({ config, updateConfig }: { config: ReturnType<typeof useConfig>; updateConfig: (fn: (prev: typeof config) => typeof config) => void }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const logs = config.versionLogs ?? [];

  const addVersion = () => {
    const newLog = { version: '', date: new Date().toISOString().slice(0, 10), changes: [{ title: '', detail: '' }], id: `vl-${Date.now()}` };
    updateConfig(prev => ({ ...prev, versionLogs: [...prev.versionLogs, newLog] }));
    setExpandedIdx(logs.length);
  };

  const removeVersion = (idx: number) => {
    if (!window.confirm('确定删除此版本公告？')) return;
    updateConfig(prev => ({ ...prev, versionLogs: prev.versionLogs.filter((_, i) => i !== idx) }));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const updateLog = (idx: number, field: string, value: string) => {
    updateConfig(prev => ({
      ...prev,
      versionLogs: prev.versionLogs.map((log, i) => i === idx ? { ...log, [field]: value } : log),
    }));
  };

  const updateChange = (logIdx: number, changeIdx: number, field: 'title' | 'detail', value: string) => {
    updateConfig(prev => ({
      ...prev,
      versionLogs: prev.versionLogs.map((log, i) => i === logIdx ? {
        ...log, changes: log.changes.map((c, ci) => ci === changeIdx ? { ...c, [field]: value } : c),
      } : log),
    }));
  };

  const addChange = (logIdx: number) => {
    updateConfig(prev => ({
      ...prev,
      versionLogs: prev.versionLogs.map((log, i) => i === logIdx ? {
        ...log, changes: [...log.changes, { title: '', detail: '' }],
      } : log),
    }));
  };

  const removeChange = (logIdx: number, changeIdx: number) => {
    updateConfig(prev => ({
      ...prev,
      versionLogs: prev.versionLogs.map((log, i) => i === logIdx ? {
        ...log, changes: log.changes.filter((_, ci) => ci !== changeIdx),
      } : log),
    }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: INK.textSecondary, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
          共 {logs.length} 条版本公告
        </span>
        <button onClick={addVersion} style={{
          padding: '6px 14px', borderRadius: D.radiusSm, background: INK.starGoldFaint,
          border: '1px solid rgba(212,168,83,0.3)', color: INK.starGold, cursor: 'pointer',
          fontSize: 13, fontFamily: "'LXGW WenKai', 'Cinzel', serif",
        }}>
          + 新增版本
        </button>
      </div>

      {logs.length === 0 && (
        <div style={{ fontSize: 13, color: INK.textMuted, textAlign: 'center', padding: 20, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
          暂无版本公告
        </div>
      )}

      {logs.map((log, idx) => (
        <div key={idx} style={{ marginBottom: 10, borderRadius: D.radius, background: INK.bgCard, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            style={{
              padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            }}
          >
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: INK.textPrimary }}>v{log.version}</span>
              <span style={{ fontSize: 12, color: INK.textMuted, marginLeft: 10 }}>{log.date}</span>
              <span style={{ fontSize: 11, color: INK.textMuted, marginLeft: 10 }}>{log.changes.length}条更新</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={(e) => { e.stopPropagation(); removeVersion(idx); }} style={{ background: 'transparent', border: 'none', color: INK.flameCinnabar, cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>删除</button>
              <span style={{ color: INK.textMuted, fontSize: 12 }}>{expandedIdx === idx ? '▲' : '▼'}</span>
            </div>
          </div>

          {expandedIdx === idx && (
            <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: INK.textMuted, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>版本号</label>
                  <input value={log.version} onChange={e => updateLog(idx, 'version', e.target.value)} style={S.input} placeholder="如 1.2.0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: INK.textMuted, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>日期</label>
                  <input type="date" value={log.date} onChange={e => updateLog(idx, 'date', e.target.value)} style={S.input} />
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: INK.textPrimary, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>更新内容</div>
              {log.changes.map((change, ci) => (
                <div key={ci} style={{ marginBottom: 8, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: D.radiusSm, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <input value={change.title} onChange={e => updateChange(idx, ci, 'title', e.target.value)} placeholder="标题" style={{ ...S.input, flex: 1, marginBottom: 0 }} />
                    <button onClick={() => removeChange(idx, ci)} style={{ background: 'transparent', border: 'none', color: INK.flameCinnabar, cursor: 'pointer', fontSize: 11 }}>×</button>
                  </div>
                  <textarea value={change.detail} onChange={e => updateChange(idx, ci, 'detail', e.target.value)} placeholder="详细说明" rows={2} style={{ ...S.input, width: '100%', resize: 'vertical', marginBottom: 0 }} />
                </div>
              ))}
              <button onClick={() => addChange(idx)} style={{
                padding: '4px 10px', borderRadius: D.radiusSm, background: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(255,255,255,0.1)', color: INK.textMuted, cursor: 'pointer',
                fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              }}>+ 添加更新条目</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ===== Limited Events Tab =====
function LimitedEventsTab({ config, updateConfig }: { config: ReturnType<typeof useConfig>; updateConfig: (fn: (prev: typeof config) => typeof config) => void }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isMobile = useMobile();
  const [newEvent, setNewEvent] = useState({
    name: '', direction: 'positive' as 'positive' | 'negative',
    weight: 1 as 1 | 2 | 3, description: '',
    startDate: '', endDate: '', isActive: true,
  });

  const addEvent = () => {
    if (!newEvent.name.trim() || !newEvent.startDate || !newEvent.endDate) return;
    const eventId = `le-${Date.now()}`;
    const event: LimitedEvent = {
      id: eventId,
      seriesId: eventId,
      name: newEvent.name.trim(),
      direction: newEvent.direction,
      weight: newEvent.weight,
      description: newEvent.description,
      startDate: newEvent.startDate,
      endDate: newEvent.endDate,
      isActive: newEvent.isActive,
    };
    updateConfig(prev => ({ ...prev, limitedEvents: [...prev.limitedEvents, event] }));
    setNewEvent({ name: '', direction: 'positive', weight: 1, description: '', startDate: '', endDate: '', isActive: true });
    setShowAddForm(false);
  };

  const updateEvent = (id: string, changes: Partial<LimitedEvent>) => {
    updateConfig(prev => ({
      ...prev,
      limitedEvents: prev.limitedEvents.map(e => e.id === id ? withTextAliases({ ...e, seriesId: e.seriesId ?? e.id }, changes) : e),
    }));
  };

  const deleteEvent = (id: string) => {
    if (!window.confirm('确定删除此限时活动？')) return;
    updateConfig(prev => ({ ...prev, limitedEvents: prev.limitedEvents.filter(e => e.id !== id) }));
    if (editingId === id) setEditingId(null);
  };

  const getEventStatus = (event: LimitedEvent) => {
    if (!event.isActive) return 'inactive';
    const today = toLocalDateStr();
    if (today < event.startDate) return 'upcoming';
    if (today > event.endDate) return 'expired';
    return 'active';
  };

  const STATUS_CONFIG: Record<string, { label: string; borderColor: string; borderStyle: string; tagBg: string; tagFg: string }> = {
    active: { label: '进行中', borderColor: '#8baa7a', borderStyle: 'solid', tagBg: 'rgba(139,170,122,0.15)', tagFg: '#8baa7a' },
    upcoming: { label: '未开始', borderColor: INK.starBlue, borderStyle: 'solid', tagBg: 'rgba(123,139,181,0.15)', tagFg: INK.starBlue },
    expired: { label: '已结束', borderColor: INK.textMuted, borderStyle: 'solid', tagBg: 'rgba(107,103,96,0.15)', tagFg: INK.textMuted },
    inactive: { label: '已停用', borderColor: INK.textMuted, borderStyle: 'dashed', tagBg: 'rgba(107,103,96,0.15)', tagFg: INK.textMuted },
  };

  const weightNames = newEvent.direction === 'negative' ? config.negativeWeightNames : config.positiveWeightNames;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : undefined, gap: isMobile ? 10 : undefined, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: INK.textSecondary, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
          共 {config.limitedEvents.length} 个限时活动
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} style={{ ...S.btnPrimary, width: isMobile ? '100%' : undefined }}><Plus size={14} /> 添加活动</button>
      </div>

      {showAddForm && (
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>新增限时活动</div>
          <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 10 : S.row.gap }}>
            <div style={{ flex: 1, width: isMobile ? '100%' : undefined }}>
              <label style={S.label}>活动名称</label>
              <input value={newEvent.name} onChange={e => setNewEvent(p => ({ ...p, name: e.target.value }))} style={S.input} placeholder="活动名称" />
            </div>
            <div style={{ width: isMobile ? '100%' : 120 }}>
              <label style={S.label}>行为类别</label>
              <select value={newEvent.direction} onChange={e => setNewEvent(p => ({ ...p, direction: e.target.value as 'positive' | 'negative' }))} style={S.select}>
                <option value="positive" style={INK_OPTION}>正面行为</option>
                <option value="negative" style={INK_OPTION}>负面行为</option>
              </select>
            </div>
            <div style={{ width: isMobile ? '100%' : 80 }}>
              <label style={S.label}>权重</label>
              <select value={newEvent.weight} onChange={e => setNewEvent(p => ({ ...p, weight: Number(e.target.value) as 1 | 2 | 3 }))} style={S.select}>
                <option value={1} style={INK_OPTION}>1 - {weightNames[1]}</option>
                <option value={2} style={INK_OPTION}>2 - {weightNames[2]}</option>
                <option value={3} style={INK_OPTION}>3 - {weightNames[3]}</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={S.label}>描述</label>
            <input value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} style={S.input} placeholder="活动描述" />
          </div>
          <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 10 : S.row.gap }}>
            <div style={{ width: isMobile ? '100%' : undefined }}>
              <label style={S.label}>开始日期</label>
              <input type="date" value={newEvent.startDate} onChange={e => setNewEvent(p => ({ ...p, startDate: e.target.value }))} style={{ ...S.input, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 16 : S.input.fontSize }} />
            </div>
            <span style={{ color: INK.textMuted, alignSelf: 'center', marginBottom: isMobile ? 0 : 4, display: isMobile ? 'none' : undefined }}>→</span>
            <div style={{ width: isMobile ? '100%' : undefined }}>
              <label style={S.label}>结束日期</label>
              <input type="date" value={newEvent.endDate} onChange={e => setNewEvent(p => ({ ...p, endDate: e.target.value }))} style={{ ...S.input, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 16 : S.input.fontSize }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: INK.textSecondary, cursor: 'pointer', alignSelf: isMobile ? 'auto' : 'flex-end', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
              <input type="checkbox" checked={newEvent.isActive} onChange={e => setNewEvent(p => ({ ...p, isActive: e.target.checked }))} /> 启用
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button onClick={addEvent} style={{ ...S.btnPrimary, flex: isMobile ? '1 1 140px' : undefined }}><Plus size={12} /> 确认添加</button>
            <button onClick={() => setShowAddForm(false)} style={{ ...S.btnPrimary, flex: isMobile ? '1 1 100px' : undefined, background: 'rgba(107,103,96,0.15)', border: `1px solid ${INK.borderHover}`, color: INK.textMuted }}>取消</button>
          </div>
        </div>
      )}

      {config.limitedEvents.length === 0 && !showAddForm && (
        <div style={{ ...S.card, textAlign: 'center', color: INK.textMuted, fontSize: 13, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
          暂无限时活动，点击上方按钮添加
        </div>
      )}

      {config.limitedEvents.map(event => {
        const status = getEventStatus(event);
        const statusCfg = STATUS_CONFIG[status];
        const isEditing = editingId === event.id;
        const directionColor = event.direction === 'positive' ? INK.starGold : INK.flameCinnabar;
        const directionBg = event.direction === 'positive' ? INK.starGoldFaint : INK.flameFaint;
        const directionLabel = event.direction === 'positive' ? '正面' : '负面';

        return (
          <div key={event.id} style={{ ...S.card, marginBottom: 8, borderLeft: `3px ${statusCfg.borderStyle} ${statusCfg.borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : undefined, gap: isMobile ? 8 : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: INK.textPrimary, fontSize: 14, fontWeight: 500, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{event.name}</span>
                <span style={S.tag(directionBg, directionColor)}>{directionLabel}</span>
                <span style={S.badge(directionBg, directionColor)}>权重{event.weight}</span>
                <span style={S.tag(statusCfg.tagBg, statusCfg.tagFg)}>{statusCfg.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: INK.textSecondary, cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                  <input type="checkbox" checked={event.isActive} onChange={e => updateEvent(event.id, { isActive: e.target.checked })} /> 启用
                </label>
                <button onClick={() => setEditingId(isEditing ? null : event.id)} style={{ ...S.btnPrimary, padding: '2px 8px', fontSize: 11 }}>
                  {isEditing ? '收起' : '编辑'}
                </button>
                <button onClick={() => deleteEvent(event.id)} style={S.btnDanger}><Trash2 size={10} /></button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: INK.textMuted, marginTop: 4, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
              {event.startDate} ~ {event.endDate}
              {event.description && <span style={{ marginLeft: 8 }}>{event.description}</span>}
            </div>
            {isEditing && (
              <div style={{ marginTop: 8, borderTop: `1px solid ${INK.border}`, paddingTop: 8 }}>
                <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 10 : S.row.gap }}>
                  <div style={{ flex: 1, width: isMobile ? '100%' : undefined }}>
                    <label style={S.label}>活动名称</label>
                    <input value={event.name} onChange={e => updateEvent(event.id, { name: e.target.value })} style={S.input} />
                  </div>
                  <div style={{ width: isMobile ? '100%' : 120 }}>
                    <label style={S.label}>行为类别</label>
                    <select value={event.direction} onChange={e => updateEvent(event.id, { direction: e.target.value as 'positive' | 'negative' })} style={S.select}>
                      <option value="positive" style={INK_OPTION}>正面行为</option>
                      <option value="negative" style={INK_OPTION}>负面行为</option>
                    </select>
                  </div>
                  <div style={{ width: isMobile ? '100%' : 100 }}>
                    <label style={S.label}>权重</label>
                    <select value={event.weight} onChange={e => updateEvent(event.id, { weight: Number(e.target.value) as 1 | 2 | 3 })} style={S.select}>
                      <option value={1} style={INK_OPTION}>1 - {(event.direction === 'negative' ? config.negativeWeightNames : config.positiveWeightNames)[1]}</option>
                      <option value={2} style={INK_OPTION}>2 - {(event.direction === 'negative' ? config.negativeWeightNames : config.positiveWeightNames)[2]}</option>
                      <option value={3} style={INK_OPTION}>3 - {(event.direction === 'negative' ? config.negativeWeightNames : config.positiveWeightNames)[3]}</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={S.label}>描述</label>
                  <input value={event.description} onChange={e => updateEvent(event.id, { description: e.target.value })} style={S.input} />
                </div>
                <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 10 : S.row.gap }}>
                  <div style={{ width: isMobile ? '100%' : undefined }}>
                    <label style={S.label}>开始日期</label>
                    <input type="date" value={event.startDate} onChange={e => updateEvent(event.id, { startDate: e.target.value })} style={{ ...S.input, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 16 : S.input.fontSize }} />
                  </div>
                  <div style={{ width: isMobile ? '100%' : undefined }}>
                    <label style={S.label}>结束日期</label>
                    <input type="date" value={event.endDate} onChange={e => updateEvent(event.id, { endDate: e.target.value })} style={{ ...S.input, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 16 : S.input.fontSize }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== Students Tab =====
function StudentsTab({ students, updateStudent, addStudent, removeStudent, batchImportStudents, updateStudentNumber, config, updateConfig: _updateConfig }: { students: ReturnType<typeof useStudents>['students']; updateStudent: ReturnType<typeof useStudents>['updateStudent']; addStudent: ReturnType<typeof useStudents>['addStudent']; removeStudent: ReturnType<typeof useStudents>['removeStudent']; batchImportStudents: ReturnType<typeof useStudents>['batchImportStudents']; updateStudentNumber: ReturnType<typeof useStudents>['updateStudentNumber']; config: ReturnType<typeof useConfig>; updateConfig: (fn: (prev: typeof config) => typeof config) => void }) {
  const [newStudentName, setNewStudentName] = useState('');
  const [batchImport, setBatchImport] = useState('');
  const [showBatchImport, setShowBatchImport] = useState(false);
  const { showToast } = useToast();

  const sortedStudents = [...students].sort((a, b) => a.number - b.number);

  const handleAddStudent = () => {
    const name = newStudentName.trim();
    if (!name) return;
    addStudent(name);
    setNewStudentName('');
    showToast(`已添加学生 ${name}`);
  };

  const handleRemoveStudent = (id: string, name: string) => {
    if (window.confirm(`确定删除学生"${name}"？相关行为记录也将被删除。`)) {
      removeStudent(id);
      showToast(`已删除学生 ${name}`);
    }
  };

  const handleBatchImport = () => {
    const lines = batchImport.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return;
    const result = batchImportStudents(lines);
    showToast(`成功导入 ${result.added} 名学生${result.skipped > 0 ? `，跳过 ${result.skipped} 名` : ''}`);
    setBatchImport('');
    setShowBatchImport(false);
  };

  return (
    <div>
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
          当前学生: {sortedStudents.length} 人
        </div>
        <div style={S.row}>
          <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="新学生姓名" style={{ ...S.input, width: 200 }} onKeyDown={e => e.key === 'Enter' && handleAddStudent()} />
          <button onClick={handleAddStudent} style={S.btnPrimary}><Plus size={12} /> 添加学生</button>
          <button onClick={() => setShowBatchImport(!showBatchImport)} style={{ ...S.btnPrimary, background: 'rgba(107,103,96,0.15)', border: `1px solid ${INK.borderHover}`, color: INK.textMuted }}>
            批量导入
          </button>
        </div>
        {showBatchImport && (
          <div style={{ marginTop: 8 }}>
            <textarea value={batchImport} onChange={e => setBatchImport(e.target.value)} placeholder={'每行一个姓名，或"编号 姓名"'} rows={5} style={{ ...S.input, resize: 'vertical' }} />
            <button onClick={handleBatchImport} style={{ ...S.btnPrimary, marginTop: 4 }}>确认导入</button>
          </div>
        )}
      </div>

      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {sortedStudents.map(s => (
          <div key={s.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={s.number}
              onChange={e => {
                const n = parseInt(e.target.value);
                if (n > 0) updateStudentNumber(s.id, n);
              }}
              style={{ ...S.input, width: 48, padding: '4px 8px', fontSize: 12, textAlign: 'center' }}
            />
            <input value={s.name} onChange={e => updateStudent(s.id, prev => ({ ...prev, name: e.target.value }))} style={{ ...S.input, width: 120, padding: '4px 8px' }} />
            <span style={S.badge(s.cardSide === 'front' ? INK.starGoldFaint : 'rgba(212,122,40,0.12)', s.cardSide === 'front' ? INK.starGold : INK.flameEmber)}>
              {s.cardSide === 'front' ? '正面' : '背面'} Lv.{s.currentLevel}
            </span>
            <button onClick={() => handleRemoveStudent(s.id, s.name)} style={{ padding: '2px 6px', borderRadius: D.radiusSm, background: INK.flameFaint, border: `1px solid rgba(196,65,37,0.2)`, color: INK.flameCinnabar, cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}><Trash2 size={11} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Committee Name Input =====
function CommitteeNameInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState('');
  const isMobile = useMobile();
  const handleAdd = () => {
    const name = value.trim();
    if (!name) return;
    onAdd(name);
    setValue('');
  };
  return (
    <div style={{ display: 'flex', gap: 6, width: isMobile ? '100%' : undefined }}>
      <input value={value} onChange={e => setValue(e.target.value)} placeholder="添加记录人" style={{ ...S.input, width: isMobile ? '100%' : 90, padding: isMobile ? '9px 10px' : '4px 8px', fontSize: isMobile ? 14 : 12 }} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
      <button onClick={handleAdd} style={{ ...S.btnPrimary, padding: isMobile ? '8px 12px' : '4px 8px', fontSize: isMobile ? 12 : 11, flexShrink: 0 }}><Plus size={10} /></button>
    </div>
  );
}

// ===== Time Period Input =====
function TimePeriodInput({ onAdd }: { onAdd: (name: string, group: 'course' | 'other') => void }) {
  const [value, setValue] = useState('');
  const [group, setGroup] = useState<'course' | 'other'>('course');
  const isMobile = useMobile();
  const handleAdd = () => {
    const name = value.trim();
    if (!name) return;
    onAdd(name, group);
    setValue('');
    setGroup('course');
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '100px 72px auto', gap: 6, alignItems: 'center', width: '100%', marginTop: 8 }}>
      <input value={value} onChange={e => setValue(e.target.value)} placeholder="时间段名" style={{ ...S.input, width: '100%', padding: isMobile ? '9px 10px' : '4px 8px', fontSize: isMobile ? 14 : 12 }} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
      <select value={group} onChange={e => setGroup(e.target.value as any)} style={{ ...S.input, width: '100%', padding: isMobile ? '9px 10px' : '4px 4px', fontSize: isMobile ? 14 : 11, fontFamily: "'LXGW WenKai','Cinzel',serif" }}>
        <option value="course">学科课程</option>
        <option value="other">其他时段</option>
      </select>
      <button onClick={handleAdd} style={{ ...S.btnPrimary, padding: isMobile ? '8px 12px' : '4px 8px', fontSize: isMobile ? 12 : 11 }}><Plus size={10} /></button>
    </div>
  );
}

// ===== System Tab =====
function DataAuditSection() {
  const { students, records, updateStudent, updateBehaviorRecord } = useStudents();
  const config = useConfig();
  const { showToast } = useToast();
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runAudit = () => {
    setIsAuditing(true);
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const result = recomputeAllStudents(students, records, config);
        setAuditResult(result);
        if (result.studentsWithIssues === 0) {
          showToast('数据校验通过！所有学生状态与行为记录完全一致');
        } else {
          showToast(`发现 ${result.studentsWithIssues} 名学生数据不一致`);
        }
      } catch (e: any) {
        showToast(`校验出错: ${e.message}`);
      }
      setIsAuditing(false);
    }, 50);
  };

  const fixAll = () => {
    if (!auditResult) return;
    setIsFixing(true);
    setTimeout(() => {
      let fixedStudents = 0;
      let fixedRecords = 0;
      // Fix student states
      for (const [studentId, corrections] of auditResult.correctedStudents) {
        updateStudent(studentId, (s: any) => ({ ...s, ...corrections }));
        fixedStudents++;
      }
      // Fix record shieldsConsumed
      for (const [recordId, correction] of auditResult.recordCorrections) {
        updateBehaviorRecord(recordId, (r) => ({ ...r, shieldsConsumed: correction.shieldsConsumed }));
        fixedRecords++;
      }
      showToast(`已修正 ${fixedStudents} 名学生、${fixedRecords} 条记录`);
      setAuditResult(null);
      setIsFixing(false);
    }, 100);
  };

  // Group discrepancies by student
  const groupedDiscrepancies = auditResult
    ? auditResult.discrepancies.reduce((acc, d) => {
        if (!acc[d.studentId]) {
          acc[d.studentId] = { name: d.studentName, number: d.studentNumber, items: [] };
        }
        acc[d.studentId].items.push(d);
        return acc;
      }, {} as Record<string, { name: string; number: number; items: typeof auditResult.discrepancies }>)
    : {};

  return (
    <div style={{ ...S.card, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, fontFamily: "'LXGW WenKai', 'Cinzel', serif", display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={14} style={{ color: INK.starGold }} /> 数据校验
          </div>
          <p style={{ color: INK.textMuted, fontSize: 11, marginTop: 2, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
            将行为记录逐条重放，验证学生状态是否与历史一致
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={runAudit}
            disabled={isAuditing}
            style={{
              ...S.btnPrimary, padding: '6px 14px', fontSize: 12,
              background: isAuditing ? 'transparent' : 'rgba(123,139,181,0.12)',
              color: isAuditing ? INK.textMuted : INK.starBlue,
              border: `1px solid rgba(123,139,181,0.3)`,
            }}
          >
            <RefreshCw size={12} style={{ animation: isAuditing ? 'spin 1s linear infinite' : 'none' }} /> {isAuditing ? '校验中...' : '开始校验'}
          </button>
          {auditResult && auditResult.studentsWithIssues > 0 && (
            <button
              onClick={fixAll}
              disabled={isFixing}
              style={{
                ...S.btnPrimary, padding: '6px 14px', fontSize: 12,
                background: 'rgba(212,168,83,0.15)',
                color: D.gold,
                border: `1px solid rgba(212,168,83,0.3)`,
              }}
            >
              <CheckCircle2 size={12} /> {isFixing ? '修正中...' : `一键修正 (${auditResult.studentsWithIssues}人)`}
            </button>
          )}
        </div>
      </div>

      {/* Result summary */}
      {auditResult && (
        <div style={{
          padding: 12, borderRadius: D.radiusXs, marginBottom: 12,
          background: auditResult.studentsWithIssues === 0
            ? 'rgba(139,170,122,0.08)'
            : 'rgba(196,65,37,0.06)',
          border: `1px solid ${auditResult.studentsWithIssues === 0 ? 'rgba(139,170,122,0.2)' : 'rgba(196,65,37,0.15)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {auditResult.studentsWithIssues === 0 ? (
              <CheckCircle2 size={16} style={{ color: D.success }} />
            ) : (
              <AlertTriangle size={16} style={{ color: D.cinnabar }} />
            )}
            <span style={{ fontSize: 13, fontWeight: 600, color: auditResult.studentsWithIssues === 0 ? D.success : D.cinnabar, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
              {auditResult.studentsWithIssues === 0
                ? '全部一致'
                : `${auditResult.studentsWithIssues} 名学生存在差异（共 ${auditResult.discrepancies.length} 项）`}
            </span>
          </div>
          <div style={{ fontSize: 11, color: INK.textMuted }}>
            处理 {auditResult.totalRecords} 条记录 · {auditResult.totalStudents} 名学生
          </div>
        </div>
      )}

      {/* Detail toggle */}
      {auditResult && auditResult.studentsWithIssues > 0 && (
        <>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '4px 12px', borderRadius: D.radiusXs, fontSize: 11, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${INK.border}`,
              color: INK.textSecondary, marginBottom: 8,
            }}
          >
            {showDetails ? '收起详情' : '展开详情'}
          </button>

          {showDetails && (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {Object.entries(groupedDiscrepancies).map(([studentId, group]) => (
                <div key={studentId} style={{
                  marginBottom: 8, padding: '10px 14px',
                  borderRadius: D.radiusXs, background: D.bgGlass,
                  border: `1px solid ${INK.border}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                    #{group.number} {group.name}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {group.items.map((item, i) => (
                      <span key={i} style={{
                        padding: '3px 8px', borderRadius: D.radiusXs, fontSize: 11,
                        background: 'rgba(196,65,37,0.08)',
                        border: '1px solid rgba(196,65,37,0.15)',
                        color: D.cinnabar,
                      }}>
                        {item.label}: <span style={{ fontWeight: 600 }}>{item.actual}</span> → <span style={{ color: D.gold }}>{item.simulated}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SystemTab({ config, updateConfig }: { config: ReturnType<typeof useConfig>; updateConfig: (fn: (prev: typeof config) => typeof config) => void }) {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const { showToast } = useToast();
  const isMobile = useMobile();
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('app_zoom');
    return saved ? parseFloat(saved) : 1;
  });

  const handleZoomChange = (val: number) => {
    const clamped = Math.max(1, Math.min(1.5, val));
    setZoom(clamped);
    localStorage.setItem('app_zoom', String(clamped));
    window.dispatchEvent(new Event('zoom-changed'));
  };

  // ===== Data Export =====
  const handleExport = () => {
    const exportData = {
      _version: 1,
      _exportDate: new Date().toISOString(),
      students: JSON.parse(localStorage.getItem('students') || '[]'),
      behaviorRecords: JSON.parse(localStorage.getItem('behavior-records') || '[]'),
      appConfig: JSON.parse(localStorage.getItem('app-config') || '{}'),
      appZoom: localStorage.getItem('app_zoom'),
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `星火燎原_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出');
  };

  // ===== Data Import =====
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data._version || !data.students) {
          showToast('文件格式不正确，请选择正确的导出文件');
          return;
        }
        if (!window.confirm('导入将覆盖当前所有数据（学生、记录、设置），确定继续？')) return;
        localStorage.setItem('students', JSON.stringify(data.students));
        localStorage.setItem('behavior-records', JSON.stringify(data.behaviorRecords || []));
        if (data.appConfig) localStorage.setItem('app-config', JSON.stringify(data.appConfig));
        if (data.appZoom) localStorage.setItem('app_zoom', data.appZoom);
        showToast('数据已导入，页面即将刷新');
        setTimeout(() => window.location.reload(), 800);
      } catch {
        showToast('导入失败，文件可能已损坏');
      }
    };
    input.click();
  };

  return (
    <div>
      {/* Data Export / Import */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>数据导出 / 导入</div>
        <div style={{ fontSize: 11, color: INK.textMuted, marginBottom: 10, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
          导出当前全部数据（学生、记录、设置）为文件，可在其他设备导入恢复
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={{ ...S.btnPrimary, flex: isMobile ? '1 1 140px' : undefined }}><Download size={13} /> 导出数据</button>
          <button onClick={handleImport} style={{ ...S.btnPrimary, flex: isMobile ? '1 1 140px' : undefined, background: 'rgba(107,103,96,0.15)', border: `1px solid ${INK.borderHover}`, color: INK.textMuted }}><Upload size={13} /> 导入数据</button>
        </div>
      </div>

      {/* Basic parameters */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>基础参数</div>
        <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 8 : S.row.gap }}>
          <div style={{ width: isMobile ? '100%' : 150 }}>
            <label style={S.label}>护盾抵消比例</label>
            <input type="number" value={config.shieldOffsetRatio} onChange={e => updateConfig(prev => ({ ...prev, shieldOffsetRatio: Number(e.target.value) }))} style={{ ...S.input, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 16 : S.input.fontSize }} />
          </div>
          <span style={{ color: INK.textMuted, fontSize: 12, lineHeight: 1.6, alignSelf: isMobile ? 'auto' : 'flex-end', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{config.shieldOffsetRatio}个护盾抵消1个{config.blankMarkName}</span>
        </div>
        <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 8 : S.row.gap }}>
          <div style={{ width: isMobile ? '100%' : 150 }}>
            <label style={S.label}>自主选座排名上限</label>
            <input type="number" value={config.chooseThreshold} onChange={e => updateConfig(prev => ({ ...prev, chooseThreshold: Number(e.target.value) }))} style={{ ...S.input, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 16 : S.input.fontSize }} />
          </div>
          <span style={{ color: INK.textMuted, fontSize: 12, lineHeight: 1.6, alignSelf: isMobile ? 'auto' : 'flex-end', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>排名 1-{config.chooseThreshold} 可自主选座</span>
        </div>
        <div style={{ ...S.row, flexDirection: isMobile ? 'column' : undefined, alignItems: isMobile ? 'stretch' : S.row.alignItems, gap: isMobile ? 10 : S.row.gap }}>
          <div style={{ width: isMobile ? '100%' : 100 }}>
            <label style={S.label}>正面标记名</label>
            <input value={config.blankMarkName} onChange={e => updateConfig(prev => ({ ...prev, blankMarkName: e.target.value }))} style={{ ...S.input, minHeight: isMobile ? 42 : undefined }} />
          </div>
          <div style={{ width: isMobile ? '100%' : 100 }}>
            <label style={S.label}>背面标记名</label>
            <input value={config.checkMarkName} onChange={e => updateConfig(prev => ({ ...prev, checkMarkName: e.target.value }))} style={{ ...S.input, minHeight: isMobile ? 42 : undefined }} />
          </div>
        </div>
      </div>

      {/* Committee names / Recorders */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>记录人名单</div>
        <div style={{ fontSize: 11, color: INK.textMuted, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>行为录入时必须选择记录人，支持班主任和班委</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {(config.committeeNames ?? ['王老师']).map((name, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: D.radiusXs, background: `${INK.starGold}15`, border: `1px solid ${INK.starGold}33`, color: INK.starGold, fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
              {name}
              <button onClick={() => updateConfig(prev => ({ ...prev, committeeNames: (prev.committeeNames ?? ['王老师']).filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: INK.starGold, cursor: 'pointer', padding: 0, opacity: 0.6 }}><X size={10} /></button>
            </span>
          ))}
          <CommitteeNameInput onAdd={(name) => updateConfig(prev => ({ ...prev, committeeNames: [...(prev.committeeNames ?? ['王老师']), name] }))} />
        </div>
      </div>

      {/* Time period management */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>行为时间段</div>
        <div style={{ fontSize: 11, color: INK.textMuted, marginBottom: 10, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>配置行为发生的时间段。分组决定录入页面中的展示位置。在行为设置中可为单个行为开启"需选择时间"</div>
        {(() => {
          const courses = (config.timePeriods ?? []).filter(tp => tp.group !== 'other');
          const others = (config.timePeriods ?? []).filter(tp => tp.group === 'other');
          return (
            <>
              <div style={{ fontSize: 10, color: INK.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>📚 学科课程</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                {courses.map((tp, i) => (
                  <span key={tp.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: D.radiusXs, background: `${INK.starGold}15`, border: `1px solid ${INK.starGold}33`, color: INK.starGold, fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                    {tp.name}
                    <button title="移到其他时段" onClick={() => updateConfig(prev => ({
                      ...prev,
                      timePeriods: prev.timePeriods.map(t => t.id === tp.id ? { ...t, group: 'other' as const } : t)
                    }))} style={{ background: 'none', border: 'none', color: INK.textSecondary, cursor: 'pointer', padding: 0, opacity: 0.5, fontSize: 10 }}>→</button>
                    <button onClick={() => updateConfig(prev => ({ ...prev, timePeriods: prev.timePeriods.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: INK.starGold, cursor: 'pointer', padding: 0, opacity: 0.6 }}><X size={10} /></button>
                  </span>
                ))}
                {(config.timePeriods ?? []).length === 0 && <span style={{ fontSize: 11, color: INK.textMuted }}>暂无</span>}
              </div>
              <div style={{ fontSize: 10, color: INK.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>📋 其他时段</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                {others.map((tp, i) => (
                  <span key={tp.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: D.radiusXs, background: `${INK.starBlue}15`, border: `1px solid ${INK.starBlue}33`, color: INK.starBlue, fontSize: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                    {tp.name}
                    <button title="移到学科课程" onClick={() => updateConfig(prev => ({
                      ...prev,
                      timePeriods: prev.timePeriods.map(t => t.id === tp.id ? { ...t, group: 'course' as const } : t)
                    }))} style={{ background: 'none', border: 'none', color: INK.textSecondary, cursor: 'pointer', padding: 0, opacity: 0.5, fontSize: 10 }}>←</button>
                    <button onClick={() => updateConfig(prev => ({ ...prev, timePeriods: prev.timePeriods.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: INK.starBlue, cursor: 'pointer', padding: 0, opacity: 0.6 }}><X size={10} /></button>
                  </span>
                ))}
                {others.length === 0 && <span style={{ fontSize: 11, color: INK.textMuted }}>暂无</span>}
              </div>
              <TimePeriodInput onAdd={(name, group) => updateConfig(prev => ({ ...prev, timePeriods: [...prev.timePeriods, { id: `tp-${Date.now()}`, name, group }] }))} />
            </>
          );
        })()}
      </div>

      {/* Parent Portal Deployment */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>📱 家长端部署</div>
        <div style={{ fontSize: 11, color: INK.textMuted, marginBottom: 10, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
          构建一个包含当前数据的只读版本，部署到 Gitee Pages，家长即可通过域名访问。
        </div>
        <div style={{ padding: '10px 14px', borderRadius: D.radiusSm, background: 'rgba(0,0,0,0.2)', border: `1px solid ${INK.border}`, fontFamily: 'Consolas, monospace, sans-serif', fontSize: isMobile ? 11 : 12, color: '#a0d0a0', marginBottom: 10, overflowWrap: 'anywhere' }}>
          node scripts/build-parent.cjs --push
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : undefined }}>
          <button
            onClick={() => {
              navigator.clipboard.writeText('node scripts/build-parent.cjs --push');
              showToast('已复制命令，在项目文件夹终端中粘贴运行');
            }}
            style={{
              padding: '6px 14px', borderRadius: D.radiusSm, fontSize: 12, cursor: 'pointer',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              background: `${INK.starGold}15`, border: `1px solid ${INK.starGold}33`,
              color: INK.starGold,
            }}
          >
            📋 复制命令
          </button>
          <span style={{ fontSize: 11, color: INK.textMuted, lineHeight: 1.6 }}>
            在「星辰与火焰v4」文件夹打开终端，粘贴运行
          </span>
        </div>
        <div style={{ fontSize: 10, color: INK.textMuted, marginTop: 8, lineHeight: 1.5 }}>
          首次使用需先配置 Gitee 仓库（见下方说明）。之后每次更新数据，点击复制→粘贴运行即可。
        </div>
      </div>

      {/* Display settings */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>界面缩放</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={100}
            max={150}
            step={5}
            value={zoom * 100}
            onChange={e => handleZoomChange(Number(e.target.value) / 100)}
            style={{ flex: 1, accentColor: INK.starGold }}
          />
          <span style={{ fontSize: 13, color: INK.textSecondary, minWidth: 40, textAlign: 'right', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <div style={{ fontSize: 11, color: INK.textMuted, marginTop: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
          调整全局界面大小，100%~150%
        </div>
      </div>

      {/* Auto rules */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : undefined, gap: isMobile ? 10 : undefined, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>自动触发规则</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => {
              if (!window.confirm('将重新结算上周的自动规则。已有的结算记录不会重复添加（系统会自动跳过）。确定？')) return;
              localStorage.setItem('app_last_week_settle', '0');
              showToast('已重置结算标记，下次进入仪表盘将自动结算上周');
            }} style={{ ...S.btnPrimary, flex: isMobile ? '1 1 140px' : undefined, padding: '4px 10px', fontSize: 11, background: 'rgba(123,139,181,0.15)', color: INK.starBlue, border: `1px solid rgba(123,139,181,0.3)` }}>重新结算上周</button>
            <button onClick={() => {
              const newRule = {
                id: `ar-custom-${Date.now()}`,
                name: '新规则',
                triggerCondition: { type: 'weekly_no_behavior' as const, behaviorId: '' },
                effectType: 'shieldAndEmber' as const,
                effectAmount: 1,
                isActive: true,
              };
              updateConfig(prev => ({ ...prev, autoRules: [...prev.autoRules, newRule] }));
              setEditingRuleId(newRule.id);
              showToast('已添加新规则');
            }} style={{ ...S.btnPrimary, flex: isMobile ? '1 1 120px' : undefined }}><Plus size={12} /> 新增规则</button>
          </div>
        </div>
        {config.autoRules.map(rule => {
          const isEditing = editingRuleId === rule.id;
          const trigger = rule.triggerCondition;
          const allBehaviors = [...config.negativeBehaviors, ...config.positiveBehaviors];
          const triggerTypeLabels: Record<string, string> = {
            'weekly_no_behavior': '一周内无某行为',
            'weekly_behavior_count': '一周内某行为达X次',
          };
          const effectTypeLabels: Record<string, string> = {
            'shieldAndEmber': '护盾/火种（按正反面）',
            'blankAndHeartDemon': '星蚀/心魔（按正反面）',
          };
          const isPenalty = rule.effectType === 'blankAndHeartDemon';
          return (
            <div key={rule.id} style={{ ...S.card, marginBottom: 8, background: D.bgGlass, borderLeft: rule.isActive ? (isPenalty ? `3px solid ${INK.flameCinnabar}` : `3px solid #8baa7a`) : `3px solid ${INK.textMuted}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: INK.textPrimary, fontSize: 13, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{rule.name}</span>
                  <div style={{ fontSize: 10, color: INK.textMuted, marginTop: 2, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                    {triggerTypeLabels[trigger.type] || trigger.type}
                    {trigger.behaviorId ? ` · ${allBehaviors.find(b => b.id === trigger.behaviorId)?.name || trigger.behaviorId}` : ' · 任何负面行为'}
                    {trigger.threshold && ` · 达${trigger.threshold}次`}
                    {' → '}{effectTypeLabels[rule.effectType] || rule.effectType} +{rule.effectAmount}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: INK.textSecondary, cursor: 'pointer', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>
                    <input type="checkbox" checked={rule.isActive} onChange={e => updateConfig(prev => ({
                      ...prev,
                      autoRules: prev.autoRules.map(r => r.id === rule.id ? { ...r, isActive: e.target.checked } : r),
                    }))} /> 启用
                  </label>
                  <button onClick={() => setEditingRuleId(isEditing ? null : rule.id)} style={{ ...S.btnPrimary, padding: '2px 8px', fontSize: 11 }}>
                    {isEditing ? '收起' : '编辑'}
                  </button>
                  <button onClick={() => {
                    if (!window.confirm('确定删除此规则？')) return;
                    updateConfig(prev => ({ ...prev, autoRules: prev.autoRules.filter(r => r.id !== rule.id) }));
                    if (isEditing) setEditingRuleId(null);
                    showToast('已删除规则');
                  }} style={S.btnDanger}><Trash2 size={10} /></button>
                </div>
              </div>
              {isEditing && (
                <div style={{ marginTop: 8, borderTop: `1px solid ${INK.border}`, paddingTop: 8 }}>
                  <div style={S.row}>
                    <div style={{ flex: 1 }}>
                      <label style={S.label}>规则名称</label>
                      <input value={rule.name} onChange={e => updateConfig(prev => ({
                        ...prev, autoRules: prev.autoRules.map(r => r.id === rule.id ? { ...r, name: e.target.value } : r),
                      }))} style={S.input} />
                    </div>
                  </div>
                  <div style={S.row}>
                    <div style={{ width: 180 }}>
                      <label style={S.label}>触发条件</label>
                      <select value={trigger.type} onChange={e => {
                        const newType = e.target.value as typeof trigger.type;
                        const newCondition: any = { type: newType };
                        if (newType === 'weekly_behavior_count') {
                          newCondition.behaviorId = allBehaviors[0]?.id;
                          newCondition.threshold = 3;
                          newCondition.period = 'week';
                        } else if (newType === 'weekly_no_behavior') {
                          newCondition.behaviorId = '';
                        }
                        updateConfig(prev => ({
                          ...prev, autoRules: prev.autoRules.map(r => r.id === rule.id ? { ...r, triggerCondition: newCondition } : r),
                        }));
                      }} style={S.select}>
                        <option value="weekly_no_behavior" style={INK_OPTION}>一周内无某行为</option>
                        <option value="weekly_behavior_count" style={INK_OPTION}>一周内某行为达X次</option>
                      </select>
                    </div>
                    {trigger.type === 'weekly_no_behavior' && (
                      <div style={{ flex: 1 }}>
                        <label style={S.label}>关联行为</label>
                        <select value={trigger.behaviorId || ''} onChange={e => updateConfig(prev => ({
                          ...prev, autoRules: prev.autoRules.map(r => r.id === rule.id ? { ...r, triggerCondition: { ...r.triggerCondition, behaviorId: e.target.value } } : r),
                        }))} style={S.select}>
                          <option value="" style={INK_OPTION}>任何负面行为</option>
                          {allBehaviors.map(b => <option key={b.id} value={b.id} style={INK_OPTION}>{b.direction === 'negative' ? '▽' : '✦'} {b.name}</option>)}
                        </select>
                      </div>
                    )}
                    {trigger.type === 'weekly_behavior_count' && (
                      <>
                        <div style={{ flex: 1 }}>
                          <label style={S.label}>关联行为</label>
                          <select value={trigger.behaviorId || ''} onChange={e => updateConfig(prev => ({
                            ...prev, autoRules: prev.autoRules.map(r => r.id === rule.id ? { ...r, triggerCondition: { ...r.triggerCondition, behaviorId: e.target.value } } : r),
                          }))} style={S.select}>
                            {allBehaviors.map(b => <option key={b.id} value={b.id} style={INK_OPTION}>{b.direction === 'negative' ? '▽' : '✦'} {b.name}</option>)}
                          </select>
                        </div>
                        <div style={{ width: 80 }}>
                          <label style={S.label}>阈值</label>
                          <input type="number" value={trigger.threshold ?? 3} onChange={e => updateConfig(prev => ({
                            ...prev, autoRules: prev.autoRules.map(r => r.id === rule.id ? { ...r, triggerCondition: { ...r.triggerCondition, threshold: Number(e.target.value) } } : r),
                          }))} style={S.input} />
                        </div>
                      </>
                    )}
                  </div>
                  <div style={S.row}>
                    <div style={{ width: 200 }}>
                      <label style={S.label}>效果类型</label>
                      <select value={rule.effectType} onChange={e => updateConfig(prev => ({
                        ...prev, autoRules: prev.autoRules.map(r => r.id === rule.id ? { ...r, effectType: e.target.value as 'shieldAndEmber' | 'blankAndHeartDemon' } : r),
                      }))} style={S.select}>
                        <option value="shieldAndEmber" style={INK_OPTION}>护盾/火种（按正反面）</option>
                        <option value="blankAndHeartDemon" style={INK_OPTION}>星蚀/心魔（按正反面）</option>
                      </select>
                    </div>
                    <div style={{ width: 100 }}>
                      <label style={S.label}>{rule.effectType === 'blankAndHeartDemon' ? '星蚀数量（心魔固定+1）' : '数量'}</label>
                      <input type="number" value={rule.effectAmount} onChange={e => updateConfig(prev => ({
                        ...prev, autoRules: prev.autoRules.map(r => r.id === rule.id ? { ...r, effectAmount: Number(e.target.value) } : r),
                      }))} style={S.input} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rise tasks */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>回升任务</div>
        {config.riseTasks.map(task => (
          <div key={`${task.side}-${task.level}`} style={{ ...S.row, marginBottom: 8 }}>
            <span style={{ color: INK.starGold, fontSize: 12, width: 80, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>Lv.{task.level} {task.name}</span>
            <div style={{ width: 80 }}>
              <label style={S.label}>所需天数</label>
              <input type="number" value={task.riseDaysRequired} onChange={e => updateConfig(prev => ({
                ...prev, riseTasks: prev.riseTasks.map(t => t.level === task.level && t.side === task.side ? { ...t, riseDaysRequired: Number(e.target.value) } : t),
              }))} style={S.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>任务</label>
              <input value={task.riseTask} onChange={e => updateConfig(prev => ({
                ...prev, riseTasks: prev.riseTasks.map(t => t.level === task.level && t.side === task.side ? { ...t, riseTask: e.target.value } : t),
              }))} style={S.input} />
            </div>
          </div>
        ))}
      </div>

      {/* 不朽晨辉·薪火传承 */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>不朽晨辉·薪火传承</div>
        <div style={S.row}>
          <div style={{ width: 150 }}>
            <label style={S.label}>心魔降级阈值</label>
            <input type="number" value={config.immortalDemotionThreshold} onChange={e => updateConfig(prev => ({ ...prev, immortalDemotionThreshold: Number(e.target.value) }))} style={S.input} />
          </div>
          <span style={{ color: INK.textMuted, fontSize: 12, alignSelf: 'flex-end', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>心魔≥{config.immortalDemotionThreshold}时降级到熔炉之心</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: INK.textSecondary, marginTop: 12, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>传承值称号</div>
        {config.immortalTitles.map((title, idx) => (
          <div key={idx} style={S.row}>
            <div style={{ width: 80 }}>
              <label style={S.label}>传承值</label>
              <input type="number" value={title.heritageRequired} onChange={e => updateConfig(prev => ({
                ...prev,
                immortalTitles: prev.immortalTitles.map((t, i) => i === idx ? { ...t, heritageRequired: Number(e.target.value) } : t),
              }))} style={S.input} />
            </div>
            <div style={{ width: 100 }}>
              <label style={S.label}>称号</label>
              <input value={title.name} onChange={e => updateConfig(prev => ({
                ...prev,
                immortalTitles: prev.immortalTitles.map((t, i) => i === idx ? { ...t, name: e.target.value } : t),
              }))} style={S.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>描述</label>
              <input value={title.description} onChange={e => updateConfig(prev => ({
                ...prev,
                immortalTitles: prev.immortalTitles.map((t, i) => i === idx ? { ...t, description: e.target.value } : t),
              }))} style={S.input} />
            </div>
            <button onClick={() => updateConfig(prev => ({
              ...prev,
              immortalTitles: prev.immortalTitles.filter((_, i) => i !== idx),
            }))} style={{ ...S.btnDanger, alignSelf: 'flex-end' }}><Trash2 size={10} /></button>
          </div>
        ))}
        <button onClick={() => updateConfig(prev => ({
          ...prev,
          immortalTitles: [...prev.immortalTitles, { heritageRequired: prev.immortalTitles.length > 0 ? prev.immortalTitles[prev.immortalTitles.length - 1].heritageRequired + 10 : 3, name: '新称号', description: '描述' }],
        }))} style={{ ...S.btnPrimary, padding: '4px 10px', fontSize: 12, marginTop: 4 }}><Plus size={10} /> 添加称号</button>
      </div>

      {/* Level one titles */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>星辉典范进阶称号</div>
        {config.levelOneTitles.map((title, idx) => (
          <LevelOneTitleRow key={idx} idx={idx} title={title} totalWeeks={config.teachingWeeks.length} updateConfig={updateConfig} />
        ))}
      </div>

      {/* Seat priority map */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK.textPrimary, marginBottom: 12, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>座位优先级排名</div>
        <p style={{ color: INK.textMuted, fontSize: 12, marginBottom: 8, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>排名越小优先级越高，1-{config.chooseThreshold}可自主选座</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {Object.entries(config.seatPriorityMap).sort(([,a],[,b]) => a - b).map(([key, priority]) => {
            const [side, level] = key.split('-');
            const levelName = side === 'front' ? config.frontLevels[Number(level)-1]?.name : config.backLevels[Number(level)-1]?.name;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: D.radiusXs, background: 'rgba(15,23,42,0.5)', border: `1px solid ${INK.border}` }}>
                <span style={{ color: side === 'front' ? INK.starGold : INK.flameEmber, fontSize: 11, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{side === 'front' ? '正' : '背'}</span>
                <span style={{ color: INK.textPrimary, fontSize: 11, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>{levelName}</span>
                <span style={{ color: INK.textSecondary, fontSize: 10, marginLeft: 'auto', fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>#{priority}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Audit */}
      <DataAuditSection />
    </div>
  );
}
