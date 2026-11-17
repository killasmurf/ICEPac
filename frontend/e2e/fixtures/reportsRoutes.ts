import { loadFixture } from './load';

/** Mock routes for the Reports screen. Pass as the second argument of mockApi(page, reportsRoutes). */
export const reportsRoutes = {
  'GET /reports/catalog': () => loadFixture('reports-catalog'),
  'POST /reports/generate': () => loadFixture('reports-result'),
};
