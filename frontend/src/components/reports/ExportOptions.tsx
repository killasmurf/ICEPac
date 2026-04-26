/**
 * ExportOptions - Export format buttons for downloading reports.
 */
import React, { useState } from 'react';
import { ExportFormat, ReportRequest, reportsApi } from '../../api/reports';

interface ExportOptionsProps {
  request: ReportRequest | null;
  disabled?: boolean;
}

const FORMATS: { format: ExportFormat; label: string; icon: string; color: string }[] = [
  { format: 'pdf', label: 'PDF', icon: '📄', color: '#ef4444' },
  { format: 'xlsx', label: 'Excel', icon: '📊', color: '#16a34a' },
  { format: 'docx', label: 'Word', icon: '📝', color: '#2563eb' },
  { format: 'csv', label: 'CSV', icon: '📋', color: '#8b5cf6' },
];

export default function ExportOptions({ request, disabled }: ExportOptionsProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (fmt: ExportFormat) => {
    if (!request || disabled) return;
    setExporting(fmt);
    try {
      await reportsApi.export({ ...request, export_format: fmt });
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(null);
  };

  const btnStyle = (color: string, isExporting: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', border: `1px solid ${color}20`, borderRadius: '8px',
    backgroundColor: isExporting ? `${color}10` : '#fff',
    color, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px', fontWeight: 600, opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center' }}>Export:</span>
      {FORMATS.map(({ format, label, icon, color }) => (
        <button key={format} style={btnStyle(color, exporting === format)}
          onClick={() => handleExport(format)} disabled={disabled || exporting !== null}
          onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = `${color}10`; }}
          onMouseLeave={e => { if (!disabled) e.currentTarget.style.backgroundColor = '#fff'; }}>
          <span>{icon}</span>
          {exporting === format ? 'Exporting...' : label}
        </button>
      ))}
    </div>
  );
}
