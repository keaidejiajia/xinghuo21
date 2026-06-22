import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Eye, Monitor, RefreshCw, Smartphone, Users } from 'lucide-react';
import type { ParentAccessData, ParentAccessDailyEntry } from '../types';
import { useStudents } from '../lib/store';
import { getParentAccessDailySummary } from '../lib/parentAccess';
import { useMobile } from '../hooks/useMobile';
import { D, INK } from '../data/theme';

function toLocalDateStr(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalDateStr(date);
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DeviceTag({ device }: { device: ParentAccessDailyEntry['lastDevice'] }) {
  const Icon = device === 'mobile' ? Smartphone : Monitor;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: device === 'mobile' ? D.gold : D.blue, background: device === 'mobile' ? D.goldDim : D.blueDim, borderRadius: D.radiusXs, padding: '2px 6px' }}>
      <Icon size={11} /> {device === 'mobile' ? '手机' : '电脑'}
    </span>
  );
}

export default function ParentAccessPage() {
  const { students } = useStudents();
  const isMobile = useMobile();
  const [data, setData] = useState<ParentAccessData>({ entries: [] });
  const [range, setRange] = useState<'today' | 'week'>('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const today = toLocalDateStr();
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => dateOffset(index)), []);

  const loadAccessData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/parent-access?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      setData({
        entries: Array.isArray(payload.entries) ? payload.entries : [],
        updatedAt: payload.updatedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法读取家长访问记录');
      setData({ entries: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccessData();
    const timer = window.setInterval(() => void loadAccessData(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadAccessData]);

  const todaySummary = useMemo(
    () => getParentAccessDailySummary(data, students, today),
    [data, students, today],
  );

  const weekEntries = useMemo(
    () => data.entries.filter(entry => weekDates.includes(entry.date)),
    [data.entries, weekDates],
  );

  const weekVisitedIds = useMemo(() => new Set(weekEntries.map(entry => entry.studentId)), [weekEntries]);
  const weekUnvisited = useMemo(
    () => [...students].sort((a, b) => a.number - b.number).filter(student => !weekVisitedIds.has(student.id)),
    [students, weekVisitedIds],
  );

  const activeEntries = range === 'today' ? todaySummary.visited : weekEntries;
  const visitedCount = range === 'today' ? todaySummary.visited.length : weekVisitedIds.size;
  const unvisitedCount = range === 'today' ? todaySummary.unvisited.length : weekUnvisited.length;
  const totalViews = activeEntries.reduce((sum, entry) => sum + entry.viewCount, 0);
  const totalLogins = activeEntries.reduce((sum, entry) => sum + entry.loginCount, 0);

  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, ParentAccessDailyEntry[]>();
    for (const entry of weekEntries) {
      if (!grouped.has(entry.date)) grouped.set(entry.date, []);
      grouped.get(entry.date)!.push(entry);
    }
    return weekDates.map(date => ({
      date,
      entries: (grouped.get(date) ?? []).sort((a, b) => b.lastAccessAt.localeCompare(a.lastAccessAt)),
    }));
  }, [weekDates, weekEntries]);

  const renderEntryCard = (entry: ParentAccessDailyEntry) => {
    const student = students.find(item => item.id === entry.studentId);
    return (
      <div key={entry.id} style={{
        padding: isMobile ? 12 : '10px 12px',
        borderRadius: D.radiusSm,
        background: D.bgCard,
        border: `1px solid ${D.border}`,
        display: 'grid',
        gap: 7,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div className="student-name" style={{ fontSize: 14, fontWeight: 700, color: D.text, lineHeight: 1.35 }}>
              #{student?.number ?? '?'} {student?.name ?? entry.parentName.replace(/家长$/, '')}
            </div>
            <div style={{ fontSize: 12, color: D.textMid, marginTop: 2 }}>{entry.parentName}</div>
          </div>
          <DeviceTag device={entry.lastDevice} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, color: D.gold, background: D.goldDim, borderRadius: D.radiusXs, padding: '2px 6px' }}>登录 {entry.loginCount}</span>
          <span style={{ fontSize: 11, color: D.blue, background: D.blueDim, borderRadius: D.radiusXs, padding: '2px 6px' }}>查看 {entry.viewCount}</span>
          <span style={{ fontSize: 11, color: D.textDim, background: 'rgba(255,255,255,0.04)', borderRadius: D.radiusXs, padding: '2px 6px' }}>最近 {formatTime(entry.lastAccessAt)}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: isMobile ? 12 : 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Eye size={20} style={{ color: D.gold }} />
            <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 24, color: D.text, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}>家长关注</h2>
          </div>
          <div style={{ fontSize: 13, color: D.textDim }}>统计家长登录与查看孩子个人卡片的情况</div>
        </div>
        <button
          type="button"
          onClick={() => void loadAccessData()}
          disabled={loading}
          style={{ height: 38, padding: '0 14px', borderRadius: D.radiusXs, border: `1px solid ${D.borderGlow}`, background: D.goldDim, color: D.gold, cursor: loading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: "'LXGW WenKai', 'Cinzel', serif" }}
        >
          <RefreshCw size={14} /> {loading ? '刷新中' : '刷新'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'today' as const, label: '今日' },
          { key: 'week' as const, label: '近7日' },
        ].map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setRange(item.key)}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: D.radiusXs,
              border: `1px solid ${range === item.key ? D.borderGlow : D.border}`,
              background: range === item.key ? D.goldDim : D.bgCard,
              color: range === item.key ? D.gold : D.textMid,
              cursor: 'pointer',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: D.radiusSm, border: '1px solid rgba(196,65,37,0.35)', background: D.cinnabarDim, color: D.cinnabar, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <AlertCircle size={16} /> 家长关注数据暂时无法读取：{error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        {[
          { label: '已访问', value: `${visitedCount}/${students.length}`, color: D.gold, icon: <Users size={15} /> },
          { label: '未访问', value: unvisitedCount, color: unvisitedCount > 0 ? D.cinnabar : D.success, icon: <AlertCircle size={15} /> },
          { label: '查看次数', value: totalViews, color: D.blue, icon: <Eye size={15} /> },
          { label: '登录次数', value: totalLogins, color: D.ember, icon: <Clock size={15} /> },
        ].map(item => (
          <div key={item.label} style={{ minHeight: 74, padding: 12, borderRadius: D.radiusSm, background: D.bgCard, border: `1px solid ${D.border}`, display: 'grid', alignContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: item.color, fontSize: 12 }}>{item.icon}{item.label}</div>
            <div style={{ fontSize: isMobile ? 22 : 26, color: item.color, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {range === 'today' ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) minmax(260px, 1fr)', gap: 12 }}>
          <section style={{ display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: D.text }}>今日已访问</h3>
            {todaySummary.visited.length === 0 ? (
              <div style={{ padding: 18, borderRadius: D.radiusSm, background: D.bgCard, border: `1px solid ${D.border}`, color: D.textDim, textAlign: 'center' }}>今天还没有家长访问记录</div>
            ) : todaySummary.visited.map(renderEntryCard)}
          </section>
          <section style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <h3 style={{ margin: 0, fontSize: 15, color: D.text }}>今日未访问</h3>
            <div style={{ padding: 12, borderRadius: D.radiusSm, background: D.bgCard, border: `1px solid ${D.border}`, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {todaySummary.unvisited.length === 0 ? (
                <span style={{ color: D.success, fontSize: 13 }}>今天所有家长都有访问记录</span>
              ) : todaySummary.unvisited.map(student => (
                <span key={student.id} className="student-name" style={{ fontSize: 12, color: INK.textSecondary, background: 'rgba(255,255,255,0.04)', border: `1px solid ${D.border}`, borderRadius: D.radiusXs, padding: '3px 7px' }}>#{student.number} {student.name}</span>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {entriesByDate.map(group => (
            <section key={group.date} style={{ display: 'grid', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: group.date === today ? D.gold : D.text }}>{group.date}{group.date === today ? ' · 今日' : ''} · {group.entries.length} 人访问</h3>
              {group.entries.length === 0 ? (
                <div style={{ padding: 14, borderRadius: D.radiusSm, background: D.bgCard, border: `1px solid ${D.border}`, color: D.textDim, fontSize: 13 }}>当天暂无访问记录</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {group.entries.map(renderEntryCard)}
                </div>
              )}
            </section>
          ))}
          <section style={{ display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: D.text }}>近7日未访问</h3>
            <div style={{ padding: 12, borderRadius: D.radiusSm, background: D.bgCard, border: `1px solid ${D.border}`, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {weekUnvisited.length === 0 ? (
                <span style={{ color: D.success, fontSize: 13 }}>近7日所有家长都有访问记录</span>
              ) : weekUnvisited.map(student => (
                <span key={student.id} className="student-name" style={{ fontSize: 12, color: INK.textSecondary, background: 'rgba(255,255,255,0.04)', border: `1px solid ${D.border}`, borderRadius: D.radiusXs, padding: '3px 7px' }}>#{student.number} {student.name}</span>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
