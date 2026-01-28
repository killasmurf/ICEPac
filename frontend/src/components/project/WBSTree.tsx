/**
 * WBSTree Component
 *
 * Displays a hierarchical WBS tree with expandable/collapsible nodes.
 * Shows WBS code, title, dates, percent complete bar, and badges
 * for milestone/critical tasks.
 */

import React, { useState, useEffect } from 'react';
import { getWBSTree, WBSTreeNode } from '../../api/projects';

// ============================================================
// Types
// ============================================================

interface WBSTreeProps {
  projectId: number;
}

// ============================================================
// Styles
// ============================================================

const styles = {
  container: {
    padding: '24px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '48px',
    color: '#999',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '48px',
    color: '#999',
  },
  header: {
    display: 'flex',
    padding: '8px 12px',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
    fontWeight: 600 as const,
    fontSize: '13px',
    color: '#666',
  },
  nodeRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  nodeRowHover: {
    backgroundColor: '#f9f9f9',
  },
  expandIcon: {
    width: '20px',
    textAlign: 'center' as const,
    fontSize: '12px',
    color: '#999',
    cursor: 'pointer',
    userSelect: 'none' as const,
    flexShrink: 0,
  },
  nameCell: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  codeCell: {
    width: '100px',
    flexShrink: 0,
    fontSize: '12px',
    color: '#999',
  },
  dateCell: {
    width: '100px',
    flexShrink: 0,
    fontSize: '12px',
    color: '#666',
    textAlign: 'right' as const,
  },
  progressCell: {
    width: '120px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingLeft: '12px',
  },
  progressBar: {
    flex: 1,
    height: '6px',
    backgroundColor: '#e0e0e0',
    borderRadius: '3px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: '3px',
  },
  progressText: {
    fontSize: '11px',
    color: '#999',
    width: '32px',
    textAlign: 'right' as const,
    flexShrink: 0,
  },
  badge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 600 as const,
    marginLeft: '6px',
    flexShrink: 0,
  },
  milestoneBadge: {
    backgroundColor: '#e8eaf6',
    color: '#3949ab',
  },
  criticalBadge: {
    backgroundColor: '#fce4ec',
    color: '#c62828',
  },
  summaryStyle: {
    fontWeight: 600 as const,
  },
  statsBar: {
    display: 'flex',
    gap: '24px',
    padding: '12px 16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#555',
  },
};

// ============================================================
// Helper functions
// ============================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ============================================================
// TreeNode sub-component
// ============================================================

interface TreeNodeProps {
  node: WBSTreeNode;
  depth: number;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
}

const TreeNodeRow: React.FC<TreeNodeProps> = ({ node, depth, expandedIds, toggleExpand }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const indent = depth * 20;

  return (
    <>
      <div
        style={{
          ...styles.nodeRow,
          ...(node.is_summary ? styles.summaryStyle : {}),
        }}
        onClick={() => hasChildren && toggleExpand(node.id)}
      >
        {/* Expand/collapse icon */}
        <span style={{ ...styles.expandIcon, marginLeft: `${indent}px` }}>
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>

        {/* WBS Code */}
        <span style={styles.codeCell}>{node.wbs_code || ''}</span>

        {/* Title */}
        <span style={styles.nameCell}>
          {node.wbs_title}
          {node.is_milestone && (
            <span style={{ ...styles.badge, ...styles.milestoneBadge }}>Milestone</span>
          )}
          {node.is_critical && (
            <span style={{ ...styles.badge, ...styles.criticalBadge }}>Critical</span>
          )}
        </span>

        {/* Start Date */}
        <span style={styles.dateCell}>{formatDate(node.schedule_start)}</span>

        {/* Finish Date */}
        <span style={styles.dateCell}>{formatDate(node.schedule_finish)}</span>

        {/* Progress */}
        <div style={styles.progressCell}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${node.percent_complete || 0}%` }} />
          </div>
          <span style={styles.progressText}>{Math.round(node.percent_complete || 0)}%</span>
        </div>
      </div>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && node.children.map((child) => (
        <TreeNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
  );
};

// ============================================================
// Main Component
// ============================================================

const WBSTree: React.FC<WBSTreeProps> = ({ projectId }) => {
  const [tree, setTree] = useState<WBSTreeNode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    getWBSTree(projectId)
      .then((res) => {
        setTree(res.items);
        setTotal(res.total);
        // Auto-expand first level
        const firstLevelIds = new Set(res.items.map((n) => n.id));
        setExpandedIds(firstLevelIds);
      })
      .catch((err) => setError(err?.message || 'Failed to load WBS'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<number>();
    const collect = (nodes: WBSTreeNode[]) => {
      for (const n of nodes) {
        if (n.children?.length) {
          allIds.add(n.id);
          collect(n.children);
        }
      }
    };
    collect(tree);
    setExpandedIds(allIds);
  };

  const collapseAll = () => setExpandedIds(new Set());

  if (loading) {
    return <div style={styles.loading}>Loading WBS...</div>;
  }

  if (error) {
    return <div style={{ ...styles.loading, color: '#c62828' }}>{error}</div>;
  }

  if (tree.length === 0) {
    return (
      <div style={styles.empty}>
        No WBS data. Import an MS Project file to populate.
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Stats */}
      <div style={styles.statsBar}>
        <span>{total} tasks total</span>
        <span style={{ marginLeft: 'auto' }}>
          <button
            onClick={expandAll}
            style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: '13px' }}
          >
            Expand All
          </button>
          {' | '}
          <button
            onClick={collapseAll}
            style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: '13px' }}
          >
            Collapse All
          </button>
        </span>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <span style={{ width: '20px', flexShrink: 0 }} />
        <span style={{ width: '100px', flexShrink: 0 }}>Code</span>
        <span style={{ flex: 1 }}>Title</span>
        <span style={{ width: '100px', flexShrink: 0, textAlign: 'right' }}>Start</span>
        <span style={{ width: '100px', flexShrink: 0, textAlign: 'right' }}>Finish</span>
        <span style={{ width: '120px', flexShrink: 0, paddingLeft: '12px' }}>Progress</span>
      </div>

      {/* Tree */}
      {tree.map((node) => (
        <TreeNodeRow
          key={node.id}
          node={node}
          depth={0}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
};

export default WBSTree;
