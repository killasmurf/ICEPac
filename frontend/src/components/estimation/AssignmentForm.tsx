import React, { useState } from 'react';
import { Box, Divider, Grid, InputAdornment, MenuItem, TextField, Typography } from '@mui/material';
import {
  Assignment,
  AssignmentCreate,
  AssignmentUpdate,
  calculatePERT,
  calculateStdDeviation,
} from '../../api/estimation';
import { resourcesApi } from '../../api/admin';
import { PertRangeBar } from '../common/PertRangeBar';
import { formatCurrency } from '../../utils/format';
import { FormDialog } from '../common/FormDialog';
import { currencySymbol, parseAmount, validatePercent, validateThreePoint } from './estimationUtils';

interface AssignmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AssignmentCreate | AssignmentUpdate) => Promise<void>;
  assignment?: Assignment | null;
  /** `supplier_code` is the resource's default supplier; when a list does not carry it the form looks it up. */
  resources: { code: string; description: string; supplier_code?: string | null }[];
  suppliers: { code: string; name: string }[];
  costTypes: { code: string; description: string }[];
  regions: { code: string; description: string }[];
  businessAreas: { code: string; description: string }[];
  estimatingTechniques: { code: string; description: string }[];
}

interface FormState {
  resource_code: string;
  supplier_code: string;
  cost_type_code: string;
  region_code: string;
  bus_area_code: string;
  estimating_technique_code: string;
  best_estimate: string;
  likely_estimate: string;
  worst_estimate: string;
  duty_pct: string;
  import_content_pct: string;
  aii_pct: string;
}

const toFormData = (assignment?: Assignment | null): FormState =>
  assignment
    ? {
        resource_code: assignment.resource_code,
        supplier_code: assignment.supplier_code || '',
        cost_type_code: assignment.cost_type_code || '',
        region_code: assignment.region_code || '',
        bus_area_code: assignment.bus_area_code || '',
        estimating_technique_code: assignment.estimating_technique_code || '',
        best_estimate: String(assignment.best_estimate),
        likely_estimate: String(assignment.likely_estimate),
        worst_estimate: String(assignment.worst_estimate),
        duty_pct: String(assignment.duty_pct),
        import_content_pct: String(assignment.import_content_pct),
        aii_pct: String(assignment.aii_pct),
      }
    : {
        resource_code: '',
        supplier_code: '',
        cost_type_code: '',
        region_code: '',
        bus_area_code: '',
        estimating_technique_code: '',
        best_estimate: '0',
        likely_estimate: '0',
        worst_estimate: '0',
        duty_pct: '0',
        import_content_pct: '0',
        aii_pct: '0',
      };

/** Keep an edited record's current code selectable even when the lookup list has not loaded it. */
function withCurrent<T extends { code: string }>(options: T[], current: string, label: (code: string) => T): T[] {
  return !current || options.some((o) => o.code === current) ? options : [label(current), ...options];
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({
  open,
  onClose,
  onSubmit,
  assignment,
  resources,
  suppliers,
  costTypes,
  regions,
  businessAreas,
  estimatingTechniques,
}) => {
  const [formData, setFormData] = useState<FormState>(() => toFormData(assignment));
  const [loading, setLoading] = useState(false);
  // Reset the form when the dialog opens or the edited item changes
  // (adjusting state during render rather than in an effect).
  const [formSource, setFormSource] = useState({ assignment, open });
  if (formSource.assignment !== assignment || formSource.open !== open) {
    setFormSource({ assignment, open });
    setFormData(toFormData(assignment));
  }

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  // Picking a resource pre-fills its default supplier, but only while the supplier is still empty, so a
  // supplier the user already chose is never overwritten.
  const handleResourceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const code = event.target.value;
    setFormData((prev) => ({ ...prev, resource_code: code }));
    const known = resources.find((r) => r.code === code);
    if (known?.supplier_code) {
      setFormData((prev) => (prev.resource_code === code && !prev.supplier_code ? { ...prev, supplier_code: known.supplier_code ?? '' } : prev));
    } else if (known && known.supplier_code === undefined) {
      // The list was loaded without suppliers: ask the server for this resource's default.
      resourcesApi
        .list({ search: code, limit: 100 })
        .then((res) => {
          const supplier = res.items.find((r) => r.resource_code === code)?.supplier_code;
          if (supplier) {
            setFormData((prev) => (prev.resource_code === code && !prev.supplier_code ? { ...prev, supplier_code: supplier } : prev));
          }
        })
        .catch(() => undefined); // best effort: the supplier can still be chosen by hand
    }
  };

  const threePointErrors = validateThreePoint({
    best: formData.best_estimate,
    likely: formData.likely_estimate,
    worst: formData.worst_estimate,
  });
  const percentErrors = {
    duty_pct: validatePercent(formData.duty_pct),
    import_content_pct: validatePercent(formData.import_content_pct),
    aii_pct: validatePercent(formData.aii_pct),
  };
  const resourceMissing = !formData.resource_code;
  const invalid =
    resourceMissing || Object.keys(threePointErrors).length > 0 || Object.values(percentErrors).some(Boolean);

  const handleSubmit = async () => {
    if (invalid) return;
    setLoading(true);
    try {
      await onSubmit({
        resource_code: formData.resource_code,
        supplier_code: formData.supplier_code,
        cost_type_code: formData.cost_type_code,
        region_code: formData.region_code,
        bus_area_code: formData.bus_area_code,
        estimating_technique_code: formData.estimating_technique_code,
        best_estimate: parseAmount(formData.best_estimate) ?? 0,
        likely_estimate: parseAmount(formData.likely_estimate) ?? 0,
        worst_estimate: parseAmount(formData.worst_estimate) ?? 0,
        duty_pct: parseAmount(formData.duty_pct) ?? 0,
        import_content_pct: parseAmount(formData.import_content_pct) ?? 0,
        aii_pct: parseAmount(formData.aii_pct) ?? 0,
      });
      onClose();
    } catch {
      // The failure is already reported by the global error toast; keep the dialog open so nothing is lost.
    } finally {
      setLoading(false);
    }
  };

  // Live preview, only while the three points are valid
  const previewReady = Object.keys(threePointErrors).length === 0;
  const best = parseAmount(formData.best_estimate) ?? 0;
  const likely = parseAmount(formData.likely_estimate) ?? 0;
  const worst = parseAmount(formData.worst_estimate) ?? 0;
  const pert = previewReady ? calculatePERT(best, likely, worst) : null;
  const stdDev = previewReady ? calculateStdDeviation(best, worst) : null;

  const isEdit = !!assignment;
  const symbol = currencySymbol();
  const moneyAdornment = { startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> };

  const resourceOptions = withCurrent(resources, formData.resource_code, (code) => ({ code, description: '' }));
  const supplierOptions = withCurrent(suppliers, formData.supplier_code, (code) => ({ code, name: '' }));
  const costTypeOptions = withCurrent(costTypes, formData.cost_type_code, (code) => ({ code, description: '' }));
  const regionOptions = withCurrent(regions, formData.region_code, (code) => ({ code, description: '' }));
  const businessAreaOptions = withCurrent(businessAreas, formData.bus_area_code, (code) => ({ code, description: '' }));
  const techniqueOptions = withCurrent(estimatingTechniques, formData.estimating_technique_code, (code) => ({
    code,
    description: '',
  }));

  const optionLabel = (code: string, text: string) => (text ? `${code} - ${text}` : code);

  const threePointField = (
    field: 'best_estimate' | 'likely_estimate' | 'worst_estimate',
    key: 'best' | 'likely' | 'worst',
    label: string,
    hint: string,
  ) => (
    <Grid size={{ xs: 12, sm: 4 }}>
      <TextField
        fullWidth
        type="number"
        label={label}
        value={formData[field]}
        onChange={handleChange(field)}
        error={!!threePointErrors[key]}
        helperText={threePointErrors[key] ?? hint}
        slotProps={{ input: moneyAdornment, htmlInput: { min: 0, step: 0.01 } }}
      />
    </Grid>
  );

  const percentField = (field: 'duty_pct' | 'import_content_pct' | 'aii_pct', label: string) => (
    <Grid size={{ xs: 12, sm: 4 }}>
      <TextField
        fullWidth
        type="number"
        label={label}
        value={formData[field]}
        onChange={handleChange(field)}
        error={!!percentErrors[field]}
        helperText={percentErrors[field] ?? '0 to 100'}
        slotProps={{
          input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
          htmlInput: { min: 0, max: 100, step: 0.1 },
        }}
      />
    </Grid>
  );

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEdit ? 'Edit Assignment' : 'New Assignment'}
      submitLabel={isEdit ? 'Update' : 'Create'}
      loading={loading}
      submitDisabled={invalid}
      maxWidth="md"
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            fullWidth
            label="Resource"
            value={formData.resource_code}
            onChange={handleResourceChange}
            required
            helperText={resourceMissing ? 'Select a resource' : undefined}
          >
            {resourceOptions.map((r) => (
              <MenuItem key={r.code} value={r.code}>
                {optionLabel(r.code, r.description)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            fullWidth
            label="Supplier"
            value={formData.supplier_code}
            onChange={handleChange('supplier_code')}
          >
            <MenuItem value="">None</MenuItem>
            {supplierOptions.map((s) => (
              <MenuItem key={s.code} value={s.code}>
                {optionLabel(s.code, s.name)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            fullWidth
            label="Cost Type"
            value={formData.cost_type_code}
            onChange={handleChange('cost_type_code')}
          >
            <MenuItem value="">None</MenuItem>
            {costTypeOptions.map((ct) => (
              <MenuItem key={ct.code} value={ct.code}>
                {optionLabel(ct.code, ct.description)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField select fullWidth label="Region" value={formData.region_code} onChange={handleChange('region_code')}>
            <MenuItem value="">None</MenuItem>
            {regionOptions.map((r) => (
              <MenuItem key={r.code} value={r.code}>
                {optionLabel(r.code, r.description)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            fullWidth
            label="Business Area"
            value={formData.bus_area_code}
            onChange={handleChange('bus_area_code')}
          >
            <MenuItem value="">None</MenuItem>
            {businessAreaOptions.map((ba) => (
              <MenuItem key={ba.code} value={ba.code}>
                {optionLabel(ba.code, ba.description)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            fullWidth
            label="Estimating Technique"
            value={formData.estimating_technique_code}
            onChange={handleChange('estimating_technique_code')}
          >
            <MenuItem value="">None</MenuItem>
            {techniqueOptions.map((et) => (
              <MenuItem key={et.code} value={et.code}>
                {optionLabel(et.code, et.description)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" component="h3" gutterBottom>
            Three-Point Estimation
          </Typography>
        </Grid>

        {threePointField('best_estimate', 'best', 'Best Estimate', 'Optimistic cost')}
        {threePointField('likely_estimate', 'likely', 'Likely Estimate', 'Most probable cost')}
        {threePointField('worst_estimate', 'worst', 'Worst Estimate', 'Pessimistic cost')}

        <Grid size={{ xs: 12 }}>
          <Box
            data-testid="pert-preview"
            sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <Typography variant="body2" color="text.secondary" aria-live="polite">
              PERT Estimate: <strong className="tabular-nums">{formatCurrency(pert)}</strong>
              {' | '}
              Std Deviation: <strong className="tabular-nums">{formatCurrency(stdDev)}</strong>
            </Typography>
            {previewReady && pert !== null && worst > best && (
              <PertRangeBar best={best} likely={likely} worst={worst} pert={pert} />
            )}
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" component="h3" gutterBottom>
            Additional Factors
          </Typography>
        </Grid>

        {percentField('duty_pct', 'Duty %')}
        {percentField('import_content_pct', 'Import Content %')}
        {percentField('aii_pct', 'AII %')}
      </Grid>
    </FormDialog>
  );
};

export default AssignmentForm;
