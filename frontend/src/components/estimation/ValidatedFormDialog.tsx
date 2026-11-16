import React from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

export interface ValidatedFormDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  loading?: boolean;
  /** Disables the submit button (invalid form). */
  submitDisabled?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Same look and behaviour as the shared FormDialog (form element, full screen on phones,
 * Enter submits) plus `submitDisabled`, which FormDialog does not offer yet.
 * Gap reported in the PR: once FormDialog gains `submitDisabled` this file can be deleted.
 */
export function ValidatedFormDialog({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  loading,
  submitDisabled,
  maxWidth = 'sm',
  children,
}: ValidatedFormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = React.useId();
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullScreen={fullScreen}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby={titleId}
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: (e: React.FormEvent) => {
            e.preventDefault();
            if (!loading && !submitDisabled) onSubmit();
          },
        },
      }}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || submitDisabled}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ValidatedFormDialog;
