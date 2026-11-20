/**
 * Admin API Client
 * Complete TypeScript client for all Phase 2 admin endpoints.
 */

import client from './client';
import { toNumber, toNumberOr0 } from '../utils/number';

const API_BASE = '/admin';

// ── Types ────────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

/** POST /admin/users (UserCreate). Password is 8 to 128 characters. */
export interface UserCreate {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  role?: UserRole;
}

/** PUT /admin/users/{id} (UserUpdate). */
export interface UserUpdate {
  email?: string;
  username?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface Resource {
  id: number;
  resource_code: string;
  description: string;
  eoc: string | null;
  /** Pydantic serialises Decimal as a JSON string; normalised to a number in this API layer. */
  cost: number;
  units: string | null;
  /** Default supplier (tblSupplier.supplier_code); older servers do not send it. */
  supplier_code?: string | null;
  /** Name of the default supplier, resolved by the server. */
  supplier_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** POST /admin/resources (ResourceCreate). */
export interface ResourceCreate {
  resource_code: string;
  description: string;
  eoc?: string;
  cost: number;
  units?: string;
  /** Must be an existing supplier code (422 otherwise). */
  supplier_code?: string | null;
  is_active?: boolean;
}

/** PUT /admin/resources/{id} (ResourceUpdate). */
export interface ResourceUpdate {
  resource_code?: string;
  description?: string;
  eoc?: string;
  cost?: number;
  units?: string;
  /** null clears the default supplier. */
  supplier_code?: string | null;
  is_active?: boolean;
}

export interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** POST /admin/suppliers (SupplierCreate). */
export interface SupplierCreate {
  supplier_code: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  notes?: string;
  is_active?: boolean;
}

/** PUT /admin/suppliers/{id} (SupplierUpdate). */
export interface SupplierUpdate {
  supplier_code?: string;
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
  notes?: string;
  is_active?: boolean;
}

export interface ConfigItem {
  id: number;
  code: string;
  description: string;
  /** Present on weighted tables only (probability, severity, PMB). Normalised to a number. */
  weight?: number;
  is_active: boolean;
  created_at: string;
}

/** Create/update body for config items. `weight` is only accepted by weighted tables. */
export interface ConfigItemInput {
  code?: string;
  description?: string;
  weight?: number;
  is_active?: boolean;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  /** Server sends a JSON object; kept as unknown so the UI can handle any shape. */
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ConfigTableInfo {
  /** URL key used in /admin/config/{key}, for example "cost-types". */
  key: string;
  /** Display name, for example "Cost Types". */
  label: string;
  description: string;
  weighted: boolean;
}

// ── Users ────────────────────────────────────────────────────

// Query parameters below are limited to those the backend routes accept (see app/routes/admin.py).

export type UserSortField = 'username' | 'full_name' | 'email' | 'role' | 'last_login' | 'created_at';
export type SortOrder = 'asc' | 'desc';

/** GET /admin/users query: search, filters and sorting are all applied by the server. */
export interface UserListParams {
  skip?: number;
  limit?: number;
  /** Case-insensitive match on username, email and full name. */
  search?: string;
  role?: UserRole;
  is_active?: boolean;
  sort?: UserSortField;
  order?: SortOrder;
}

export const usersApi = {
  list: (params?: UserListParams) =>
    client
      .get<PaginatedResponse<User>>(`${API_BASE}/users`, {
        params: {
          skip: params?.skip,
          limit: params?.limit,
          search: params?.search || undefined,
          role: params?.role,
          is_active: params?.is_active,
          sort: params?.sort,
          order: params?.sort ? params.order : undefined,
        },
      })
      .then((r) => r.data),
  get: (id: number) => client.get<User>(`${API_BASE}/users/${id}`).then((r) => r.data),
  create: (data: UserCreate) => client.post<User>(`${API_BASE}/users`, data).then((r) => r.data),
  update: (id: number, data: UserUpdate) => client.put<User>(`${API_BASE}/users/${id}`, data).then((r) => r.data),
  delete: (id: number) => client.delete<void>(`${API_BASE}/users/${id}`).then((r) => r.data),
  /**
   * PUT /admin/users/{id}/password. An admin resetting another user's password sends only `new_password`;
   * a user changing their own must also send `current_password`.
   */
  changePassword: (id: number, newPassword: string, currentPassword?: string) =>
    client
      .put<void>(`${API_BASE}/users/${id}/password`, {
        new_password: newPassword,
        ...(currentPassword ? { current_password: currentPassword } : {}),
      })
      .then((r) => r.data),
};

// ── Resources ────────────────────────────────────────────────

type RawResource = Omit<Resource, 'cost'> & { cost: number | string | null | undefined };

/** The API serialises Decimal cost as a string; convert to a number. */
export const normalizeResource = (raw: RawResource): Resource => ({ ...raw, cost: toNumberOr0(raw.cost) });

export const resourcesApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; is_active?: boolean; supplier_code?: string }) =>
    client
      .get<PaginatedResponse<RawResource>>(`${API_BASE}/resources`, {
        params: {
          skip: params?.skip,
          limit: params?.limit,
          search: params?.search,
          active_only: params?.is_active ? true : undefined,
          supplier_code: params?.supplier_code || undefined,
        },
      })
      .then((r) => ({ ...r.data, items: r.data.items.map(normalizeResource) })),
  get: (id: number) => client.get<RawResource>(`${API_BASE}/resources/${id}`).then((r) => normalizeResource(r.data)),
  create: (data: ResourceCreate) =>
    client.post<RawResource>(`${API_BASE}/resources`, data).then((r) => normalizeResource(r.data)),
  update: (id: number, data: ResourceUpdate) =>
    client.put<RawResource>(`${API_BASE}/resources/${id}`, data).then((r) => normalizeResource(r.data)),
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

interface RawConfigTable {
  /** Route key such as "cost-types". Older backends do not send it. */
  key?: string;
  /** Display label such as "Cost Types". */
  name: string;
  description: string;
  weighted: boolean;
}

/** Fallback for an older backend that sends no `key`: turn the display name ("Cost Types") into the route key ("cost-types"). */
export const configTableKey = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * GET /admin/config returns `{ tables: [{ key, name, description, weighted }] }` where `key` is the route
 * key and `name` the display label. Without `key` (older backend) the key is derived from the label.
 */
export const normalizeConfigTables = (raw: { tables?: RawConfigTable[] } | RawConfigTable[] | null | undefined) => {
  const list = Array.isArray(raw) ? raw : (raw?.tables ?? []);
  return list.map<ConfigTableInfo>((t) => ({
    key: t.key || configTableKey(t.name),
    label: t.name,
    description: t.description,
    weighted: Boolean(t.weighted),
  }));
};

/** The API serialises Decimal weights as strings; convert to numbers. */
export const normalizeConfigItem = (item: Omit<ConfigItem, 'weight'> & { weight?: number | string | null }): ConfigItem => {
  const { weight, ...rest } = item;
  if (weight === undefined || weight === null) return rest;
  const n = toNumber(weight);
  return n === null ? rest : { ...rest, weight: n };
};

export const configApi = {
  listTables: () =>
    client.get<{ tables: RawConfigTable[] }>(`${API_BASE}/config`).then((r) => normalizeConfigTables(r.data)),
  // The config list route takes only `active_only` (no pagination).
  listItems: (table: string, params?: { skip?: number; limit?: number; is_active?: boolean }) =>
    client
      .get<{ items: Parameters<typeof normalizeConfigItem>[0][]; total: number }>(`${API_BASE}/config/${table}`, {
        params: { active_only: params?.is_active ? true : undefined },
      })
      .then((r) => ({ ...r.data, table_name: table, items: r.data.items.map(normalizeConfigItem) })),
  getItem: (table: string, id: number) =>
    client.get<ConfigItem>(`${API_BASE}/config/${table}/${id}`).then((r) => normalizeConfigItem(r.data)),
  createItem: (table: string, data: ConfigItemInput) =>
    client.post<ConfigItem>(`${API_BASE}/config/${table}`, data).then((r) => normalizeConfigItem(r.data)),
  updateItem: (table: string, id: number, data: ConfigItemInput) =>
    client.put<ConfigItem>(`${API_BASE}/config/${table}/${id}`, data).then((r) => normalizeConfigItem(r.data)),
  deleteItem: (table: string, id: number) =>
    client.delete<void>(`${API_BASE}/config/${table}/${id}`).then((r) => r.data),
};

// ── Audit Logs ───────────────────────────────────────────────

export interface AuditLogParams {
  skip?: number;
  limit?: number;
  action?: string;
  entity_type?: string;
  user_id?: number;
}

export const auditApi = {
  list: (params?: AuditLogParams) =>
    client.get<PaginatedResponse<AuditLog>>(`${API_BASE}/audit-logs`, { params }).then((r) => r.data),
  get: (id: number) => client.get<AuditLog>(`${API_BASE}/audit-logs/${id}`).then((r) => r.data),
};
