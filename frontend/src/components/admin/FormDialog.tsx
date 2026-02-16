/**
 * FormDialog Component
 * 
 * Reusable modal dialog for create/edit forms.
 */

import React, { useEffect, useRef } from 'react';

interface FormDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
  width?: string;
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
    maxHeight: 'calc(100vh - 48px)',
    display: 'flex',
    flexDirection: 'column',
    transform: 'scale(0.95)',
    transition: 'transform 0.2s ease',
  },
  dialogVisible: {
    transform: 'scale(1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
  },
  closeButton: {
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#64748b',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonHover: {
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
  },
  body: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: '0 0 16px 16px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cancelButton: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    color: '#475569',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    border: '1px solid #3b82f6',
    color: '#fff',
  },
  submitButtonDisabled: {
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

// Add keyframes for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('style[data-form-dialog]')) {
  styleSheet.setAttribute('data-form-dialog', 'true');
  document.head.appendChild(styleSheet);
}

function FormDialog({
  open,
  title,
  onClose,
  onSubmit,
  loading = false,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  children,
  width = '560px',
}: FormDialogProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [closeHovered, setCloseHovered] = React.useState(false);
  const dialogRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (open) {
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 10);
      // Prevent body scroll
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

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
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
      <form
        ref={dialogRef}
        style={{
          ...styles.dialog,
          ...(isVisible ? styles.dialogVisible : {}),
          maxWidth: width,
        }}
        onSubmit={handleSubmit}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button
            type="button"
            style={{
              ...styles.closeButton,
              ...(closeHovered ? styles.closeButtonHover : {}),
            }}
            onClick={onClose}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {children}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            type="button"
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            style={{
              ...styles.button,
              ...styles.submitButton,
              ...(loading ? styles.submitButtonDisabled : {}),
            }}
            disabled={loading}
          >
            {loading && <div style={styles.spinner} />}
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormDialog;
