// src/App.tsx
import type { JSX } from 'react'; // <-- FIXED the JSX import
import React, { useEffect, useState } from 'react';
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
import VerifyEmail from './pages/VerifyEmail';

// Type for user
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

  // Safely read and parse user from localStorage
  const loadAuth = (): AuthState => {
    try {
      const userJson = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');

      const user: User | null = userJson ? JSON.parse(userJson) : null;

      // Clean inconsistent state
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
  };

  // Initialize and keep auth in sync
  useEffect(() => {
    // Initial load
    setAuth(loadAuth());

    // Listen for changes from other tabs
    const handleStorageChange = () => {
      setAuth(loadAuth());
    };

    window.addEventListener('storage', handleStorageChange);

    // Fallback polling in case storage event is missed
    const interval = setInterval(() => {
      setAuth((current) => {
        const updated = loadAuth();
        if (
          current.user?.role !== updated.user?.role ||
          current.token !== updated.token
        ) {
          return updated;
        }
        return current;
      });
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Show loader until auth is ready
  if (!auth.ready) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif'
      }}>
        Loading...
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
      return <Navigate to="/" replace />;
    }

    return children;
  };

  // Determine where to redirect logged-in users
  const getDefaultRedirect = (): string => {
    if (!user || !token) return '/';
    return user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
  };

  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/login" element={<LandingPage />} />

        {/* Protected Dashboards */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentsDashboard />
            </ProtectedRoute>
          }
        />

        {/* Home & Login → Landing Page */}
        <Route
          path="/"
          element={
            user && token ? (
              <Navigate to={getDefaultRedirect()} replace />
            ) : (
              <LandingPage />
            )
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
