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
const LEGACY_AUTH_STORAGE_KEY = 'demo_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    const legacyStored = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
    const valueToLoad = stored || legacyStored;
    if (valueToLoad) {
      try {
        const parsed = JSON.parse(valueToLoad);
        setUser(parsed);
        if (!stored && legacyStored) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    setLoading(false);
  }, []);

  const signIn = (userData: User) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem('xinghuo_auth_remembered', 'true');
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    setUser(userData);
  };

  const signOut = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('xinghuo_auth_remembered');
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
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
