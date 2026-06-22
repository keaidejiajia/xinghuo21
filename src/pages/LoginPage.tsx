import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Flame, GraduationCap, Users, ShieldCheck, KeyRound } from 'lucide-react';
import type { UserRole } from '../types';
import { D } from '../data/theme';
import { getStudents } from '../lib/store';
import { PARENT_AUTH_DATA } from '../data/parentAuth';
import { useAuth } from '../hooks/useAuth';
import { useMobile } from '../hooks/useMobile';
import { changeTeacherPassword, verifyTeacherPassword } from '../lib/authPasswords';
import { recordParentAccess } from '../lib/parentAccessClient';

const ROLES: { role: UserRole; label: string; icon: typeof Star; color: string }[] = [
  { role: 'teacher', label: '班主任', icon: GraduationCap, color: D.gold },
  { role: 'committee', label: '班委', icon: ShieldCheck, color: D.blue },
  { role: 'parent', label: '家长', icon: Users, color: D.blue },
];

const DEMO_ACCOUNTS: Record<string, { password: string; name: string; role: UserRole }> = {
  'teacher@21ban': { password: '', name: '班主任', role: 'teacher' },
  'committee@21ban': { password: '210021', name: '本周班委', role: 'committee' },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'select' | 'login' | 'changePassword'>('select');
  const [selectedRole, setSelectedRole] = useState<UserRole>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useMobile();
  const roleMeta = ROLES.find(r => r.role === selectedRole) ?? ROLES[0];
  const SelectedRoleIcon = roleMeta.icon;

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (selectedRole === 'parent') {
        const inputSuffix = password.trim().toUpperCase();
        const match = PARENT_AUTH_DATA.find(
          d => d.name === email.trim() && d.idSuffix.toUpperCase() === inputSuffix
        );
        if (match) {
          const students = getStudents();
          const student = students.find(s => s.name === match.name);
          const parentUser = {
            id: `parent-${match.name}`,
            email: match.name,
            role: 'parent' as UserRole,
            name: `${match.name}家长`,
            linkedStudentId: student?.id ?? undefined,
          };
          signIn(parentUser);
          void recordParentAccess('login', parentUser);
          navigate('/');
          return;
        }
        setError('姓名或身份证后6位不匹配');
        return;
      }

      const account = DEMO_ACCOUNTS[email.trim()];
      if (!account) {
        setError('账号或密码错误');
        return;
      }

      const passwordCheck = account.role === 'teacher'
        ? await verifyTeacherPassword(password)
        : { ok: account.password === password, message: '账号或密码错误' };

      if (passwordCheck.ok) {
        signIn({
          id: `demo-${account.role}`,
          email: email.trim(),
          role: account.role,
          name: account.name,
        });
        navigate('/');
        return;
      }

      setError(passwordCheck.message || '账号或密码错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetChangePasswordFields = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangeTeacherPassword = async () => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const result = await changeTeacherPassword({
        currentPassword: oldPassword,
        newPassword,
        confirmPassword,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      resetChangePasswordFields();
      setPassword('');
      setMode('login');
      setSuccess(`${result.message}，其他设备刷新后生效`);
    } catch {
      setError('无法连接认证服务，密码未修改');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #000000 0%, #080812 30%, #0a0816 60%, #050510 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'LXGW WenKai', 'Cinzel', serif",
        padding: isMobile ? '12px' : '24px',
      }}
    >
      {/* Animated starfield — subtle background stars */}
      {isMobile ? null : (
      Array.from({ length: 40 }, (_, i) => {
        const isGold = i < 8;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: isGold ? 2 + (i % 2) : 1 + (i % 2),
              height: isGold ? 2 + (i % 2) : 1 + (i % 2),
              borderRadius: '50%',
              background: isGold ? D.gold : 'rgba(180,190,210,0.4)',
              top: `${2 + (i * 7.3 + 11) % 94}%`,
              left: `${3 + (i * 13.7) % 94}%`,
              animation: `star-twinkle ${2 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.7) % 5}s`,
              opacity: isGold ? 0.5 : 0.3,
              pointerEvents: 'none',
            }}
          />
        );
      })
      )}

      {/* Floating nebula glow */}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,83,0.04) 0%, transparent 70%)', top: '15%', left: '50%', transform: 'translateX(-70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(123,139,181,0.03) 0%, transparent 70%)', bottom: '10%', right: '10%', pointerEvents: 'none' }} />

      {/* Main card */}
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 480,
          padding: 0,
          position: 'relative',
          zIndex: 1,
          background: 'rgba(10,10,18,0.85)',
          backdropFilter: 'blur(32px)',
          borderRadius: isMobile ? 12 : 20,
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 0 80px rgba(0,0,0,0.6), 0 0 30px rgba(212,168,83,0.04), 0 1px 0 rgba(255,255,255,0.03) inset',
          overflow: 'hidden',
        }}
      >
        {/* Header — logo area */}
        <div style={{
          padding: isMobile ? '24px 20px 18px' : '44px 48px 32px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: isMobile ? 10 : 16, marginBottom: 8 }}>
            <Star size={isMobile ? 22 : 28} style={{ color: D.gold, filter: 'drop-shadow(0 0 14px rgba(212,168,83,0.5))' }} />
            <h1 style={{
              fontSize: isMobile ? 26 : 38, fontWeight: 700, margin: 0, letterSpacing: '0.08em',
              background: `linear-gradient(135deg, ${D.gold} 0%, ${D.flameGold} 60%, #e8c55a 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 18px rgba(212,168,83,0.3))',
            }}>
              星火燎原
            </h1>
            <Flame size={isMobile ? 22 : 28} style={{ color: D.flameGold, filter: 'drop-shadow(0 0 14px rgba(232,197,90,0.5))' }} />
          </div>
          <p style={{
            color: D.textDim, fontSize: 12, margin: 0,
            letterSpacing: '0.12em', fontFamily: "'Cinzel', serif",
            textTransform: 'uppercase',
          }}>
            星光21班班级管理系统
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: isMobile ? '20px 16px 24px' : '36px 48px 44px' }}>
          {/* Role selection */}
          {mode === 'select' && (
            <div>
              <p style={{
                color: D.textMid, fontSize: 13, textAlign: 'center',
                marginBottom: 24, letterSpacing: '0.04em',
              }}>
                选择你的身份进入系统
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ROLES.map(({ role, label, icon: Icon, color }) => (
                  <button
                    key={role}
                    onClick={() => {
                      setSelectedRole(role);
                      setMode('login');
                      setError('');
                      setSuccess('');
                      resetChangePasswordFields();
                      if (role === 'parent') {
                        setEmail('');
                        setPassword('');
                      } else {
                        setEmail(`${role}@21ban`);
                        setPassword('');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: isMobile ? '18px 16px' : '26px 24px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      color: D.text,
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `rgba(255,255,255,0.04)`;
                      e.currentTarget.style.borderColor = `${color}44`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3), 0 0 20px ${color}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: `${color}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={24} style={{ color, filter: `drop-shadow(0 0 8px ${color}40)` }} />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: D.text, letterSpacing: '0.04em' }}>
                      {label}
                    </div>
                    <div style={{ marginLeft: 'auto', color: D.textDim, fontSize: 18, opacity: 0.3 }}>
                      →
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Login form */}
          {mode === 'login' && (
            <div>
              <button
                onClick={() => {
                  setMode('select');
                  setError('');
                  setSuccess('');
                  resetChangePasswordFields();
                }}
                style={{
                  background: 'none', border: 'none',
                  color: D.textDim, fontSize: 12, cursor: 'pointer',
                  marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 4,
                  transition: 'color 0.2s', letterSpacing: '0.04em',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = D.gold; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = D.textDim; }}
              >
                ← 返回选择
              </button>

              {/* Role badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 20,
                background: `${roleMeta.color}10`,
                border: `1px solid ${roleMeta.color}22`,
                marginBottom: 24, fontSize: 13,
                color: roleMeta.color,
                fontWeight: 500,
              }}>
                <SelectedRoleIcon size={14} />
                {roleMeta.label}登录
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 11, color: D.textDim, marginBottom: 6,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {selectedRole === 'parent' ? '学生姓名' : '账号'}
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'parent' ? '输入学生姓名' : '输入账号'}
                  autoComplete={selectedRole === 'committee' ? 'username' : 'off'}
                  autoCorrect="off"
                  spellCheck={false}
                  name={`xinghuo-${selectedRole}-account`}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: D.text, fontSize: 15, outline: 'none',
                    transition: 'all 0.25s ease',
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = `${D.borderGlow}`;
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,168,83,0.06)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block', fontSize: 11, color: D.textDim, marginBottom: 6,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {selectedRole === 'parent' ? '身份证后 6 位' : '密码'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={selectedRole === 'parent' ? '输入身份证后6位' : '输入密码'}
                  autoComplete={selectedRole === 'committee' ? 'current-password' : selectedRole === 'parent' ? 'one-time-code' : 'new-password'}
                  autoCorrect="off"
                  spellCheck={false}
                  name={`xinghuo-${selectedRole}-password`}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: D.text, fontSize: 15, outline: 'none',
                    transition: 'all 0.25s ease',
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = `${D.borderGlow}`;
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,168,83,0.06)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                />
              </div>

              {error && (
                <div style={{
                  color: D.cinnabar, fontSize: 12, marginBottom: 14,
                  textAlign: 'center', padding: '8px 14px', borderRadius: 8,
                  background: 'rgba(196,65,37,0.08)', border: '1px solid rgba(196,65,37,0.15)',
                }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{
                  color: D.success, fontSize: 12, marginBottom: 14,
                  textAlign: 'center', padding: '8px 14px', borderRadius: 8,
                  background: D.successDim, border: '1px solid rgba(139,170,122,0.18)',
                }}>
                  {success}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '15px', borderRadius: 12,
                  background: selectedRole === 'parent'
                    ? `linear-gradient(135deg, rgba(123,139,181,0.6), ${D.blue})`
                    : selectedRole === 'committee'
                      ? `linear-gradient(135deg, rgba(123,139,181,0.6), ${D.blue})`
                    : `linear-gradient(135deg, rgba(212,168,83,0.6), ${D.gold})`,
                  border: 'none', color: '#000000', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: selectedRole === 'parent' || selectedRole === 'committee'
                    ? '0 0 20px rgba(123,139,181,0.2)'
                    : D.goldGlowStrong,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: '0.06em',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = selectedRole === 'parent' || selectedRole === 'committee'
                    ? '0 0 28px rgba(123,139,181,0.35)'
                    : D.goldGlowStrong + ', 0 0 40px rgba(212,168,83,0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = selectedRole === 'parent' || selectedRole === 'committee'
                    ? '0 0 20px rgba(123,139,181,0.2)'
                    : D.goldGlowStrong;
                }}
              >
                {isSubmitting ? '验证中...' : '登 录'}
              </button>

              <div style={{
                marginTop: 16, fontSize: 11, color: D.textDim, textAlign: 'center',
                lineHeight: 1.6, letterSpacing: '0.03em',
              }}>
                {selectedRole === 'parent'
                  ? '家长登录：输入学生姓名和身份证后6位'
                  : selectedRole === 'committee'
                    ? '班委登录：可录入行为，但不能删除记录或修改系统设置'
                  : '请输入班主任账号和密码'}
              </div>
              {selectedRole === 'teacher' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('changePassword');
                    setError('');
                    setSuccess('');
                    resetChangePasswordFields();
                  }}
                  style={{
                    margin: '14px auto 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 10px',
                    borderRadius: D.radiusXs,
                    border: `1px solid ${D.border}`,
                    background: 'rgba(255,255,255,0.025)',
                    color: D.textMid,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                  }}
                >
                  <KeyRound size={13} />
                  修改密码
                </button>
              )}
            </div>
          )}

          {mode === 'changePassword' && (
            <div>
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                  resetChangePasswordFields();
                }}
                style={{
                  background: 'none', border: 'none',
                  color: D.textDim, fontSize: 12, cursor: 'pointer',
                  marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 4,
                  transition: 'color 0.2s', letterSpacing: '0.04em',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = D.gold; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = D.textDim; }}
              >
                ← 返回登录
              </button>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 20,
                background: `${D.gold}10`,
                border: `1px solid ${D.gold}22`,
                marginBottom: 20, fontSize: 13,
                color: D.gold,
                fontWeight: 500,
              }}>
                <KeyRound size={14} />
                修改班主任密码
              </div>

              {[
                { label: '原密码', value: oldPassword, setter: setOldPassword, name: 'xinghuo-teacher-old-password' },
                { label: '新密码', value: newPassword, setter: setNewPassword, name: 'xinghuo-teacher-new-password' },
                { label: '确认新密码', value: confirmPassword, setter: setConfirmPassword, name: 'xinghuo-teacher-confirm-password' },
              ].map((field, index) => (
                <div key={field.name} style={{ marginBottom: index === 2 ? 18 : 14 }}>
                  <label style={{
                    display: 'block', fontSize: 11, color: D.textDim, marginBottom: 6,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    {field.label}
                  </label>
                  <input
                    type="password"
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck={false}
                    name={field.name}
                    onKeyDown={(e) => e.key === 'Enter' && handleChangeTeacherPassword()}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: D.text, fontSize: 15, outline: 'none',
                      transition: 'all 0.25s ease',
                      fontFamily: "'LXGW WenKai', 'Cinzel', serif",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = `${D.borderGlow}`;
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,168,83,0.06)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                  />
                </div>
              ))}

              {error && (
                <div style={{
                  color: D.cinnabar, fontSize: 12, marginBottom: 14,
                  textAlign: 'center', padding: '8px 14px', borderRadius: 8,
                  background: 'rgba(196,65,37,0.08)', border: '1px solid rgba(196,65,37,0.15)',
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleChangeTeacherPassword}
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '15px', borderRadius: 12,
                  background: `linear-gradient(135deg, rgba(212,168,83,0.62), ${D.gold})`,
                  border: 'none', color: '#000000', fontSize: 15, fontWeight: 700,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  opacity: isSubmitting ? 0.72 : 1,
                  boxShadow: D.goldGlowStrong,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: '0.06em',
                }}
              >
                {isSubmitting ? '正在保存...' : '保存新密码'}
              </button>

              <div style={{
                marginTop: 14, fontSize: 11, color: D.textDim, textAlign: 'center',
                lineHeight: 1.6, letterSpacing: '0.03em',
              }}>
                修改成功后，所有设备刷新页面即可使用新密码；班委登录不受影响。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
