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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('demo_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = (userData: User) => {
    localStorage.setItem('demo_user', JSON.stringify(userData));
    setUser(userData);
  };

  const signOut = () => {
    localStorage.removeItem('demo_user');
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
