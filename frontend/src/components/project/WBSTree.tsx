/**
 * WBSTree
 *
 * Accessible, filterable WBS tree (WAI-ARIA tree pattern) built on MUI List.
 * Rows show code, title, approval status, PERT total (when supplied), progress
 * and milestone/critical flags. Keyboard: Up/Down move, Right expands or moves
 * to the first child, Left collapses or moves to the parent, Home/End jump,
 * Enter/Space select.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { WBSItem, WBSTreeNode } from '../../api/projects';
import { formatCurrency, formatNumber } from '../../utils/format';
import CardSkeleton from '../common/CardSkeleton';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import SearchField from '../common/SearchField';
import StatusChip from '../common/StatusChip';
import { useWbsTree } from './useWbsTree';
import {
  FlatRow,
  NAV_KEYS,
  ancestorIds,
  NavKey,
  expandableIds,
  filterTree,
  flattenVisible,
  initialExpanded,
  navigate as navigateRows,
} from './wbsTreeLogic';
import { pluralise } from '../../utils/number';

export interface WBSTreeProps {
  projectId: number;
  onNodeClick?: (node: WBSItem) => void;
  /** Id of the selected node; when omitted the tree tracks selection itself. */
  selectedId?: number | null;
  /** PERT estimate per WBS id (from the project estimation summary). */
  pertTotals?: Readonly<Record<number, number>>;
  /** Shown in the empty state, e.g. a button that opens the import tab. */
  emptyAction?: React.ReactNode;
}

const INDENT_PX = 16;

interface TreeRowProps {
  row: FlatRow;
  selected: boolean;
  focusable: boolean;
  pert: number | undefined;
  onSelect: (node: WBSTreeNode) => void;
  onToggle: (id: number) => void;
  onFocusRow: (id: number) => void;
  register: (id: number, el: HTMLElement | null) => void;
}

const TreeRow = React.memo(function TreeRow({
  row,
  selected,
  focusable,
  pert,
  onSelect,
  onToggle,
  onFocusRow,
  register,
}: TreeRowProps) {
  const { node, depth, hasChildren, expanded } = row;
  const percent = Math.round(node.percent_complete ?? 0);
  return (
    <ListItemButton
      component="div"
      role="treeitem"
      ref={(el: HTMLElement | null) => register(node.id, el)}
      tabIndex={focusable ? 0 : -1}
      aria-level={depth + 1}
      aria-setsize={row.setSize}
      aria-posinset={row.posInSet}
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      selected={selected}
      onClick={() => onSelect(node)}
      onFocus={() => onFocusRow(node.id)}
      data-wbs-id={node.id}
      sx={{
        alignItems: 'flex-start',
        gap: 0.5,
        py: 0.75,
        pr: 1.5,
        pl: `${8 + depth * INDENT_PX}px`,
        borderBottom: 1,
        borderColor: 'divider',
        '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main', outlineOffset: -2 },
      }}
    >
      <Box
        component="span"
        aria-hidden
        onClick={(e: React.MouseEvent) => {
          if (!hasChildren) return;
          e.stopPropagation();
          onToggle(node.id);
        }}
        sx={{
          display: 'inline-flex',
          width: 24,
          height: 24,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          color: 'text.secondary',
          cursor: hasChildren ? 'pointer' : 'default',
          '&:hover': hasChildren ? { bgcolor: 'action.hover' } : undefined,
        }}
      >
        {hasChildren && (expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />)}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
          {node.wbs_code && (
            <Typography variant="caption" color="text.secondary" className="tabular-nums" sx={{ flexShrink: 0 }}>
              {node.wbs_code}
            </Typography>
          )}
          <Typography variant="body2" noWrap sx={{ fontWeight: node.is_summary ? 700 : 400, minWidth: 0 }}>
            {node.wbs_title}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
          <StatusChip kind="approval" value={node.approval_status} />
          {pert !== undefined && pert > 0 && (
            <Typography variant="caption" className="tabular-nums" sx={{ fontWeight: 600 }}>
              {formatCurrency(pert, { maximumFractionDigits: 0 })}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" className="tabular-nums">
            {percent}% complete
          </Typography>
          {node.is_milestone && <Chip label="Milestone" size="small" variant="outlined" />}
          {node.is_critical && <Chip label="Critical" size="small" variant="outlined" color="error" />}
        </Box>
      </Box>
    </ListItemButton>
  );
});

const WBSTree: React.FC<WBSTreeProps> = ({ projectId, onNodeClick, selectedId, pertTotals, emptyAction }) => {
  const { data, isPending, isError, refetch } = useWbsTree(projectId);
  const tree = useMemo(() => data?.items ?? [], [data]);

  const [query, setQuery] = useState('');
  // Expansion is the user's choice (null = the default, first level open). It is kept in the query cache, not in
  // this component, so it survives the tree remounting (switching tabs, crossing the md breakpoint).
  const queryClient = useQueryClient();
  const expandedKey = useMemo(() => ['ui', 'wbs-expanded', projectId] as const, [projectId]);
  const [expandedOverride, setExpandedState] = useState<Set<number> | null>(() => {
    const saved = queryClient.getQueryData<number[]>(expandedKey);
    return saved ? new Set(saved) : null;
  });
  const setExpandedOverride = useCallback(
    (update: Set<number> | ((prev: Set<number> | null) => Set<number>)) =>
      setExpandedState((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        queryClient.setQueryData(expandedKey, [...next]);
        return next;
      }),
    [queryClient, expandedKey],
  );
  const [localSelected, setLocalSelected] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const rowEls = useRef(new Map<number, HTMLElement>());

  // Reveal the selected row (e.g. a ?wbs= deep link) once the tree is loaded: open its ancestors.
  const [revealedFor, setRevealedFor] = useState<number | null>(null);
  if (selectedId != null && tree.length > 0 && revealedFor !== selectedId) {
    setRevealedFor(selectedId);
    const parents = ancestorIds(tree, selectedId);
    if (parents.length > 0) {
      setExpandedOverride((prev) => new Set([...(prev ?? initialExpanded(tree)), ...parents]));
    }
  }

  const expanded = useMemo(() => expandedOverride ?? initialExpanded(tree), [expandedOverride, tree]);
  const filter = useMemo(() => filterTree(tree, query), [tree, query]);
  const rows = useMemo(() => flattenVisible(tree, expanded, filter), [tree, expanded, filter]);

  const effectiveSelected = selectedId !== undefined ? selectedId : localSelected;

  // Roving tabindex: one row is in the tab order.
  const tabStopId = useMemo(() => {
    const has = (id: number | null) => id !== null && rows.some((r) => r.node.id === id);
    if (has(focusedId)) return focusedId;
    if (has(effectiveSelected)) return effectiveSelected;
    return rows[0]?.node.id ?? null;
  }, [rows, focusedId, effectiveSelected]);

  const register = useCallback((id: number, el: HTMLElement | null) => {
    if (el) rowEls.current.set(id, el);
    else rowEls.current.delete(id);
  }, []);

  const toggle = useCallback(
    (id: number) => {
      setExpandedOverride((prev) => {
        const next = new Set(prev ?? initialExpanded(tree));
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [tree, setExpandedOverride],
  );

  const select = useCallback(
    (node: WBSTreeNode) => {
      setLocalSelected(node.id);
      setFocusedId(node.id);
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  const focusRow = useCallback((id: number) => {
    setFocusedId(id);
    rowEls.current.get(id)?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const current = (e.target as HTMLElement).closest<HTMLElement>('[data-wbs-id]');
    if (!current) return;
    const id = Number(current.dataset.wbsId);

    if (e.key === 'Enter' || e.key === ' ') {
      const row = rows.find((r) => r.node.id === id);
      if (row) {
        e.preventDefault();
        select(row.node);
      }
      return;
    }
    if (!NAV_KEYS.includes(e.key)) return;
    e.preventDefault();
    const result = navigateRows(rows, id, e.key as NavKey);
    if (!result) return;
    if (result.action === 'focus') focusRow(result.id);
    else toggle(result.id);
  };

  if (isPending) return <CardSkeleton lines={6} />;

  if (isError) {
    return (
      <ErrorState
        title="Could not load the WBS"
        description="Something went wrong while loading the work breakdown structure."
        action={
          <Button variant="outlined" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (tree.length === 0) {
    return (
      <EmptyState
        icon={<AccountTreeOutlinedIcon />}
        title="No WBS yet"
        description="Import an MS Project file to populate the work breakdown structure."
        action={emptyAction}
      />
    );
  }

  const filtering = filter.visible !== null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <SearchField onChange={setQuery} label="Filter WBS" placeholder="Filter by code or title" fullWidth />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" role="status" className="tabular-nums">
            {filtering
              ? `${formatNumber(filter.matches.size)} of ${pluralise(data?.total ?? 0, 'item')} match`
              : pluralise(data?.total ?? 0, 'item')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button size="small" onClick={() => setExpandedOverride(expandableIds(tree))}>
              Expand all
            </Button>
            <Button size="small" onClick={() => setExpandedOverride(new Set())}>
              Collapse all
            </Button>
          </Box>
        </Box>
      </Box>

      {rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          No WBS items match “{query.trim()}”.
        </Typography>
      ) : (
        <List
          component="div"
          role="tree"
          aria-label="Work breakdown structure"
          disablePadding
          onKeyDown={onKeyDown}
          sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
        >
          {rows.map((row) => (
            <TreeRow
              key={row.node.id}
              row={row}
              selected={row.node.id === effectiveSelected}
              focusable={row.node.id === tabStopId}
              pert={pertTotals?.[row.node.id]}
              onSelect={select}
              onToggle={toggle}
              onFocusRow={setFocusedId}
              register={register}
            />
          ))}
        </List>
      )}
    </Box>
  );
};

export default WBSTree;
