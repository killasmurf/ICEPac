/**
 * FormDialog - Modal dialog for create/edit forms.
 */
import React from 'react';

interface FormDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
  children: React.ReactNode;
  width?: string;
}

export default function FormDialog({
  open, title, onClose, onSubmit, loading, submitLabel = 'Save', children, width = '560px',
}: FormDialogProps) {
  if (!open) return null;

  const s: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    dialog: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width, maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
    title: { fontSize: '18px', fontWeight: 700, color: '#0f172a' },
    close: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8', padding: '4px' },
    body: { padding: '24px', overflowY: 'auto', flex: 1 },
    footer: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #e2e8f0' },
    cancelBtn: { padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 },
    submitBtn: { padding: '10px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: loading ? 0.7 : 1 },
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.dialog} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.title}>{title}</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <div style={s.body}>{children}</div>
        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={s.submitBtn} onClick={onSubmit} disabled={loading}>
            {loading ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
