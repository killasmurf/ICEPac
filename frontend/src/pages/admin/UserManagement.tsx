/**
 * UserManagement - Admin page for managing users with full CRUD.
 */
import React, { useState, useEffect, useCallback } from 'react';
import DataGrid, { Column, StatusBadge, RoleBadge } from '../../components/admin/DataGrid';
import FormDialog from '../../components/admin/FormDialog';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import SearchBar from '../../components/admin/SearchBar';
import { User, usersApi } from '../../api/admin';

// Mock data for development
const MOCK_USERS: User[] = [
  { id: 1, email: 'admin@icepac.com', username: 'admin', full_name: 'System Admin', role: 'admin', is_active: true, is_verified: true, created_at: '2026-01-01', updated_at: '2026-01-15', last_login: '2026-01-15' },
  { id: 2, email: 'jsmith@company.com', username: 'jsmith', full_name: 'John Smith', role: 'manager', is_active: true, is_verified: true, created_at: '2026-01-05', updated_at: '2026-01-14', last_login: '2026-01-14' },
  { id: 3, email: 'mjones@company.com', username: 'mjones', full_name: 'Mary Jones', role: 'user', is_active: true, is_verified: true, created_at: '2026-01-08', updated_at: '2026-01-12', last_login: '2026-01-12' },
  { id: 4, email: 'inactive@company.com', username: 'olduser', full_name: 'Old User', role: 'viewer', is_active: false, is_verified: false, created_at: '2025-06-01', updated_at: '2025-12-01', last_login: null },
];

const EMPTY_FORM = { username: '', email: '', full_name: '', password: '', role: 'user', is_active: true };

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [total, setTotal] = useState(MOCK_USERS.length);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setForm({ username: user.username, email: user.email, full_name: user.full_name || '', role: user.role, is_active: user.is_active, password: '' });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editingUser) {
        // Update mock
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...form, updated_at: new Date().toISOString() } : u));
        showToast(`User "${form.username}" updated`);
      } else {
        const newUser: User = { ...form, id: Math.max(...users.map(u => u.id)) + 1, is_verified: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_login: null };
        setUsers(prev => [...prev, newUser]);
        setTotal(t => t + 1);
        showToast(`User "${form.username}" created`);
      }
      setShowForm(false);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!editingUser) return;
    setSaving(true);
    setUsers(prev => prev.filter(u => u.id !== editingUser.id));
    setTotal(t => t - 1);
    showToast(`User "${editingUser.username}" deleted`);
    setShowDelete(false);
    setEditingUser(null);
    setSaving(false);
  };

  const columns: Column<User>[] = [
    { key: 'username', label: 'Username', sortable: true },
    { key: 'full_name', label: 'Full Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role', render: (v) => <RoleBadge role={v} /> },
    { key: 'is_active', label: 'Status', render: (v) => <StatusBadge active={v} /> },
    { key: 'last_login', label: 'Last Login', render: (v) => v ? new Date(v).toLocaleDateString() : 'Never' },
  ];

  const filtered = users.filter(u => {
    if (search && !u.username.toLowerCase().includes(search.toLowerCase()) && !(u.full_name || '').toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active) return false;
    return true;
  });

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <div style={{ maxWidth: '1400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>User Management</h1>
          <p style={{ fontSize: '15px', color: '#64748b' }}>Manage user accounts, roles, and permissions</p>
        </div>
        <button onClick={handleCreate} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>+ Add User</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        <select style={selectStyle} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="user">User</option>
          <option value="viewer">Viewer</option>
        </select>
        <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <DataGrid columns={columns} data={filtered} total={filtered.length} page={page} pageSize={20} onPageChange={setPage} loading={loading}
          actions={(row: User) => (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleEdit(row)} style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px' }}>Edit</button>
              <button onClick={() => { setEditingUser(row); setShowDelete(true); }} style={{ padding: '4px 12px', border: '1px solid #fee2e2', borderRadius: '6px', backgroundColor: '#fff', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
            </div>
          )} />
      </div>

      <FormDialog open={showForm} title={editingUser ? 'Edit User' : 'Create User'} onClose={() => setShowForm(false)} onSubmit={handleSubmit} loading={saving}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div><label style={labelStyle}>Username</label><input style={inputStyle} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
          <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
          {!editingUser && <div><label style={labelStyle}>Password</label><input style={inputStyle} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>}
          <div><label style={labelStyle}>Role</label><select style={selectStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="admin">Admin</option><option value="manager">Manager</option><option value="user">User</option><option value="viewer">Viewer</option></select></div>
          <div><label style={labelStyle}>Status</label><select style={selectStyle} value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={showDelete} title="Delete User" message={`Are you sure you want to delete user "${editingUser?.username}"? This action cannot be undone.`} onClose={() => setShowDelete(false)} onConfirm={confirmDelete} loading={saving} confirmLabel="Delete" danger />

      {toast && <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 500, zIndex: 2000, backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444' }}>{toast.message}</div>}
    </div>
  );
}
