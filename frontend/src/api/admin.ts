/**
 * Admin API Client
 * Complete TypeScript client for all Phase 2 admin endpoints.
 */

import client from './client';

const API_BASE = '/admin';

// ── Types ────────────────────────────────────────────────────

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
  role?: string;
  is_active?: boolean;
}

export interface UserUpdate {
  email?: string;
  username?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

export interface Resource {
  id: number;
  resource_code: string;
  description: string;
  eoc?: string;
  cost: number;
  units?: string;
  supplier_id?: number;
  supplier_name?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceCreate {
  resource_code: string;
  description: string;
  eoc?: string;
  cost: number;
  units?: string;
  supplier_id?: number;
  supplier_name?: string;
  notes?: string;
}

export interface ResourceUpdate {
  resource_code?: string;
  description?: string;
  eoc?: string;
  cost?: number;
  units?: string;
  supplier_id?: number;
  supplier_name?: string;
  notes?: string;
  is_active?: boolean;
}

export interface Supplier {
  id: number;
  supplier_code?: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierCreate {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
}

export interface SupplierUpdate {
  name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  is_active?: boolean;
}

export interface ConfigItem {
  id: number;
  name: string;
  description?: string;
  code?: string;
  weight?: number;
  level?: number;
  category?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: string;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ConfigTableInfo {
  name: string;
  label: string;
  description: string;
  weighted: boolean;
}

// ── Users ────────────────────────────────────────────────────

// Query parameters below are limited to those the backend route accepts
// (see app/routes/admin.py). Optional filter fields kept on the types for
// source compatibility but not supported by the server are not sent.

export const usersApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; role?: string; is_active?: boolean }) =>
    client
      .get<PaginatedResponse<User>>(`${API_BASE}/users`, { params: { skip: params?.skip, limit: params?.limit } })
      .then((r) => r.data),
  get: (id: number) => client.get<User>(`${API_BASE}/users/${id}`).then((r) => r.data),
  create: (data: UserCreate) => client.post<User>(`${API_BASE}/users`, data).then((r) => r.data),
  update: (id: number, data: UserUpdate) => client.put<User>(`${API_BASE}/users/${id}`, data).then((r) => r.data),
  delete: (id: number) => client.delete<void>(`${API_BASE}/users/${id}`).then((r) => r.data),
  changePassword: (id: number, newPassword: string, currentPassword = '') =>
    client
      .put<void>(`${API_BASE}/users/${id}/password`, { current_password: currentPassword, new_password: newPassword })
      .then((r) => r.data),
};

// ── Resources ────────────────────────────────────────────────

export const resourcesApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; eoc?: string; is_active?: boolean }) =>
    client
      .get<PaginatedResponse<Resource>>(`${API_BASE}/resources`, {
        params: {
          skip: params?.skip,
          limit: params?.limit,
          search: params?.search,
          active_only: params?.is_active ? true : undefined,
        },
      })
      .then((r) => r.data),
  get: (id: number) => client.get<Resource>(`${API_BASE}/resources/${id}`).then((r) => r.data),
  create: (data: ResourceCreate) => client.post<Resource>(`${API_BASE}/resources`, data).then((r) => r.data),
  update: (id: number, data: ResourceUpdate) =>
    client.put<Resource>(`${API_BASE}/resources/${id}`, data).then((r) => r.data),
  delete: (id: number) => client.delete<void>(`${API_BASE}/resources/${id}`).then((r) => r.data),
};

// ── Suppliers ────────────────────────────────────────────────

export const suppliersApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; is_active?: boolean }) =>
    client
      .get<PaginatedResponse<Supplier>>(`${API_BASE}/suppliers`, {
        params: {
          skip: params?.skip,
          limit: params?.limit,
          search: params?.search,
          active_only: params?.is_active ? true : undefined,
        },
      })
      .then((r) => r.data),
  get: (id: number) => client.get<Supplier>(`${API_BASE}/suppliers/${id}`).then((r) => r.data),
  create: (data: SupplierCreate) => client.post<Supplier>(`${API_BASE}/suppliers`, data).then((r) => r.data),
  update: (id: number, data: SupplierUpdate) =>
    client.put<Supplier>(`${API_BASE}/suppliers/${id}`, data).then((r) => r.data),
  delete: (id: number) => client.delete<void>(`${API_BASE}/suppliers/${id}`).then((r) => r.data),
};

// ── Config Tables ────────────────────────────────────────────

export const configApi = {
  listTables: () => client.get<ConfigTableInfo[]>(`${API_BASE}/config`).then((r) => r.data),
  // The config list route takes only `active_only` (no pagination).
  listItems: (table: string, params?: { skip?: number; limit?: number; is_active?: boolean }) =>
    client
      .get<{ items: ConfigItem[]; total: number; table_name: string }>(`${API_BASE}/config/${table}`, {
        params: { active_only: params?.is_active ? true : undefined },
      })
      .then((r) => r.data),
  getItem: (table: string, id: number) =>
    client.get<ConfigItem>(`${API_BASE}/config/${table}/${id}`).then((r) => r.data),
  createItem: (table: string, data: Partial<ConfigItem>) =>
    client.post<ConfigItem>(`${API_BASE}/config/${table}`, data).then((r) => r.data),
  updateItem: (table: string, id: number, data: Partial<ConfigItem>) =>
    client.put<ConfigItem>(`${API_BASE}/config/${table}/${id}`, data).then((r) => r.data),
  deleteItem: (table: string, id: number) =>
    client.delete<void>(`${API_BASE}/config/${table}/${id}`).then((r) => r.data),
};

// ── Audit Logs ───────────────────────────────────────────────

export const auditApi = {
  list: (params?: { skip?: number; limit?: number; action?: string; entity_type?: string; user_id?: number }) =>
    client.get<PaginatedResponse<AuditLog>>(`${API_BASE}/audit-logs`, { params }).then((r) => r.data),
  get: (id: number) => client.get<AuditLog>(`${API_BASE}/audit-logs/${id}`).then((r) => r.data),
};
