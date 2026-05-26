import { createContext, useContext, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import type { UserResponse } from '../api/types';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, displayName: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<UserResponse | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? (JSON.parse(stored) as UserResponse) : null;
  });

  function persist(t: string, u: UserResponse) {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  async function login(email: string, password: string) {
    const data = await authApi.login(email, password);
    persist(data.token, data.user);
  }

  async function register(email: string, displayName: string, password: string) {
    const data = await authApi.register(email, displayName, password);
    persist(data.token, data.user);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
