/**
 * AuditLogs Component
 * 
 * Admin page for viewing system audit logs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import DataGrid, { Column } from '../../components/admin/DataGrid';
import { AuditLog } from '../../api/admin';

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1400px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' },
  subtitle: { fontSize: '15px', color: '#64748b' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' },
  filters: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  filterSelect: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#475569', backgroundColor: '#fff', cursor: 'pointer' },
  filterInput: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#475569', backgroundColor: '#fff', width: '150px' },
  tableCard: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  actionBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const },
  detailModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' },
  detailContent: { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', width: '100%', maxWidth: '700px', maxHeight: 'calc(100vh - 48px)', overflow: 'auto' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  detailTitle: { fontSize: '18px', fontWeight: 600, color: '#0f172a' },
  detailClose: { padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#64748b' },
  detailBody: { padding: '24px' },
  detailSection: { marginBottom: '24px' },
  detailSectionTitle: { fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '12px' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  detailLabel: { fontSize: '13px', color: '#64748b' },
  detailValue: { fontSize: '14px', color: '#0f172a', fontWeight: 500 },
  jsonView: { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', overflow: 'auto', maxHeight: '200px', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const },
  noData: { color: '#94a3b8', fontStyle: 'italic' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' },
  statValue: { fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' },
  statLabel: { fontSize: '13px', color: '#64748b' },
};

const actionColors: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: '#dcfce7', text: '#166534' },
  UPDATE: { bg: '#dbeafe', text: '#1e40af' },
  DELETE: { bg: '#fee2e2', text: '#991b1b' },
  LOGIN: { bg: '#f3e8ff', text: '#6b21a8' },
  LOGOUT: { bg: '#e0e7ff', text: '#3730a3' },
  FAILED_LOGIN: { bg: '#fef2f2', text: '#b91c1c' },
  PASSWORD_CHANGE: { bg: '#fef3c7', text: '#92400e' },
  ROLE_CHANGE: { bg: '#cffafe', text: '#0e7490' },
};

const mockAuditLogs: AuditLog[] = [
  { id: 1, user_id: 1, username: 'admin', action: 'CREATE', entity_type: 'Resource', entity_id: 157, old_values: null, new_values: { resource_code: 'ENG-SR', description: 'Senior Engineer' }, ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0', created_at: '2024-01-27T10:30:00Z' },
  { id: 2, user_id: 2, username: 'jsmith', action: 'UPDATE', entity_type: 'User', entity_id: 12, old_values: { role: 'user' }, new_values: { role: 'manager' }, ip_address: '192.168.1.101', user_agent: 'Mozilla/5.0', created_at: '2024-01-27T10:15:00Z' },
  { id: 3, user_id: 1, username: 'admin', action: 'CREATE', entity_type: 'Supplier', entity_id: 49, old_values: null, new_values: { supplier_code: 'NEWCO', name: 'New Company Inc' }, ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0', created_at: '2024-01-27T09:00:00Z' },
  { id: 4, user_id: 3, username: 'mwilson', action: 'DELETE', entity_type: 'Resource', entity_id: 89, old_values: { resource_code: 'OLD-RES', description: 'Old Resource' }, new_values: null, ip_address: '192.168.1.102', user_agent: 'Mozilla/5.0', created_at: '2024-01-27T08:30:00Z' },
  { id: 5, user_id: 1, username: 'admin', action: 'LOGIN', entity_type: 'User', entity_id: 1, old_values: null, new_values: null, ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0', created_at: '2024-01-27T08:00:00Z' },
  { id: 6, user_id: null, username: null, action: 'FAILED_LOGIN', entity_type: 'User', entity_id: null, old_values: null, new_values: { attempted_username: 'hacker' }, ip_address: '10.0.0.99', user_agent: 'curl/7.64.1', created_at: '2024-01-27T07:45:00Z' },
  { id: 7, user_id: 1, username: 'admin', action: 'PASSWORD_CHANGE', entity_type: 'User', entity_id: 5, old_values: null, new_values: null, ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0', created_at: '2024-01-26T16:00:00Z' },
];

function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    let filtered = [...mockAuditLogs];
    if (actionFilter !== 'all') filtered = filtered.filter(l => l.action === actionFilter);
    if (entityFilter !== 'all') filtered = filtered.filter(l => l.entity_type === entityFilter);
    if (userFilter) filtered = filtered.filter(l => l.username?.toLowerCase().includes(userFilter.toLowerCase()));
    setLogs(filtered.slice(skip, skip + 20));
    setTotal(filtered.length);
    setLoading(false);
  }, [skip, actionFilter, entityFilter, userFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const formatDate = (date: string) => new Date(date).toLocaleString();

  const columns: Column<AuditLog>[] = [
    { key: 'created_at', header: 'Time', sortable: true, width: '180px', render: log => <span style={{ color: '#64748b', fontSize: '13px' }}>{formatDate(log.created_at)}</span> },
    { key: 'username', header: 'User', sortable: true, width: '120px', render: log => <span style={{ fontWeight: 500 }}>{log.username || <span style={styles.noData}>System</span>}</span> },
    { key: 'action', header: 'Action', sortable: true, width: '140px', render: log => {
      const color = actionColors[log.action] || { bg: '#f1f5f9', text: '#475569' };
      return <span style={{ ...styles.actionBadge, backgroundColor: color.bg, color: color.text }}>{log.action}</span>;
    }},
    { key: 'entity_type', header: 'Entity', sortable: true, width: '120px' },
    { key: 'entity_id', header: 'ID', sortable: true, width: '80px', render: log => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{log.entity_id || '-'}</span> },
    { key: 'ip_address', header: 'IP Address', sortable: true, width: '130px', render: log => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#64748b' }}>{log.ip_address}</span> },
  ];

  const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGE', 'ROLE_CHANGE'];
  const entities = [...new Set(mockAuditLogs.map(l => l.entity_type))];

  const stats = {
    total: mockAuditLogs.length,
    creates: mockAuditLogs.filter(l => l.action === 'CREATE').length,
    updates: mockAuditLogs.filter(l => l.action === 'UPDATE').length,
    deletes: mockAuditLogs.filter(l => l.action === 'DELETE').length,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Audit Logs</h1>
        <p style={styles.subtitle}>System activity and change history</p>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}><div style={styles.statValue}>{stats.total}</div><div style={styles.statLabel}>Total Events</div></div>
        <div style={styles.statCard}><div style={{ ...styles.statValue, color: '#16a34a' }}>{stats.creates}</div><div style={styles.statLabel}>Creates</div></div>
        <div style={styles.statCard}><div style={{ ...styles.statValue, color: '#2563eb' }}>{stats.updates}</div><div style={styles.statLabel}>Updates</div></div>
        <div style={styles.statCard}><div style={{ ...styles.statValue, color: '#dc2626' }}>{stats.deletes}</div><div style={styles.statLabel}>Deletes</div></div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.filters}>
          <select style={styles.filterSelect} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="all">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select style={styles.filterSelect} value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
            <option value="all">All Entities</option>
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input style={styles.filterInput} type="text" placeholder="Filter by user..." value={userFilter} onChange={e => setUserFilter(e.target.value)} />
        </div>
      </div>

      <div style={styles.tableCard}>
        <DataGrid data={logs} columns={columns} keyField="id" loading={loading} emptyMessage="No audit logs found"
          onRowClick={setSelectedLog} showActions={false} pagination={{ total, skip, limit: 20, onPageChange: setSkip }} />
      </div>

      {selectedLog && (
        <div style={styles.detailModal} onClick={() => setSelectedLog(null)}>
          <div style={styles.detailContent} onClick={e => e.stopPropagation()}>
            <div style={styles.detailHeader}>
              <h2 style={styles.detailTitle}>Audit Log Details</h2>
              <button style={styles.detailClose} onClick={() => setSelectedLog(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={styles.detailBody}>
              <div style={styles.detailSection}>
                <div style={styles.detailSectionTitle}>Event Information</div>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}><span style={styles.detailLabel}>Time</span><span style={styles.detailValue}>{formatDate(selectedLog.created_at)}</span></div>
                  <div style={styles.detailItem}><span style={styles.detailLabel}>User</span><span style={styles.detailValue}>{selectedLog.username || 'System'}</span></div>
                  <div style={styles.detailItem}><span style={styles.detailLabel}>Action</span><span style={styles.detailValue}>{selectedLog.action}</span></div>
                  <div style={styles.detailItem}><span style={styles.detailLabel}>Entity</span><span style={styles.detailValue}>{selectedLog.entity_type} #{selectedLog.entity_id || 'N/A'}</span></div>
                  <div style={styles.detailItem}><span style={styles.detailLabel}>IP Address</span><span style={styles.detailValue}>{selectedLog.ip_address}</span></div>
                  <div style={styles.detailItem}><span style={styles.detailLabel}>User Agent</span><span style={styles.detailValue}>{selectedLog.user_agent?.substring(0, 30)}...</span></div>
                </div>
              </div>

              {selectedLog.old_values && (
                <div style={styles.detailSection}>
                  <div style={styles.detailSectionTitle}>Previous Values</div>
                  <div style={styles.jsonView}>{JSON.stringify(selectedLog.old_values, null, 2)}</div>
                </div>
              )}

              {selectedLog.new_values && (
                <div style={styles.detailSection}>
                  <div style={styles.detailSectionTitle}>New Values</div>
                  <div style={styles.jsonView}>{JSON.stringify(selectedLog.new_values, null, 2)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogs;
