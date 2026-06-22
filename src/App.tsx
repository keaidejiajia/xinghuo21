import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { ConfigProvider } from './contexts/ConfigContext';
import { INK } from './data/theme';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StudentCard from './pages/StudentCard';
import RecordPage from './pages/RecordPage';
import LoginPage from './pages/LoginPage';
import RulesPage from './pages/RulesPage';
import SeatPage from './pages/SeatPage';
import SettingsPage from './pages/SettingsPage';
import ParentAccessPage from './pages/ParentAccessPage';

function ParentRedirect() {
  const { user } = useAuth();
  if (user?.role === 'parent' && user.linkedStudentId) {
    return <Navigate to={`/card/${user.linkedStudentId}`} replace />;
  }
  return <Dashboard />;
}

function ProtectedRoutes() {
  const { user, loading, isTeacher, canRecord } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0c14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: INK.textMuted,
        fontSize: 16,
        fontFamily: "'LXGW WenKai', 'Cinzel', serif",
      }}>
        加载中...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ParentRedirect />} />
        <Route path="/card/:id" element={<StudentCard />} />
        <Route path="/record" element={canRecord ? <RecordPage /> : <Navigate to="/" replace />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/seats" element={<SeatPage />} />
        <Route path="/parent-access" element={isTeacher ? <ParentAccessPage /> : <Navigate to="/" replace />} />
        <Route path="/settings" element={isTeacher ? <SettingsPage /> : <Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ConfigProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </ToastProvider>
        </ConfigProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
