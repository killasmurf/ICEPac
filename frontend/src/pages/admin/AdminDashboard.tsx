/**
 * AdminDashboard Component
 * 
 * Overview page showing key metrics and recent activity.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Types
interface DashboardStats {
  users: { total: number; active: number };
  resources: { total: number; active: number };
  suppliers: { total: number; active: number };
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  username: string;
  timestamp: string;
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  statCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: 500,
  },
  statMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f1f5f9',
  },
  statMetaBadge: {
    fontSize: '13px',
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: '20px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  activityItem: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s ease',
  },
  activityItemHover: {
    backgroundColor: '#f8fafc',
  },
  activityIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
  },
  activityText: {
    fontSize: '14px',
    color: '#0f172a',
    marginBottom: '4px',
  },
  activityMeta: {
    fontSize: '13px',
    color: '#64748b',
  },
  actionBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  quickActionCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s ease',
  },
  quickActionIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: '#64748b',
  },
};

// Icon components
const StatIcons = {
  Users: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Resources: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  Suppliers: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
};

// Action colors
const actionColors: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: '#dcfce7', text: '#166534' },
  UPDATE: { bg: '#dbeafe', text: '#1e40af' },
  DELETE: { bg: '#fee2e2', text: '#991b1b' },
  LOGIN: { bg: '#f3e8ff', text: '#6b21a8' },
};

// Mock data for demo
const mockStats: DashboardStats = {
  users: { total: 24, active: 18 },
  resources: { total: 156, active: 142 },
  suppliers: { total: 48, active: 45 },
  recentActivity: [
    { id: 1, action: 'CREATE', entityType: 'Resource', entityId: 157, username: 'admin', timestamp: '2 minutes ago' },
    { id: 2, action: 'UPDATE', entityType: 'User', entityId: 12, username: 'jsmith', timestamp: '15 minutes ago' },
    { id: 3, action: 'CREATE', entityType: 'Supplier', entityId: 49, username: 'admin', timestamp: '1 hour ago' },
    { id: 4, action: 'DELETE', entityType: 'Resource', entityId: 89, username: 'mwilson', timestamp: '2 hours ago' },
    { id: 5, action: 'LOGIN', entityType: 'User', entityId: 5, username: 'admin', timestamp: '3 hours ago' },
  ],
};

function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredActivity, setHoveredActivity] = useState<number | null>(null);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <div style={styles.loading}>Loading dashboard...</div>;
  }

  if (!stats) {
    return <div style={styles.loading}>Failed to load dashboard data</div>;
  }

  const statCards = [
    {
      key: 'users',
      label: 'Total Users',
      value: stats.users.total,
      active: stats.users.active,
      icon: StatIcons.Users,
      color: '#3b82f6',
      bgColor: '#eff6ff',
      link: '/admin/users',
    },
    {
      key: 'resources',
      label: 'Resources',
      value: stats.resources.total,
      active: stats.resources.active,
      icon: StatIcons.Resources,
      color: '#10b981',
      bgColor: '#ecfdf5',
      link: '/admin/resources',
    },
    {
      key: 'suppliers',
      label: 'Suppliers',
      value: stats.suppliers.total,
      active: stats.suppliers.active,
      icon: StatIcons.Suppliers,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
      link: '/admin/suppliers',
    },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <p style={styles.subtitle}>Overview of your administration system</p>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        {statCards.map((card) => {
          const Icon = card.icon;
          const isHovered = hoveredCard === card.key;
          
          return (
            <Link
              key={card.key}
              to={card.link}
              style={{
                ...styles.statCard,
                ...(isHovered ? styles.statCardHover : {}),
              }}
              onMouseEnter={() => setHoveredCard(card.key)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.statHeader}>
                <div>
                  <div style={styles.statValue}>{card.value}</div>
                  <div style={styles.statLabel}>{card.label}</div>
                </div>
                <div style={{ ...styles.statIcon, backgroundColor: card.bgColor, color: card.color }}>
                  <Icon />
                </div>
              </div>
              <div style={styles.statMeta}>
                <span
                  style={{
                    ...styles.statMetaBadge,
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                  }}
                >
                  {card.active} active
                </span>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {card.value - card.active} inactive
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.quickActions}>
          <Link
            to="/admin/users?action=new"
            style={{
              ...styles.quickActionCard,
              ...(hoveredCard === 'newUser' ? { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } : {}),
            }}
            onMouseEnter={() => setHoveredCard('newUser')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ ...styles.quickActionIcon, backgroundColor: '#eff6ff', color: '#3b82f6' }}>
              <StatIcons.Plus />
            </div>
            <span style={styles.quickActionText}>Add New User</span>
          </Link>
          <Link
            to="/admin/resources?action=new"
            style={{
              ...styles.quickActionCard,
              ...(hoveredCard === 'newResource' ? { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } : {}),
            }}
            onMouseEnter={() => setHoveredCard('newResource')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ ...styles.quickActionIcon, backgroundColor: '#ecfdf5', color: '#10b981' }}>
              <StatIcons.Plus />
            </div>
            <span style={styles.quickActionText}>Add New Resource</span>
          </Link>
          <Link
            to="/admin/suppliers?action=new"
            style={{
              ...styles.quickActionCard,
              ...(hoveredCard === 'newSupplier' ? { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } : {}),
            }}
            onMouseEnter={() => setHoveredCard('newSupplier')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ ...styles.quickActionIcon, backgroundColor: '#f5f3ff', color: '#8b5cf6' }}>
              <StatIcons.Plus />
            </div>
            <span style={styles.quickActionText}>Add New Supplier</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Activity</h2>
        <div style={styles.activityList}>
          {stats.recentActivity.map((activity) => {
            const actionStyle = actionColors[activity.action] || actionColors.UPDATE;
            const isHovered = hoveredActivity === activity.id;
            
            return (
              <div
                key={activity.id}
                style={{
                  ...styles.activityItem,
                  ...(isHovered ? styles.activityItemHover : {}),
                }}
                onMouseEnter={() => setHoveredActivity(activity.id)}
                onMouseLeave={() => setHoveredActivity(null)}
              >
                <div
                  style={{
                    ...styles.activityIcon,
                    backgroundColor: actionStyle.bg,
                    color: actionStyle.text,
                  }}
                >
                  {activity.action === 'CREATE' && <StatIcons.Plus />}
                  {activity.action === 'UPDATE' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  )}
                  {activity.action === 'DELETE' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  )}
                  {activity.action === 'LOGIN' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  )}
                </div>
                <div style={styles.activityContent}>
                  <div style={styles.activityText}>
                    <strong>{activity.username}</strong>{' '}
                    <span
                      style={{
                        ...styles.actionBadge,
                        backgroundColor: actionStyle.bg,
                        color: actionStyle.text,
                      }}
                    >
                      {activity.action}
                    </span>{' '}
                    {activity.entityType} #{activity.entityId}
                  </div>
                  <div style={styles.activityMeta}>{activity.timestamp}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
