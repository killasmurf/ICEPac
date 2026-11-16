import React from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

export interface FormDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Called on submit button click or Enter inside a field. */
  onSubmit: () => void;
  submitLabel?: string;
  loading?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function FormDialog({ open, title, onClose, onSubmit, submitLabel = 'Save', loading, maxWidth = 'sm', children }: FormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullScreen={fullScreen}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby="form-dialog-title"
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: (e: React.FormEvent) => {
            e.preventDefault();
            if (!loading) onSubmit();
          },
        },
      }}
    >
      <DialogTitle id="form-dialog-title">{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FormDialog;
