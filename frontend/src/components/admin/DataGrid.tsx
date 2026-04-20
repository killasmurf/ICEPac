/**
 * DataGrid - Reusable sortable, paginated table component.
 */
import React, { useState, useMemo } from 'react';

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataGridProps<T = any> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
}

export function StatusBadge({ active }: { active: boolean }) {
  const style: React.CSSProperties = {
    display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
    backgroundColor: active ? '#dcfce7' : '#fee2e2', color: active ? '#166534' : '#991b1b',
  };
  return <span style={style}>{active ? 'Active' : 'Inactive'}</span>;
}

export function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    admin: { bg: '#ede9fe', fg: '#5b21b6' }, manager: { bg: '#dbeafe', fg: '#1e40af' },
    user: { bg: '#f0fdf4', fg: '#166534' }, viewer: { bg: '#f1f5f9', fg: '#475569' },
  };
  const c = colors[role] || colors.viewer;
  const style: React.CSSProperties = {
    display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px',
    fontWeight: 600, backgroundColor: c.bg, color: c.fg, textTransform: 'capitalize',
  };
  return <span style={style}>{role}</span>;
}

export default function DataGrid<T extends Record<string, any>>({
  columns, data, total, page = 0, pageSize = 20, onPageChange, onSort,
  onRowClick, actions, loading, emptyMessage = 'No data found',
}: DataGridProps<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    const order = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortOrder(order);
    onSort?.(key, order);
  };

  const totalPages = total ? Math.ceil(total / pageSize) : 1;

  const s: Record<string, React.CSSProperties> = {
    wrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' },
    td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
    row: { transition: 'background 0.15s', cursor: onRowClick ? 'pointer' : 'default' },
    pager: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b' },
    btn: { padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px' },
    loading: { textAlign: 'center', padding: '40px', color: '#94a3b8' },
    empty: { textAlign: 'center', padding: '40px', color: '#94a3b8' },
  };

  if (loading) return <div style={s.loading}>Loading...</div>;
  if (!data.length) return <div style={s.empty}>{emptyMessage}</div>;

  return (
    <div>
      <div style={s.wrapper}>
        <table style={s.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ ...s.th, width: col.width }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}>
                  {col.label}
                  {sortKey === col.key && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </th>
              ))}
              {actions && <th style={s.th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id || i} style={s.row}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                onClick={() => onRowClick?.(row)}>
                {columns.map(col => (
                  <td key={col.key} style={s.td}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
                {actions && <td style={s.td} onClick={e => e.stopPropagation()}>{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total !== undefined && (
        <div style={s.pager}>
          <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={s.btn} disabled={page === 0} onClick={() => onPageChange?.(page - 1)}>Previous</button>
            <button style={s.btn} disabled={page >= totalPages - 1} onClick={() => onPageChange?.(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
