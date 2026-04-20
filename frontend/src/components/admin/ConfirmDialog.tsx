/**
 * ConfirmDialog - Confirmation modal for destructive actions.
 */
import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  confirmLabel?: string;
  danger?: boolean;
}

export default function ConfirmDialog({
  open, title, message, onClose, onConfirm, loading, confirmLabel = 'Confirm', danger,
}: ConfirmDialogProps) {
  if (!open) return null;

  const s: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    dialog: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '420px', maxWidth: '90vw', padding: '24px' },
    title: { fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' },
    message: { fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' },
    footer: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
    cancelBtn: { padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 },
    confirmBtn: { padding: '10px 20px', border: 'none', borderRadius: '8px', backgroundColor: danger ? '#ef4444' : '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: loading ? 0.7 : 1 },
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.dialog} onClick={e => e.stopPropagation()}>
        <div style={s.title}>{title}</div>
        <div style={s.message}>{message}</div>
        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={s.confirmBtn} onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
