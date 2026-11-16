export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

export type Role = 'admin' | 'manager' | 'user' | 'viewer';

export interface JwtPayload {
  sub?: string;
  role?: string;
  exp?: number;
  [claim: string]: unknown;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(access: string, refresh?: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  } catch {
    /* storage unavailable: the session lasts until reload */
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Decode the payload of a JWT without verifying it. Returns null on any error. */
export function decodeJwt(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const payload: unknown = JSON.parse(json);
    return payload !== null && typeof payload === 'object' && !Array.isArray(payload) ? (payload as JwtPayload) : null;
  } catch {
    return null;
  }
}

/** True when the payload is missing or its `exp` (seconds since epoch) has passed. */
export function isExpired(payload: JwtPayload | null, now: number = Date.now()): boolean {
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= now;
}

const ROLES: readonly string[] = ['admin', 'manager', 'user', 'viewer'];

export function roleFromPayload(payload: JwtPayload | null): Role | null {
  return payload && typeof payload.role === 'string' && ROLES.includes(payload.role) ? (payload.role as Role) : null;
}
