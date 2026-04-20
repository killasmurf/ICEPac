/**
 * AuditLogs - Audit trail viewer with action/entity filters and detail modal.
 */
import React, { useState } from 'react';
import DataGrid, { Column } from '../../components/admin/DataGrid';
import SearchBar from '../../components/admin/SearchBar';
import { AuditLog } from '../../api/admin';

const MOCK_LOGS: AuditLog[] = [
  { id: 1, user_id: 1, username: 'admin', action: 'create', entity_type: 'resource', entity_id: 45, details: 'Created resource RES045', old_values: undefined, new_values: '{"resource_code":"RES045","cost":175}', ip_address: '192.168.1.10', created_at: new Date().toISOString() },
  { id: 2, user_id: 2, username: 'jsmith', action: 'update', entity_type: 'supplier', entity_id: 12, details: 'Updated supplier contact info', old_values: '{"contact_name":"Old Name"}', new_values: '{"contact_name":"New Name"}', ip_address: '192.168.1.15', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, user_id: 1, username: 'admin', action: 'delete', entity_type: 'cost_types', entity_id: 7, details: 'Removed cost type "Obsolete"', old_values: '{"name":"Obsolete","code":"OBS"}', ip_address: '192.168.1.10', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, user_id: 3, username: 'mjones', action: 'create', entity_type: 'user', entity_id: 5, details: 'Created user account', new_values: '{"username":"newuser","role":"viewer"}', ip_address: '10.0.0.5', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 5, user_id: 1, username: 'admin', action: 'update', entity_type: 'resource', entity_id: 12, details: 'Updated resource cost', old_values: '{"cost":100}', new_values: '{"cost":125}', ip_address: '192.168.1.10', created_at: new Date(Date.now() - 172800000).toISOString() },
];

export default function AuditLogs() {
  const [logs] = useState<AuditLog[]>(MOCK_LOGS);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const actionColors: Record<string, { bg: string; fg: string }> = {
    create: { bg: '#dcfce7', fg: '#166534' }, update: { bg: '#dbeafe', fg: '#1e40af' }, delete: { bg: '#fee2e2', fg: '#991b1b' },
  };

  const columns: Column<AuditLog>[] = [
    { key: 'created_at', label: 'Time', sortable: true, width: '160px', render: v => new Date(v).toLocaleString() },
    { key: 'username', label: 'User', sortable: true, width: '100px' },
    { key: 'action', label: 'Action', width: '90px', render: v => { const c = actionColors[v] || actionColors.update; return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, backgroundColor: c.bg, color: c.fg, textTransform: 'capitalize' }}>{v}</span>; } },
    { key: 'entity_type', label: 'Entity', sortable: true, width: '120px', render: v => v.replace(/_/g, ' ') },
    { key: 'entity_id', label: 'ID', width: '60px', render: v => v ? `#${v}` : '—' },
    { key: 'details', label: 'Details', render: v => v || '—' },
    { key: 'ip_address', label: 'IP', width: '120px', render: v => v || '—' },
  ];

  const actions = [...new Set(logs.map(l => l.action))];
  const entities = [...new Set(logs.map(l => l.entity_type))];

  const filtered = logs.filter(l => {
    if (actionFilter && l.action !== actionFilter) return false;
    if (entityFilter && l.entity_type !== entityFilter) return false;
    if (search && !l.username.toLowerCase().includes(search.toLowerCase()) && !(l.details || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff' };

  const tryParse = (s?: string) => { try { return s ? JSON.stringify(JSON.parse(s), null, 2) : '—'; } catch { return s || '—'; } };

  return (
    <div style={{ maxWidth: '1400px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Audit Logs</h1>
      <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>Track all administrative actions and changes</p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by user or details..." />
        <select style={selectStyle} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select style={selectStyle} value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
          <option value="">All Entities</option>
          {entities.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <DataGrid columns={columns} data={filtered} total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
          onRowClick={(row) => setDetailLog(row)}
          actions={(row: AuditLog) => (
            <button onClick={() => setDetailLog(row)} style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px' }}>View</button>
          )} />
      </div>

      {/* Detail Modal */}
      {detailLog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDetailLog(null)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Audit Log #{detailLog.id}</h2>
              <button onClick={() => setDetailLog(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '14px' }}>
              <strong style={{ color: '#64748b' }}>Time:</strong><span>{new Date(detailLog.created_at).toLocaleString()}</span>
              <strong style={{ color: '#64748b' }}>User:</strong><span>{detailLog.username} (ID: {detailLog.user_id})</span>
              <strong style={{ color: '#64748b' }}>Action:</strong><span style={{ textTransform: 'capitalize' }}>{detailLog.action}</span>
              <strong style={{ color: '#64748b' }}>Entity:</strong><span>{detailLog.entity_type} #{detailLog.entity_id}</span>
              <strong style={{ color: '#64748b' }}>Details:</strong><span>{detailLog.details || '—'}</span>
              <strong style={{ color: '#64748b' }}>IP Address:</strong><span>{detailLog.ip_address || '—'}</span>
            </div>
            {detailLog.old_values && (
              <div style={{ marginTop: '16px' }}>
                <strong style={{ fontSize: '13px', color: '#64748b' }}>Previous Values:</strong>
                <pre style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', fontSize: '12px', overflow: 'auto', marginTop: '4px' }}>{tryParse(detailLog.old_values)}</pre>
              </div>
            )}
            {detailLog.new_values && (
              <div style={{ marginTop: '12px' }}>
                <strong style={{ fontSize: '13px', color: '#64748b' }}>New Values:</strong>
                <pre style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px', fontSize: '12px', overflow: 'auto', marginTop: '4px' }}>{tryParse(detailLog.new_values)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
