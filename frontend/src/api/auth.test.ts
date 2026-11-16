import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from './client';
import { login } from './auth';

vi.mock('./client', () => ({
  default: { post: vi.fn() },
}));

describe('login', () => {
  beforeEach(() => {
    vi.mocked(client.post).mockReset();
  });

  it('posts a form-encoded body to /auth/login', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { access_token: 'a', refresh_token: 'r', token_type: 'bearer' },
    });

    const tokens = await login('alice', 'p@ss word&1');

    expect(tokens.access_token).toBe('a');
    const [url, body, config] = vi.mocked(client.post).mock.calls[0];
    expect(url).toBe('/auth/login');
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(String(body)).toBe('username=alice&password=p%40ss+word%261');
    expect(config?.headers).toMatchObject({ 'Content-Type': 'application/x-www-form-urlencoded' });
  });
});
