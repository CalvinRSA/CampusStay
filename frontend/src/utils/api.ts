// src/utils/api.ts
export const API_BASE = 'https://campusstay-production.up.railway.app';

export async function fetcher(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  const headers = new Headers(options.headers);

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
  headers.set('Content-Type', 'application/json');
}

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    let msg = 'Something went wrong';
    try {
      const data = await response.json();
      msg = data.detail || data.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}