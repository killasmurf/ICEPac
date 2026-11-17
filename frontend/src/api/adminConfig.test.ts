import { describe, expect, it } from 'vitest';
import { configTableKey, normalizeConfigItem, normalizeConfigTables } from './admin';

describe('config table helpers', () => {
  it('derives route keys from labels', () => {
    expect(configTableKey('Cost Types')).toBe('cost-types');
    expect(configTableKey('PMB Weights')).toBe('pmb-weights');
  });

  it('normalises the /admin/config response', () => {
    expect(
      normalizeConfigTables({ tables: [{ name: 'Probability Levels', description: 'd', weighted: true }] }),
    ).toEqual([{ key: 'probability-levels', label: 'Probability Levels', description: 'd', weighted: true }]);
    expect(normalizeConfigTables(undefined)).toEqual([]);
  });

  it('converts Decimal string weights to numbers', () => {
    const base = { id: 1, code: 'H', description: 'High', is_active: true, created_at: '' };
    expect(normalizeConfigItem({ ...base, weight: '75.50' }).weight).toBe(75.5);
    expect('weight' in normalizeConfigItem(base)).toBe(false);
    expect('weight' in normalizeConfigItem({ ...base, weight: null })).toBe(false);
  });
});
