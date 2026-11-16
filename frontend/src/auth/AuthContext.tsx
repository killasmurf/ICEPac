import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginRequest, getMe, type CurrentUser } from '../api/auth';
import { clearTokens, decodeJwt, getToken, isExpired, roleFromPayload, setTokens, type Role } from './token';
import { queryClient } from '../app/queryClient';

export interface AuthContextValue {
  /** Profile from GET /auth/me; null until loaded or when signed out. */
  user: CurrentUser | null;
  /** Role from the JWT claim (available immediately, before /auth/me returns). */
  role: Role | null;
  isAuthenticated: boolean;
  /** True after an explicit sign-out, so guards redirect to plain /login without ?next=. */
  signedOut: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function validToken(token: string | null): string | null {
  return token && !isExpired(decodeJwt(token)) ? token : null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => validToken(getToken()));
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        /* the shell still works from the JWT claims; a 401 is handled by the API client */
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await loginRequest(username, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    setToken(validToken(tokens.access_token));
    setSignedOut(false);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    queryClient.clear();
    setToken(null);
    setUser(null);
    setSignedOut(true);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: token ? user : null,
      role: token ? roleFromPayload(decodeJwt(token)) : null,
      isAuthenticated: token !== null,
      signedOut,
      login,
      logout,
    }),
    [token, user, signedOut, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
