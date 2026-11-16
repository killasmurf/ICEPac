import { describe, expect, it } from 'vitest';
import type { User } from '../../api/admin';
import { filterUsers, hasUserFilters, NO_USER_FILTERS } from './userFilters';

const make = (over: Partial<User>): User => ({
  id: 1,
  email: 'a@example.com',
  username: 'alpha',
  full_name: 'Alice Alpha',
  role: 'user',
  is_active: true,
  is_verified: true,
  created_at: '',
  updated_at: '',
  last_login: null,
  ...over,
});

const users = [
  make({ id: 1 }),
  make({ id: 2, username: 'bravo', email: 'b@example.com', full_name: null, role: 'admin', is_active: false }),
  make({ id: 3, username: 'charlie', email: 'c@corp.test', full_name: 'Charlie C', role: 'manager' }),
];

describe('filterUsers', () => {
  it('returns everyone with no filters', () => {
    expect(filterUsers(users, NO_USER_FILTERS)).toHaveLength(3);
    expect(hasUserFilters(NO_USER_FILTERS)).toBe(false);
  });
  it('filters by role and status', () => {
    expect(filterUsers(users, { ...NO_USER_FILTERS, role: 'admin' }).map((u) => u.id)).toEqual([2]);
    expect(filterUsers(users, { ...NO_USER_FILTERS, status: 'inactive' }).map((u) => u.id)).toEqual([2]);
    expect(filterUsers(users, { ...NO_USER_FILTERS, status: 'active' }).map((u) => u.id)).toEqual([1, 3]);
  });
  it('searches username, email and full name case-insensitively', () => {
    expect(filterUsers(users, { ...NO_USER_FILTERS, search: 'CORP' }).map((u) => u.id)).toEqual([3]);
    expect(filterUsers(users, { ...NO_USER_FILTERS, search: 'alice' }).map((u) => u.id)).toEqual([1]);
    expect(filterUsers(users, { ...NO_USER_FILTERS, search: 'bravo' }).map((u) => u.id)).toEqual([2]);
    expect(hasUserFilters({ ...NO_USER_FILTERS, search: ' x ' })).toBe(true);
  });
});
