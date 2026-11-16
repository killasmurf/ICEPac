import { describe, expect, it } from 'vitest';
import { columnKind, formatCell } from './reportColumns';

const col = (key: string, label = key) => ({ key, label });

describe('columnKind', () => {
  it('treats dollar-labelled and money-named numeric columns as money', () => {
    expect(columnKind(col('best_total', 'Best ($)'), [{ best_total: 10 }])).toBe('money');
    expect(columnKind(col('std_dev', 'Std Dev'), [{ std_dev: 1.5 }])).toBe('money');
    expect(columnKind(col('exposure', 'Exposure ($)'), [{ exposure: 5 }])).toBe('money');
  });
  it('treats counts as plain numbers', () => {
    expect(columnKind(col('assignment_count', 'Assignments'), [{ assignment_count: 4 }])).toBe('number');
    expect(columnKind(col('wbs_count', 'WBS Items'), [{ wbs_count: 4 }])).toBe('number');
    expect(columnKind(col('risk_count', 'Risks'), [{ risk_count: 4 }])).toBe('number');
  });
  it('treats numeric ids as text so they are not thousands-formatted', () => {
    expect(columnKind(col('entity_id', 'ID'), [{ entity_id: 12345 }])).toBe('text');
    expect(columnKind(col('user_id', 'User'), [{ user_id: 7 }])).toBe('text');
  });
  it('detects ISO timestamps', () => {
    expect(columnKind(col('timestamp', 'Date/Time'), [{ timestamp: '2026-03-01T10:00:00' }])).toBe('datetime');
  });
  it('treats strings and empty columns as text', () => {
    expect(columnKind(col('wbs_title'), [{ wbs_title: 'Pier' }])).toBe('text');
    expect(columnKind(col('mitigation'), [{ mitigation: '' }])).toBe('text');
  });
  it('ignores empty values when classifying', () => {
    expect(columnKind(col('pert_total', 'PERT ($)'), [{ pert_total: null }, { pert_total: 3 }])).toBe('money');
  });
  it('uses totals when rows are empty', () => {
    expect(columnKind(col('pert_total', 'PERT ($)'), [], { pert_total: 3 })).toBe('money');
  });
});

describe('formatCell', () => {
  it('formats money as currency', () => {
    expect(formatCell('money', 1234.5)).toBe('$1,234.50');
  });
  it('formats numbers with grouping', () => {
    expect(formatCell('number', 12345)).toBe('12,345');
  });
  it('shows a dash for empty values', () => {
    expect(formatCell('text', '')).toBe('—');
    expect(formatCell('money', null)).toBe('—');
  });
  it('passes text through', () => {
    expect(formatCell('text', 'Pier')).toBe('Pier');
  });
});
