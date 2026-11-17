/**
 * AuditLogs - read-only, server-paginated audit trail (GET /admin/audit-logs).
 * Clicking a row opens a drawer with who, when, what and the old/new values.
 */
import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { auditApi, type AuditLog } from '../../api/admin';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import SearchField from '../../components/common/SearchField';
import { formatDateTime } from '../../utils/format';
import { AUDIT_ACTIONS, formatActionLabel, formatAuditValue } from './auditFormat';

const columns: GridColDef<AuditLog>[] = [
  {
    field: 'created_at',
    headerName: 'When',
    width: 180,
    sortable: false,
    valueFormatter: (value: string) => formatDateTime(value),
  },
  { field: 'username', headerName: 'User', width: 140, sortable: false, valueFormatter: (v: string | null) => v ?? 'System' },
  {
    field: 'action',
    headerName: 'Action',
    width: 160,
    sortable: false,
    renderCell: (p) => <Chip size="small" variant="outlined" label={formatActionLabel(p.row.action)} />,
  },
  { field: 'entity_type', headerName: 'Entity', flex: 1, minWidth: 140, sortable: false },
  {
    field: 'entity_id',
    headerName: 'Entity ID',
    width: 110,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
    sortable: false,
    cellClassName: 'tabular-nums',
    valueFormatter: (v: number | null) => (v == null ? '—' : String(v)),
  },
  { field: 'ip_address', headerName: 'IP address', width: 140, sortable: false, valueFormatter: (v: string | null) => v ?? '—' },
];

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  const text = formatAuditValue(value);
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {text === null ? (
        <Typography variant="body2" color="text.secondary">
          No value recorded.
        </Typography>
      ) : (
        <Box
          component="pre"
          tabIndex={0}
          aria-label={`${title} (JSON)`}
          sx={{
            m: 0,
            p: 1.5,
            overflow: 'auto',
            maxHeight: 280,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '0.8125rem',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'action.hover',
            color: 'text.primary',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {text}
        </Box>
      )}
    </Box>
  );
}

export default function AuditLogs() {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const params = {
    skip: paginationModel.page * paginationModel.pageSize,
    limit: paginationModel.pageSize,
    action: action || undefined,
    entity_type: entityType || undefined,
  };

  const query = useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => auditApi.list(params),
    placeholderData: keepPreviousData,
  });

  const resetPage = () => setPaginationModel((m) => ({ ...m, page: 0 }));
  const filtered = Boolean(action || entityType);

  const toolbar = (
    <>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="audit-action-label">Action</InputLabel>
        <Select
          labelId="audit-action-label"
          label="Action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            resetPage();
          }}
        >
          <MenuItem value="">All actions</MenuItem>
          {AUDIT_ACTIONS.map((a) => (
            <MenuItem key={a} value={a}>
              {formatActionLabel(a)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <SearchField
        label="Entity type"
        placeholder="Entity type, e.g. Resource"
        onChange={(v) => {
          setEntityType(v.trim());
          resetPage();
        }}
      />
    </>
  );

  return (
    <Box>
      <PageHeader title="Audit Logs" subtitle="Every change made through the admin area. Select a row to see what changed." />

      <DataTable<AuditLog>
        rows={query.data?.items ?? []}
        columns={columns}
        loading={query.isPending || query.isFetching}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        rowCount={query.data?.total ?? 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={setSelected}
        toolbar={toolbar}
        ariaLabel="Audit log entries"
        emptyTitle={filtered ? 'No matching entries' : 'No audit entries yet'}
        emptyDescription={filtered ? 'Try a different action or entity type.' : 'Changes made in the admin area will appear here.'}
      />

      <Drawer
        anchor="right"
        open={selected !== null}
        onClose={() => setSelected(null)}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 }, maxWidth: '100%' }, 'aria-label': 'Audit entry details' } }}
      >
        {selected && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon aria-hidden /> Audit entry #{selected.id}
              </Typography>
              <Tooltip title="Close">
                <IconButton aria-label="Close details" onClick={() => setSelected(null)}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <DetailRow label="Action">{formatActionLabel(selected.action)}</DetailRow>
            <DetailRow label="Entity">
              {selected.entity_type}
              {selected.entity_id != null ? ` #${selected.entity_id}` : ''}
            </DetailRow>
            <DetailRow label="User">{selected.username ?? 'System'}</DetailRow>
            <DetailRow label="When">{formatDateTime(selected.created_at)}</DetailRow>
            <DetailRow label="IP address">{selected.ip_address ?? '—'}</DetailRow>
            <JsonBlock title="Old values" value={selected.old_values} />
            <JsonBlock title="New values" value={selected.new_values} />
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
