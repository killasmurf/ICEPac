/**
 * UserManagement - Admin page for managing user accounts (list, create, edit, reset password, delete).
 */
import React, { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockResetIcon from '@mui/icons-material/LockReset';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { usersApi, type User, type UserCreate, type UserRole, type UserUpdate } from '../../api/admin';
import { useAuth } from '../../auth/AuthContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable, { useResponsiveColumns } from '../../components/common/DataTable';
import ErrorState from '../../components/common/ErrorState';
import FormDialog from '../../components/common/FormDialog';
import PageHeader from '../../components/common/PageHeader';
import SearchField from '../../components/common/SearchField';
import StatusChip from '../../components/common/StatusChip';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatDateTime } from '../../utils/format';
import RowActionButton from './RowActionButton';
import { filterUsers, hasUserFilters, NO_USER_FILTERS, type UserFilters } from './userFilters';

const ROLES: UserRole[] = ['admin', 'manager', 'user', 'viewer'];
const ROLE_LABEL: Record<UserRole, string> = { admin: 'Admin', manager: 'Manager', user: 'User', viewer: 'Viewer' };
const FILTERED_FETCH_LIMIT = 1000; // the API maximum; used when client-side filters are active
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserForm {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
  is_active: boolean;
}

const EMPTY_FORM: UserForm = { username: '', email: '', full_name: '', password: '', role: 'user', is_active: true };

type FormErrors = Partial<Record<keyof UserForm, string>>;

function validate(form: UserForm, creating: boolean): FormErrors {
  const errors: FormErrors = {};
  if (form.username.trim().length < 3) errors.username = 'Username must be at least 3 characters';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (creating && (form.password.length < 8 || form.password.length > 128)) {
    errors.password = 'Password must be 8 to 128 characters';
  }
  return errors;
}

interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}
const EMPTY_PASSWORD: PasswordForm = { current: '', next: '', confirm: '' };

/** Columns hidden below the sm breakpoint so the table does not scroll sideways on phones. */
const USER_LOW_PRIORITY = ['email', 'last_login'];

export default function UserManagement() {
  const columnVisibilityModel = useResponsiveColumns(USER_LOW_PRIORITY);
  const { user: me } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [filters, setFilters] = useState<UserFilters>(NO_USER_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD);
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);

  const filtered = hasUserFilters(filters);
  const params = filtered
    ? { skip: 0, limit: FILTERED_FETCH_LIMIT }
    : { skip: paginationModel.page * paginationModel.pageSize, limit: paginationModel.pageSize };

  const query = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => usersApi.list(params),
    placeholderData: keepPreviousData,
  });

  const rows = useMemo(
    () => (query.data ? (filtered ? filterUsers(query.data.items, filters) : query.data.items) : []),
    [query.data, filtered, filters],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });

  const saveMutation = useMutation({
    mutationFn: (): Promise<User> => {
      if (editing) {
        const body: UserUpdate = {
          username: form.username.trim(),
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          role: form.role,
          is_active: form.is_active,
        };
        return usersApi.update(editing.id, body);
      }
      const body: UserCreate = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        ...(form.full_name.trim() ? { full_name: form.full_name.trim() } : {}),
      };
      return usersApi.create(body);
    },
    onSuccess: (saved) => {
      toast.success(editing ? `User "${saved.username}" updated` : `User "${saved.username}" created`);
      setFormOpen(false);
      void invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (user: User) => usersApi.delete(user.id),
    onSuccess: (_data, user) => {
      toast.success(`User "${user.username}" deleted`);
      setDeleting(null);
      void invalidate();
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ user, form: f }: { user: User; form: PasswordForm }) =>
      usersApi.changePassword(user.id, f.next, f.current),
    onSuccess: (_data, { user }) => {
      toast.success(`Password updated for "${user.username}"`);
      setResetting(null);
    },
  });

  const isSelf = (u: User | null) => u != null && me != null && u.id === me.id;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSubmitted(false);
    setFormOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, full_name: u.full_name ?? '', password: '', role: u.role, is_active: u.is_active });
    setSubmitted(false);
    setFormOpen(true);
  };
  const openReset = (u: User) => {
    setResetting(u);
    setPasswordForm(EMPTY_PASSWORD);
    setPasswordSubmitted(false);
  };

  const errors = submitted ? validate(form, editing === null) : {};
  const submit = () => {
    setSubmitted(true);
    if (Object.keys(validate(form, editing === null)).length === 0) saveMutation.mutate();
  };

  const passwordErrors: Partial<Record<keyof PasswordForm, string>> = {};
  if (passwordSubmitted) {
    if (!passwordForm.current) passwordErrors.current = 'Enter the current password';
    if (passwordForm.next.length < 8 || passwordForm.next.length > 128) passwordErrors.next = 'Password must be 8 to 128 characters';
    if (passwordForm.confirm !== passwordForm.next) passwordErrors.confirm = 'Passwords do not match';
  }
  const submitPassword = () => {
    setPasswordSubmitted(true);
    if (!resetting) return;
    if (passwordForm.current && passwordForm.next.length >= 8 && passwordForm.next.length <= 128 && passwordForm.confirm === passwordForm.next) {
      passwordMutation.mutate({ user: resetting, form: passwordForm });
    }
  };

  const columns: GridColDef<User>[] = [
    {
      field: 'full_name',
      headerName: 'Name',
      flex: 1,
      minWidth: 160,
      sortable: false,
      valueGetter: (_v, row) => row.full_name ?? '',
      renderCell: ({ row }) => row.full_name || <Typography component="span" variant="inherit" color="text.secondary">Not set</Typography>,
    },
    { field: 'username', headerName: 'Username', flex: 1, minWidth: 130, sortable: false },
    { field: 'email', headerName: 'Email', flex: 1.3, minWidth: 200, sortable: false },
    {
      field: 'role',
      headerName: 'Role',
      width: 120,
      sortable: false,
      renderCell: ({ row }) => <StatusChip kind="role" value={row.role} />,
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 110,
      sortable: false,
      renderCell: ({ row }) => <StatusChip kind="active" value={row.is_active} />,
    },
    {
      field: 'last_login',
      headerName: 'Last login',
      width: 180,
      sortable: false,
      valueGetter: (_v, row) => row.last_login ?? '',
      renderCell: ({ row }) => (row.last_login ? formatDateTime(row.last_login) : 'Never'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <RowActionButton label={`Edit ${row.username}`} icon={<EditOutlinedIcon fontSize="small" />} onClick={() => openEdit(row)} />
          <RowActionButton label={`Reset password for ${row.username}`} icon={<LockResetIcon fontSize="small" />} onClick={() => openReset(row)} />
          <RowActionButton
            label={`Delete ${row.username}`}
            icon={<DeleteOutlineIcon fontSize="small" />}
            color="error"
            onClick={() => setDeleting(row)}
            disabledReason={isSelf(row) ? 'You cannot delete your own account' : undefined}
          />
        </Box>
      ),
    },
  ];

  const toolbar = (
    <>
      <SearchField
        label="Search users"
        placeholder="Search users"
        onChange={(search) => {
          setFilters((f) => ({ ...f, search }));
          setPaginationModel((m) => ({ ...m, page: 0 }));
        }}
      />
      <TextField
        select
        size="small"
        label="Role"
        value={filters.role}
        onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value as UserFilters['role'] }))}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="">All roles</MenuItem>
        {ROLES.map((r) => (
          <MenuItem key={r} value={r}>
            {ROLE_LABEL[r]}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Status"
        value={filters.status}
        onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as UserFilters['status'] }))}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="">All statuses</MenuItem>
        <MenuItem value="active">Active</MenuItem>
        <MenuItem value="inactive">Inactive</MenuItem>
      </TextField>
    </>
  );

  const failedFirstLoad = query.isError && !query.data;
  const editingSelf = isSelf(editing);

  return (
    <Box>
      <PageHeader
        title="User management"
        subtitle="Manage user accounts, roles and access"
        actions={
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={openCreate}>
            Add user
          </Button>
        }
      />

      <Card sx={{ p: 2 }}>
        {failedFirstLoad ? (
          <ErrorState
            title="Could not load users"
            description="Something went wrong while loading users. Check your connection and try again."
            action={
              <Button variant="outlined" onClick={() => query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <DataTable<User>
            columnVisibilityModel={columnVisibilityModel}
            ariaLabel="Users"
            rows={rows}
            columns={columns}
            loading={query.isLoading || (query.isFetching && query.isPlaceholderData)}
            rowCount={filtered ? undefined : (query.data?.total ?? 0)}
            paginationModel={filtered ? undefined : paginationModel}
            onPaginationModelChange={filtered ? undefined : setPaginationModel}
            toolbar={toolbar}
            emptyTitle={filtered ? 'No users match your filters' : 'No users yet'}
            emptyDescription={filtered ? 'Try a different search or clear the filters.' : 'Add the first user to get started.'}
            emptyAction={
              filtered ? (
                <Button variant="outlined" onClick={() => setFilters(NO_USER_FILTERS)}>
                  Clear filters
                </Button>
              ) : (
                <Button variant="contained" color="secondary" onClick={openCreate}>
                  Add user
                </Button>
              )
            }
          />
        )}
      </Card>

      <FormDialog
        open={formOpen}
        title={editing ? 'Edit user' : 'Add user'}
        submitLabel={editing ? 'Save changes' : 'Create user'}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        loading={saveMutation.isPending}
      >
        <TextField label="Username" slotProps={{ inputLabel: { required: true } }} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} error={Boolean(errors.username)} helperText={errors.username ?? 'At least 3 characters'} autoComplete="off" />
        <TextField label="Email" type="email" slotProps={{ inputLabel: { required: true } }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={Boolean(errors.email)} helperText={errors.email} autoComplete="off" />
        <TextField label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        {!editing && (
          <TextField label="Password" type="password" slotProps={{ inputLabel: { required: true } }} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={Boolean(errors.password)} helperText={errors.password ?? 'At least 8 characters'} autoComplete="new-password" />
        )}
        <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
          {ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {ROLE_LABEL[r]}
            </MenuItem>
          ))}
        </TextField>
        {editing && (
          <TextField
            select
            label="Status"
            value={form.is_active ? 'active' : 'inactive'}
            onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}
            disabled={editingSelf}
            helperText={editingSelf ? 'You cannot deactivate your own account' : undefined}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        )}
      </FormDialog>

      <FormDialog
        open={resetting !== null}
        title={`Reset password${resetting ? ` for ${resetting.username}` : ''}`}
        submitLabel="Update password"
        onClose={() => setResetting(null)}
        onSubmit={submitPassword}
        loading={passwordMutation.isPending}
      >
        <TextField label="Current password" type="password" slotProps={{ inputLabel: { required: true } }} value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} error={Boolean(passwordErrors.current)} helperText={passwordErrors.current ?? 'The API verifies the existing password before changing it'} autoComplete="off" />
        <TextField label="New password" type="password" slotProps={{ inputLabel: { required: true } }} value={passwordForm.next} onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })} error={Boolean(passwordErrors.next)} helperText={passwordErrors.next ?? 'At least 8 characters'} autoComplete="new-password" />
        <TextField label="Confirm new password" type="password" slotProps={{ inputLabel: { required: true } }} value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} error={Boolean(passwordErrors.confirm)} helperText={passwordErrors.confirm} autoComplete="new-password" />
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete user"
        message={`Delete user "${deleting?.username ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </Box>
  );
}
