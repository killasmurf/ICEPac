/**
 * FilterPanel - filter inputs for the selected report. Only filters the backend applies to that report are shown.
 */
import React from 'react';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { Project } from '../../api/projects';
import type { ReportType } from '../../api/reports';
import { APPROVAL_STATUSES, CODE_FILTERS, dateRangeError, supportedFilters, type FilterValues } from './reportFilters';

interface FilterPanelProps {
  reportType: ReportType;
  values: FilterValues;
  /** Receives only the changed fields so rapid edits never overwrite each other. */
  onChange: (patch: Partial<FilterValues>) => void;
  projects: Pick<Project, 'id' | 'project_name'>[];
  projectsLoading?: boolean;
}

export default function FilterPanel({ reportType, values, onChange, projects, projectsLoading }: FilterPanelProps) {
  const supported = new Set(supportedFilters(reportType));
  const update = onChange;
  const rangeError = dateRangeError(values);
  const projectKnown = values.project_id === undefined || projects.some((p) => p.id === values.project_id);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
      <TextField
        select
        required
        label="Project"
        value={projectKnown ? (values.project_id ?? '') : ''}
        onChange={(e) => update({ project_id: e.target.value === '' ? undefined : Number(e.target.value) })}
        disabled={projectsLoading}
        helperText={projectsLoading ? 'Loading projects' : undefined}
        slotProps={{ select: { displayEmpty: false } }}
      >
        {projects.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.project_name}
          </MenuItem>
        ))}
      </TextField>

      {supported.has('date_from') && (
        <TextField
          type="date"
          label="From date"
          value={values.date_from ?? ''}
          onChange={(e) => update({ date_from: e.target.value || undefined })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      )}
      {supported.has('date_to') && (
        <TextField
          type="date"
          label="To date"
          value={values.date_to ?? ''}
          onChange={(e) => update({ date_to: e.target.value || undefined })}
          error={rangeError !== null}
          helperText={rangeError ?? undefined}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      )}

      {supported.has('approval_status') && (
        <TextField
          select
          label="Approval status"
          value={values.approval_status ?? ''}
          onChange={(e) => update({ approval_status: e.target.value || undefined })}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {APPROVAL_STATUSES.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
      )}

      {CODE_FILTERS.filter((f) => supported.has(f.key)).map((f) => (
        <TextField
          key={f.key}
          label={f.label}
          placeholder={f.placeholder}
          value={values[f.key] ?? ''}
          onChange={(e) => update({ [f.key]: e.target.value || undefined })}
          helperText="Comma-separated"
          slotProps={{ inputLabel: { shrink: true } }}
        />
      ))}
    </Box>
  );
}
