/**
 * SupplierManagement - Admin page for managing suppliers (list, search, create, edit, delete).
 */
import React, { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { suppliersApi, type Supplier, type SupplierCreate } from '../../api/admin';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable from '../../components/common/DataTable';
import ErrorState from '../../components/common/ErrorState';
import FormDialog from '../../components/common/FormDialog';
import PageHeader from '../../components/common/PageHeader';
import SearchField from '../../components/common/SearchField';
import StatusChip from '../../components/common/StatusChip';
import { useToast } from '../../components/feedback/ToastProvider';
import RowActionButton from './RowActionButton';

interface SupplierForm {
  supplier_code: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  notes: string;
  is_active: boolean;
}

const EMPTY_FORM: SupplierForm = { supplier_code: '', name: '', contact: '', email: '', phone: '', notes: '', is_active: true };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = Partial<Record<keyof SupplierForm, string>>;

function validate(form: SupplierForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.supplier_code.trim()) errors.supplier_code = 'Supplier code is required';
  if (!form.name.trim()) errors.name = 'Name is required';
  if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address';
  return errors;
}

export default function SupplierManagement() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  const params = {
    skip: paginationModel.page * paginationModel.pageSize,
    limit: paginationModel.pageSize,
    search: search || undefined,
    is_active: activeOnly || undefined,
  };

  const query = useQuery({
    queryKey: ['admin', 'suppliers', params],
    queryFn: () => suppliersApi.list(params),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] });

  const saveMutation = useMutation({
    mutationFn: (): Promise<Supplier> => {
      const body: SupplierCreate = {
        supplier_code: form.supplier_code.trim(),
        name: form.name.trim(),
        contact: form.contact.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
        is_active: form.is_active,
      };
      return editing ? suppliersApi.update(editing.id, body) : suppliersApi.create(body);
    },
    onSuccess: (saved) => {
      toast.success(editing ? `Supplier "${saved.name}" updated` : `Supplier "${saved.name}" created`);
      setFormOpen(false);
      void invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (s: Supplier) => suppliersApi.delete(s.id),
    onSuccess: (_data, s) => {
      toast.success(`Supplier "${s.name}" deleted`);
      setDeleting(null);
      void invalidate();
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSubmitted(false);
    setFormOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ supplier_code: s.supplier_code, name: s.name, contact: s.contact ?? '', email: s.email ?? '', phone: s.phone ?? '', notes: s.notes ?? '', is_active: s.is_active });
    setSubmitted(false);
    setFormOpen(true);
  };

  const errors = submitted ? validate(form) : {};
  const submit = () => {
    setSubmitted(true);
    if (Object.keys(validate(form)).length === 0) saveMutation.mutate();
  };

  const columns: GridColDef<Supplier>[] = [
    { field: 'name', headerName: 'Name', flex: 1.3, minWidth: 200, sortable: false },
    { field: 'contact', headerName: 'Contact', flex: 1, minWidth: 150, sortable: false, valueGetter: (_v, row) => row.contact ?? '' },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 200, sortable: false, valueGetter: (_v, row) => row.email ?? '' },
    { field: 'phone', headerName: 'Phone', width: 150, sortable: false, valueGetter: (_v, row) => row.phone ?? '' },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 110,
      sortable: false,
      renderCell: ({ row }) => <StatusChip kind="active" value={row.is_active} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <RowActionButton label={`Edit ${row.name}`} icon={<EditOutlinedIcon fontSize="small" />} onClick={() => openEdit(row)} />
          <RowActionButton label={`Delete ${row.name}`} icon={<DeleteOutlineIcon fontSize="small" />} color="error" onClick={() => setDeleting(row)} />
        </Box>
      ),
    },
  ];

  const toolbar = (
    <>
      <SearchField
        label="Search suppliers"
        placeholder="Search suppliers"
        onChange={(value) => {
          setSearch(value);
          setPaginationModel((m) => ({ ...m, page: 0 }));
        }}
      />
      <FormControlLabel
        control={
          <Switch
            checked={activeOnly}
            onChange={(e) => {
              setActiveOnly(e.target.checked);
              setPaginationModel((m) => ({ ...m, page: 0 }));
            }}
          />
        }
        label="Active only"
      />
    </>
  );

  const filtered = Boolean(search || activeOnly);
  const failedFirstLoad = query.isError && !query.data;

  return (
    <Box>
      <PageHeader
        title="Supplier management"
        subtitle="Manage the suppliers behind your resources"
        actions={
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={openCreate}>
            Add supplier
          </Button>
        }
      />

      <Card sx={{ p: 2 }}>
        {failedFirstLoad ? (
          <ErrorState
            title="Could not load suppliers"
            description="Something went wrong while loading suppliers. Check your connection and try again."
            action={
              <Button variant="outlined" onClick={() => query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <DataTable<Supplier>
            ariaLabel="Suppliers"
            rows={query.data?.items ?? []}
            columns={columns}
            loading={query.isLoading || (query.isFetching && query.isPlaceholderData)}
            rowCount={query.data?.total ?? 0}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            toolbar={toolbar}
            emptyTitle={filtered ? 'No suppliers match your filters' : 'No suppliers yet'}
            emptyDescription={filtered ? 'Try a different search or turn off Active only.' : 'Add the first supplier to get started.'}
            emptyAction={
              filtered ? (
                <Button variant="outlined" onClick={() => setActiveOnly(false)}>
                  Show all suppliers
                </Button>
              ) : (
                <Button variant="contained" color="secondary" onClick={openCreate}>
                  Add supplier
                </Button>
              )
            }
          />
        )}
      </Card>

      <FormDialog
        open={formOpen}
        title={editing ? 'Edit supplier' : 'Add supplier'}
        submitLabel={editing ? 'Save changes' : 'Create supplier'}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        loading={saveMutation.isPending}
      >
        <TextField label="Supplier code" slotProps={{ inputLabel: { required: true } }} value={form.supplier_code} onChange={(e) => setForm({ ...form, supplier_code: e.target.value })} error={Boolean(errors.supplier_code)} helperText={errors.supplier_code ?? 'Saved in upper case'} autoComplete="off" />
        <TextField label="Name" slotProps={{ inputLabel: { required: true } }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={Boolean(errors.name)} helperText={errors.name} />
        <TextField label="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={Boolean(errors.email)} helperText={errors.email} autoComplete="off" />
        <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <TextField label="Notes" multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <TextField select label="Status" value={form.is_active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete supplier"
        message={`Delete supplier "${deleting?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </Box>
  );
}
