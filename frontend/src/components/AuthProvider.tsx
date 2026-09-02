'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { PublicUser } from '@/lib/types';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // The socket connection follows auth state: connect once we have a
  // session cookie, disconnect fully on logout so we stop receiving events
  // for a user who is no longer signed in.
  useEffect(() => {
    const socket = getSocket();
    if (user) {
      socket.connect();
    } else {
      socket.disconnect();
    }
  }, [user]);

  async function login(username: string, password: string) {
    const loggedInUser = await api.login(username, password);
    setUser(loggedInUser);
  }

  async function signup(username: string, password: string) {
    const newUser = await api.signup(username, password);
    setUser(newUser);
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
