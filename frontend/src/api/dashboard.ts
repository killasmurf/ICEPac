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

export interface HealthStatus {
  overall: 'healthy' | 'degraded';
  [component: string]: unknown;
}

export const getDashboardStats = () => client.get<DashboardStats>('/dashboard/stats').then((r) => r.data);

export const getHealth = () => client.get<HealthStatus>('/dashboard/health-detailed').then((r) => r.data);
