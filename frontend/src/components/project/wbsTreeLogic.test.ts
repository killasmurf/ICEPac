import { describe, expect, it } from 'vitest';
import type { WBSTreeNode } from '../../api/projects';
import {
  ancestorIds,
  expandableIds,
  filterTree,
  findNode,
  flattenVisible,
  initialExpanded,
  navigate,
} from './wbsTreeLogic';

function node(id: number, title: string, children: WBSTreeNode[] = [], code: string | null = null): WBSTreeNode {
  return { id, wbs_title: title, wbs_code: code, children } as unknown as WBSTreeNode;
}

// 1 Design (2 Concept, 3 Detail (6 Review)), 4 Build (5 Foundations), 7 Handover
const tree = [
  node(1, 'Design', [node(2, 'Concept'), node(3, 'Detail', [node(6, 'Review')])], '1'),
  node(4, 'Build', [node(5, 'Foundations')], '2'),
  node(7, 'Handover', [], '3'),
];

const ids = (rows: { node: { id: number } }[]) => rows.map((r) => r.node.id);

describe('flattenVisible', () => {
  it('shows only roots when nothing is expanded', () => {
    expect(ids(flattenVisible(tree, new Set()))).toEqual([1, 4, 7]);
  });

  it('shows children of expanded nodes in depth-first order', () => {
    const rows = flattenVisible(tree, new Set([1, 3]));
    expect(ids(rows)).toEqual([1, 2, 3, 6, 4, 7]);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 1, 2, 0, 0]);
  });

  it('reports set size and position among siblings', () => {
    const rows = flattenVisible(tree, new Set([1]));
    const detail = rows.find((r) => r.node.id === 3);
    expect(detail).toMatchObject({ posInSet: 2, setSize: 2, parentId: 1 });
  });

  it('does not expand a node without children', () => {
    const rows = flattenVisible(tree, new Set([7]));
    expect(rows.find((r) => r.node.id === 7)).toMatchObject({ hasChildren: false, expanded: false });
  });
});

describe('filterTree', () => {
  it('returns no filter for a blank query', () => {
    expect(filterTree(tree, '  ').visible).toBeNull();
  });

  it('keeps ancestors of a deep match visible and forces them open', () => {
    const filter = filterTree(tree, 'review');
    expect([...filter.matches]).toEqual([6]);
    expect(ids(flattenVisible(tree, new Set(), filter))).toEqual([1, 3, 6]);
    expect(filter.forcedExpanded).toEqual(new Set([1, 3]));
  });

  it('matches on the WBS code as well as the title', () => {
    expect(ids(flattenVisible(tree, new Set(), filterTree(tree, '2')))).toEqual([4]);
  });

  it('is case-insensitive and hides non-matching siblings', () => {
    expect(ids(flattenVisible(tree, new Set(), filterTree(tree, 'FOUND')))).toEqual([4, 5]);
  });

  it('returns nothing when no node matches', () => {
    expect(flattenVisible(tree, new Set(), filterTree(tree, 'zzz'))).toEqual([]);
  });

  it('counts only visible children when deciding whether a row can expand', () => {
    const filter = filterTree(tree, 'design');
    const rows = flattenVisible(tree, new Set(), filter);
    expect(ids(rows)).toEqual([1]);
    expect(rows[0].hasChildren).toBe(false);
  });
});

describe('helpers', () => {
  it('collects expandable ids', () => {
    expect(expandableIds(tree)).toEqual(new Set([1, 3, 4]));
  });
  it('opens the first level by default', () => {
    expect(initialExpanded(tree)).toEqual(new Set([1, 4]));
  });
  it('finds nested nodes', () => {
    expect(findNode(tree, 6)?.wbs_title).toBe('Review');
    expect(findNode(tree, 99)).toBeUndefined();
  });
});

describe('navigate', () => {
  const rows = flattenVisible(tree, new Set([1]));
  // rows: 1 Design(open), 2, 3, 4, 7

  it('moves down and up, clamped at the ends', () => {
    expect(navigate(rows, 1, 'ArrowDown')).toEqual({ action: 'focus', id: 2 });
    expect(navigate(rows, 2, 'ArrowUp')).toEqual({ action: 'focus', id: 1 });
    expect(navigate(rows, 1, 'ArrowUp')).toBeNull();
    expect(navigate(rows, 7, 'ArrowDown')).toBeNull();
  });

  it('jumps to first and last with Home and End', () => {
    expect(navigate(rows, 3, 'Home')).toEqual({ action: 'focus', id: 1 });
    expect(navigate(rows, 3, 'End')).toEqual({ action: 'focus', id: 7 });
  });

  it('Right expands a closed parent, then moves to its first child', () => {
    expect(navigate(rows, 4, 'ArrowRight')).toEqual({ action: 'expand', id: 4 });
    expect(navigate(rows, 1, 'ArrowRight')).toEqual({ action: 'focus', id: 2 });
  });

  it('Right does nothing on a leaf', () => {
    expect(navigate(rows, 2, 'ArrowRight')).toBeNull();
  });

  it('Left collapses an open parent, otherwise moves to the parent', () => {
    expect(navigate(rows, 1, 'ArrowLeft')).toEqual({ action: 'collapse', id: 1 });
    expect(navigate(rows, 2, 'ArrowLeft')).toEqual({ action: 'focus', id: 1 });
    expect(navigate(rows, 7, 'ArrowLeft')).toBeNull();
  });

  it('ignores an unknown current row', () => {
    expect(navigate(rows, 99, 'ArrowDown')).toBeNull();
  });
});

describe('ancestorIds', () => {
  it('lists ancestors outermost first, and nothing for roots or unknown ids', () => {
    expect(ancestorIds(tree, 6)).toEqual([1, 3]);
    expect(ancestorIds(tree, 5)).toEqual([4]);
    expect(ancestorIds(tree, 2)).toEqual([1]);
    expect(ancestorIds(tree, 1)).toEqual([]);
    expect(ancestorIds(tree, 7)).toEqual([]);
    expect(ancestorIds(tree, 99)).toEqual([]);
  });
});
