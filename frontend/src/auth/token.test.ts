import { describe, it, expect } from 'vitest';
import { decodeJwt, isExpired, roleFromPayload } from './token';

const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('token helpers', () => {
  it('decodes a base64url payload', () => {
    const p = decodeJwt(`h.${b64url({ sub: '7', role: 'admin', exp: 99 })}.s`);
    expect(p).toMatchObject({ sub: '7', role: 'admin' });
    expect(roleFromPayload(p)).toBe('admin');
  });
  it('returns null on garbage', () => {
    expect(decodeJwt('nope')).toBeNull();
    expect(decodeJwt('a.%%%.c')).toBeNull();
    expect(decodeJwt(null)).toBeNull();
  });
  it('detects expiry', () => {
    expect(isExpired({ exp: 1 })).toBe(true);
    expect(isExpired({ exp: 4102444800 })).toBe(false);
    expect(isExpired(null)).toBe(true);
  });
});
