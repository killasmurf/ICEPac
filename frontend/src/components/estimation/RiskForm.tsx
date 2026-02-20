import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Typography,
  Box,
} from '@mui/material';
import { Risk, RiskCreate, RiskUpdate } from '../../api/estimation';

interface RiskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RiskCreate | RiskUpdate) => Promise<void>;
  risk?: Risk | null;
  riskCategories: { code: string; description: string }[];
  probabilityLevels: { code: string; description: string; weight: number }[];
  severityLevels: { code: string; description: string; weight: number }[];
}

const RiskForm: React.FC<RiskFormProps> = ({
  open,
  onClose,
  onSubmit,
  risk,
  riskCategories,
  probabilityLevels,
  severityLevels,
}) => {
  const [formData, setFormData] = useState({
    risk_category_code: '',
    risk_cost: 0,
    probability_code: '',
    severity_code: '',
    mitigation_plan: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (risk) {
      setFormData({
        risk_category_code: risk.risk_category_code,
        risk_cost: risk.risk_cost,
        probability_code: risk.probability_code || '',
        severity_code: risk.severity_code || '',
        mitigation_plan: risk.mitigation_plan || '',
      });
    } else {
      setFormData({
        risk_category_code: '',
        risk_cost: 0,
        probability_code: '',
        severity_code: '',
        mitigation_plan: '',
      });
    }
  }, [risk, open]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'number' ? parseFloat(event.target.value) || 0 : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Calculate live risk exposure preview
  const probWeight = probabilityLevels.find((p) => p.code === formData.probability_code)?.weight || 0;
  const sevWeight = severityLevels.find((s) => s.code === formData.severity_code)?.weight || 0;
  const riskExposure = formData.risk_cost * probWeight * sevWeight;

  const isEdit = !!risk;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Risk' : 'New Risk'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Risk Category */}
          <Grid size={{ xs: 12 }}>
            <TextField
              select
              fullWidth
              label="Risk Category"
              value={formData.risk_category_code}
              onChange={handleChange('risk_category_code')}
              required
            >
              {riskCategories.map((rc) => (
                <MenuItem key={rc.code} value={rc.code}>
                  {rc.code} - {rc.description}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Risk Cost */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              type="number"
              label="Risk Cost"
              value={formData.risk_cost}
              onChange={handleChange('risk_cost')}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Potential cost if risk occurs"
            />
          </Grid>

          {/* Probability */}
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

          {/* Severity */}
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

          {/* Live Preview */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ bgcolor: 'warning.50', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
              <Typography variant="body2" color="text.secondary">
                Risk Exposure: <strong>${riskExposure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (Cost x Probability Weight x Severity Weight)
              </Typography>
            </Box>
          </Grid>

          {/* Mitigation Plan */}
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.risk_category_code}
        >
          {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RiskForm;
