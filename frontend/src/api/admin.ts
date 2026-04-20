/**
 * Admin API Client
 * Complete TypeScript client for all Phase 2 admin endpoints.
 */

const API_BASE = '/api/v1/admin';

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

// ── Helper ───────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

// ── Dashboard ────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () => apiFetch<any>(`${API_BASE}/dashboard`),
};

// ── Users ────────────────────────────────────────────────────

export const usersApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; role?: string; is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.skip) q.set('skip', String(params.skip));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
    return apiFetch<PaginatedResponse<User>>(`${API_BASE}/users?${q}`);
  },
  get: (id: number) => apiFetch<User>(`${API_BASE}/users/${id}`),
  create: (data: UserCreate) => apiFetch<User>(`${API_BASE}/users`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UserUpdate) => apiFetch<User>(`${API_BASE}/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`${API_BASE}/users/${id}`, { method: 'DELETE' }),
  changePassword: (id: number, newPassword: string) =>
    apiFetch<void>(`${API_BASE}/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ new_password: newPassword }) }),
};

// ── Resources ────────────────────────────────────────────────

export const resourcesApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; eoc?: string; is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.skip) q.set('skip', String(params.skip));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.eoc) q.set('eoc', params.eoc);
    if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
    return apiFetch<PaginatedResponse<Resource>>(`${API_BASE}/resources?${q}`);
  },
  get: (id: number) => apiFetch<Resource>(`${API_BASE}/resources/${id}`),
  create: (data: ResourceCreate) => apiFetch<Resource>(`${API_BASE}/resources`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: ResourceUpdate) => apiFetch<Resource>(`${API_BASE}/resources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`${API_BASE}/resources/${id}`, { method: 'DELETE' }),
  eocSummary: () => apiFetch<Record<string, number>>(`${API_BASE}/resources/eoc-summary`),
};

// ── Suppliers ────────────────────────────────────────────────

export const suppliersApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.skip) q.set('skip', String(params.skip));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
    return apiFetch<PaginatedResponse<Supplier>>(`${API_BASE}/suppliers?${q}`);
  },
  get: (id: number) => apiFetch<Supplier>(`${API_BASE}/suppliers/${id}`),
  create: (data: SupplierCreate) => apiFetch<Supplier>(`${API_BASE}/suppliers`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: SupplierUpdate) => apiFetch<Supplier>(`${API_BASE}/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`${API_BASE}/suppliers/${id}`, { method: 'DELETE' }),
};

// ── Config Tables ────────────────────────────────────────────

export const configApi = {
  listTables: () => apiFetch<ConfigTableInfo[]>(`${API_BASE}/config`),
  listItems: (table: string, params?: { skip?: number; limit?: number; is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.skip) q.set('skip', String(params.skip));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
    return apiFetch<{ items: ConfigItem[]; total: number; table_name: string }>(`${API_BASE}/config/${table}?${q}`);
  },
  getItem: (table: string, id: number) => apiFetch<ConfigItem>(`${API_BASE}/config/${table}/${id}`),
  createItem: (table: string, data: any) => apiFetch<ConfigItem>(`${API_BASE}/config/${table}`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (table: string, id: number, data: any) => apiFetch<ConfigItem>(`${API_BASE}/config/${table}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (table: string, id: number) => apiFetch<void>(`${API_BASE}/config/${table}/${id}`, { method: 'DELETE' }),
};

// ── Audit Logs ───────────────────────────────────────────────

export const auditApi = {
  list: (params?: { skip?: number; limit?: number; action?: string; entity_type?: string; user_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.skip) q.set('skip', String(params.skip));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.action) q.set('action', params.action);
    if (params?.entity_type) q.set('entity_type', params.entity_type);
    if (params?.user_id) q.set('user_id', String(params.user_id));
    return apiFetch<PaginatedResponse<AuditLog>>(`${API_BASE}/audit-logs?${q}`);
  },
  get: (id: number) => apiFetch<AuditLog>(`${API_BASE}/audit-logs/${id}`),
};
