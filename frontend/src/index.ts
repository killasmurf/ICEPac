/**
 * Admin Module Barrel Exports
 *
 * Router setup example:
 *
 * import { AdminLayout, AdminDashboard, UserManagement, ResourceLibrary,
 *          SupplierManagement, ConfigTables, AuditLogs } from './admin';
 *
 * <Route path="/admin" element={<AdminLayout />}>
 *   <Route index element={<AdminDashboard />} />
 *   <Route path="users" element={<UserManagement />} />
 *   <Route path="resources" element={<ResourceLibrary />} />
 *   <Route path="suppliers" element={<SupplierManagement />} />
 *   <Route path="config" element={<ConfigTables />} />
 *   <Route path="audit-logs" element={<AuditLogs />} />
 * </Route>
 */

// Layout
export { default as AdminLayout } from './pages/admin/AdminLayout';

// Pages
export { default as AdminDashboard } from './pages/admin/AdminDashboard';
export { default as UserManagement } from './pages/admin/UserManagement';
export { default as ResourceLibrary } from './pages/admin/ResourceLibrary';
export { default as SupplierManagement } from './pages/admin/SupplierManagement';
export { default as ConfigTables } from './pages/admin/ConfigTables';
export { default as AuditLogs } from './pages/admin/AuditLogs';

// Components
export { default as DataGrid, StatusBadge, RoleBadge } from './components/admin/DataGrid';
export { default as FormDialog } from './components/admin/FormDialog';
export { default as ConfirmDialog } from './components/admin/ConfirmDialog';
export { default as SearchBar } from './components/admin/SearchBar';
