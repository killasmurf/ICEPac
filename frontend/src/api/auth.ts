import client from './client';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ username, password });
  const res = await client.post<TokenResponse>('/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
}

export interface CurrentUser {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export async function getMe(): Promise<CurrentUser> {
  const res = await client.get<CurrentUser>('/auth/me');
  return res.data;
}
