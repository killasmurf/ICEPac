/**
 * UserManagement Component
 *
 * Admin page for managing system users with full CRUD operations.
 * Connected to real backend API endpoints.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataGrid, { Column, StatusBadge, RoleBadge } from '../../components/admin/DataGrid';
import FormDialog from '../../components/admin/FormDialog';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import SearchBar from '../../components/admin/SearchBar';
import { getUsers, createUser, updateUser, deleteUser, User, UserCreate, UserUpdate } from '../../api/admin';

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  titleSection: {},
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  filterSelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#475569',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  error: {
    color: '#dc2626',
    fontSize: '13px',
    marginTop: '4px',
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '16px 24px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  toastSuccess: {
    backgroundColor: '#10b981',
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
};

interface UserFormData {
  email: string;
  username: string;
  password: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  is_active: boolean;
}

const initialFormData: UserFormData = {
  email: '',
  username: '',
  password: '',
  full_name: '',
  role: 'user',
  is_active: true,
};

function UserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load users from API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUsers(skip, limit);
      let filtered = response.items;

      // Client-side filtering (search/role/status filters)
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(u =>
          u.username.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.full_name?.toLowerCase().includes(searchLower)
        );
      }

      if (roleFilter !== 'all') {
        filtered = filtered.filter(u => u.role === roleFilter);
      }

      if (statusFilter === 'active') {
        filtered = filtered.filter(u => u.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(u => !u.is_active);
      }

      setUsers(filtered);
      setTotal(response.total);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [skip, limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Check for action param
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowCreateDialog(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.username) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!selectedUser && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create
  const handleCreate = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload: UserCreate = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name || undefined,
        role: formData.role,
      };
      await createUser(payload);
      showToast('User created successfully', 'success');
      setShowCreateDialog(false);
      setFormData(initialFormData);
      loadUsers();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to create user', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle edit
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      username: user.username,
      password: '',
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active,
    });
    setFormErrors({});
    setShowEditDialog(true);
  };

  // Handle update
  const handleUpdate = async () => {
    if (!validateForm() || !selectedUser) return;

    setSaving(true);
    try {
      const payload: UserUpdate = {
        email: formData.email,
        username: formData.username,
        full_name: formData.full_name || undefined,
        role: formData.role,
        is_active: formData.is_active,
      };
      await updateUser(selectedUser.id, payload);
      showToast('User updated successfully', 'success');
      setShowEditDialog(false);
      setSelectedUser(null);
      setFormData(initialFormData);
      loadUsers();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to update user', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      await deleteUser(selectedUser.id);
      showToast('User deleted successfully', 'success');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to delete user', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Table columns
  const columns: Column<User>[] = [
    {
      key: 'username',
      header: 'Username',
      sortable: true,
      render: (user) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 600,
            color: '#475569',
          }}>
            {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || user.username[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 500, color: '#0f172a' }}>{user.username}</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>{user.full_name || 'No name'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (user) => <RoleBadge role={user.role} />,
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      render: (user) => <StatusBadge isActive={user.is_active} />,
    },
    {
      key: 'last_login',
      header: 'Last Login',
      sortable: true,
      render: (user) => (
        <span style={{ color: '#64748b', fontSize: '13px' }}>
          {user.last_login
            ? new Date(user.last_login).toLocaleDateString()
            : 'Never'}
        </span>
      ),
    },
  ];

  // Form input handler
  const handleInputChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>User Management</h1>
          <p style={styles.subtitle}>Manage system users and their permissions</p>
        </div>
        <div style={styles.actions}>
          <button
            style={styles.primaryButton}
            onClick={() => {
              setFormData(initialFormData);
              setFormErrors({});
              setShowCreateDialog(true);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add User
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search users..."
        />
        <div style={styles.filters}>
          <select
            style={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
            <option value="viewer">Viewer</option>
          </select>
          <select
            style={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Data Grid */}
      <div style={styles.tableCard}>
        <DataGrid
          data={users}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No users found"
          onEdit={handleEdit}
          onDelete={handleDelete}
          pagination={{
            total,
            skip,
            limit,
            onPageChange: setSkip,
          }}
        />
      </div>

      {/* Create Dialog */}
      <FormDialog
        open={showCreateDialog}
        title="Create New User"
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreate}
        loading={saving}
        submitLabel="Create User"
      >
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              style={styles.input}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="user@example.com"
            />
            {formErrors.email && <span style={styles.error}>{formErrors.email}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username *</label>
            <input
              type="text"
              style={styles.input}
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="username"
            />
            {formErrors.username && <span style={styles.error}>{formErrors.username}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Password *</label>
            <input
              type="password"
              style={styles.input}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Min 8 characters"
            />
            {formErrors.password && <span style={styles.error}>{formErrors.password}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              style={styles.input}
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select
              style={styles.select}
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value as any)}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Status</label>
            <select
              style={styles.select}
              value={formData.is_active ? 'active' : 'inactive'}
              onChange={(e) => handleInputChange('is_active', e.target.value === 'active')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </FormDialog>

      {/* Edit Dialog */}
      <FormDialog
        open={showEditDialog}
        title="Edit User"
        onClose={() => setShowEditDialog(false)}
        onSubmit={handleUpdate}
        loading={saving}
        submitLabel="Save Changes"
      >
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              style={styles.input}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
            {formErrors.email && <span style={styles.error}>{formErrors.email}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username *</label>
            <input
              type="text"
              style={styles.input}
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
            />
            {formErrors.username && <span style={styles.error}>{formErrors.username}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>New Password (leave blank to keep)</label>
            <input
              type="password"
              style={styles.input}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter new password"
            />
            {formErrors.password && <span style={styles.error}>{formErrors.password}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              style={styles.input}
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select
              style={styles.select}
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value as any)}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Status</label>
            <select
              style={styles.select}
              value={formData.is_active ? 'active' : 'inactive'}
              onChange={(e) => handleInputChange('is_active', e.target.value === 'active')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </FormDialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete User"
        message={`Are you sure you want to delete user "${selectedUser?.username}"? This action cannot be undone.`}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        loading={saving}
        confirmLabel="Delete"
        danger
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            ...(toast.type === 'success' ? styles.toastSuccess : styles.toastError),
          }}
        >
          {toast.type === 'success' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default UserManagement;
