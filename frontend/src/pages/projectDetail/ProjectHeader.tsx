import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, updateProject } from '../../api/projects';
import { projectQuery } from '../../api/queries';
import type { ProjectEstimationSummary } from '../../api/estimation';
import FormDialog from '../../components/common/FormDialog';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusChip from '../../components/common/StatusChip';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../../utils/format';
import { pluralise } from '../../utils/number';

const figure = (text: string) => (
  <Box component="span" sx={{ fontSize: { xs: '1.25rem', sm: 'inherit' }, overflowWrap: 'anywhere' }}>
    {text}
  </Box>
);

interface MetaProps {
  label: string;
  value: React.ReactNode;
}
const Meta: React.FC<MetaProps> = ({ label, value }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" component="div">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
      {value}
    </Typography>
  </Box>
);

interface EditDialogProps {
  project: Project;
  open: boolean;
  onClose: () => void;
}

const EditProjectDialog: React.FC<EditDialogProps> = ({ project, open, onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(project.project_name);
  const [manager, setManager] = useState(project.project_manager ?? '');
  const [description, setDescription] = useState(project.description ?? '');
  const [touched, setTouched] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      updateProject(project.id, {
        project_name: name.trim(),
        project_manager: manager,
        description,
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(projectQuery(project.id).queryKey, updated);
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated.');
      onClose();
    },
  });

  const nameError = touched && !name.trim();

  return (
    <FormDialog
      open={open}
      title="Edit project details"
      onClose={onClose}
      loading={mutation.isPending}
      onSubmit={() => {
        setTouched(true);
        if (name.trim()) mutation.mutate();
      }}
    >
      <TextField
        label="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError}
        helperText={nameError ? 'Project name is required.' : undefined}
        autoFocus
        fullWidth
      />
      <TextField label="Project manager" value={manager} onChange={(e) => setManager(e.target.value)} fullWidth />
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        minRows={3}
        fullWidth
      />
    </FormDialog>
  );
};

export interface ProjectHeaderProps {
  project: Project;
  estimation: ProjectEstimationSummary | undefined;
  estimationLoading: boolean;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project, estimation, estimationLoading }) => {
  const [editing, setEditing] = useState(false);
  const dash = '—';
  const range = estimation
    ? `${formatCurrency(estimation.confidence_80_low, { compact: true })} – ${formatCurrency(estimation.confidence_80_high, { compact: true })}`
    : dash;

  return (
    <Box component="section" aria-label="Project summary" sx={{ mb: 2 }}>
      <PageHeader
        title={project.project_name}
        subtitle={
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <StatusChip kind="project" value={project.status ?? (project.archived ? 'archived' : 'active')} />
            <span>{project.project_manager ? `Managed by ${project.project_manager}` : 'No project manager assigned'}</span>
          </Box>
        }
        actions={
          <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>
            Edit details
          </Button>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
        }}
      >
        <StatCard
          label="Total PERT estimate"
          icon={<PaidOutlinedIcon />}
          loading={estimationLoading}
          value={figure(estimation ? formatCurrency(estimation.total_pert_estimate, { maximumFractionDigits: 0 }) : dash)}
          hint={estimation ? `Risk-adjusted ${formatCurrency(estimation.risk_adjusted_estimate, { compact: true })}` : undefined}
        />
        <StatCard
          label="80% range"
          icon={<ShowChartIcon />}
          loading={estimationLoading}
          value={figure(range)}
          hint={estimation ? `Std dev ${formatCurrency(estimation.total_std_deviation, { compact: true })}` : undefined}
        />
        <StatCard
          label="WBS items"
          icon={<AccountTreeOutlinedIcon />}
          loading={estimationLoading}
          value={figure(estimation ? formatNumber(estimation.total_wbs_items) : dash)}
          hint={estimation ? pluralise(estimation.total_assignments, 'assignment') : undefined}
        />
        <StatCard
          label="Risks"
          icon={<WarningAmberOutlinedIcon />}
          loading={estimationLoading}
          value={figure(estimation ? formatNumber(estimation.total_risks) : dash)}
          hint={estimation ? `Exposure ${formatCurrency(estimation.total_risk_exposure, { compact: true })}` : undefined}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          mt: 2,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' },
        }}
      >
        <Meta label="Start" value={formatDate(project.start_date)} />
        <Meta label="Finish" value={formatDate(project.finish_date)} />
        <Meta label="Resources" value={formatNumber(project.resource_count)} />
        <Meta label="Source file" value={project.source_file ?? dash} />
        <Meta label="Created" value={formatDateTime(project.created_at)} />
      </Box>
      {project.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
          {project.description}
        </Typography>
      )}

      {editing && <EditProjectDialog key={project.updated_at} project={project} open onClose={() => setEditing(false)} />}
    </Box>
  );
};

export default ProjectHeader;
