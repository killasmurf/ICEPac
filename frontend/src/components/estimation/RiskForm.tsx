import React, { useState } from 'react';
import { Box, Grid, InputAdornment, MenuItem, TextField, Typography } from '@mui/material';
import { Risk, RiskCreate, RiskUpdate } from '../../api/estimation';
import { formatCurrency } from '../../utils/format';
import { FormDialog } from '../common/FormDialog';
import { currencySymbol, parseAmount, validateMoney } from './estimationUtils';

interface RiskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RiskCreate | RiskUpdate) => Promise<void>;
  risk?: Risk | null;
  riskCategories: { code: string; description: string }[];
  probabilityLevels: { code: string; description: string; weight: number }[];
  severityLevels: { code: string; description: string; weight: number }[];
}

interface FormState {
  title: string;
  status: string;
  risk_category_code: string;
  risk_cost: string;
  probability_code: string;
  severity_code: string;
  mitigation_plan: string;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'closed', label: 'Closed' },
];

const toFormData = (risk?: Risk | null): FormState =>
  risk
    ? {
        title: risk.title,
        status: risk.status,
        risk_category_code: risk.risk_category_code ?? '',
        risk_cost: String(risk.risk_cost),
        probability_code: risk.probability_code || '',
        severity_code: risk.severity_code || '',
        mitigation_plan: risk.mitigation_plan || '',
      }
    : {
        title: '',
        status: 'open',
        risk_category_code: '',
        risk_cost: '0',
        probability_code: '',
        severity_code: '',
        mitigation_plan: '',
      };

const RiskForm: React.FC<RiskFormProps> = ({
  open,
  onClose,
  onSubmit,
  risk,
  riskCategories,
  probabilityLevels,
  severityLevels,
}) => {
  const [formData, setFormData] = useState<FormState>(() => toFormData(risk));
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  // Reset the form when the dialog opens or the edited item changes
  // (adjusting state during render rather than in an effect).
  const [formSource, setFormSource] = useState({ risk, open });
  if (formSource.risk !== risk || formSource.open !== open) {
    setFormSource({ risk, open });
    setFormData(toFormData(risk));
    setTouched(false);
  }

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const costError = validateMoney(formData.risk_cost);
  const titleError = formData.title.trim() === '' ? 'Title is required' : formData.title.length > 255 ? 'Title must be 255 characters or fewer' : undefined;
  const categoryMissing = !formData.risk_category_code;
  const invalid = !!costError || categoryMissing || !!titleError;

  const handleSubmit = async () => {
    if (invalid) return;
    setLoading(true);
    try {
      await onSubmit({
        title: formData.title.trim(),
        status: formData.status,
        risk_category_code: formData.risk_category_code,
        risk_cost: parseAmount(formData.risk_cost) ?? 0,
        probability_code: formData.probability_code,
        severity_code: formData.severity_code,
        mitigation_plan: formData.mitigation_plan,
      });
      onClose();
    } catch {
      // The failure is already reported by the global error toast; keep the dialog open so nothing is lost.
    } finally {
      setLoading(false);
    }
  };

  // Live risk exposure preview
  const probWeight = probabilityLevels.find((p) => p.code === formData.probability_code)?.weight || 0;
  const sevWeight = severityLevels.find((s) => s.code === formData.severity_code)?.weight || 0;
  const riskExposure = costError ? null : (parseAmount(formData.risk_cost) ?? 0) * probWeight * sevWeight;

  const isEdit = !!risk;
  const statusOptions = STATUS_OPTIONS.some((o) => o.value === formData.status)
    ? STATUS_OPTIONS
    : [...STATUS_OPTIONS, { value: formData.status, label: formData.status }];

  const categoryOptions =
    formData.risk_category_code && !riskCategories.some((c) => c.code === formData.risk_category_code)
      ? [{ code: formData.risk_category_code, description: '' }, ...riskCategories]
      : riskCategories;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEdit ? 'Edit Risk' : 'New Risk'}
      submitLabel={isEdit ? 'Update' : 'Create'}
      loading={loading}
      submitDisabled={invalid}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={handleChange('title')}
            onBlur={() => setTouched(true)}
            required
            autoFocus
            error={touched && !!titleError}
            helperText={touched && titleError ? titleError : 'A short name for this risk'}
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField select fullWidth label="Status" value={formData.status} onChange={handleChange('status')}>
            {statusOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            select
            fullWidth
            label="Risk Category"
            value={formData.risk_category_code}
            onChange={handleChange('risk_category_code')}
            required
            helperText={categoryMissing ? 'Select a category' : undefined}
          >
            {categoryOptions.map((rc) => (
              <MenuItem key={rc.code} value={rc.code}>
                {rc.description ? `${rc.code} - ${rc.description}` : rc.code}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            type="number"
            label="Risk Cost"
            value={formData.risk_cost}
            onChange={handleChange('risk_cost')}
            error={!!costError}
            helperText={costError ?? 'Potential cost if risk occurs'}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">{currencySymbol()}</InputAdornment> },
              htmlInput: { min: 0, step: 0.01 },
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            fullWidth
            label="Probability"
            value={formData.probability_code}
            onChange={handleChange('probability_code')}
          >
            <MenuItem value="">Not Set</MenuItem>
            {probabilityLevels.map((p) => (
              <MenuItem key={p.code} value={p.code}>
                {p.description} ({(p.weight * 100).toFixed(0)}%)
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            fullWidth
            label="Severity"
            value={formData.severity_code}
            onChange={handleChange('severity_code')}
          >
            <MenuItem value="">Not Set</MenuItem>
            {severityLevels.map((s) => (
              <MenuItem key={s.code} value={s.code}>
                {s.description} ({s.weight}x)
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Box
            data-testid="risk-exposure-preview"
            sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, border: 1, borderColor: 'divider' }}
          >
            <Typography variant="body2" color="text.secondary" aria-live="polite">
              Risk Exposure: <strong className="tabular-nums">{formatCurrency(riskExposure)}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (Cost x Probability Weight x Severity Weight)
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Mitigation Plan"
            value={formData.mitigation_plan}
            onChange={handleChange('mitigation_plan')}
            placeholder="Describe risk mitigation strategies..."
          />
        </Grid>
      </Grid>
    </FormDialog>
  );
};

export default RiskForm;
