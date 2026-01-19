// Add this to your App.tsx - COMPLETE FIX for index.html in URL

// At the top of your App component, add this useEffect:

useEffect(() => {
  // Clean up URL if it contains index.html
  const cleanUrl = () => {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    
    if (currentPath.includes('index.html')) {
      // Replace the URL without index.html
      const cleanPath = currentPath.replace('/index.html', '');
      const newUrl = `${window.location.origin}${cleanPath}${currentHash}`;
      
      console.log('Cleaning URL from:', window.location.href);
      console.log('Cleaning URL to:', newUrl);
      
      window.history.replaceState(null, '', newUrl);
    }
  };

  // Clean on mount
  cleanUrl();

  // Clean on hash change
  window.addEventListener('hashchange', cleanUrl);
  
  return () => {
    window.removeEventListener('hashchange', cleanUrl);
  };
}, []);

// COMPLETE UPDATED App.tsx WITH FIX:

import type { JSX } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import {
  HashRouter,
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

  // ✅ ADDED: Clean up index.html from URL
  useEffect(() => {
    const cleanUrl = () => {
      const currentPath = window.location.pathname;
      const currentHash = window.location.hash;
      
      if (currentPath.includes('index.html')) {
        const cleanPath = currentPath.replace('/index.html', '');
        const newUrl = `${window.location.origin}${cleanPath}${currentHash}`;
        window.history.replaceState(null, '', newUrl);
      }
    };

    cleanUrl();
    window.addEventListener('hashchange', cleanUrl);
    
    return () => {
      window.removeEventListener('hashchange', cleanUrl);
    };
  }, []);

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
    setAuth(loadAuth());

    const handleAuthChange = () => {
      console.log('Auth change detected');
      setAuth(loadAuth());
    };

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

  const ProtectedRoute: React.FC<{
    children: JSX.Element;
    role: 'admin' | 'student';
  }> = ({ children, role }) => {
    const location = useLocation();

    if (!user || !token) {
      return <Navigate to="/" replace state={{ from: location }} />;
    }

    if (user.role !== role) {
      const correctPath = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
      return <Navigate to={correctPath} replace />;
    }

    return children;
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentsDashboard />
            </ProtectedRoute>
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;