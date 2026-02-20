/**
 * Admin API Client
 * 
 * Provides typed API calls for the admin system endpoints.
 * Part of Phase 2: Admin Circuit Migration
 */

import client from './client';

// ============================================================
// User Types & API
// ============================================================

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  role?: 'admin' | 'manager' | 'user' | 'viewer';
}

export interface UserUpdate {
  email?: string;
  username?: string;
  full_name?: string;
  role?: 'admin' | 'manager' | 'user' | 'viewer';
  is_active?: boolean;
}

export interface UserPasswordUpdate {
  current_password: string;
  new_password: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  skip: number;
  limit: number;
}

export async function getUsers(skip = 0, limit = 100): Promise<UserListResponse> {
  const response = await client.get('/admin/users', { params: { skip, limit } });
  return response.data;
}

export async function getUser(userId: number): Promise<User> {
  const response = await client.get(`/admin/users/${userId}`);
  return response.data;
}

export async function createUser(data: UserCreate): Promise<User> {
  const response = await client.post('/admin/users', data);
  return response.data;
}

export async function updateUser(userId: number, data: UserUpdate): Promise<User> {
  const response = await client.put(`/admin/users/${userId}`, data);
  return response.data;
}

export async function updateUserPassword(userId: number, data: UserPasswordUpdate): Promise<void> {
  await client.put(`/admin/users/${userId}/password`, data);
}

export async function deleteUser(userId: number): Promise<void> {
  await client.delete(`/admin/users/${userId}`);
}

// ============================================================
// Resource Types & API
// ============================================================

export interface Resource {
  id: number;
  resource_code: string;
  description: string;
  eoc: string | null;
  cost: number;
  units: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceCreate {
  resource_code: string;
  description: string;
  eoc?: string;
  cost?: number;
  units?: string;
  is_active?: boolean;
}

export interface ResourceUpdate {
  resource_code?: string;
  description?: string;
  eoc?: string;
  cost?: number;
  units?: string;
  is_active?: boolean;
}

export interface ResourceListResponse {
  items: Resource[];
  total: number;
  skip: number;
  limit: number;
}

export async function getResources(
  skip = 0,
  limit = 100,
  search?: string,
  activeOnly = false
): Promise<ResourceListResponse> {
  const response = await client.get('/admin/resources', {
    params: { skip, limit, search, active_only: activeOnly }
  });
  return response.data;
}

export async function getResource(resourceId: number): Promise<Resource> {
  const response = await client.get(`/admin/resources/${resourceId}`);
  return response.data;
}

export async function createResource(data: ResourceCreate): Promise<Resource> {
  const response = await client.post('/admin/resources', data);
  return response.data;
}

export async function updateResource(resourceId: number, data: ResourceUpdate): Promise<Resource> {
  const response = await client.put(`/admin/resources/${resourceId}`, data);
  return response.data;
}

export async function deleteResource(resourceId: number): Promise<void> {
  await client.delete(`/admin/resources/${resourceId}`);
}

// ============================================================
// Supplier Types & API
// ============================================================

export interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierCreate {
  supplier_code: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  notes?: string;
  is_active?: boolean;
}

export interface SupplierUpdate {
  supplier_code?: string;
  name?: string;
  contact?: string;
  phone?: string;
  email?: string;
  notes?: string;
  is_active?: boolean;
}

export interface SupplierListResponse {
  items: Supplier[];
  total: number;
  skip: number;
  limit: number;
}

export async function getSuppliers(
  skip = 0,
  limit = 100,
  search?: string,
  activeOnly = false
): Promise<SupplierListResponse> {
  const response = await client.get('/admin/suppliers', {
    params: { skip, limit, search, active_only: activeOnly }
  });
  return response.data;
}

export async function getSupplier(supplierId: number): Promise<Supplier> {
  const response = await client.get(`/admin/suppliers/${supplierId}`);
  return response.data;
}

export async function createSupplier(data: SupplierCreate): Promise<Supplier> {
  const response = await client.post('/admin/suppliers', data);
  return response.data;
}

export async function updateSupplier(supplierId: number, data: SupplierUpdate): Promise<Supplier> {
  const response = await client.put(`/admin/suppliers/${supplierId}`, data);
  return response.data;
}

export async function deleteSupplier(supplierId: number): Promise<void> {
  await client.delete(`/admin/suppliers/${supplierId}`);
}

// ============================================================
// Configuration Tables Types & API
// ============================================================

export interface ConfigItem {
  id: number;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface WeightedConfigItem extends ConfigItem {
  weight: number;
}

export interface ConfigItemCreate {
  code: string;
  description: string;
  is_active?: boolean;
}

export interface WeightedConfigItemCreate extends ConfigItemCreate {
  weight: number;
}

export interface ConfigItemUpdate {
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface WeightedConfigItemUpdate extends ConfigItemUpdate {
  weight?: number;
}

export interface ConfigItemListResponse {
  items: ConfigItem[];
  total: number;
}

export interface ConfigTableInfo {
  name: string;
  description: string;
  weighted: boolean;
}

export type ConfigTableName =
  | 'cost-types'
  | 'expense-types'
  | 'regions'
  | 'business-areas'
  | 'estimating-techniques'
  | 'risk-categories'
  | 'expenditure-indicators'
  | 'probability-levels'
  | 'severity-levels'
  | 'pmb-weights';

export async function getConfigTables(): Promise<{ tables: ConfigTableInfo[] }> {
  const response = await client.get('/admin/config');
  return response.data;
}

export async function getConfigItems(
  tableName: ConfigTableName,
  activeOnly = false
): Promise<ConfigItemListResponse> {
  const response = await client.get(`/admin/config/${tableName}`, {
    params: { active_only: activeOnly }
  });
  return response.data;
}

export async function getConfigItem(
  tableName: ConfigTableName,
  itemId: number
): Promise<ConfigItem | WeightedConfigItem> {
  const response = await client.get(`/admin/config/${tableName}/${itemId}`);
  return response.data;
}

export async function createConfigItem(
  tableName: ConfigTableName,
  data: ConfigItemCreate | WeightedConfigItemCreate
): Promise<ConfigItem | WeightedConfigItem> {
  const response = await client.post(`/admin/config/${tableName}`, data);
  return response.data;
}

export async function updateConfigItem(
  tableName: ConfigTableName,
  itemId: number,
  data: ConfigItemUpdate | WeightedConfigItemUpdate
): Promise<ConfigItem | WeightedConfigItem> {
  const response = await client.put(`/admin/config/${tableName}/${itemId}`, data);
  return response.data;
}

export async function deleteConfigItem(
  tableName: ConfigTableName,
  itemId: number
): Promise<void> {
  await client.delete(`/admin/config/${tableName}/${itemId}`);
}

// ============================================================
// Audit Log Types & API
// ============================================================

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  skip: number;
  limit: number;
}

export interface AuditLogFilter {
  user_id?: number;
  action?: string;
  entity_type?: string;
  entity_id?: number;
  start_date?: string;
  end_date?: string;
}

export async function getAuditLogs(
  skip = 0,
  limit = 100,
  filters?: AuditLogFilter
): Promise<AuditLogListResponse> {
  const response = await client.get('/admin/audit-logs', {
    params: { skip, limit, ...filters }
  });
  return response.data;
}

export async function getAuditLog(auditId: number): Promise<AuditLog> {
  const response = await client.get(`/admin/audit-logs/${auditId}`);
  return response.data;
}

export async function getEntityAuditHistory(
  entityType: string,
  entityId: number,
  skip = 0,
  limit = 100
): Promise<AuditLogListResponse> {
  const response = await client.get(
    `/admin/audit-logs/entity/${entityType}/${entityId}`,
    { params: { skip, limit } }
  );
  return response.data;
}

// ============================================================
// Utility Functions
// ============================================================

export function formatAuditAction(action: string): string {
  const actionLabels: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    LOGIN: 'Logged In',
    LOGOUT: 'Logged Out',
    FAILED_LOGIN: 'Failed Login',
    PASSWORD_CHANGE: 'Password Changed',
    ROLE_CHANGE: 'Role Changed',
  };
  return actionLabels[action] || action;
}

export function formatEntityType(type: string): string {
  return type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    admin: '#dc3545',
    manager: '#fd7e14',
    user: '#28a745',
    viewer: '#6c757d',
  };
  return colors[role] || '#6c757d';
}

// ============================================================
// Dashboard Stats API
// ============================================================

export interface DashboardStats {
  users: { total: number; active: number };
  resources: { total: number; active: number };
  suppliers: { total: number; active: number };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [users, resources, suppliers] = await Promise.all([
    client.get('/admin/users', { params: { skip: 0, limit: 1 } }),
    client.get('/admin/resources', { params: { skip: 0, limit: 1 } }),
    client.get('/admin/suppliers', { params: { skip: 0, limit: 1 } }),
  ]);

  const [activeResources, activeSuppliers] = await Promise.all([
    client.get('/admin/resources', { params: { skip: 0, limit: 1, active_only: true } }),
    client.get('/admin/suppliers', { params: { skip: 0, limit: 1, active_only: true } }),
  ]);

  return {
    users: { total: users.data.total, active: users.data.items.filter((u: User) => u.is_active).length || users.data.total },
    resources: { total: resources.data.total, active: activeResources.data.total },
    suppliers: { total: suppliers.data.total, active: activeSuppliers.data.total },
  };
}

// ============================================================
// Config Table Metadata
// ============================================================

export const CONFIG_TABLE_INFO: Record<ConfigTableName, { description: string; weighted: boolean }> = {
  'cost-types': { description: 'Cost Types', weighted: false },
  'expense-types': { description: 'Expense Types', weighted: false },
  'regions': { description: 'Regions', weighted: false },
  'business-areas': { description: 'Business Areas', weighted: false },
  'estimating-techniques': { description: 'Estimating Techniques', weighted: false },
  'risk-categories': { description: 'Risk Categories', weighted: false },
  'expenditure-indicators': { description: 'Expenditure Indicators', weighted: false },
  'probability-levels': { description: 'Probability Levels', weighted: true },
  'severity-levels': { description: 'Severity Levels', weighted: true },
  'pmb-weights': { description: 'PMB Weights', weighted: true },
};
