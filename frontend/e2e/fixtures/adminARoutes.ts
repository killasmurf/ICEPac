import { loadFixture } from './mockApi';

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

export const emptyList = { items: [], total: 0, skip: 0, limit: 10 };

export const adminARoutes = {
  'GET /admin/users': paged('admin-a-users'),
  'GET /admin/resources': paged('admin-a-resources', activeOnly),
  'GET /admin/suppliers': paged('admin-a-suppliers', activeOnly),
};
