import { useState, useEffect } from 'react';
import { User } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_VALO_API_BASE || "http://localhost:3030";

export function useValoAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.token && data.user) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('valo_token', data.token);
          localStorage.setItem('valo_user', JSON.stringify(data.user));
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error("Login failed", e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.clear();
  };

  const authFetch = async (url: string, options: any = {}) => {
    const t = token || localStorage.getItem('valo_token');
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${t}`,
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      logout();
    }
    return res;
  };

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('valo_token');
      const savedUser = localStorage.getItem('valo_user');
      if (savedToken && savedUser && savedUser !== 'undefined') {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error("Auth restore error", e);
    }
  }, []);

  return { user, token, login, logout, authFetch, API_BASE };
}
