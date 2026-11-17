import client from './client';

export interface RecentActivity {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  username: string | null;
  created_at: string | null;
}

export interface DashboardStats {
  projects: { total: number; active: number };
  wbs: { total: number; approved: number; pending: number };
  estimation: { assignments: number; risks: number; total_pert: number };
  admin: { users: number; active_users: number; resources: number; suppliers: number };
  reports: { generated: number; available_types: number };
  help: { topics: number };
  recent_activity: RecentActivity[];
}

/** One checked component, e.g. `database`. Extra keys depend on the component (version, note, error, java_home). */
export interface HealthComponent {
  status: string;
  version?: string;
  note?: string;
  error?: string;
}

/**
 * GET /dashboard/health-detailed: `overall`, one object per component (app, database, cache, storage, java)
 * and `circuits`, a map of module name to status word. Typed loosely so a new component still renders.
 */
export interface HealthStatus {
  overall: string;
  [component: string]: HealthComponent | Record<string, string> | string | undefined;
}

export interface PortfolioProject {
  project_id: number;
  name: string;
  status: string;
  wbs_total: number;
  wbs_approved: number;
  wbs_submitted: number;
  total_pert: number;
  risk_count: number;
}

export interface ApprovalTotals {
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
}

export interface Portfolio {
  projects: PortfolioProject[];
  approval_totals: ApprovalTotals;
}

export const getDashboardStats = () => client.get<DashboardStats>('/dashboard/stats').then((r) => r.data);

export const getHealth = () => client.get<HealthStatus>('/dashboard/health-detailed').then((r) => r.data);

export const getPortfolio = (limit = 20) =>
  client.get<Portfolio>('/dashboard/portfolio', { params: { limit } }).then((r) => r.data);
