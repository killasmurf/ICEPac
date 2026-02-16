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
  Divider,
} from '@mui/material';
import {
  Assignment,
  AssignmentCreate,
  AssignmentUpdate,
  calculatePERT,
  calculateStdDeviation,
} from '../../api/estimation';

interface AssignmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AssignmentCreate | AssignmentUpdate) => Promise<void>;
  assignment?: Assignment | null;
  resources: { code: string; description: string }[];
  suppliers: { code: string; name: string }[];
  costTypes: { code: string; description: string }[];
  regions: { code: string; description: string }[];
  businessAreas: { code: string; description: string }[];
  estimatingTechniques: { code: string; description: string }[];
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
  const [formData, setFormData] = useState({
    resource_code: '',
    supplier_code: '',
    cost_type_code: '',
    region_code: '',
    bus_area_code: '',
    estimating_technique_code: '',
    best_estimate: 0,
    likely_estimate: 0,
    worst_estimate: 0,
    duty_pct: 0,
    import_content_pct: 0,
    aii_pct: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assignment) {
      setFormData({
        resource_code: assignment.resource_code,
        supplier_code: assignment.supplier_code || '',
        cost_type_code: assignment.cost_type_code || '',
        region_code: assignment.region_code || '',
        bus_area_code: assignment.bus_area_code || '',
        estimating_technique_code: assignment.estimating_technique_code || '',
        best_estimate: assignment.best_estimate,
        likely_estimate: assignment.likely_estimate,
        worst_estimate: assignment.worst_estimate,
        duty_pct: assignment.duty_pct,
        import_content_pct: assignment.import_content_pct,
        aii_pct: assignment.aii_pct,
      });
    } else {
      setFormData({
        resource_code: '',
        supplier_code: '',
        cost_type_code: '',
        region_code: '',
        bus_area_code: '',
        estimating_technique_code: '',
        best_estimate: 0,
        likely_estimate: 0,
        worst_estimate: 0,
        duty_pct: 0,
        import_content_pct: 0,
        aii_pct: 0,
      });
    }
  }, [assignment, open]);

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

  // Calculate live preview
  const pert = calculatePERT(formData.best_estimate, formData.likely_estimate, formData.worst_estimate);
  const stdDev = calculateStdDeviation(formData.best_estimate, formData.worst_estimate);

  const isEdit = !!assignment;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Assignment' : 'New Assignment'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Resource Selection */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Resource"
              value={formData.resource_code}
              onChange={handleChange('resource_code')}
              required
            >
              {resources.map((r) => (
                <MenuItem key={r.code} value={r.code}>
                  {r.code} - {r.description}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Supplier Selection */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Supplier"
              value={formData.supplier_code}
              onChange={handleChange('supplier_code')}
            >
              <MenuItem value="">None</MenuItem>
              {suppliers.map((s) => (
                <MenuItem key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Cost Type */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Cost Type"
              value={formData.cost_type_code}
              onChange={handleChange('cost_type_code')}
            >
              <MenuItem value="">None</MenuItem>
              {costTypes.map((ct) => (
                <MenuItem key={ct.code} value={ct.code}>
                  {ct.code} - {ct.description}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Region */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Region"
              value={formData.region_code}
              onChange={handleChange('region_code')}
            >
              <MenuItem value="">None</MenuItem>
              {regions.map((r) => (
                <MenuItem key={r.code} value={r.code}>
                  {r.code} - {r.description}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Business Area */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Business Area"
              value={formData.bus_area_code}
              onChange={handleChange('bus_area_code')}
            >
              <MenuItem value="">None</MenuItem>
              {businessAreas.map((ba) => (
                <MenuItem key={ba.code} value={ba.code}>
                  {ba.code} - {ba.description}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Estimating Technique */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Estimating Technique"
              value={formData.estimating_technique_code}
              onChange={handleChange('estimating_technique_code')}
            >
              <MenuItem value="">None</MenuItem>
              {estimatingTechniques.map((et) => (
                <MenuItem key={et.code} value={et.code}>
                  {et.code} - {et.description}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>
              Three-Point Estimation
            </Typography>
          </Grid>

          {/* Three-Point Estimates */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Best Estimate"
              value={formData.best_estimate}
              onChange={handleChange('best_estimate')}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Likely Estimate"
              value={formData.likely_estimate}
              onChange={handleChange('likely_estimate')}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Worst Estimate"
              value={formData.worst_estimate}
              onChange={handleChange('worst_estimate')}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>

          {/* Live Preview */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                PERT Estimate: <strong>${pert.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                {' | '}
                Std Deviation: <strong>${stdDev.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>
              Additional Factors
            </Typography>
          </Grid>

          {/* Percentages */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Duty %"
              value={formData.duty_pct}
              onChange={handleChange('duty_pct')}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Import Content %"
              value={formData.import_content_pct}
              onChange={handleChange('import_content_pct')}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="AII %"
              value={formData.aii_pct}
              onChange={handleChange('aii_pct')}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.resource_code}
        >
          {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignmentForm;
