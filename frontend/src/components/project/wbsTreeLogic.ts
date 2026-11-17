import type { WBSTreeNode } from '../../api/projects';

/** One visible row of the tree, in display order. */
export interface FlatRow {
  node: WBSTreeNode;
  depth: number;
  /** True when at least one child is shown (respects the active filter). */
  hasChildren: boolean;
  expanded: boolean;
  parentId: number | null;
  /** 1-based position among visible siblings (aria-posinset). */
  posInSet: number;
  /** Number of visible siblings (aria-setsize). */
  setSize: number;
}

export interface FilterResult {
  /** Ids to show (matches plus their ancestors), or null when there is no query. */
  visible: Set<number> | null;
  /** Ids whose own title or code matches. */
  matches: Set<number>;
  /** Ancestors of matches: forced open so the matches can be seen. */
  forcedExpanded: Set<number>;
}

const NO_FILTER: FilterResult = { visible: null, matches: new Set(), forcedExpanded: new Set() };

export function nodeMatches(node: WBSTreeNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (node.wbs_title ?? '').toLowerCase().includes(q) || (node.wbs_code ?? '').toLowerCase().includes(q);
}

/** Filter by title or code, keeping every ancestor of a match visible. */
export function filterTree(nodes: WBSTreeNode[], query: string): FilterResult {
  if (!query.trim()) return NO_FILTER;
  const visible = new Set<number>();
  const matches = new Set<number>();
  const forcedExpanded = new Set<number>();

  const walk = (node: WBSTreeNode): boolean => {
    const self = nodeMatches(node, query);
    let descendant = false;
    for (const child of node.children ?? []) {
      if (walk(child)) descendant = true;
    }
    if (self) matches.add(node.id);
    if (self || descendant) visible.add(node.id);
    if (descendant) forcedExpanded.add(node.id);
    return self || descendant;
  };
  nodes.forEach(walk);
  return { visible, matches, forcedExpanded };
}

/** Flatten the tree into the rows currently on screen. */
export function flattenVisible(
  nodes: WBSTreeNode[],
  expanded: ReadonlySet<number>,
  filter: FilterResult = NO_FILTER,
): FlatRow[] {
  const rows: FlatRow[] = [];
  const isShown = (n: WBSTreeNode) => filter.visible === null || filter.visible.has(n.id);

  const walk = (siblings: WBSTreeNode[], depth: number, parentId: number | null) => {
    const shown = siblings.filter(isShown);
    shown.forEach((node, index) => {
      const shownChildren = (node.children ?? []).filter(isShown);
      const hasChildren = shownChildren.length > 0;
      const isExpanded = hasChildren && (expanded.has(node.id) || filter.forcedExpanded.has(node.id));
      rows.push({ node, depth, hasChildren, expanded: isExpanded, parentId, posInSet: index + 1, setSize: shown.length });
      if (isExpanded) walk(node.children, depth + 1, node.id);
    });
  };
  walk(nodes, 0, null);
  return rows;
}

/** Ids of every node that has children. */
export function expandableIds(nodes: WBSTreeNode[]): Set<number> {
  const ids = new Set<number>();
  const walk = (list: WBSTreeNode[]) => {
    for (const n of list) {
      if (n.children?.length) {
        ids.add(n.id);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

/** The first level starts open, matching the previous tree. */
export function initialExpanded(nodes: WBSTreeNode[]): Set<number> {
  return new Set(nodes.filter((n) => n.children?.length).map((n) => n.id));
}

/** Depth-first lookup of a node by id. */
export function findNode(nodes: WBSTreeNode[], id: number): WBSTreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children ?? [], id);
    if (found) return found;
  }
  return undefined;
}

export type NavKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

export type NavResult =
  | { action: 'focus'; id: number }
  | { action: 'expand'; id: number }
  | { action: 'collapse'; id: number }
  | null;

export const NAV_KEYS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

/** WAI-ARIA tree keyboard model: what should happen when `key` is pressed on row `currentId`. */
export function navigate(rows: FlatRow[], currentId: number, key: NavKey): NavResult {
  const index = rows.findIndex((r) => r.node.id === currentId);
  if (index < 0 || rows.length === 0) return null;
  const row = rows[index];
  switch (key) {
    case 'ArrowDown':
      return index < rows.length - 1 ? { action: 'focus', id: rows[index + 1].node.id } : null;
    case 'ArrowUp':
      return index > 0 ? { action: 'focus', id: rows[index - 1].node.id } : null;
    case 'Home':
      return { action: 'focus', id: rows[0].node.id };
    case 'End':
      return { action: 'focus', id: rows[rows.length - 1].node.id };
    case 'ArrowRight': {
      if (!row.hasChildren) return null;
      if (!row.expanded) return { action: 'expand', id: row.node.id };
      const next = rows[index + 1];
      return next && next.parentId === row.node.id ? { action: 'focus', id: next.node.id } : null;
    }
    case 'ArrowLeft': {
      if (row.hasChildren && row.expanded) return { action: 'collapse', id: row.node.id };
      return row.parentId !== null ? { action: 'focus', id: row.parentId } : null;
    }
  }
}
