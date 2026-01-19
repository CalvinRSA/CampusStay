// src/App.tsx - FIXED VERSION with proper route handling
import type { JSX } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import StudentsDashboard from './components/StudentsDashboard';
import VerifyEmail from './components/VerifyEmail';
import ResetPassword from './components/ResetPassword';
import RouteTest from './components/RouteTest';

interface User {
  role: 'admin' | 'student';
}

interface AuthState {
  user: User | null;
  token: string | null;
  ready: boolean;
}

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    ready: false,
  });

  const loadAuth = useCallback((): AuthState => {
    try {
      const userJson = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');

      const user: User | null = userJson ? JSON.parse(userJson) : null;

      if (user && !token) {
        localStorage.removeItem('user');
        return { user: null, token: null, ready: true };
      }
      if (!user && token) {
        localStorage.removeItem('access_token');
        return { user: null, token: null, ready: true };
      }

      return { user, token, ready: true };
    } catch (error) {
      console.error('Failed to parse auth data:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      return { user: null, token: null, ready: true };
    }
  }, []);

  useEffect(() => {
    // Initial load
    setAuth(loadAuth());

    // Listen for auth changes (from login/logout)
    const handleAuthChange = () => {
      console.log('Auth change detected');
      setAuth(loadAuth());
    };

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'user') {
        console.log('Storage change detected:', e.key);
        setAuth(loadAuth());
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadAuth]);

  if (!auth.ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const { user, token } = auth;

  // Protected Route Component
  const ProtectedRoute: React.FC<{
    children: JSX.Element;
    role: 'admin' | 'student';
  }> = ({ children, role }) => {
    const location = useLocation();

    if (!user || !token) {
      return <Navigate to="/" replace state={{ from: location }} />;
    }

    if (user.role !== role) {
      // Redirect to correct dashboard if wrong role
      const correctPath = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
      return <Navigate to={correctPath} replace />;
    }

    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ CRITICAL: Public routes MUST come first and be explicit */}
        {/* These routes are accessible without authentication */}
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/test" element={<RouteTest />} />

        {/* Protected Student Dashboard */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentsDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Home route - Smart redirect based on auth status */}
        <Route
          path="/"
          element={
            user && token ? (
              <Navigate 
                to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} 
                replace 
              />
            ) : (
              <LandingPage />
            )
          }
        />

        {/* Catch-all - Only redirect to home for truly unknown routes */}
        {/*<Route path="*" element={<Navigate to="/" replace />} />*/}
      </Routes>
    </BrowserRouter>
  );
};

export default App;