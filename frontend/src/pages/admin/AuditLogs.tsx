/**
 * AuditLogs Component
 *
 * Admin page for viewing system audit logs.
 * Connected to real backend API endpoints.
 */

import React, { useState, useEffect, useCallback } from 'react';
import DataGrid, { Column } from '../../components/admin/DataGrid';
import { getAuditLogs, AuditLog, AuditLogFilter } from '../../api/admin';

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
  toast: { position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 500, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  toastError: { backgroundColor: '#ef4444' },
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

const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGE', 'ROLE_CHANGE'];
const entities = ['User', 'Resource', 'Supplier'];

function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' } | null>(null);

  const showToast = (message: string) => { setToast({ message, type: 'error' }); setTimeout(() => setToast(null), 3000); };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters: AuditLogFilter = {};
      if (actionFilter !== 'all') filters.action = actionFilter;
      if (entityFilter !== 'all') filters.entity_type = entityFilter;
      const response = await getAuditLogs(skip, 20, filters);
      let filtered = response.items;
      // Client-side username filter (backend doesn't support it directly)
      if (userFilter) {
        filtered = filtered.filter(l => l.username?.toLowerCase().includes(userFilter.toLowerCase()));
      }
      setLogs(filtered);
      setTotal(response.total);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Audit Logs</h1>
        <p style={styles.subtitle}>System activity and change history</p>
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

      {toast && <div style={{...styles.toast, ...styles.toastError}}>{toast.message}</div>}
    </div>
  );
}

export default AuditLogs;
