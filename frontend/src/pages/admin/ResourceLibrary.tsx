/**
 * ResourceLibrary - Admin page for managing the resource library (list, search, create, edit, delete).
 */
import React, { useMemo, useState } from 'react';
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
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { resourcesApi, suppliersApi, type Resource, type ResourceCreate, type ResourceUpdate } from '../../api/admin';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable, { useResponsiveColumns } from '../../components/common/DataTable';
import ErrorState from '../../components/common/ErrorState';
import FormDialog from '../../components/common/FormDialog';
import PageHeader from '../../components/common/PageHeader';
import SearchField from '../../components/common/SearchField';
import StatusChip from '../../components/common/StatusChip';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatCurrency } from '../../utils/format';
import RowActionButton from './RowActionButton';

interface ResourceForm {
  resource_code: string;
  description: string;
  eoc: string;
  cost: string;
  units: string;
  supplier_code: string;
  is_active: boolean;
}

const EMPTY_FORM: ResourceForm = { resource_code: '', description: '', eoc: '', cost: '0', units: '', supplier_code: '', is_active: true };

type FormErrors = Partial<Record<keyof ResourceForm, string>>;

function validate(form: ResourceForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.resource_code.trim()) errors.resource_code = 'Code is required';
  if (!form.description.trim()) errors.description = 'Description is required';
  const cost = Number(form.cost);
  if (form.cost.trim() === '' || Number.isNaN(cost) || cost < 0) errors.cost = 'Enter a cost of zero or more';
  return errors;
}

/**
 * Columns hidden below the sm breakpoint so the table does not scroll sideways on phones. Phones keep the code
 * (with the description under it), the cost and the edit and delete buttons.
 */
const RESOURCE_LOW_PRIORITY = ['description', 'eoc', 'supplier_name', 'units', 'is_active'];

export default function ResourceLibrary() {
  const columnVisibilityModel = useResponsiveColumns(RESOURCE_LOW_PRIORITY);
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const toast = useToast();
  const queryClient = useQueryClient();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [eoc, setEoc] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState<ResourceForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [deleting, setDeleting] = useState<Resource | null>(null);

  const params = {
    skip: paginationModel.page * paginationModel.pageSize,
    limit: paginationModel.pageSize,
    search: search || undefined,
    is_active: activeOnly || undefined,
    supplier_code: supplierFilter || undefined,
  };

  const query = useQuery({
    queryKey: ['admin', 'resources', params],
    queryFn: () => resourcesApi.list(params),
    placeholderData: keepPreviousData,
  });

  // Suppliers for the filter and the form's supplier select.
  const suppliersQuery = useQuery({
    queryKey: ['admin', 'suppliers', 'options'],
    queryFn: () => suppliersApi.list({ limit: 1000 }),
    staleTime: 60_000,
    meta: { silent: true },
  });
  const suppliers = suppliersQuery.data?.items ?? [];

  // The API has no EOC filter, so the options come from the rows loaded and the filter applies to them.
  const eocOptions = useMemo(
    () => Array.from(new Set((query.data?.items ?? []).map((r) => r.eoc).filter((v): v is string => Boolean(v)))).sort(),
    [query.data],
  );
  const rows = useMemo(
    () => (query.data?.items ?? []).filter((r) => !eoc || r.eoc === eoc),
    [query.data, eoc],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'resources'] });

  const saveMutation = useMutation({
    mutationFn: (): Promise<Resource> => {
      const body: ResourceCreate = {
        resource_code: form.resource_code.trim(),
        description: form.description.trim(),
        eoc: form.eoc.trim(),
        cost: Number(form.cost),
        units: form.units.trim(),
        is_active: form.is_active,
      };
      if (editing) {
        const update: ResourceUpdate = { ...body, supplier_code: form.supplier_code || null }; // null clears it
        return resourcesApi.update(editing.id, update);
      }
      return resourcesApi.create(form.supplier_code ? { ...body, supplier_code: form.supplier_code } : body);
    },
    onSuccess: (saved) => {
      toast.success(editing ? `Resource "${saved.resource_code}" updated` : `Resource "${saved.resource_code}" created`);
      setFormOpen(false);
      void invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (r: Resource) => resourcesApi.delete(r.id),
    onSuccess: (_data, r) => {
      toast.success(`Resource "${r.resource_code}" deleted`);
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
  const openEdit = (r: Resource) => {
    setEditing(r);
    setForm({ resource_code: r.resource_code, description: r.description, eoc: r.eoc ?? '', cost: String(r.cost), units: r.units ?? '', supplier_code: r.supplier_code ?? '', is_active: r.is_active });
    setSubmitted(false);
    setFormOpen(true);
  };

  const errors = submitted ? validate(form) : {};
  const submit = () => {
    setSubmitted(true);
    if (Object.keys(validate(form)).length === 0) saveMutation.mutate();
  };

  const columns: GridColDef<Resource>[] = [
    {
      field: 'resource_code',
      headerName: 'Code',
      width: phone ? undefined : 110,
      flex: phone ? 1 : undefined,
      minWidth: phone ? 120 : undefined,
      sortable: false,
      renderCell: ({ row }) =>
        phone ? (
          <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
            <Typography variant="inherit" noWrap>
              {row.resource_code}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div" noWrap>
              {row.description}
            </Typography>
          </Box>
        ) : (
          row.resource_code
        ),
    },
    { field: 'description', headerName: 'Description', flex: 1.5, minWidth: 150, sortable: false },
    { field: 'eoc', headerName: 'EOC', width: 130, sortable: false, valueGetter: (_v, row) => row.eoc ?? '' },
    {
      field: 'supplier_name',
      headerName: 'Supplier',
      flex: 1,
      minWidth: 140,
      sortable: false,
      valueGetter: (_v, row) => row.supplier_name ?? row.supplier_code ?? '',
      renderCell: ({ row }) =>
        row.supplier_code ? (row.supplier_name ?? row.supplier_code) : <Typography component="span" variant="inherit" color="text.secondary">None</Typography>,
    },
    {
      field: 'cost',
      headerName: 'Cost',
      width: phone ? 100 : 130,
      sortable: false,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      cellClassName: 'tabular-nums',
      valueGetter: (_v, row) => Number(row.cost),
      valueFormatter: (value: number) => formatCurrency(value),
    },
    { field: 'units', headerName: 'Units', width: 110, sortable: false, valueGetter: (_v, row) => row.units ?? '' },
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
      width: phone ? 84 : 110,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <RowActionButton label={`Edit ${row.resource_code}`} icon={<EditOutlinedIcon fontSize="small" />} onClick={() => openEdit(row)} />
          <RowActionButton label={`Delete ${row.resource_code}`} icon={<DeleteOutlineIcon fontSize="small" />} color="error" onClick={() => setDeleting(row)} />
        </Box>
      ),
    },
  ];

  const toolbar = (
    <>
      <SearchField
        label="Search resources"
        placeholder="Search resources"
        onChange={(value) => {
          setSearch(value);
          setPaginationModel((m) => ({ ...m, page: 0 }));
        }}
      />
      <TextField select size="small" label="EOC" value={eoc} onChange={(e) => setEoc(e.target.value)} sx={{ minWidth: 150 }}>
        <MenuItem value="">All EOCs</MenuItem>
        {eocOptions.map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
        {eoc && !eocOptions.includes(eoc) && <MenuItem value={eoc}>{eoc}</MenuItem>}
      </TextField>
      <TextField
        select
        size="small"
        label="Supplier"
        value={supplierFilter}
        onChange={(e) => {
          setSupplierFilter(e.target.value);
          setPaginationModel((m) => ({ ...m, page: 0 }));
        }}
        sx={{ minWidth: 170 }}
      >
        <MenuItem value="">All suppliers</MenuItem>
        {suppliers.map((sp) => (
          <MenuItem key={sp.supplier_code} value={sp.supplier_code}>
            {sp.name}
          </MenuItem>
        ))}
      </TextField>
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

  const filtered = Boolean(search || activeOnly || eoc || supplierFilter);
  const failedFirstLoad = query.isError && !query.data;

  return (
    <Box>
      <PageHeader
        title="Resource Library"
        subtitle="Manage the resources and unit costs used in estimates"
        actions={
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={openCreate}>
            Add resource
          </Button>
        }
      />

      <Card sx={{ p: 2 }}>
        {failedFirstLoad ? (
          <ErrorState
            title="Could not load resources"
            description="Something went wrong while loading resources. Check your connection and try again."
            action={
              <Button variant="outlined" onClick={() => query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <DataTable<Resource>
            columnVisibilityModel={columnVisibilityModel}
            ariaLabel="Resources"
            rows={rows}
            columns={columns}
            loading={query.isLoading || (query.isFetching && query.isPlaceholderData)}
            rowCount={query.data?.total ?? 0}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            toolbar={toolbar}
            emptyTitle={filtered ? 'No resources match your filters' : 'No resources yet'}
            emptyDescription={filtered ? 'Try a different search or clear the filters.' : 'Add the first resource to build the library.'}
            emptyAction={
              filtered ? (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setEoc('');
                    setActiveOnly(false);
                    setSupplierFilter('');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button variant="contained" color="secondary" onClick={openCreate}>
                  Add resource
                </Button>
              )
            }
          />
        )}
      </Card>

      <FormDialog
        open={formOpen}
        title={editing ? 'Edit resource' : 'Add resource'}
        submitLabel={editing ? 'Save changes' : 'Create resource'}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        loading={saveMutation.isPending}
      >
        <TextField label="Resource code" slotProps={{ inputLabel: { required: true } }} value={form.resource_code} onChange={(e) => setForm({ ...form, resource_code: e.target.value })} error={Boolean(errors.resource_code)} helperText={errors.resource_code ?? 'Saved in upper case'} autoComplete="off" />
        <TextField label="Description" slotProps={{ inputLabel: { required: true } }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={Boolean(errors.description)} helperText={errors.description} />
        <TextField label="EOC (element of cost)" value={form.eoc} onChange={(e) => setForm({ ...form, eoc: e.target.value })} />
        <TextField label="Cost" type="number" slotProps={{ inputLabel: { required: true }, htmlInput: { min: 0, step: '0.01' } }} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} error={Boolean(errors.cost)} helperText={errors.cost} />
        <TextField label="Units" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
        <TextField
          select
          label="Default supplier"
          value={form.supplier_code}
          onChange={(e) => setForm({ ...form, supplier_code: e.target.value })}
          helperText="Pre-fills the supplier when this resource is assigned"
        >
          <MenuItem value="">None</MenuItem>
          {form.supplier_code && !suppliers.some((sp) => sp.supplier_code === form.supplier_code) && (
            <MenuItem value={form.supplier_code}>{editing?.supplier_name ?? form.supplier_code}</MenuItem>
          )}
          {suppliers.map((sp) => (
            <MenuItem key={sp.supplier_code} value={sp.supplier_code}>
              {sp.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Status" value={form.is_active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete resource"
        message={`Delete resource "${deleting?.resource_code ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </Box>
  );
}
