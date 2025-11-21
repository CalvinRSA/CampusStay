// src/utils/auth.ts
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

  // Store auth data
  localStorage.setItem('access_token', res.access_token);
  localStorage.setItem(
    'user',
    JSON.stringify({
      email: res.email || data.email,
      full_name: res.full_name || data.email.split('@')[0],
      role: res.role,
      student_id: res.student_id || null,
    })
  );

  // Dispatch custom event to notify App.tsx immediately
  window.dispatchEvent(new Event('auth-change'));

  // Small delay to ensure state updates, then redirect
  // Using window.location.replace to avoid back-button issues
  setTimeout(() => {
    const redirectPath = res.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    window.location.replace(redirectPath);
  }, 100);

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
  window.location.replace('/');
}

export function getCurrentUser() {
  const json = localStorage.getItem('user');
  return json ? JSON.parse(json) : null;
}