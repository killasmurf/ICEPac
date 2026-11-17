/**
 * Project Risk Register — list + create/edit/delete UI for the
 * project-level risk register (cross-cutting risks at the project
 * scope, distinct from WBS-scoped item-level risks).
 *
 * Renders inside ProjectDetail's "Risk Register" tab.
 *
 * Data comes from React Query and is refreshed after every mutation.
 * Lookup lists for category / probability / severity codes are pulled
 * from the generic admin/config endpoint via the existing configApi.
 * The API only lets admins and managers change risks, so everyone else
 * gets a read-only register.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Box, Button, Chip, Grid, IconButton, InputAdornment, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  projectRiskApi,
  ProjectRisk,
  ProjectRiskCreate,
  ProjectRiskUpdate,
} from '../../api/project-risks';
import { configApi } from '../../api/admin';
import { applyOptimistic, optimisticTarget, rollbackOptimistic } from '../../api/optimistic';
import { useAuth } from '../../auth/AuthContext';
import { formatCurrency, formatDate } from '../../utils/format';
import { DataTable } from '../common/DataTable';
import { StatCard } from '../common/StatCard';
import { StatusChip } from '../common/StatusChip';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CardSkeleton } from '../common/CardSkeleton';
import { TableSkeleton } from '../common/TableSkeleton';
import ErrorState from '../common/ErrorState';
import { useToast } from '../feedback/ToastProvider';
import { FormDialog } from '../common/FormDialog';
import { currencySymbol, validateMoney } from '../estimation/estimationUtils';
import { invalidateEstimation, projectRiskRegisterKey } from '../estimation/queryKeys';

interface Props {
  projectId: number;
}

/** Roles the API allows to create, change or delete project risks (app/routes/risk.py). */
const EDITOR_ROLES = ['admin', 'manager'];

const formatMoney = (raw: string | number) => {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  return formatCurrency(Number.isNaN(n) ? 0 : n, { maximumFractionDigits: 0 });
};

// Severity → display colour (matches WBS-risk component convention).
const sevColor = (code: string | null | undefined): 'default' | 'success' | 'warning' | 'error' => {
  if (!code) return 'default';
  const c = code.toUpperCase();
  if (c === 'VL' || c === 'L') return 'success';
  if (c === 'M') return 'warning';
  if (c === 'H' || c === 'VH') return 'error';
  return 'default';
};

interface FormState {
  title: string;
  risk_cost: string;
  risk_category_code: string;
  probability_code: string;
  severity_code: string;
  mitigation_plan: string;
  status: string;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'closed', label: 'Closed' },
];

const fetchLookups = async () => {
  const [cats, probs, sevs] = await Promise.all([
    configApi.listItems('risk-categories'),
    configApi.listItems('probability-levels'),
    configApi.listItems('severity-levels'),
  ]);
  return { categories: cats.items, probabilities: probs.items, severities: sevs.items };
};

const fetchRegister = async (projectId: number) => {
  const [list, cost] = await Promise.all([projectRiskApi.list(projectId), projectRiskApi.totalCost(projectId)]);
  return { list, cost };
};

type RegisterData = Awaited<ReturnType<typeof fetchRegister>>;

/** Apply an update payload to a cached risk (the server response replaces it once the request settles). */
export const patchRisk = (risk: ProjectRisk, payload: ProjectRiskCreate | ProjectRiskUpdate): ProjectRisk => ({
  ...risk,
  ...(payload.title !== undefined && { title: payload.title }),
  ...(payload.status !== undefined && { status: payload.status }),
  ...(payload.risk_cost !== undefined && { risk_cost: String(payload.risk_cost) }),
  ...(payload.risk_category_code !== undefined && { risk_category_code: payload.risk_category_code }),
  ...(payload.probability_code !== undefined && { probability_code: payload.probability_code }),
  ...(payload.severity_code !== undefined && { severity_code: payload.severity_code }),
  ...(payload.mitigation_plan !== undefined && { mitigation_plan: payload.mitigation_plan }),
});

export const ProjectRiskRegister: React.FC<Props> = ({ projectId }) => {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canEdit = role !== null && EDITOR_ROLES.includes(role);

  const register = useQuery({
    queryKey: projectRiskRegisterKey(projectId),
    queryFn: () => fetchRegister(projectId),
  });
  const lookups = useQuery({
    queryKey: ['config', 'project-risk-lookups'],
    queryFn: fetchLookups,
    staleTime: 5 * 60_000,
  });

  const risks = register.data?.list.items ?? [];
  const totalCost = register.data?.cost.total_risk_cost ?? null;
  const categories = lookups.data?.categories ?? [];
  const probabilities = lookups.data?.probabilities ?? [];
  const severities = lookups.data?.severities ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRisk | null>(null);
  const [form, setForm] = useState<FormState>({
    title: '',
    risk_cost: '0',
    risk_category_code: '',
    probability_code: '',
    severity_code: '',
    mitigation_plan: '',
    status: 'open',
  });
  const [deleting, setDeleting] = useState<ProjectRisk | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: projectRiskRegisterKey(projectId) });
    void invalidateEstimation(queryClient, projectId);
  };

  const save = useMutation({
    mutationFn: (vars: { payload: ProjectRiskCreate | ProjectRiskUpdate; editing: ProjectRisk | null }) =>
      vars.editing
        ? projectRiskApi.update(projectId, vars.editing.id, vars.payload)
        : projectRiskApi.create(projectId, vars.payload as ProjectRiskCreate),
    // Optimistic only when editing an existing risk (status and other fields); creates wait for the server id.
    onMutate: (vars) =>
      vars.editing
        ? applyOptimistic(
            queryClient,
            [
              optimisticTarget<RegisterData, typeof vars>(projectRiskRegisterKey(projectId), (old, v) => ({
                ...old,
                list: {
                  ...old.list,
                  items: old.list.items.map((r) => (r.id === v.editing?.id ? patchRisk(r, v.payload) : r)),
                },
              })),
            ],
            vars,
          )
        : undefined,
    onError: (_error, _vars, snapshot) => rollbackOptimistic(queryClient, snapshot),
    onSuccess: (_result, vars) => {
      toast.success(vars.editing ? 'Project risk updated' : 'Project risk created');
      setDialogOpen(false);
    },
    onSettled: () => refresh(),
  });

  const remove = useMutation({
    mutationFn: (risk: ProjectRisk) => projectRiskApi.delete(projectId, risk.id),
    onSuccess: () => {
      toast.success('Project risk deleted');
      setDeleting(null);
      refresh();
    },
    onError: () => setDeleting(null),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '',
      risk_cost: '0',
      risk_category_code: categories[0]?.code ?? '',
      probability_code: probabilities[0]?.code ?? '',
      severity_code: severities[0]?.code ?? '',
      mitigation_plan: '',
      status: 'open',
    });
    setDialogOpen(true);
  };

  const openEdit = useCallback((risk: ProjectRisk) => {
    setEditing(risk);
    setForm({
      title: risk.title,
      risk_cost: String(parseFloat(risk.risk_cost)),
      risk_category_code: risk.risk_category_code ?? '',
      probability_code: risk.probability_code ?? '',
      severity_code: risk.severity_code ?? '',
      mitigation_plan: risk.mitigation_plan ?? '',
      status: risk.status,
    });
    setDialogOpen(true);
  }, []);

  const titleError = form.title.trim() ? undefined : 'Title is required';
  const costError = validateMoney(form.risk_cost);
  const invalid = !!titleError || !!costError;

  const handleSave = () => {
    if (invalid) return;
    const payload: ProjectRiskCreate | ProjectRiskUpdate = {
      title: form.title,
      risk_cost: Number(form.risk_cost) || 0,
      risk_category_code: form.risk_category_code || undefined,
      probability_code: form.probability_code || undefined,
      severity_code: form.severity_code || undefined,
      mitigation_plan: form.mitigation_plan,
      status: form.status,
    };
    save.mutate({ payload, editing });
  };

  const field = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const columns = useMemo<GridColDef<ProjectRisk>[]>(() => {
    const cols: GridColDef<ProjectRisk>[] = [
      {
        field: 'title',
        headerName: 'Title',
        minWidth: 220,
        flex: 2,
        renderCell: ({ row }) => (
          <Tooltip title={row.mitigation_plan || '(no mitigation plan)'} placement="top">
            <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                {row.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {formatDate(row.date_identified)}
              </Typography>
            </Box>
          </Tooltip>
        ),
      },
      {
        field: 'risk_category_code',
        headerName: 'Category',
        minWidth: 110,
        flex: 1,
        valueFormatter: (value: string | null) => value ?? '—',
      },
      {
        field: 'probability_code',
        headerName: 'Prob × Sev',
        sortable: false,
        align: 'center',
        headerAlign: 'center',
        minWidth: 150,
        flex: 1,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <Chip size="small" label={row.probability_code ?? '?'} color={sevColor(row.probability_code)} />
            <Typography variant="caption" aria-hidden>
              ×
            </Typography>
            <Chip size="small" label={row.severity_code ?? '?'} color={sevColor(row.severity_code)} />
          </Stack>
        ),
      },
      {
        field: 'risk_cost',
        headerName: 'Risk Cost',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        minWidth: 120,
        flex: 1,
        cellClassName: 'tabular-nums',
        valueGetter: (value: string) => parseFloat(value),
        valueFormatter: (value: number) => formatMoney(value),
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 120,
        flex: 0.8,
        renderCell: ({ row }) => <StatusChip kind="risk" value={row.status} />,
      },
    ];
    if (canEdit) {
      cols.push({
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'right',
        headerAlign: 'right',
        minWidth: 110,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton size="small" aria-label={`Edit risk ${row.title}`} onClick={() => openEdit(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" aria-label={`Delete risk ${row.title}`} onClick={() => setDeleting(row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      });
    }
    return cols;
  }, [canEdit, openEdit]);

  if (register.isLoading) {
    return (
      <Box role="status" aria-busy="true" aria-label="Loading risk register">
        <Box sx={{ mb: 2 }}>
          <CardSkeleton lines={2} />
        </Box>
        <TableSkeleton rows={4} columns={5} />
      </Box>
    );
  }

  if (register.isError) {
    return (
      <ErrorState
        title="Could not load the risk register"
        description="Something went wrong while loading. Check your connection and try again."
        action={
          <Button variant="outlined" onClick={() => void register.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const addButton = canEdit ? (
    <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={openCreate}>
      Add Project Risk
    </Button>
  ) : undefined;

  return (
    <Box>
      {/* Aggregate header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch', mb: 2 }}>
        <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
          <StatCard
            label="Project-Level Risk Cost"
            value={totalCost === null ? '—' : formatMoney(totalCost)}
            hint={`${risks.length} project-level ${risks.length === 1 ? 'risk' : 'risks'} (cross-cutting; excludes WBS-scoped item-level risks)`}
          />
        </Box>
        {addButton && <Box sx={{ alignSelf: 'flex-start' }}>{addButton}</Box>}
      </Box>

      <DataTable<ProjectRisk>
        rows={risks}
        columns={columns}
        ariaLabel="Project risk register"
        emptyTitle="No project-level risks recorded yet"
        emptyDescription="Record a cross-cutting risk such as material price escalation, a regulatory approval slip or a key-person dependency."
        emptyAction={
          canEdit ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
              Add Project Risk
            </Button>
          ) : undefined
        }
      />

      {/* Create / edit dialog */}
      <FormDialog
        open={dialogOpen}
        title={editing ? 'Edit Project Risk' : 'Add Project Risk'}
        submitLabel={editing ? 'Save Changes' : 'Create Risk'}
        loading={save.isPending}
        submitDisabled={invalid}
        maxWidth="md"
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSave}
      >
        <TextField
          label="Title"
          value={form.title}
          onChange={field('title')}
          required
          fullWidth
          autoFocus
          error={!!titleError}
          helperText={titleError ?? "Concise risk name (e.g. 'Material Price Escalation from Steel Tariffs')."}
        />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Category" value={form.risk_category_code} onChange={field('risk_category_code')}>
              <MenuItem value="">—</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.code} — {c.description}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Risk Cost"
              type="number"
              fullWidth
              value={form.risk_cost}
              onChange={field('risk_cost')}
              error={!!costError}
              helperText={costError ?? 'Potential cost if the risk occurs'}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">{currencySymbol()}</InputAdornment> },
                htmlInput: { min: 0, step: 1000 },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Probability" value={form.probability_code} onChange={field('probability_code')}>
              <MenuItem value="">—</MenuItem>
              {probabilities.map((p) => (
                <MenuItem key={p.code} value={p.code}>
                  {p.code} — {p.description}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Severity" value={form.severity_code} onChange={field('severity_code')}>
              <MenuItem value="">—</MenuItem>
              {severities.map((s) => (
                <MenuItem key={s.code} value={s.code}>
                  {s.code} — {s.description}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Status" value={form.status} onChange={field('status')}>
              {STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
        <TextField
          label="Mitigation Plan"
          value={form.mitigation_plan}
          onChange={field('mitigation_plan')}
          multiline
          rows={4}
          fullWidth
          helperText="Concrete actions, not platitudes ('monitor closely' is not a plan)."
        />
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete project risk?"
        message={deleting ? `Delete project-level risk "${deleting.title}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </Box>
  );
};
