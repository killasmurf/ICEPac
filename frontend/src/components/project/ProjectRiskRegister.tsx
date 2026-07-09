/**
 * Project Risk Register — list + create/edit/delete UI for the
 * project-level risk register (cross-cutting risks at the project
 * scope, distinct from WBS-scoped item-level risks).
 *
 * Renders inside ProjectDetail's "Risk Register" tab.
 *
 * Data is loaded on mount and after every mutation. Lookup lists for
 * category / probability / severity codes are pulled from the generic
 * admin/config endpoint via the existing configApi.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  projectRiskApi,
  ProjectRisk,
  ProjectRiskCreate,
  ProjectRiskUpdate,
} from '../../api/project-risks';
import { configApi, ConfigItem } from '../../api/admin';

interface Props {
  projectId: number;
}

const formatMoney = (raw: string | number) => {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (Number.isNaN(n)) return '$0';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
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

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  open: 'warning',
  mitigated: 'info',
  closed: 'success',
};

type LookupItem = ConfigItem;

export const ProjectRiskRegister: React.FC<Props> = ({ projectId }) => {
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCost, setTotalCost] = useState<number | null>(null);

  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [probabilities, setProbabilities] = useState<LookupItem[]>([]);
  const [severities, setSeverities] = useState<LookupItem[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRisk | null>(null);
  const [form, setForm] = useState<ProjectRiskCreate | ProjectRiskUpdate>({
    title: '',
    risk_cost: 0,
    risk_category_code: '',
    probability_code: '',
    severity_code: '',
    mitigation_plan: '',
    status: 'open',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [list, cost, cats, probs, sevs] = await Promise.all([
        projectRiskApi.list(projectId),
        projectRiskApi.totalCost(projectId),
        configApi.listItems('risk-categories'),
        configApi.listItems('probability-levels'),
        configApi.listItems('severity-levels'),
      ]);
      setRisks(list.items);
      setTotalCost(cost.total_risk_cost);
      setCategories(cats.items);
      setProbabilities(probs.items);
      setSeverities(sevs.items);
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to load project risk register.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '',
      risk_cost: 0,
      risk_category_code: categories[0]?.code ?? '',
      probability_code: probabilities[0]?.code ?? '',
      severity_code: severities[0]?.code ?? '',
      mitigation_plan: '',
      status: 'open',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (risk: ProjectRisk) => {
    setEditing(risk);
    setForm({
      title: risk.title,
      risk_cost: parseFloat(risk.risk_cost),
      risk_category_code: risk.risk_category_code ?? '',
      probability_code: risk.probability_code ?? '',
      severity_code: risk.severity_code ?? '',
      mitigation_plan: risk.mitigation_plan ?? '',
      status: risk.status,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) {
      setFormError('Title is required.');
      return;
    }
    try {
      setSaving(true);
      setFormError('');
      const payload: ProjectRiskCreate | ProjectRiskUpdate = {
        ...form,
        risk_cost: Number(form.risk_cost) || 0,
      };
      if (editing) {
        await projectRiskApi.update(projectId, editing.id, payload);
      } else {
        await projectRiskApi.create(projectId, payload as ProjectRiskCreate);
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      setFormError(
        e?.response?.data?.detail ??
          (editing ? 'Failed to update risk.' : 'Failed to create risk.')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (risk: ProjectRisk) => {
    if (!window.confirm(`Delete project-level risk "${risk.title}"?`)) return;
    try {
      await projectRiskApi.delete(projectId, risk.id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to delete risk.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Aggregate header */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Project-Level Risk Cost
          </Typography>
          <Typography variant="h5">
            {totalCost === null ? '—' : formatMoney(totalCost)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {risks.length} project-level {risks.length === 1 ? 'risk' : 'risks'} (cross-cutting; excludes WBS-scoped item-level risks)
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Project Risk
        </Button>
      </Paper>

      {risks.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No project-level risks recorded yet. Click "Add Project Risk" to record a
            cross-cutting risk (material price escalation, regulatory approval slip,
            key-person dependency, etc.).
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="center">Prob × Sev</TableCell>
                <TableCell align="right">Risk Cost</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {risks.map((risk) => (
                <TableRow key={risk.id} hover>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Tooltip title={risk.mitigation_plan || '(no mitigation plan)'} placement="top">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {risk.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {risk.date_identified?.slice(0, 10) ?? ''}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{risk.risk_category_code ?? '—'}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Chip
                        size="small"
                        label={risk.probability_code ?? '?'}
                        color={sevColor(risk.probability_code)}
                      />
                      <Typography variant="caption">×</Typography>
                      <Chip
                        size="small"
                        label={risk.severity_code ?? '?'}
                        color={sevColor(risk.severity_code)}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{formatMoney(risk.risk_cost)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={risk.status}
                      color={STATUS_COLORS[risk.status] ?? 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(risk)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(risk)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Project Risk' : 'Add Project Risk'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={(form as ProjectRiskCreate).title ?? ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              fullWidth
              autoFocus
              helperText="Concise risk name (e.g. 'Material Price Escalation from Steel Tariffs')."
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Category"
                value={(form as ProjectRiskCreate).risk_category_code ?? ''}
                onChange={(e) =>
                  setForm({ ...form, risk_category_code: e.target.value || undefined })
                }
                sx={{ flex: 1 }}
              >
                <MenuItem value="">—</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.code} — {c.description}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Risk Cost ($)"
                type="number"
                value={(form as ProjectRiskCreate).risk_cost ?? 0}
                onChange={(e) => setForm({ ...form, risk_cost: Number(e.target.value) })}
                sx={{ flex: 1 }}
                inputProps={{ min: 0, step: 1000 }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Probability"
                value={(form as ProjectRiskCreate).probability_code ?? ''}
                onChange={(e) =>
                  setForm({ ...form, probability_code: e.target.value || undefined })
                }
                sx={{ flex: 1 }}
              >
                <MenuItem value="">—</MenuItem>
                {probabilities.map((p) => (
                  <MenuItem key={p.code} value={p.code}>
                    {p.code} — {p.description}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Severity"
                value={(form as ProjectRiskCreate).severity_code ?? ''}
                onChange={(e) =>
                  setForm({ ...form, severity_code: e.target.value || undefined })
                }
                sx={{ flex: 1 }}
              >
                <MenuItem value="">—</MenuItem>
                {severities.map((s) => (
                  <MenuItem key={s.code} value={s.code}>
                    {s.code} — {s.description}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Status"
                value={(form as ProjectRiskCreate).status ?? 'open'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                sx={{ flex: 1 }}
              >
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="mitigated">Mitigated</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </TextField>
            </Stack>
            <TextField
              label="Mitigation Plan"
              value={(form as ProjectRiskCreate).mitigation_plan ?? ''}
              onChange={(e) => setForm({ ...form, mitigation_plan: e.target.value })}
              multiline
              rows={4}
              fullWidth
              helperText="Concrete actions, not platitudes ('monitor closely' is not a plan)."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Risk'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
