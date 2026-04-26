/**
 * ReportSelector - Card-based report type picker grouped by category.
 */
import React from 'react';
import { ReportCatalog, ReportType } from '../../api/reports';

interface ReportSelectorProps {
  catalog: ReportCatalog;
  selected: ReportType | null;
  onSelect: (type: ReportType) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  cost_control: '💰', boe: '📋', risk: '⚠️', audit: '🔍', utilization: '📊',
};

export default function ReportSelector({ catalog, selected, onSelect }: ReportSelectorProps) {
  const s: Record<string, React.CSSProperties> = {
    section: { marginBottom: '24px' },
    catHeader: { fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' },
    card: { padding: '16px', borderRadius: '10px', border: '2px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', transition: 'all 0.15s' },
    cardSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff', boxShadow: '0 0 0 1px #3b82f6' },
    cardTitle: { fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' },
    cardDesc: { fontSize: '12px', color: '#64748b', lineHeight: 1.4 },
  };

  return (
    <div>
      {Object.entries(catalog).map(([catKey, cat]) => (
        <div key={catKey} style={s.section}>
          <div style={s.catHeader}>
            <span style={{ fontSize: '20px' }}>{CATEGORY_ICONS[catKey] || '📄'}</span>
            {cat.label}
          </div>
          <div style={s.grid}>
            {cat.reports.map(report => {
              const isSelected = selected === report.type;
              return (
                <div key={report.type}
                  style={{ ...s.card, ...(isSelected ? s.cardSelected : {}) }}
                  onClick={() => onSelect(report.type as ReportType)}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#94a3b8'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                  <div style={s.cardTitle}>{report.label}</div>
                  <div style={s.cardDesc}>{report.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
