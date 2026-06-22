import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, LogOut, Star, BookOpen, Armchair, Settings, CreditCard, X, Monitor, Smartphone, Eye } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMobile, toggleMobileView } from '../hooks/useMobile';
import type { UserRole } from '../types';
import { D } from '../data/theme';
import { APP_VERSION } from '../data/config';
import { useConfig } from '../contexts/ConfigContext';
import MainContentScene from './MainContentScene';
import InkWashBg from './InkWashBg';

const NAV_ITEMS: { to: string; icon: typeof LayoutDashboard; label: string; roles?: UserRole[]; parentOnly?: boolean }[] = [
  { to: '/', icon: LayoutDashboard, label: '全班总览', roles: ['teacher', 'committee', 'student'] },
  { to: '/card/me', icon: CreditCard, label: '个人卡片', parentOnly: true },
  { to: '/record', icon: ClipboardList, label: '行为录入', roles: ['teacher', 'committee'] },
  { to: '/seats', icon: Armchair, label: '座位编排', roles: ['teacher', 'committee', 'student'] },
  { to: '/parent-access', icon: Eye, label: '家长关注', roles: ['teacher'] },
  { to: '/rules', icon: BookOpen, label: '规则说明' },
  { to: '/settings', icon: Settings, label: '系统设置', roles: ['teacher'] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  teacher: '班主任',
  committee: '班委',
  student: '学生',
  parent: '家长',
};

const ROLE_COLORS: Record<UserRole, string> = {
  teacher: D.gold,
  committee: D.blue,
  student: D.textMid,
  parent: D.success,
};

type SyncState = {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message: string;
  updatedAt?: string;
  error?: string;
};

const BG_SHIFT_MAP: Record<string, number> = {
  '/': 0,
  '/record': -40,
  '/seats': -80,
  '/parent-access': -120,
  '/rules': -120,
  '/settings': -160,
};

export default function Layout() {
  const { user, signOut } = useAuth();
  const config = useConfig();
  const location = useLocation();
  const role = user?.role ?? 'student';
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('app_zoom');
    return saved ? parseFloat(saved) : 1;
  });
  const isMobile = useMobile();
  const bgShift = useMemo(() => {
    if (isMobile) return 0; // 手机上禁用背景位移，否则右边露出黑条
    const path = location.pathname.startsWith('/card') ? '/' : location.pathname;
    return BG_SHIFT_MAP[path] || 0;
  }, [location.pathname, isMobile]);
  const [syncState, setSyncState] = useState<SyncState>(() =>
    window.xinghuoSync?.getState() ?? { status: 'idle', message: '待同步' }
  );
  const visibleNavItems = useMemo(() => NAV_ITEMS.filter(({ roles: navRoles, parentOnly }) => {
    if (parentOnly) return role === 'parent';
    return !navRoles || navRoles.includes(role);
  }), [role]);
  const currentTitle = useMemo(() => {
    if (location.pathname.startsWith('/card')) return role === 'parent' ? '孩子卡片' : '学生卡片';
    const item = visibleNavItems.find(nav => nav.to === location.pathname) ?? visibleNavItems.find(nav => nav.to === '/' && location.pathname === '/');
    return item?.label.replace('全班', '').replace('行为', '') ?? '星火燎原';
  }, [location.pathname, role, visibleNavItems]);

  const [showUpdatePopup, setShowUpdatePopup] = useState(() => {
    const lastSeen = localStorage.getItem('app_version_seen');
    return lastSeen !== APP_VERSION;
  });

  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem('app_zoom');
      if (saved) setZoom(parseFloat(saved));
    };
    window.addEventListener('zoom-changed', handler);
    return () => window.removeEventListener('zoom-changed', handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SyncState>).detail;
      if (detail) setSyncState(detail);
    };
    window.addEventListener('xinghuo-sync-state', handler);
    return () => window.removeEventListener('xinghuo-sync-state', handler);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: D.bg,
      fontFamily: "'LXGW WenKai', 'Cinzel', serif",
      display: 'flex',
      flexDirection: 'column',
      zoom: zoom,
    }}>
      {/* Top navigation bar */}
      <header
        style={{
          height: isMobile ? 48 : 64,
          display: 'flex',
          alignItems: 'center',
          padding: isMobile ? '0 12px' : '0 24px',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${D.border}`,
          flexShrink: 0,
          position: 'relative',
          zIndex: 100,
          gap: isMobile ? 8 : 0,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 7 : 8, marginRight: isMobile ? 0 : 32, minWidth: 0, flex: isMobile ? 1 : 'initial' }}>
          <Star size={isMobile ? 18 : 22} style={{ color: D.gold, filter: 'drop-shadow(0 0 8px rgba(212,168,83,0.5))' }} />
          {!isMobile && (
          <span style={{
            fontSize: 20, fontWeight: 700, color: D.gold, letterSpacing: '2px', textShadow: D.goldText,
          }}>
            星火燎原
          </span>
          )}
          {isMobile && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: D.text, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTitle}
              </div>
              {user && (
                <div style={{ fontSize: 10, color: ROLE_COLORS[role], lineHeight: 1.2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name} · {ROLE_LABELS[role]}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop nav */}
        {!isMobile && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label, roles: navRoles, parentOnly }) => {
            if (parentOnly && role !== 'parent') return null;
            if (navRoles && !navRoles.includes(role) && !parentOnly) return null;
            const resolvedTo = to === '/card/me' && user?.linkedStudentId ? `/card/${user.linkedStudentId}` : to;
            return (
              <NavLink
                key={to} to={resolvedTo} end={to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  borderRadius: D.radiusXs, textDecoration: 'none', fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? D.gold : D.textDim,
                  background: isActive ? D.goldDim : 'transparent',
                  transition: 'all 0.2s ease', cursor: 'pointer',
                  boxShadow: isActive ? D.goldGlow : 'none',
                })}
                onMouseEnter={(e) => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.color = D.text; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                onMouseLeave={(e) => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.color = D.textDim; e.currentTarget.style.background = 'transparent'; } }}
              >
                <Icon size={17} /><span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
        )}

        {/* Right side controls */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, justifyContent: 'flex-end' }}>
        {user && (
          <button
            onClick={() => syncState.status === 'error' && window.xinghuoSync?.retry().catch(() => { /* status event handles UI */ })}
            title={syncState.error || syncState.message}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: isMobile ? '4px 7px' : '5px 9px',
              borderRadius: D.radiusXs,
              border: `1px solid ${syncState.status === 'error' ? 'rgba(196,65,37,0.45)' : syncState.status === 'saving' ? 'rgba(212,168,83,0.45)' : D.border}`,
              background: syncState.status === 'error' ? D.cinnabarDim : syncState.status === 'saving' ? D.goldDim : 'rgba(255,255,255,0.03)',
              color: syncState.status === 'error' ? D.cinnabar : syncState.status === 'saving' ? D.gold : D.textDim,
              fontSize: isMobile ? 10 : 11,
              cursor: syncState.status === 'error' ? 'pointer' : 'default',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: syncState.status === 'error' ? D.cinnabar : syncState.status === 'saving' ? D.gold : D.success,
              boxShadow: syncState.status === 'saving' ? `0 0 8px ${D.gold}` : 'none',
            }} />
            {isMobile ? (syncState.status === 'error' ? '重试' : syncState.status === 'saving' ? '同步中' : '已同步') : syncState.message}
          </button>
        )}
        {user ? (
          <>
            {!isMobile && (
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 13, color: D.text, fontWeight: 500 }}>{user.name}</div>
              <div style={{ fontSize: 10, color: ROLE_COLORS[role] }}>{ROLE_LABELS[role]}</div>
            </div>
            )}
            {!isMobile && (
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: D.goldDim,
              border: `1px solid ${D.borderGlow}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 14, color: D.gold, fontWeight: 600, boxShadow: D.goldGlow,
            }}>
              {user.name.charAt(0)}
            </div>
            )}
            <button
              onClick={() => setShowUpdatePopup(true)}
              title="查看版本公告"
              style={{
                width: isMobile ? 28 : 34,
                height: isMobile ? 28 : 34,
                padding: 0,
                borderRadius: D.radiusXs,
                background: 'rgba(212,168,83,0.08)',
                border: `1px solid ${D.borderGlow}`,
                color: D.gold,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BookOpen size={isMobile ? 14 : 16} />
            </button>
            {/* View toggle — always visible */}
            <button onClick={() => { toggleMobileView(); }}
              title={isMobile ? '切换到桌面视图' : '切换到手机视图'}
              style={{
                padding: isMobile ? '4px 6px' : '6px 8px', borderRadius: D.radiusXs,
                background: isMobile ? D.goldDim : 'transparent',
                border: `1px solid ${isMobile ? D.borderGlow : D.border}`,
                color: isMobile ? D.gold : D.textDim, fontSize: isMobile ? 14 : 16,
                cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', lineHeight: 1,
              }}
            >
              {isMobile ? <Smartphone size={isMobile ? 15 : 16} /> : <Monitor size={isMobile ? 15 : 16} />}
            </button>
            <button onClick={() => signOut()} style={{
              padding: isMobile ? '4px 8px' : '6px 10px', borderRadius: D.radiusXs,
              background: 'transparent', border: `1px solid ${D.border}`,
              color: D.textDim, fontSize: isMobile ? 11 : 12, cursor: 'pointer',
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 2,
            }}>
              <LogOut size={isMobile ? 12 : 14} />
            </button>
          </>
        ) : (
          <span style={{ fontSize: 12, color: D.textDim }}>未登录</span>
        )}
        </div>
      </header>

      {/* Main content area — full width */}
      <main
        style={{
          flex: 1,
          padding: isMobile ? '10px 10px calc(80px + env(safe-area-inset-bottom))' : '28px 32px',
          background: D.bg,
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <MainContentScene bgShift={bgShift} />
        <InkWashBg side="front" intensity="medium" animated={true} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: isMobile ? '100%' : 1400, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>

      {isMobile && user && (
        <nav
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 90,
            padding: '7px 8px calc(7px + env(safe-area-inset-bottom))',
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(22px)',
            borderTop: `1px solid ${D.border}`,
            display: 'grid',
            gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))`,
            gap: 4,
          }}
        >
          {visibleNavItems.map(({ to, icon: Icon, label }) => {
            const resolvedTo = to === '/card/me' && user?.linkedStudentId ? `/card/${user.linkedStudentId}` : to;
            const shortLabel = label.replace('全班', '').replace('行为', '').replace('说明', '').replace('编排', '').replace('系统', '');
            return (
              <NavLink
                key={to}
                to={resolvedTo}
                end={to === '/'}
                style={({ isActive }) => ({
                  minHeight: 48,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  borderRadius: D.radiusSm,
                  textDecoration: 'none',
                  color: isActive ? D.gold : D.textDim,
                  background: isActive ? D.goldDim : 'transparent',
                  border: `1px solid ${isActive ? D.borderGlow : 'transparent'}`,
                  fontSize: 11,
                  lineHeight: 1,
                  fontWeight: isActive ? 700 : 500,
                  minWidth: 0,
                })}
              >
                <Icon size={18} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{shortLabel}</span>
              </NavLink>
            );
          })}
        </nav>
      )}

      {/* Update announcement popup */}
      {showUpdatePopup && (() => {
        const currentLog = config.versionLogs?.find(v => v.version === APP_VERSION);
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }}>
            <div style={{
              background: D.bgCard,
              border: `1px solid ${D.borderGlow}`,
              borderRadius: D.radius,
              boxShadow: D.goldGlow,
              maxWidth: 520, width: '90%',
              maxHeight: '80vh', overflowY: 'auto',
              padding: 28,
              position: 'relative',
            }}>
              <button
                onClick={() => { localStorage.setItem('app_version_seen', APP_VERSION); setShowUpdatePopup(false); }}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'transparent', border: 'none', color: D.textDim,
                  cursor: 'pointer', padding: 4, lineHeight: 1,
                }}
              >
                <X size={18} />
              </button>
              <div style={{ fontSize: 18, fontWeight: 700, color: D.gold, marginBottom: 4, textShadow: D.goldText }}>
                星火燎原 v{APP_VERSION} 更新公告
              </div>
              {currentLog && (
                <div style={{ fontSize: 12, color: D.textDim, marginBottom: 16 }}>{currentLog.date}</div>
              )}
              {currentLog ? currentLog.changes.map((c, i) => (
                <div key={i} style={{ marginBottom: i < currentLog.changes.length - 1 ? 14 : 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: D.text, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: D.textMid, lineHeight: 1.6 }}>{c.detail}</div>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: D.textMid }}>暂无更新说明</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
