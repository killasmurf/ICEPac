/**
 * ConfirmDialog Component
 * 
 * Reusable confirmation dialog for destructive actions.
 */

import React, { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  overlayVisible: {
    opacity: 1,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '420px',
    transform: 'scale(0.95)',
    transition: 'transform 0.2s ease',
  },
  dialogVisible: {
    transform: 'scale(1)',
  },
  content: {
    padding: '24px',
    textAlign: 'center',
  },
  iconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  iconDanger: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  iconWarning: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '8px',
  },
  message: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: '0 0 16px 16px',
  },
  button: {
    flex: 1,
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  cancelButton: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    color: '#475569',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    border: '1px solid #3b82f6',
    color: '#fff',
  },
  confirmButtonDanger: {
    backgroundColor: '#dc2626',
    border: '1px solid #dc2626',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

function ConfirmDialog({
  open,
  title,
  message,
  onClose,
  onConfirm,
  loading = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
}: ConfirmDialogProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, loading, onClose]);

  // Handle click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        ...styles.overlay,
        ...(isVisible ? styles.overlayVisible : {}),
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          ...styles.dialog,
          ...(isVisible ? styles.dialogVisible : {}),
        }}
      >
        <div style={styles.content}>
          <div
            style={{
              ...styles.iconWrapper,
              ...(danger ? styles.iconDanger : styles.iconWarning),
            }}
          >
            {danger ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </div>
          <h3 style={styles.title}>{title}</h3>
          <p style={styles.message}>{message}</p>
        </div>
        <div style={styles.footer}>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            style={{
              ...styles.button,
              ...(danger ? styles.confirmButtonDanger : styles.confirmButton),
              ...(loading ? styles.buttonDisabled : {}),
            }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <div style={styles.spinner} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
