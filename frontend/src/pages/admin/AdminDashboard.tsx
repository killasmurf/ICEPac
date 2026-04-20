/**
 * AdminDashboard - Overview page with stats and recent activity.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, auditApi, AuditLog } from '../../api/admin';

// Mock data for development
const MOCK_STATS = { total_resources: 128, total_suppliers: 24, recent_activity_count: 342 };
const MOCK_ACTIVITY: AuditLog[] = [
  { id: 1, user_id: 1, username: 'admin', action: 'create', entity_type: 'resource', entity_id: 45, details: 'Created resource RES045', created_at: new Date().toISOString() } as AuditLog,
  { id: 2, user_id: 2, username: 'jsmith', action: 'update', entity_type: 'supplier', entity_id: 12, details: 'Updated supplier info', created_at: new Date(Date.now() - 3600000).toISOString() } as AuditLog,
  { id: 3, user_id: 1, username: 'admin', action: 'delete', entity_type: 'cost_types', entity_id: 3, details: 'Removed cost type', created_at: new Date(Date.now() - 7200000).toISOString() } as AuditLog,
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(MOCK_STATS);
  const [activity, setActivity] = useState<AuditLog[]>(MOCK_ACTIVITY);

  const statCards = [
    { label: 'Resources', value: stats.total_resources, icon: '📦', color: '#3b82f6', path: '/admin/resources' },
    { label: 'Suppliers', value: stats.total_suppliers, icon: '🏢', color: '#8b5cf6', path: '/admin/suppliers' },
    { label: 'Activity', value: stats.recent_activity_count, icon: '📋', color: '#10b981', path: '/admin/audit-logs' },
  ];

  const quickActions = [
    { label: 'Add Resource', icon: '➕', path: '/admin/resources' },
    { label: 'Add Supplier', icon: '🏢', path: '/admin/suppliers' },
    { label: 'Manage Users', icon: '👥', path: '/admin/users' },
    { label: 'Config Tables', icon: '⚙️', path: '/admin/config' },
  ];

  const s: Record<string, React.CSSProperties> = {
    title: { fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '24px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' },
    card: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', border: '1px solid #e2e8f0' },
    cardIcon: { fontSize: '32px', marginBottom: '8px' },
    cardValue: { fontSize: '32px', fontWeight: 700, color: '#0f172a' },
    cardLabel: { fontSize: '14px', color: '#64748b', marginTop: '4px' },
    section: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', marginBottom: '24px' },
    sectionTitle: { fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' },
    actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' },
    actionBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'all 0.15s' },
    activityItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
    activityText: { fontSize: '14px', color: '#1e293b' },
    activityTime: { fontSize: '12px', color: '#94a3b8' },
    badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 },
  };

  const actionColors: Record<string, { bg: string; fg: string }> = {
    create: { bg: '#dcfce7', fg: '#166534' }, update: { bg: '#dbeafe', fg: '#1e40af' }, delete: { bg: '#fee2e2', fg: '#991b1b' },
  };

  const timeAgo = (dt: string) => {
    const mins = Math.floor((Date.now() - new Date(dt).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <div>
      <h1 style={s.title}>Admin Dashboard</h1>

      <div style={s.grid}>
        {statCards.map(c => (
          <div key={c.label} style={s.card} onClick={() => navigate(c.path)}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
            <div style={s.cardIcon}>{c.icon}</div>
            <div style={{ ...s.cardValue, color: c.color }}>{c.value}</div>
            <div style={s.cardLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Quick Actions</div>
        <div style={s.actionsGrid}>
          {quickActions.map(a => (
            <button key={a.label} style={s.actionBtn} onClick={() => navigate(a.path)}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}>
              <span>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Recent Activity</div>
        {activity.map(log => {
          const ac = actionColors[log.action] || actionColors.update;
          return (
            <div key={log.id} style={s.activityItem}>
              <div>
                <span style={{ ...s.badge, backgroundColor: ac.bg, color: ac.fg, marginRight: '8px' }}>{log.action}</span>
                <span style={s.activityText}>{log.details || `${log.action} ${log.entity_type} #${log.entity_id}`}</span>
                <span style={{ ...s.activityTime, marginLeft: '8px' }}>by {log.username}</span>
              </div>
              <span style={s.activityTime}>{timeAgo(log.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
