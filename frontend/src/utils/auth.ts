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

  console.log('Login response:', res); // Debug: see what backend returns

  // Store auth data
  localStorage.setItem('access_token', res.access_token);
  
  // Make sure we're getting the user info properly
  const userInfo = {
    email: res.email || data.email,
    full_name: res.full_name || data.email.split('@')[0],
    role: res.role || res.user_role || 'student', // Try multiple fields
    student_id: res.student_id || null,
  };
  
  console.log('Storing user info:', userInfo); // Debug: see what we're storing
  
  localStorage.setItem('user', JSON.stringify(userInfo));

  // Dispatch event to trigger App.tsx rerender
  window.dispatchEvent(new Event('auth-change'));

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