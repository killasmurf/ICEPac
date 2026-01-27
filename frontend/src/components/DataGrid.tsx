/**
 * DataGrid Component
 * 
 * A reusable data grid with sorting, pagination, and actions.
 * Part of Phase 2: Admin Circuit Migration
 */

import React, { useState, useMemo } from 'react';

// ============================================================
// Types
// ============================================================

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  showActions?: boolean;
  pagination?: {
    total: number;
    skip: number;
    limit: number;
    onPageChange: (skip: number) => void;
  };
}

// ============================================================
// Styles
// ============================================================

const styles = {
  container: {
    width: '100%',
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  thead: {
    backgroundColor: '#f8f9fa',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: '14px',
    color: '#495057',
    borderBottom: '2px solid #dee2e6',
    cursor: 'pointer',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
  },
  thSortable: {
    cursor: 'pointer',
  },
  thSortIcon: {
    marginLeft: '4px',
    opacity: 0.5,
  },
  tr: {
    borderBottom: '1px solid #e9ecef',
    transition: 'background-color 0.15s',
  },
  trHover: {
    backgroundColor: '#f8f9fa',
  },
  trClickable: {
    cursor: 'pointer',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#212529',
    verticalAlign: 'middle' as const,
  },
  actionsCell: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '12px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  editButton: {
    backgroundColor: '#e7f1ff',
    color: '#0d6efd',
  },
  deleteButton: {
    backgroundColor: '#f8d7da',
    color: '#dc3545',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '48px',
    color: '#6c757d',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '48px',
    color: '#6c757d',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa',
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#6c757d',
  },
  paginationButtons: {
    display: 'flex',
    gap: '8px',
  },
  pageButton: {
    padding: '8px 16px',
    fontSize: '14px',
    borderRadius: '4px',
    border: '1px solid #dee2e6',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  pageButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  activeBadge: {
    backgroundColor: '#d1e7dd',
    color: '#0f5132',
  },
  inactiveBadge: {
    backgroundColor: '#f8d7da',
    color: '#842029',
  },
};

// ============================================================
// Component
// ============================================================

function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  onEdit,
  onDelete,
  showActions = true,
  pagination,
}: DataGridProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hoveredRow, setHoveredRow] = useState<any>(null);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDir]);

  // Handle sort
  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Get value from item
  const getValue = (item: T, key: string) => {
    const keys = key.split('.');
    let value: any = item;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  };

  // Render sort indicator
  const renderSortIndicator = (key: string) => {
    if (sortKey !== key) return <span style={styles.thSortIcon}>↕</span>;
    return <span style={styles.thSortIcon}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // Calculate pagination
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;
  const currentPage = pagination ? Math.floor(pagination.skip / pagination.limit) + 1 : 1;

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  if (data.length === 0) {
    return <div style={styles.empty}>{emptyMessage}</div>;
  }

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead style={styles.thead}>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={{
                  ...styles.th,
                  ...(col.sortable ? styles.thSortable : {}),
                  width: col.width,
                }}
                onClick={() => handleSort(String(col.key), col.sortable)}
              >
                {col.header}
                {col.sortable && renderSortIndicator(String(col.key))}
              </th>
            ))}
            {showActions && (onEdit || onDelete) && (
              <th style={{ ...styles.th, textAlign: 'right', width: '120px' }}>
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr
              key={String(item[keyField])}
              style={{
                ...styles.tr,
                ...(hoveredRow === item[keyField] ? styles.trHover : {}),
                ...(onRowClick ? styles.trClickable : {}),
              }}
              onMouseEnter={() => setHoveredRow(item[keyField])}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={String(col.key)} style={styles.td}>
                  {col.render
                    ? col.render(item)
                    : String(getValue(item, String(col.key)) ?? '')}
                </td>
              ))}
              {showActions && (onEdit || onDelete) && (
                <td style={styles.td}>
                  <div style={styles.actionsCell}>
                    {onEdit && (
                      <button
                        style={{ ...styles.actionButton, ...styles.editButton }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        style={{ ...styles.actionButton, ...styles.deleteButton }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && pagination.total > pagination.limit && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            Showing {pagination.skip + 1} to{' '}
            {Math.min(pagination.skip + pagination.limit, pagination.total)} of{' '}
            {pagination.total} entries
          </div>
          <div style={styles.paginationButtons}>
            <button
              style={{
                ...styles.pageButton,
                ...(currentPage === 1 ? styles.pageButtonDisabled : {}),
              }}
              disabled={currentPage === 1}
              onClick={() => pagination.onPageChange(0)}
            >
              First
            </button>
            <button
              style={{
                ...styles.pageButton,
                ...(currentPage === 1 ? styles.pageButtonDisabled : {}),
              }}
              disabled={currentPage === 1}
              onClick={() =>
                pagination.onPageChange(
                  Math.max(0, pagination.skip - pagination.limit)
                )
              }
            >
              Previous
            </button>
            <span style={{ padding: '8px 16px', fontSize: '14px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              style={{
                ...styles.pageButton,
                ...(currentPage === totalPages ? styles.pageButtonDisabled : {}),
              }}
              disabled={currentPage === totalPages}
              onClick={() =>
                pagination.onPageChange(pagination.skip + pagination.limit)
              }
            >
              Next
            </button>
            <button
              style={{
                ...styles.pageButton,
                ...(currentPage === totalPages ? styles.pageButtonDisabled : {}),
              }}
              disabled={currentPage === totalPages}
              onClick={() =>
                pagination.onPageChange((totalPages - 1) * pagination.limit)
              }
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Utility Components
// ============================================================

export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      style={{
        ...styles.statusBadge,
        ...(isActive ? styles.activeBadge : styles.inactiveBadge),
      }}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    admin: { bg: '#f8d7da', text: '#842029' },
    manager: { bg: '#fff3cd', text: '#664d03' },
    user: { bg: '#d1e7dd', text: '#0f5132' },
    viewer: { bg: '#e2e3e5', text: '#41464b' },
  };

  const color = colors[role] || colors.viewer;

  return (
    <span
      style={{
        ...styles.statusBadge,
        backgroundColor: color.bg,
        color: color.text,
      }}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

export default DataGrid;
