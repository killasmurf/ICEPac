import { loadFixture } from './load';

/** Extra mock routes for the admin config tables, audit logs and overview screens. */
export const adminBRoutes = {
  'GET /admin/config': () => loadFixture('admin-b-config-tables'),
  'GET /admin/config/cost-types': () => loadFixture('admin-b-config-cost-types'),
  'GET /admin/config/regions': () => ({ items: [], total: 0 }),
  'GET /admin/config/probability-levels': () => loadFixture('admin-b-config-probability-levels'),
  'POST /admin/config/cost-types': () => ({
    id: 4,
    code: 'PLANT',
    description: 'Plant hire',
    is_active: true,
    created_at: '2026-11-16T00:00:00Z',
  }),
  'PUT /admin/config/cost-types/1': () => ({
    id: 1,
    code: 'LABOUR',
    description: 'Direct labour (updated)',
    is_active: true,
    created_at: '2026-01-05T00:00:00Z',
  }),
  'DELETE /admin/config/cost-types/2': () => null,
  'POST /admin/config/probability-levels': () => ({
    id: 14,
    code: 'VH',
    description: 'Very high',
    weight: '95.00',
    is_active: true,
    created_at: '2026-11-16T00:00:00Z',
  }),
  'GET /admin/audit-logs': () => loadFixture('admin-b-audit-logs'),
  'GET /dashboard/stats': () => loadFixture('admin-b-dashboard-stats'),
};
