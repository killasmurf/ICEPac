import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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
  WBSCostSummary,
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

interface WBSDetailPanelProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  wbs: WBSItem | null;
  canApprove?: boolean;
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
  <div role="tabpanel" hidden={value !== index} style={{ height: '100%' }}>
    {value === index && <Box sx={{ py: 2, height: '100%' }}>{children}</Box>}
  </div>
);

const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const WBSDetailPanel: React.FC<WBSDetailPanelProps> = ({
  open,
  onClose,
  projectId,
  wbs,
  canApprove = false,
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
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<WBSApprovalResponse | null>(null);
  const [estimation, setEstimation] = useState<WBSCostSummary | null>(null);

  // Form states
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [riskFormOpen, setRiskFormOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);

  useEffect(() => {
    if (open && wbs) {
      loadData();
    }
  }, [open, wbs?.id]);

  const loadData = async () => {
    if (!wbs) return;
    setLoading(true);
    setError(null);
    try {
      const [assignmentsRes, risksRes, approvalRes, estimationRes] = await Promise.all([
        getAssignments(projectId, wbs.id),
        getRisks(projectId, wbs.id),
        getApprovalStatus(projectId, wbs.id),
        getWBSEstimation(projectId, wbs.id),
      ]);
      setAssignments(assignmentsRes.items);
      setRisks(risksRes.items);
      setApprovalStatus(approvalRes);
      setEstimation(estimationRes);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load WBS details');
    } finally {
      setLoading(false);
    }
  };

  const isReadonly = approvalStatus?.approval_status === 'submitted' || approvalStatus?.approval_status === 'approved';

  // Assignment handlers
  const handleAddAssignment = () => {
    setEditingAssignment(null);
    setAssignmentFormOpen(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignmentFormOpen(true);
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    if (!wbs || !confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await deleteAssignment(projectId, wbs.id, assignment.id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete assignment');
    }
  };

  const handleAssignmentSubmit = async (data: AssignmentCreate | AssignmentUpdate) => {
    if (!wbs) return;
    if (editingAssignment) {
      await updateAssignment(projectId, wbs.id, editingAssignment.id, data);
    } else {
      await createAssignment(projectId, wbs.id, data as AssignmentCreate);
    }
    setAssignmentFormOpen(false);
    await loadData();
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

  const handleDeleteRisk = async (risk: Risk) => {
    if (!wbs || !confirm('Are you sure you want to delete this risk?')) return;
    try {
      await deleteRisk(projectId, wbs.id, risk.id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete risk');
    }
  };

  const handleRiskSubmit = async (data: RiskCreate | RiskUpdate) => {
    if (!wbs) return;
    if (editingRisk) {
      await updateRisk(projectId, wbs.id, editingRisk.id, data);
    } else {
      await createRisk(projectId, wbs.id, data as RiskCreate);
    }
    setRiskFormOpen(false);
    await loadData();
  };

  // Approval handler
  const handleApprovalChange = (newStatus: WBSApprovalResponse) => {
    setApprovalStatus(newStatus);
    loadData();
  };

  if (!wbs) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 600, md: 800 },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6">{wbs.wbs_title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {wbs.wbs_code || `WBS #${wbs.id}`}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ px: 2 }}>
        <Tab label="Assignments" />
        <Tab label="Risks" />
        <Tab label="Summary" />
        <Tab label="Approval" />
      </Tabs>
      <Divider />

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {/* Assignments Tab */}
            <TabPanel value={tabValue} index={0}>
              <AssignmentList
                assignments={assignments}
                onAdd={handleAddAssignment}
                onEdit={handleEditAssignment}
                onDelete={handleDeleteAssignment}
                readonly={isReadonly}
              />
            </TabPanel>

            {/* Risks Tab */}
            <TabPanel value={tabValue} index={1}>
              <RiskList
                risks={risks}
                onAdd={handleAddRisk}
                onEdit={handleEditRisk}
                onDelete={handleDeleteRisk}
                readonly={isReadonly}
              />
            </TabPanel>

            {/* Summary Tab */}
            <TabPanel value={tabValue} index={2}>
              {estimation && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Cost Summary
                  </Typography>
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography>PERT Estimate</Typography>
                      <Typography fontWeight="bold">{formatCurrency(estimation.total_pert_estimate)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography>Standard Deviation</Typography>
                      <Typography fontWeight="bold">{formatCurrency(estimation.total_std_deviation)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                      <Typography>80% Confidence Range</Typography>
                      <Typography fontWeight="bold">
                        {formatCurrency(estimation.confidence_80_low)} - {formatCurrency(estimation.confidence_80_high)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                      <Typography>Risk Exposure</Typography>
                      <Typography fontWeight="bold">{formatCurrency(estimation.total_risk_exposure)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                      <Typography>Risk-Adjusted Estimate</Typography>
                      <Typography fontWeight="bold">{formatCurrency(estimation.risk_adjusted_estimate)}</Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </TabPanel>

            {/* Approval Tab */}
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

      {/* Forms */}
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
    </Drawer>
  );
};

export default WBSDetailPanel;
