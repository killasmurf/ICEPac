import React, { useId, useState } from 'react';
import { Box, Button, Divider, Drawer, Grid, IconButton, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AssignmentList from './AssignmentList';
import AssignmentForm from './AssignmentForm';
import RiskList from './RiskList';
import RiskForm from './RiskForm';
import ApprovalWorkflow from './ApprovalWorkflow';
import {
  Assignment,
  AssignmentCreate,
  AssignmentUpdate,
  Risk,
  RiskCreate,
  RiskUpdate,
  WBSApprovalResponse,
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getRisks,
  createRisk,
  updateRisk,
  deleteRisk,
  getApprovalStatus,
  getWBSEstimation,
} from '../../api/estimation';
import { WBSItem } from '../../api/projects';
import { formatCurrency } from '../../utils/format';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { StatCard } from '../common/StatCard';
import { StatusChip } from '../common/StatusChip';
import { PertRangeBar } from '../common/PertRangeBar';
import { TableSkeleton } from '../common/TableSkeleton';
import ErrorState from '../common/ErrorState';
import { useToast } from '../feedback/ToastProvider';
import { invalidateEstimation, wbsDetailsKey } from './queryKeys';
import { summaryRangeBar } from './estimationUtils';

interface WBSDetailPanelProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  wbs: WBSItem | null;
  /** Overrides the role check inside the approval tab. When omitted, admins and managers can approve. */
  canApprove?: boolean;
  /** 'drawer' (default) slides in from the right; 'inline' renders the panel in place for split layouts. */
  variant?: 'drawer' | 'inline';
  /** Called after any successful create, update, delete or approval action, so the parent can refresh its own data. */
  onChanged?: () => void;
  // Lookup data for forms
  resources?: { code: string; description: string }[];
  suppliers?: { code: string; name: string }[];
  costTypes?: { code: string; description: string }[];
  regions?: { code: string; description: string }[];
  businessAreas?: { code: string; description: string }[];
  estimatingTechniques?: { code: string; description: string }[];
  riskCategories?: { code: string; description: string }[];
  probabilityLevels?: { code: string; description: string; weight: number }[];
  severityLevels?: { code: string; description: string; weight: number }[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" id={`wbs-panel-${index}`} aria-labelledby={`wbs-tab-${index}`} hidden={value !== index} sx={{ height: '100%' }}>
    {value === index && <Box sx={{ py: 2, height: '100%' }}>{children}</Box>}
  </Box>
);

const fetchDetails = async (projectId: number, wbsId: number) => {
  const [assignments, risks, approval, estimation] = await Promise.all([
    getAssignments(projectId, wbsId),
    getRisks(projectId, wbsId),
    getApprovalStatus(projectId, wbsId),
    getWBSEstimation(projectId, wbsId),
  ]);
  return { assignments, risks, approval, estimation };
};

type DeleteTarget = { kind: 'assignment'; item: Assignment } | { kind: 'risk'; item: Risk } | null;

const WBSDetailPanel: React.FC<WBSDetailPanelProps> = ({
  open,
  onClose,
  projectId,
  wbs,
  canApprove,
  variant = 'drawer',
  onChanged,
  resources = [],
  suppliers = [],
  costTypes = [],
  regions = [],
  businessAreas = [],
  estimatingTechniques = [],
  riskCategories = [],
  probabilityLevels = [],
  severityLevels = [],
}) => {
  const toast = useToast();
  const titleId = useId();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);

  // Form / dialog states
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [riskFormOpen, setRiskFormOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const wbsId = wbs?.id;

  const {
    data: details,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: wbsDetailsKey(projectId, wbsId),
    queryFn: () => fetchDetails(projectId, wbsId as number),
    enabled: open && wbsId !== undefined,
  });

  const assignments = details?.assignments.items ?? [];
  const risks = details?.risks.items ?? [];
  const approvalStatus = details?.approval ?? null;
  const estimation = details?.estimation ?? null;

  const isReadonly = approvalStatus?.approval_status === 'submitted' || approvalStatus?.approval_status === 'approved';

  const refresh = () => {
    onChanged?.();
    return wbsId === undefined ? Promise.resolve([]) : invalidateEstimation(queryClient, projectId, wbsId);
  };

  const assignmentSave = useMutation({
    mutationFn: (vars: { data: AssignmentCreate | AssignmentUpdate; editing: Assignment | null }) =>
      vars.editing
        ? updateAssignment(projectId, wbsId as number, vars.editing.id, vars.data)
        : createAssignment(projectId, wbsId as number, vars.data as AssignmentCreate),
    onSuccess: (_result, vars) => {
      toast.success(vars.editing ? 'Assignment updated' : 'Assignment created');
      setAssignmentFormOpen(false);
      void refresh();
    },
  });

  const riskSave = useMutation({
    mutationFn: (vars: { data: RiskCreate | RiskUpdate; editing: Risk | null }) =>
      vars.editing
        ? updateRisk(projectId, wbsId as number, vars.editing.id, vars.data)
        : createRisk(projectId, wbsId as number, vars.data as RiskCreate),
    onSuccess: (_result, vars) => {
      toast.success(vars.editing ? 'Risk updated' : 'Risk created');
      setRiskFormOpen(false);
      void refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (target: NonNullable<DeleteTarget>) =>
      target.kind === 'assignment'
        ? deleteAssignment(projectId, wbsId as number, target.item.id)
        : deleteRisk(projectId, wbsId as number, target.item.id),
    onSuccess: (_result, target) => {
      toast.success(target.kind === 'assignment' ? 'Assignment deleted' : 'Risk deleted');
      setDeleteTarget(null);
      void refresh();
    },
    onError: () => setDeleteTarget(null),
  });

  // Assignment handlers
  const handleAddAssignment = () => {
    setEditingAssignment(null);
    setAssignmentFormOpen(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignmentFormOpen(true);
  };

  const handleAssignmentSubmit = async (data: AssignmentCreate | AssignmentUpdate) => {
    if (!wbs) return;
    await assignmentSave.mutateAsync({ data, editing: editingAssignment });
  };

  // Risk handlers
  const handleAddRisk = () => {
    setEditingRisk(null);
    setRiskFormOpen(true);
  };

  const handleEditRisk = (risk: Risk) => {
    setEditingRisk(risk);
    setRiskFormOpen(true);
  };

  const handleRiskSubmit = async (data: RiskCreate | RiskUpdate) => {
    if (!wbs) return;
    await riskSave.mutateAsync({ data, editing: editingRisk });
  };

  // The approval workflow invalidates the queries itself; this keeps the cached copy fresh immediately.
  const handleApprovalChange = (newStatus: WBSApprovalResponse) => {
    onChanged?.();
    if (wbsId === undefined) return;
    queryClient.setQueryData(wbsDetailsKey(projectId, wbsId), (old: Awaited<ReturnType<typeof fetchDetails>> | undefined) =>
      old ? { ...old, approval: newStatus } : old,
    );
  };

  if (!wbs) return null;

  const content = (
    <>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h2" id={titleId}>
            {wbs.wbs_title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              {wbs.wbs_code || `WBS #${wbs.id}`}
            </Typography>
            {approvalStatus && <StatusChip kind="approval" value={approvalStatus.approval_status} />}
          </Box>
        </Box>
        <Tooltip title="Close">
          <IconButton onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, v: number) => setTabValue(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="WBS details"
        sx={{ px: 2 }}
      >
        {['Assignments', 'Risks', 'Summary', 'Approval'].map((label, i) => (
          <Tab key={label} label={label} id={`wbs-tab-${i}`} aria-controls={`wbs-panel-${i}`} />
        ))}
      </Tabs>
      <Divider />

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {isLoading ? (
          <TableSkeleton rows={4} columns={5} />
        ) : isError || !details ? (
          <ErrorState
            title="Could not load WBS details"
            description="Something went wrong while loading. Check your connection and try again."
            action={
              <Button variant="outlined" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              <AssignmentList
                assignments={assignments}
                onAdd={handleAddAssignment}
                onEdit={handleEditAssignment}
                onDelete={(assignment) => setDeleteTarget({ kind: 'assignment', item: assignment })}
                readonly={isReadonly}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <RiskList
                risks={risks}
                onAdd={handleAddRisk}
                onEdit={handleEditRisk}
                onDelete={(risk) => setDeleteTarget({ kind: 'risk', item: risk })}
                readonly={isReadonly}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              {estimation && (
                <Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    Cost Summary
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <StatCard label="PERT Estimate" value={formatCurrency(estimation.total_pert_estimate)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <StatCard label="Standard Deviation" value={formatCurrency(estimation.total_std_deviation)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <StatCard label="Risk Exposure" value={formatCurrency(estimation.total_risk_exposure)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <StatCard label="Risk-Adjusted Estimate" value={formatCurrency(estimation.risk_adjusted_estimate)} />
                    </Grid>
                  </Grid>
                  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      80% Confidence Range
                    </Typography>
                    <Typography variant="body1" className="tabular-nums" sx={{ mb: 1, fontWeight: 600 }}>
                      {formatCurrency(estimation.confidence_80_low)} - {formatCurrency(estimation.confidence_80_high)}
                    </Typography>
                    <PertRangeBar {...summaryRangeBar(estimation)} />
                  </Box>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              {approvalStatus && (
                <ApprovalWorkflow
                  projectId={projectId}
                  wbsId={wbs.id}
                  approvalStatus={approvalStatus}
                  onStatusChange={handleApprovalChange}
                  canApprove={canApprove}
                />
              )}
            </TabPanel>
          </>
        )}
      </Box>

      {/* Forms and confirmations */}
      <AssignmentForm
        open={assignmentFormOpen}
        onClose={() => setAssignmentFormOpen(false)}
        onSubmit={handleAssignmentSubmit}
        assignment={editingAssignment}
        resources={resources}
        suppliers={suppliers}
        costTypes={costTypes}
        regions={regions}
        businessAreas={businessAreas}
        estimatingTechniques={estimatingTechniques}
      />

      <RiskForm
        open={riskFormOpen}
        onClose={() => setRiskFormOpen(false)}
        onSubmit={handleRiskSubmit}
        risk={editingRisk}
        riskCategories={riskCategories}
        probabilityLevels={probabilityLevels}
        severityLevels={severityLevels}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'risk' ? 'Delete risk?' : 'Delete assignment?'}
        message={
          deleteTarget?.kind === 'risk'
            ? `Delete the ${deleteTarget.item.risk_category_code} risk? This cannot be undone.`
            : deleteTarget
              ? `Delete the ${deleteTarget.item.resource_code} assignment? This cannot be undone.`
              : ''
        }
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );

  if (variant === 'inline') {
    return open ? (
      <Box
        component="section"
        aria-labelledby={titleId}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        {content}
      </Box>
    ) : null;
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId } }}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 600, md: 800 },
        },
      }}
    >
      {content}
    </Drawer>
  );
};

export default WBSDetailPanel;
