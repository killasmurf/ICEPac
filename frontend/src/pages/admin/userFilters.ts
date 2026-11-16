import type { User, UserRole } from '../../api/admin';

export interface UserFilters {
  search: string;
  role: UserRole | '';
  status: 'active' | 'inactive' | '';
}

export const NO_USER_FILTERS: UserFilters = { search: '', role: '', status: '' };

export const hasUserFilters = (f: UserFilters): boolean => Boolean(f.search.trim() || f.role || f.status);

/** The users endpoint has no search or filter parameters, so filtering happens on the client. */
export function filterUsers(users: User[], f: UserFilters): User[] {
  const q = f.search.trim().toLowerCase();
  return users.filter((u) => {
    if (f.role && u.role !== f.role) return false;
    if (f.status === 'active' && !u.is_active) return false;
    if (f.status === 'inactive' && u.is_active) return false;
    if (q && ![u.username, u.email, u.full_name ?? ''].some((v) => v.toLowerCase().includes(q))) return false;
    return true;
  });
}
