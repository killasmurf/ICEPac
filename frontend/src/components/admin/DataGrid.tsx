import React, { useState, useMemo } from 'react';
import { adminTokens as t } from '../../pages/admin/admin-tokens';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Icon SVGs ─────────────────────────────────────────────────────────────────

const PencilIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const SortIcon = ({ dir }: { dir?: 'asc' | 'desc' }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '4px', opacity: dir ? 1 : 0.35 }}>
    {!dir || dir === 'asc'
      ? <polyline points="18 15 12 9 6 15" />
      : <polyline points="6 9 12 15 18 9" />}
  </svg>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' },
  thead: { backgroundColor: t.slate50 },
  th: {
    padding: '11px 16px', textAlign: 'left', fontWeight: 600,
    fontSize: '12px', color: t.slate500, borderBottom: `1px solid ${t.slate200}`,
    userSelect: 'none', whiteSpace: 'nowrap',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  thSortable: { cursor: 'pointer' },
  tr: { borderBottom: `1px solid ${t.slate100}`, transition: 'background-color 120ms ease' },
  trHover: { backgroundColor: t.slate50 },
  trClickable: { cursor: 'pointer' },
  td: { padding: '13px 16px', fontSize: '14px', color: t.slate700, verticalAlign: 'middle' },
  actionsCell: { display: 'flex', gap: '6px', justifyContent: 'flex-end' },
  iconBtn: {
    width: '30px', height: '30px', borderRadius: t.radiusSm,
    border: 'none', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    transition: 'all 140ms ease',
  },
  editBtn: { backgroundColor: t.blueL, color: t.blue },
  editBtnHover: { backgroundColor: '#DBEAFE', color: t.blueD },
  deleteBtn: { backgroundColor: t.redL, color: t.red },
  deleteBtnHover: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
  pagination: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 20px', borderTop: `1px solid ${t.slate100}`,
    backgroundColor: t.slate50,
  },
  paginationInfo: { fontSize: '13px', color: t.slate400 },
  paginationButtons: { display: 'flex', gap: '4px', alignItems: 'center' },
  pageBtn: {
    minWidth: '32px', height: '32px', padding: '0 10px',
    fontSize: '13px', fontWeight: 500, borderRadius: t.radiusSm,
    border: `1px solid ${t.slate200}`, backgroundColor: '#fff',
    color: t.slate600, cursor: 'pointer', transition: 'all 140ms ease',
  },
  pageBtnActive: { backgroundColor: t.blue, color: '#fff', borderColor: t.blue },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  pageSep: { fontSize: '13px', color: t.slate400, padding: '0 6px' },
};

// ── Skeleton loading ──────────────────────────────────────────────────────────

const shimmerStyle: React.CSSProperties = {
  background: `linear-gradient(90deg, ${t.slate100} 25%, ${t.slate200} 50%, ${t.slate100} 75%)`,
  backgroundSize: '600px 100%',
  animation: 'shimmer 1.5s infinite linear',
  borderRadius: t.radiusSm,
};

function SkeletonRows({ columns, rows = 5, hasActions }: { columns: number; rows?: number; hasActions: boolean }) {
  const widths = ['60%', '80%', '45%', '70%', '55%'];
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} style={styles.tr}>
          {Array.from({ length: columns }).map((_, ci) => (
            <td key={ci} style={styles.td}>
              <div style={{ ...shimmerStyle, height: '14px', width: widths[(ri + ci) % widths.length] }} />
            </td>
          ))}
          {hasActions && (
            <td style={styles.td}>
              <div style={{ ...styles.actionsCell }}>
                <div style={{ ...shimmerStyle, width: '30px', height: '30px', borderRadius: t.radiusSm }} />
                <div style={{ ...shimmerStyle, width: '30px', height: '30px', borderRadius: t.radiusSm }} />
              </div>
            </td>
          )}
        </tr>
      ))}
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: '56px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="8" y="16" width="48" height="36" rx="4" fill={t.slate100} />
        <rect x="8" y="16" width="48" height="10" rx="4" fill={t.slate200} />
        <rect x="16" y="34" width="20" height="3" rx="1.5" fill={t.slate300} />
        <rect x="16" y="41" width="14" height="3" rx="1.5" fill={t.slate200} />
        <circle cx="46" cy="46" r="12" fill={t.blueL} stroke={t.slate200} strokeWidth="1.5" />
        <line x1="46" y1="42" x2="46" y2="46" stroke={t.blue} strokeWidth="2" strokeLinecap="round" />
        <circle cx="46" cy="49" r="1" fill={t.blue} />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: t.slate700, margin: '0 0 4px' }}>No results found</p>
        <p style={{ fontSize: '13px', color: t.slate400, margin: 0 }}>{message}</p>
      </div>
    </div>
  );
}

// ── Action icon button ────────────────────────────────────────────────────────

function IconButton({
  onClick, hoverStyle, baseStyle, title, children,
}: {
  onClick: (e: React.MouseEvent) => void;
  hoverStyle: React.CSSProperties;
  baseStyle: React.CSSProperties;
  title: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      style={{ ...styles.iconBtn, ...baseStyle, ...(hovered ? hoverStyle : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ── DataGrid ──────────────────────────────────────────────────────────────────

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

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getValue = (item: T, key: string) => {
    let value: any = item;
    for (const k of key.split('.')) value = value?.[k];
    return value;
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;
  const currentPage = pagination ? Math.floor(pagination.skip / pagination.limit) + 1 : 1;
  const hasActions = showActions && !!(onEdit || onDelete);

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
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {col.header}
                  {col.sortable && (
                    <SortIcon dir={sortKey === String(col.key) ? sortDir : undefined} />
                  )}
                </span>
              </th>
            ))}
            {hasActions && (
              <th style={{ ...styles.th, textAlign: 'right', width: '90px' }}>Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows columns={columns.length} hasActions={hasActions} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (hasActions ? 1 : 0)} style={{ padding: 0 }}>
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            sortedData.map((item) => (
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
                {hasActions && (
                  <td style={styles.td}>
                    <div style={styles.actionsCell}>
                      {onEdit && (
                        <IconButton
                          title="Edit"
                          baseStyle={styles.editBtn}
                          hoverStyle={styles.editBtnHover}
                          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                        >
                          <PencilIcon />
                        </IconButton>
                      )}
                      {onDelete && (
                        <IconButton
                          title="Delete"
                          baseStyle={styles.deleteBtn}
                          hoverStyle={styles.deleteBtnHover}
                          onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                        >
                          <TrashIcon />
                        </IconButton>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && pagination.total > pagination.limit && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            {pagination.skip + 1}–{Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total}
          </div>
          <div style={styles.paginationButtons}>
            <PaginationBtn
              label="←"
              disabled={currentPage === 1}
              onClick={() => pagination.onPageChange(Math.max(0, pagination.skip - pagination.limit))}
            />
            <span style={styles.pageSep}>Page {currentPage} of {totalPages}</span>
            <PaginationBtn
              label="→"
              disabled={currentPage === totalPages}
              onClick={() => pagination.onPageChange(pagination.skip + pagination.limit)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        ...styles.pageBtn,
        ...(disabled ? styles.pageBtnDisabled : {}),
        ...(hovered && !disabled ? { backgroundColor: t.slate100, borderColor: t.slate300 } : {}),
      }}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

// ── Utility components ────────────────────────────────────────────────────────

export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
      backgroundColor: isActive ? t.greenL : t.redL,
      color: isActive ? t.greenD : t.redD,
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
        backgroundColor: isActive ? t.green : t.red,
      }} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, [string, string]> = {
    admin:   [t.redL,   t.redD],
    manager: [t.amberL, t.amberD],
    user:    [t.greenL, t.greenD],
    viewer:  [t.slate100, t.slate600],
  };
  const [bg, fg] = map[role] ?? map.viewer;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '99px',
      fontSize: '12px', fontWeight: 600, backgroundColor: bg, color: fg,
    }}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

export default DataGrid;
