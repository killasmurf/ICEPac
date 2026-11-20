import { loadFixture } from './load';

interface Paged {
  items: unknown[];
  total: number;
}

/** Slice a fixture list by the skip/limit the page asked for, as the real API does. */
function paged(name: string, filter?: (item: Record<string, unknown>, url: URL) => boolean) {
  return (url: URL) => {
    const all = loadFixture<Paged>(name).items as Record<string, unknown>[];
    const kept = filter ? all.filter((i) => filter(i, url)) : all;
    const skip = Number(url.searchParams.get('skip') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 100);
    return { items: kept.slice(skip, skip + limit), total: kept.length, skip, limit };
  };
}

const activeOnly = (i: Record<string, unknown>, url: URL) => url.searchParams.get('active_only') !== 'true' || i.is_active === true;

const supplierFilter = (i: Record<string, unknown>, url: URL) => {
  const code = url.searchParams.get('supplier_code');
  return (!code || i.supplier_code === code) && activeOnly(i, url);
};

/** Mirrors GET /admin/users: search, role, is_active and sort/order are applied before paging, nulls last. */
const userFilter = (i: Record<string, unknown>, url: URL) => {
  const q = url.searchParams.get('search')?.toLowerCase();
  const role = url.searchParams.get('role');
  const active = url.searchParams.get('is_active');
  if (role && i.role !== role) return false;
  if (active && String(i.is_active) !== active) return false;
  if (q && ![i.username, i.email, i.full_name].some((v) => String(v ?? '').toLowerCase().includes(q))) return false;
  return true;
};

function users(url: URL) {
  const all = loadFixture<Paged>('admin-a-users').items as Record<string, unknown>[];
  const kept = all.filter((i) => userFilter(i, url));
  const sort = url.searchParams.get('sort');
  if (sort) {
    const dir = url.searchParams.get('order') === 'desc' ? -1 : 1;
    kept.sort((a, b) => {
      const [x, y] = [a[sort], b[sort]];
      if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1; // nulls last either way
      return String(x).localeCompare(String(y)) * dir;
    });
  }
  const skip = Number(url.searchParams.get('skip') ?? 0);
  const limit = Number(url.searchParams.get('limit') ?? 100);
  return { items: kept.slice(skip, skip + limit), total: kept.length, skip, limit };
}

export const emptyList = { items: [], total: 0, skip: 0, limit: 10 };

export const adminARoutes = {
  'GET /admin/users': users,
  'GET /admin/resources': paged('admin-a-resources', supplierFilter),
  'GET /admin/suppliers': paged('admin-a-suppliers', activeOnly),
};
