import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  WBSApprovalResponse,
  ApprovalActionType,
  processApproval,
} from '../../api/estimation';
import type { WBSTreeNode } from '../../api/projects';
import { applyOptimistic, optimisticTarget, rollbackOptimistic } from '../../api/optimistic';
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from '../../utils/format';
import { StatusChip } from '../common/StatusChip';
import { FormDialog } from '../common/FormDialog';
import { useToast } from '../feedback/ToastProvider';
import { invalidateEstimation, wbsDetailsKey, wbsTreeKey } from './queryKeys';

interface ApprovalWorkflowProps {
  projectId: number;
  wbsId: number;
  approvalStatus: WBSApprovalResponse;
  onStatusChange: (newStatus: WBSApprovalResponse) => void;
  /** Overrides the role check. When omitted, admins and managers (the roles the API allows) can approve. */
  canApprove?: boolean;
}

const SUCCESS_MESSAGE: Record<ApprovalActionType, string> = {
  submit: 'Submitted for approval',
  approve: 'Estimate approved',
  reject: 'Estimate rejected',
  reset: 'Reset to draft',
};

/** Roles the backend lets approve or reject (app/routes/estimation.py). */
const APPROVER_ROLES = ['admin', 'manager'];

/** Status each action leads to; used for the optimistic update (the server's answer replaces it). */
const NEXT_STATUS: Record<ApprovalActionType, string> = {
  submit: 'submitted',
  approve: 'approved',
  reject: 'rejected',
  reset: 'draft',
};

const setNodeStatus = (nodes: WBSTreeNode[], wbsId: number, status: string): WBSTreeNode[] =>
  nodes.map((n) => ({
    ...n,
    approval_status: n.id === wbsId ? status : n.approval_status,
    children: setNodeStatus(n.children, wbsId, status),
  }));

const STEPS = ['Draft', 'Submitted', 'Approved'];

/** Index of the active step; a finished flow passes the last index so every step shows complete. */
function activeStepFor(status: string): number {
  switch (status) {
    case 'submitted':
      return 1;
    case 'approved':
      return STEPS.length;
    case 'rejected':
      return 2;
    default:
      return 0;
  }
}

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  projectId,
  wbsId,
  approvalStatus,
  onStatusChange,
  canApprove: canApproveOverride,
}) => {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const canApprove = canApproveOverride ?? (role !== null && APPROVER_ROLES.includes(role));

  const mutation = useMutation({
    mutationFn: (vars: { action: ApprovalActionType; comment?: string }) =>
      processApproval(projectId, wbsId, { action: vars.action, comment: vars.comment }),
    // Optimistic: show the new status at once; roll back on error (the global handler raises the error toast).
    onMutate: (vars) =>
      applyOptimistic(
        queryClient,
        [
          optimisticTarget<{ approval: WBSApprovalResponse }, typeof vars>(wbsDetailsKey(projectId, wbsId), (old, v) => ({
            ...old,
            approval: { ...old.approval, approval_status: NEXT_STATUS[v.action] },
          })),
          optimisticTarget<WBSTreeNode[], typeof vars>(wbsTreeKey(projectId), (old, v) => setNodeStatus(old, wbsId, NEXT_STATUS[v.action])),
        ],
        vars,
      ),
    onError: (_error, _vars, snapshot) => rollbackOptimistic(queryClient, snapshot),
    onSuccess: (result, vars) => {
      toast.success(SUCCESS_MESSAGE[vars.action]);
      setRejectDialogOpen(false);
      setRejectComment('');
      onStatusChange(result);
    },
    onSettled: () => invalidateEstimation(queryClient, projectId, wbsId),
  });

  const loading = mutation.isPending;
  const act = (action: ApprovalActionType, comment?: string) => mutation.mutate({ action, comment });

  const status = approvalStatus.approval_status;
  const rejected = status === 'rejected';
  const spinner = <CircularProgress size={16} color="inherit" />;

  return (
    <Box>
      {/* Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" component="span">
          Status:
        </Typography>
        <StatusChip kind="approval" value={status} size="medium" />
        {approvalStatus.estimate_revision > 0 && (
          <Chip label={`Rev ${approvalStatus.estimate_revision}`} size="small" variant="outlined" />
        )}
      </Box>

      <Stepper
        activeStep={activeStepFor(status)}
        alternativeLabel
        aria-label="Approval progress"
        sx={{ mb: 3 }}
      >
        {STEPS.map((label, index) => {
          const isRejectedStep = rejected && index === 2;
          return (
            <Step key={label}>
              <StepLabel
                error={isRejectedStep}
                optional={
                  isRejectedStep ? (
                    <Typography variant="caption" color="error">
                      Needs changes
                    </Typography>
                  ) : undefined
                }
              >
                {isRejectedStep ? 'Rejected' : label}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      {/* Approver Info */}
      {approvalStatus.approver && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Approved by: {approvalStatus.approver}
          {approvalStatus.approver_date && <> on {formatDate(approvalStatus.approver_date)}</>}
        </Typography>
      )}

      {/* Actions, by status and role */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {status === 'draft' && (
          <Button
            variant="contained"
            startIcon={loading ? spinner : <SendIcon />}
            onClick={() => act('submit')}
            disabled={loading}
          >
            Submit for Approval
          </Button>
        )}

        {status === 'submitted' && canApprove && (
          <>
            <Button
              variant="contained"
              color="success"
              startIcon={loading ? spinner : <CheckCircleIcon />}
              onClick={() => act('approve')}
              disabled={loading}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setRejectDialogOpen(true)}
              disabled={loading}
            >
              Reject
            </Button>
          </>
        )}

        {status === 'submitted' && !canApprove && (
          <Alert severity="info" sx={{ flex: 1 }}>
            Awaiting approval from project manager
          </Alert>
        )}

        {rejected && (
          <Button
            variant="outlined"
            startIcon={loading ? spinner : <RefreshIcon />}
            onClick={() => act('reset')}
            disabled={loading}
          >
            Reset to Draft
          </Button>
        )}

        {status === 'approved' && (
          <Alert severity="success" sx={{ flex: 1 }}>
            This estimate has been approved and is locked
          </Alert>
        )}
      </Box>

      <FormDialog
        open={rejectDialogOpen}
        title="Reject Estimate"
        submitLabel="Reject"
        loading={loading}
        onClose={() => setRejectDialogOpen(false)}
        onSubmit={() => act('reject', rejectComment)}
      >
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Rejection Comment"
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          placeholder="Explain why this estimate is being rejected..."
          helperText="Recorded in the audit log. Optional."
          autoFocus
        />
      </FormDialog>
    </Box>
  );
};

export default ApprovalWorkflow;
