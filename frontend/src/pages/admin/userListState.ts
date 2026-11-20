import type { SortOrder, UserListParams, UserRole, UserSortField } from '../../api/admin';

export const USER_ROLES: readonly UserRole[] = ['admin', 'manager', 'user', 'viewer'];
export const USER_SORT_FIELDS: readonly UserSortField[] = ['username', 'full_name', 'email', 'role', 'last_login', 'created_at'];
export const USER_PAGE_SIZES: readonly number[] = [10, 25, 50];
export const DEFAULT_USER_PAGE_SIZE = 10;

/** Everything that shapes the users list. It lives in the URL, so a filtered view can be reloaded and shared. */
export interface UserListState {
  search: string;
  role: UserRole | '';
  status: 'active' | 'inactive' | '';
  /** Empty means the server's default order. */
  sort: UserSortField | '';
  order: SortOrder;
  /** Zero-based. */
  page: number;
  pageSize: number;
}

export const DEFAULT_USER_LIST_STATE: UserListState = {
  search: '',
  role: '',
  status: '',
  sort: '',
  order: 'asc',
  page: 0,
  pageSize: DEFAULT_USER_PAGE_SIZE,
};

export const hasUserFilters = (s: Pick<UserListState, 'search' | 'role' | 'status'>): boolean =>
  Boolean(s.search.trim() || s.role || s.status);

const oneOf = <T extends string>(allowed: readonly T[], value: string | null): T | '' =>
  allowed.includes(value as T) ? (value as T) : '';

/** Read the list state from the URL; anything unrecognised falls back to the default. */
export function parseUserListState(params: URLSearchParams): UserListState {
  const status = params.get('status');
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));
  return {
    search: params.get('q') ?? '',
    role: oneOf(USER_ROLES, params.get('role')),
    status: status === 'active' || status === 'inactive' ? status : '',
    sort: oneOf(USER_SORT_FIELDS, params.get('sort')),
    order: params.get('order') === 'desc' ? 'desc' : 'asc',
    page: Number.isInteger(page) && page > 0 ? page : 0,
    pageSize: USER_PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_USER_PAGE_SIZE,
  };
}

/** Write the list state to URL parameters, leaving defaults out so the default view has a clean URL. */
export function writeUserListState(state: UserListState): URLSearchParams {
  const out = new URLSearchParams();
  const search = state.search.trim();
  if (search) out.set('q', search);
  if (state.role) out.set('role', state.role);
  if (state.status) out.set('status', state.status);
  if (state.sort) {
    out.set('sort', state.sort);
    if (state.order === 'desc') out.set('order', 'desc');
  }
  if (state.page > 0) out.set('page', String(state.page));
  if (state.pageSize !== DEFAULT_USER_PAGE_SIZE) out.set('pageSize', String(state.pageSize));
  return out;
}

/** Apply a change. Any change other than paging itself returns to the first page. */
export function applyUserListChange(state: UserListState, change: Partial<UserListState>): UserListState {
  const pagingOnly = Object.keys(change).every((k) => k === 'page');
  return { ...state, ...change, page: pagingOnly ? (change.page ?? state.page) : (change.page ?? 0) };
}

/** The query string parameters for GET /admin/users. */
export function userListApiParams(state: UserListState): UserListParams {
  const search = state.search.trim();
  return {
    skip: state.page * state.pageSize,
    limit: state.pageSize,
    search: search || undefined,
    role: state.role || undefined,
    is_active: state.status === '' ? undefined : state.status === 'active',
    sort: state.sort || undefined,
    order: state.sort ? state.order : undefined,
  };
}
