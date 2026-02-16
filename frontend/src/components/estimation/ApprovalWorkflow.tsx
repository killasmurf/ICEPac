import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  WBSApprovalResponse,
  ApprovalActionType,
  processApproval,
} from '../../api/estimation';

interface ApprovalWorkflowProps {
  projectId: number;
  wbsId: number;
  approvalStatus: WBSApprovalResponse;
  onStatusChange: (newStatus: WBSApprovalResponse) => void;
  canApprove?: boolean;
}

const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'error' | 'warning' => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'submitted':
      return 'primary';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted for Approval';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
};

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  projectId,
  wbsId,
  approvalStatus,
  onStatusChange,
  canApprove = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const handleAction = async (action: ApprovalActionType, comment?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await processApproval(projectId, wbsId, { action, comment });
      onStatusChange(result);
      setRejectDialogOpen(false);
      setRejectComment('');
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const status = approvalStatus.approval_status;

  return (
    <Box>
      {/* Status Display */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="subtitle2">Status:</Typography>
        <Chip
          label={getStatusLabel(status)}
          color={getStatusColor(status)}
          variant={status === 'draft' ? 'outlined' : 'filled'}
        />
        {approvalStatus.estimate_revision > 0 && (
          <Chip label={`Rev ${approvalStatus.estimate_revision}`} size="small" variant="outlined" />
        )}
      </Box>

      {/* Approver Info */}
      {approvalStatus.approver && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Approved by: {approvalStatus.approver}
          {approvalStatus.approver_date && (
            <> on {new Date(approvalStatus.approver_date).toLocaleDateString()}</>
          )}
        </Typography>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {/* Draft -> Submit */}
        {status === 'draft' && (
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
            onClick={() => handleAction('submit')}
            disabled={loading}
          >
            Submit for Approval
          </Button>
        )}

        {/* Submitted -> Approve/Reject (for approvers) */}
        {status === 'submitted' && canApprove && (
          <>
            <Button
              variant="contained"
              color="success"
              startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
              onClick={() => handleAction('approve')}
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

        {/* Submitted -> Waiting message (for non-approvers) */}
        {status === 'submitted' && !canApprove && (
          <Alert severity="info" sx={{ flex: 1 }}>
            Awaiting approval from project manager
          </Alert>
        )}

        {/* Rejected -> Reset to Draft */}
        {status === 'rejected' && (
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => handleAction('reset')}
            disabled={loading}
          >
            Reset to Draft
          </Button>
        )}

        {/* Approved -> No actions */}
        {status === 'approved' && (
          <Alert severity="success" sx={{ flex: 1 }}>
            This estimate has been approved and is locked
          </Alert>
        )}
      </Box>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Estimate</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Comment"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Explain why this estimate is being rejected..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleAction('reject', rejectComment)}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalWorkflow;
