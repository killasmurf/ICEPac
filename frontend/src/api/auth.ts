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
