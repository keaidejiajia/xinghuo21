import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserRole } from '../types';

interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  linkedStudentId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (userData: User) => void;
  signOut: () => void;
  isTeacher: boolean;
  isCommittee: boolean;
  isParent: boolean;
  canRecord: boolean;
  canDeleteRecord: boolean;
  canManageRules: boolean;
  canViewReports: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STORAGE_KEY = 'xinghuo_auth_user';
const AUTH_SESSION_KEY = 'xinghuo_auth_session_user';
const LEGACY_AUTH_STORAGE_KEY = 'demo_user';

function parseStoredUser(value: string | null): User | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionUser = parseStoredUser(sessionStorage.getItem(AUTH_SESSION_KEY));
    if (sessionUser) {
      setUser(sessionUser);
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    const legacyStored = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
    const parsed = parseStoredUser(stored || legacyStored);
    if (parsed) {
      if (parsed.role === 'teacher') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem('xinghuo_auth_remembered');
      } else {
        setUser(parsed);
        if (!stored && legacyStored) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
        }
      }
    } else if (stored || legacyStored) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    setLoading(false);
  }, []);

  const signIn = (userData: User) => {
    if (userData.role === 'teacher') {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(userData));
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('xinghuo_auth_remembered');
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem('xinghuo_auth_remembered', 'true');
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    }
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    setUser(userData);
  };

  const signOut = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('xinghuo_auth_remembered');
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setUser(null);
  };

  const isTeacher = user?.role === 'teacher';
  const isCommittee = user?.role === 'committee';
  const isParent = user?.role === 'parent';
  const canRecord = isTeacher || isCommittee;
  const canDeleteRecord = isTeacher;
  const canManageRules = isTeacher;
  const canViewReports = isTeacher;

  return (
    <AuthContext.Provider value={{
      user, loading, signIn, signOut,
      isTeacher, isCommittee, isParent, canRecord,
      canDeleteRecord, canManageRules, canViewReports,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
