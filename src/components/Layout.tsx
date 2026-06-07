import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, LogOut, Star, BookOpen, Armchair, Settings, CreditCard, X, Bell, Menu } from 'lucide-react';
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

const BG_SHIFT_MAP: Record<string, number> = {
  '/': 0,
  '/record': -40,
  '/seats': -80,
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
  const mobileView = localStorage.getItem('app_mobile_view') === 'true';
  const [menuOpen, setMenuOpen] = useState(false);

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
        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(v => !v)} style={{
            background: 'none', border: 'none', color: D.text, cursor: 'pointer',
            padding: 8, display: 'flex', alignItems: 'center', fontSize: 22,
          }}>
            <Menu size={22} />
          </button>
        )}

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, marginRight: isMobile ? 0 : 32 }}>
          <Star size={isMobile ? 18 : 22} style={{ color: D.gold, filter: 'drop-shadow(0 0 8px rgba(212,168,83,0.5))' }} />
          {!isMobile && (
          <span style={{
            fontSize: 20, fontWeight: 700, color: D.gold, letterSpacing: '2px', textShadow: D.goldText,
          }}>
            星火燎原
          </span>
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
            {/* View toggle — always visible */}
            <button onClick={() => { toggleMobileView(); setMenuOpen(false); }}
              title={mobileView ? '切换到桌面视图' : '切换到手机视图'}
              style={{
                padding: isMobile ? '4px 6px' : '6px 8px', borderRadius: D.radiusXs,
                background: mobileView ? D.goldDim : 'transparent',
                border: `1px solid ${mobileView ? D.borderGlow : D.border}`,
                color: mobileView ? D.gold : D.textDim, fontSize: isMobile ? 14 : 16,
                cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', lineHeight: 1,
              }}
            >
              {mobileView ? '📱' : '💻'}
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

      {/* Mobile slide-down menu */}
      {isMobile && menuOpen && (
        <div style={{
          background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${D.border}`, padding: '8px 12px',
          animation: 'slideDown 0.2s ease', zIndex: 99,
        }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label, roles: navRoles, parentOnly }) => {
            if (parentOnly && role !== 'parent') return null;
            if (navRoles && !navRoles.includes(role) && !parentOnly) return null;
            const resolvedTo = to === '/card/me' && user?.linkedStudentId ? `/card/${user.linkedStudentId}` : to;
            return (
              <NavLink
                key={to} to={resolvedTo} end={to === '/'}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px', borderRadius: D.radiusXs, textDecoration: 'none',
                  fontSize: 15, fontWeight: isActive ? 600 : 400,
                  color: isActive ? D.gold : D.text,
                  background: isActive ? D.goldDim : 'transparent',
                  transition: 'all 0.2s ease',
                })}
              >
                <Icon size={20} /><span>{label}</span>
              </NavLink>
            );
          })}
        </div>
      )}

      {/* Main content area — full width */}
      <main
        style={{
          flex: 1,
          padding: isMobile ? '12px 8px' : '28px 32px',
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
