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
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
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
import { assignableRoles, manageBlockedReason, roleChangeBlockedReason } from './userPermissions';
import {
  applyUserListChange,
  hasUserFilters,
  parseUserListState,
  userListApiParams,
  USER_ROLES,
  writeUserListState,
  type UserListState,
} from './userListState';

const ROLE_LABEL: Record<UserRole, string> = { admin: 'Admin', manager: 'Manager', user: 'User', viewer: 'Viewer' };
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

/**
 * Columns hidden below the sm breakpoint so the table does not scroll sideways on phones. Phones keep the
 * name (with the username and an inactive hint under it), the role and the three action buttons.
 */
const USER_LOW_PRIORITY = ['username', 'email', 'is_active', 'last_login'];

export default function UserManagement() {
  const columnVisibilityModel = useResponsiveColumns(USER_LOW_PRIORITY);
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const { user: me, role: actorRole } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Search, filters, sort and page live in the URL; the server does all of the work.
  const [searchParams, setSearchParams] = useSearchParams();
  const listState = parseUserListState(searchParams);
  const [searchKey, setSearchKey] = useState(0); // remounts the search box when the filters are cleared
  const changeList = (change: Partial<UserListState>, replace = false) =>
    setSearchParams(writeUserListState(applyUserListChange(listState, change)), { replace });
  const paginationModel = useMemo<GridPaginationModel>(
    () => ({ page: listState.page, pageSize: listState.pageSize }),
    [listState.page, listState.pageSize],
  );
  const sortModel = useMemo<GridSortModel>(
    () => (listState.sort ? [{ field: listState.sort, sort: listState.order }] : []),
    [listState.sort, listState.order],
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD);
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);

  const filtered = hasUserFilters(listState);
  const params = userListApiParams(listState);

  const query = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => usersApi.list(params),
    placeholderData: keepPreviousData,
  });
  const rows = query.data?.items ?? [];

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
      usersApi.changePassword(user.id, f.next, isSelf(user) ? f.current : undefined),
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
    if (isSelf(resetting) && !passwordForm.current) passwordErrors.current = 'Enter your current password';
    if (passwordForm.next.length < 8 || passwordForm.next.length > 128) passwordErrors.next = 'Password must be 8 to 128 characters';
    if (passwordForm.confirm !== passwordForm.next) passwordErrors.confirm = 'Passwords do not match';
  }
  const submitPassword = () => {
    setPasswordSubmitted(true);
    if (!resetting) return;
    if ((!isSelf(resetting) || passwordForm.current) && passwordForm.next.length >= 8 && passwordForm.next.length <= 128 && passwordForm.confirm === passwordForm.next) {
      passwordMutation.mutate({ user: resetting, form: passwordForm });
    }
  };

  const columns: GridColDef<User>[] = [
    {
      field: 'full_name',
      headerName: 'Name',
      flex: 1,
      minWidth: phone ? 100 : 120,
      valueGetter: (_v, row) => row.full_name ?? '',
      renderCell: ({ row }) => {
        const name = row.full_name || <Typography component="span" variant="inherit" color="text.secondary">Not set</Typography>;
        if (!phone) return name;
        return (
          <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
            <Typography variant="inherit" noWrap>
              {name}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div" noWrap>
              {row.is_active ? row.username : `${row.username} (inactive)`}
            </Typography>
          </Box>
        );
      },
    },
    { field: 'username', headerName: 'Username', flex: 1, minWidth: 130 },
    { field: 'email', headerName: 'Email', flex: 1.3, minWidth: 200 },
    {
      field: 'role',
      headerName: 'Role',
      width: phone ? 100 : 110,
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
      valueGetter: (_v, row) => row.last_login ?? '',
      renderCell: ({ row }) => (row.last_login ? formatDateTime(row.last_login) : 'Never'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: phone ? 112 : 150,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <RowActionButton
            label={`Edit ${row.username}`}
            icon={<EditOutlinedIcon fontSize="small" />}
            onClick={() => openEdit(row)}
            disabledReason={manageBlockedReason(actorRole, row)}
          />
          <RowActionButton
            label={`Reset password for ${row.username}`}
            icon={<LockResetIcon fontSize="small" />}
            onClick={() => openReset(row)}
            disabledReason={manageBlockedReason(actorRole, row)}
          />
          <RowActionButton
            label={`Delete ${row.username}`}
            icon={<DeleteOutlineIcon fontSize="small" />}
            color="error"
            onClick={() => setDeleting(row)}
            disabledReason={isSelf(row) ? 'You cannot delete your own account' : manageBlockedReason(actorRole, row)}
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
        key={searchKey}
        defaultValue={searchKey === 0 ? listState.search : ''}
        onChange={(search) => changeList({ search }, true)}
      />
      <TextField
        select
        size="small"
        label="Role"
        value={listState.role}
        onChange={(e) => changeList({ role: e.target.value as UserListState['role'] })}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="">All roles</MenuItem>
        {USER_ROLES.map((r) => (
          <MenuItem key={r} value={r}>
            {ROLE_LABEL[r]}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Status"
        value={listState.status}
        onChange={(e) => changeList({ status: e.target.value as UserListState['status'] })}
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
  const roleBlocked = editing ? roleChangeBlockedReason(actorRole, editingSelf) : undefined;
  // A manager's role list has no Admin; keep the current role listed if it is not assignable so the select stays valid.
  const formRoles = assignableRoles(actorRole).includes(form.role) ? assignableRoles(actorRole) : [form.role, ...assignableRoles(actorRole)];

  return (
    <Box>
      <PageHeader
        title="User Management"
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
            rowCount={query.data?.total ?? 0}
            paginationModel={paginationModel}
            onPaginationModelChange={(m) => {
              // Before the first response the grid knows no row count and clamps the page to 0: ignore that.
              if (!query.data || (m.page === listState.page && m.pageSize === listState.pageSize)) return;
              changeList(m.pageSize !== listState.pageSize ? { pageSize: m.pageSize } : { page: m.page });
            }}
            sortModel={sortModel}
            onSortModelChange={(model) =>
              changeList(model[0] ? { sort: model[0].field as UserListState['sort'], order: model[0].sort ?? 'asc' } : { sort: '', order: 'asc' })
            }
            toolbar={toolbar}
            emptyTitle={filtered ? 'No users match your filters' : 'No users yet'}
            emptyDescription={filtered ? 'Try a different search or clear the filters.' : 'Add the first user to get started.'}
            emptyAction={
              filtered ? (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearchKey((k) => k + 1);
                    changeList({ search: '', role: '', status: '' });
                  }}
                >
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
        <TextField
          select
          label="Role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          disabled={Boolean(roleBlocked)}
          helperText={roleBlocked}
        >
          {formRoles.map((r) => (
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
        {isSelf(resetting) && (
          <TextField label="Current password" type="password" slotProps={{ inputLabel: { required: true } }} value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} error={Boolean(passwordErrors.current)} helperText={passwordErrors.current ?? 'Required when changing your own password'} autoComplete="current-password" />
        )}
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
