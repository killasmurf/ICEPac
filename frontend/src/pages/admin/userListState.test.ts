import { describe, expect, it } from 'vitest';
import {
  applyUserListChange,
  DEFAULT_USER_LIST_STATE,
  hasUserFilters,
  parseUserListState,
  userListApiParams,
  writeUserListState,
  type UserListState,
} from './userListState';

const parse = (qs: string) => parseUserListState(new URLSearchParams(qs));

describe('parseUserListState', () => {
  it('gives the default state for an empty URL', () => {
    expect(parse('')).toEqual(DEFAULT_USER_LIST_STATE);
  });

  it('reads every parameter', () => {
    expect(parse('q=ali&role=manager&status=inactive&sort=last_login&order=desc&page=3&pageSize=25')).toEqual({
      search: 'ali',
      role: 'manager',
      status: 'inactive',
      sort: 'last_login',
      order: 'desc',
      page: 3,
      pageSize: 25,
    });
  });

  it('ignores unknown or malformed values', () => {
    expect(parse('role=root&status=maybe&sort=password&order=up&page=-2&pageSize=7')).toEqual(DEFAULT_USER_LIST_STATE);
    expect(parse('page=abc').page).toBe(0);
    expect(parse('page=1.5').page).toBe(0);
  });
});

describe('writeUserListState', () => {
  it('leaves defaults out', () => {
    expect(writeUserListState(DEFAULT_USER_LIST_STATE).toString()).toBe('');
  });

  it('round-trips a full state', () => {
    const state: UserListState = {
      search: 'a b',
      role: 'viewer',
      status: 'active',
      sort: 'username',
      order: 'desc',
      page: 2,
      pageSize: 50,
    };
    expect(parse(writeUserListState(state).toString())).toEqual(state);
  });

  it('omits the order when there is no sort, and ascending order', () => {
    expect(writeUserListState({ ...DEFAULT_USER_LIST_STATE, order: 'desc' }).toString()).toBe('');
    expect(writeUserListState({ ...DEFAULT_USER_LIST_STATE, sort: 'email' }).toString()).toBe('sort=email');
  });
});

describe('applyUserListChange', () => {
  const onPage3: UserListState = { ...DEFAULT_USER_LIST_STATE, page: 3 };

  it('returns to the first page when a filter or the sort changes', () => {
    expect(applyUserListChange(onPage3, { role: 'admin' }).page).toBe(0);
    expect(applyUserListChange(onPage3, { search: 'x' }).page).toBe(0);
    expect(applyUserListChange(onPage3, { status: 'active' }).page).toBe(0);
    expect(applyUserListChange(onPage3, { sort: 'role', order: 'desc' }).page).toBe(0);
    expect(applyUserListChange(onPage3, { pageSize: 25 }).page).toBe(0);
  });

  it('keeps the page when only the page changes', () => {
    expect(applyUserListChange(DEFAULT_USER_LIST_STATE, { page: 2 }).page).toBe(2);
  });
});

describe('userListApiParams', () => {
  it('sends only paging for the default state', () => {
    expect(userListApiParams(DEFAULT_USER_LIST_STATE)).toEqual({
      skip: 0,
      limit: 10,
      search: undefined,
      role: undefined,
      is_active: undefined,
      sort: undefined,
      order: undefined,
    });
  });

  it('maps filters, sort and page to server parameters', () => {
    expect(
      userListApiParams({ search: ' ann ', role: 'user', status: 'inactive', sort: 'email', order: 'desc', page: 2, pageSize: 25 }),
    ).toEqual({ skip: 50, limit: 25, search: 'ann', role: 'user', is_active: false, sort: 'email', order: 'desc' });
    expect(userListApiParams({ ...DEFAULT_USER_LIST_STATE, status: 'active' }).is_active).toBe(true);
  });

  it('hasUserFilters ignores sorting and paging', () => {
    expect(hasUserFilters(DEFAULT_USER_LIST_STATE)).toBe(false);
    expect(hasUserFilters({ ...DEFAULT_USER_LIST_STATE, search: '  ' })).toBe(false);
    expect(hasUserFilters({ ...DEFAULT_USER_LIST_STATE, role: 'admin' })).toBe(true);
  });
});
