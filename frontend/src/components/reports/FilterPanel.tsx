/**
 * FilterPanel - Collapsible filter controls for report generation.
 */
import React, { useState } from 'react';
import { ReportFilter } from '../../api/reports';

interface FilterPanelProps {
  filters: ReportFilter;
  onChange: (filters: ReportFilter) => void;
  projects: { id: number; name: string }[];
}

export default function FilterPanel({ filters, onChange, projects }: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<ReportFilter>) => onChange({ ...filters, ...patch });

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' };

  return (
    <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Filters</span>
        <button onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          {expanded ? 'Less Filters ▲' : 'More Filters ▼'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
        <div>
          <label style={labelStyle}>Project</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={filters.project_id} onChange={e => update({ project_id: Number(e.target.value) })}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Date From</label>
          <input style={inputStyle} type="date" value={filters.date_from || ''} onChange={e => update({ date_from: e.target.value || undefined })} />
        </div>
        <div>
          <label style={labelStyle}>Date To</label>
          <input style={inputStyle} type="date" value={filters.date_to || ''} onChange={e => update({ date_to: e.target.value || undefined })} />
        </div>
        <div>
          <label style={labelStyle}>Approval Status</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={filters.approval_status || ''} onChange={e => update({ approval_status: e.target.value || undefined })}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
          <div>
            <label style={labelStyle}>Cost Type Codes</label>
            <input style={inputStyle} placeholder="LBR, MAT, SUB..." value={(filters.cost_type_codes || []).join(', ')}
              onChange={e => update({ cost_type_codes: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined })} />
          </div>
          <div>
            <label style={labelStyle}>Region Codes</label>
            <input style={inputStyle} placeholder="US, EU, APAC..." value={(filters.region_codes || []).join(', ')}
              onChange={e => update({ region_codes: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined })} />
          </div>
          <div>
            <label style={labelStyle}>Resource Codes</label>
            <input style={inputStyle} placeholder="RES001, RES002..." value={(filters.resource_codes || []).join(', ')}
              onChange={e => update({ resource_codes: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ fontSize: '13px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={filters.include_inactive || false}
                onChange={e => update({ include_inactive: e.target.checked })} />
              Include Inactive
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
