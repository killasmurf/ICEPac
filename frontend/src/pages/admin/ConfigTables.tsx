/**
 * ConfigTables - manage the lookup tables behind the estimation forms.
 * Table list comes from GET /admin/config; items from /admin/config/{table}.
 * The selected table lives in the URL (?table=cost-types).
 */
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { configApi, type ConfigItem } from '../../api/admin';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import FormDialog from '../../components/common/FormDialog';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import TableSkeleton from '../../components/common/TableSkeleton';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatNumber } from '../../utils/format';
import {
  configFormFromItem,
  configFormToInput,
  emptyConfigForm,
  validateConfigForm,
  type ConfigFormErrors,
  type ConfigFormValues,
} from './configForm';

export default function ConfigTables() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  const tablesQuery = useQuery({ queryKey: ['admin', 'config', 'tables'], queryFn: configApi.listTables });
  const tables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data]);
  const requested = searchParams.get('table');
  const active = tables.find((t) => t.key === requested) ?? tables[0];
  const tableKey = active?.key;
  const weighted = active?.weighted ?? false;

  const itemsQuery = useQuery({
    queryKey: ['admin', 'config', tableKey, {}],
    queryFn: () => configApi.listItems(tableKey as string),
    enabled: Boolean(tableKey),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [form, setForm] = useState<ConfigFormValues>(emptyConfigForm);
  const [errors, setErrors] = useState<ConfigFormErrors>({});
  const [deleting, setDeleting] = useState<ConfigItem | null>(null);

  const selectTable = (key: string) => setSearchParams({ table: key }, { replace: true });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'config', tableKey] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = configFormToInput(form, weighted);
      return editing
        ? configApi.updateItem(tableKey as string, editing.id, body)
        : configApi.createItem(tableKey as string, body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Item updated' : 'Item created');
      setDialogOpen(false);
      void invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (item: ConfigItem) => configApi.deleteItem(tableKey as string, item.id),
    onSuccess: () => {
      toast.success('Item deleted');
      setDeleting(null);
      void invalidate();
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyConfigForm());
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (item: ConfigItem) => {
    setEditing(item);
    setForm(configFormFromItem(item));
    setErrors({});
    setDialogOpen(true);
  };

  const submit = () => {
    const found = validateConfigForm(form, weighted);
    setErrors(found);
    if (Object.keys(found).length === 0) saveMutation.mutate();
  };

  const columns = useMemo<GridColDef<ConfigItem>[]>(() => {
    const cols: GridColDef<ConfigItem>[] = [
      { field: 'code', headerName: 'Code', width: 140 },
      { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    ];
    if (weighted) {
      cols.push({
        field: 'weight',
        headerName: 'Weight',
        type: 'number',
        width: 110,
        align: 'right',
        headerAlign: 'right',
        cellClassName: 'tabular-nums',
        valueFormatter: (value: number | undefined) => (value === undefined ? '—' : formatNumber(value)),
      });
    }
    cols.push(
      {
        field: 'is_active',
        headerName: 'Status',
        width: 120,
        renderCell: (p) => <StatusChip kind="active" value={p.row.is_active} size="small" />,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 110,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (p) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton size="small" aria-label={`Edit ${p.row.code}`} onClick={() => openEdit(p.row)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" aria-label={`Delete ${p.row.code}`} onClick={() => setDeleting(p.row)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    );
    return cols;
  }, [weighted]);

  const addButton = (
    <Button color="secondary" variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={!active}>
      Add item
    </Button>
  );

  let body: React.ReactNode;
  if (tablesQuery.isPending) {
    body = <TableSkeleton rows={6} columns={4} />;
  } else if (tablesQuery.isError) {
    body = (
      <ErrorState
        title="Could not load configuration tables"
        description="Something went wrong while loading. Check your connection and try again."
        action={
          <Button variant="outlined" onClick={() => void tablesQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  } else if (tables.length === 0) {
    body = <EmptyState icon={<TuneIcon />} title="No configuration tables" description="The server did not report any configuration tables." />;
  } else {
    body = (
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: { md: 'flex-start' } }}>
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <FormControl fullWidth size="small">
            <InputLabel id="config-table-label">Table</InputLabel>
            <Select
              labelId="config-table-label"
              label="Table"
              value={tableKey ?? ''}
              onChange={(e) => selectTable(e.target.value)}
            >
              {tables.map((t) => (
                <MenuItem key={t.key} value={t.key}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Card sx={{ display: { xs: 'none', md: 'block' }, width: 260, flexShrink: 0 }}>
          <Tabs
            orientation="vertical"
            value={tableKey ?? false}
            onChange={(_, v: string) => selectTable(v)}
            aria-label="Configuration tables"
            sx={{ '& .MuiTab-root': { alignItems: 'flex-start', textAlign: 'left', textTransform: 'none' } }}
          >
            {tables.map((t) => (
              <Tab key={t.key} value={t.key} label={t.label} />
            ))}
          </Tabs>
        </Card>
        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent>
            <Typography variant="h6" component="h2">
              {active?.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {active?.description}
            </Typography>
            <DataTable<ConfigItem>
              rows={itemsQuery.data?.items ?? []}
              columns={columns}
              loading={itemsQuery.isPending || itemsQuery.isFetching}
              error={itemsQuery.isError ? itemsQuery.error : undefined}
              onRetry={() => void itemsQuery.refetch()}
              ariaLabel={`${active?.label ?? 'Configuration'} items`}
              emptyTitle="No items yet"
              emptyDescription={`Add the first item to ${active?.label ?? 'this table'}.`}
              emptyAction={
                <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
                  Add item
                </Button>
              }
            />
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Config Tables"
        subtitle="Lookup values used across estimation, risk and project forms."
        actions={tables.length > 0 ? addButton : undefined}
      />
      {body}

      <FormDialog
        open={dialogOpen}
        title={`${editing ? 'Edit' : 'Add'} ${active?.label ?? 'item'}`}
        submitLabel={editing ? 'Save changes' : 'Create'}
        loading={saveMutation.isPending}
        onClose={() => setDialogOpen(false)}
        onSubmit={submit}
      >
        <TextField
          label="Code"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          error={Boolean(errors.code)}
          helperText={errors.code ?? 'Stored in upper case'}
          autoFocus
          slotProps={{ htmlInput: { 'aria-required': true } }}
          fullWidth
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          error={Boolean(errors.description)}
          helperText={errors.description}
          slotProps={{ htmlInput: { 'aria-required': true } }}
          fullWidth
        />
        {weighted && (
          <TextField
            label="Weight"
            type="number"
            value={form.weight}
            onChange={(e) => setForm({ ...form, weight: e.target.value })}
            error={Boolean(errors.weight)}
            helperText={errors.weight ?? 'A number from 0 to 100'}
            slotProps={{ htmlInput: { step: 'any', 'aria-required': true } }}
              fullWidth
          />
        )}
        <FormControlLabel
          control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
          label="Active"
        />
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete item"
        message={`Delete ${deleting?.code ?? 'this item'}? Records that use it may be affected.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </Box>
  );
}
