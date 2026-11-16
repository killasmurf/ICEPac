import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { registerToastHandler, type ToastSeverity } from './toastBus';

interface ToastItem {
  key: number;
  severity: ToastSeverity;
  message: string;
}

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_HIDE_MS: Record<ToastSeverity, number> = { success: 4000, info: 4000, error: 8000 };

/** Renders one Snackbar at a time, queueing the rest. Also registers itself on the toast bus. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [open, setOpen] = useState(true);
  const counter = useRef(0);

  const push = useCallback((severity: ToastSeverity, message: string) => {
    counter.current += 1;
    const item: ToastItem = { key: counter.current, severity, message };
    setQueue((q) => [...q, item]);
    setOpen(true);
  }, []);

  useEffect(() => registerToastHandler(push), [push]);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  const current = queue[0];

  const handleClose = (_: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };
  const handleExited = () => {
    setQueue((q) => q.slice(1));
    setOpen(true);
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {current && (
        <Snackbar
          key={current.key}
          open={open}
          autoHideDuration={AUTO_HIDE_MS[current.severity]}
          onClose={handleClose}
          slotProps={{ transition: { onExited: handleExited } }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert variant="filled" severity={current.severity} onClose={() => setOpen(false)} sx={{ width: '100%' }}>
            {current.message}
          </Alert>
        </Snackbar>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
