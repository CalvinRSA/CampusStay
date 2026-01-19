// src/utils/auth.ts - FIXED for HashRouter
import { fetcher } from './api';

export interface LoginData {
  email: string;
  password: string;
}

export interface StudentData {
  full_name: string;
  email: string;
  phone_number: string;
  student_number: string;
  campus: string;
  password: string;
}

export async function login(data: LoginData) {
  const res = await fetcher('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: data.email, password: data.password }),
  });

  console.log('Login response:', res);

  // Store auth data
  localStorage.setItem('access_token', res.access_token);
  
  const userInfo = {
    email: res.email || data.email,
    full_name: res.full_name || data.email.split('@')[0],
    role: res.role || res.user_role || 'student',
    student_id: res.student_id || null,
  };
  
  console.log('Storing user info:', userInfo);
  localStorage.setItem('user', JSON.stringify(userInfo));

  // Dispatch event to trigger App.tsx rerender
  window.dispatchEvent(new Event('auth-change'));

  // ✅ ADDED: Manually redirect to correct dashboard
  const redirectPath = userInfo.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
  console.log('Redirecting to:', redirectPath);
  window.location.hash = redirectPath;

  return res;
}

export async function registerStudent(data: StudentData) {
  return await fetcher('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('auth-change'));
  // ✅ FIXED: Use hash navigation instead of replace
  window.location.hash = '/';
}

export function getCurrentUser() {
  const json = localStorage.getItem('user');
  return json ? JSON.parse(json) : null;
}