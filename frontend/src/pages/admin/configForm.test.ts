import { describe, expect, it } from 'vitest';
import { configFormFromItem, configFormToInput, emptyConfigForm, validateConfigForm } from './configForm';

describe('validateConfigForm', () => {
  it('requires code and description', () => {
    expect(validateConfigForm(emptyConfigForm(), false)).toEqual({
      code: 'Code is required',
      description: 'Description is required',
    });
  });

  it('only checks weight on weighted tables', () => {
    const v = { ...emptyConfigForm(), code: 'A', description: 'B' };
    expect(validateConfigForm(v, false)).toEqual({});
    expect(validateConfigForm(v, true)).toEqual({ weight: 'Weight is required' });
    expect(validateConfigForm({ ...v, weight: '101' }, true).weight).toMatch(/between 0 and 100/);
    expect(validateConfigForm({ ...v, weight: '-1' }, true).weight).toMatch(/between 0 and 100/);
    expect(validateConfigForm({ ...v, weight: '0' }, true)).toEqual({});
  });

  it('enforces maximum lengths', () => {
    const v = { ...emptyConfigForm(), code: 'x'.repeat(51), description: 'y'.repeat(256) };
    expect(Object.keys(validateConfigForm(v, false))).toEqual(['code', 'description']);
  });
});

describe('configFormToInput', () => {
  it('omits weight for plain tables and trims text', () => {
    expect(configFormToInput({ code: ' ab ', description: ' d ', weight: '5', is_active: true }, false)).toEqual({
      code: 'ab',
      description: 'd',
      is_active: true,
    });
  });

  it('sends a numeric weight for weighted tables', () => {
    expect(configFormToInput({ code: 'H', description: 'High', weight: '75.5', is_active: false }, true)).toEqual({
      code: 'H',
      description: 'High',
      weight: 75.5,
      is_active: false,
    });
  });
});

describe('configFormFromItem', () => {
  it('maps an item to form strings', () => {
    expect(
      configFormFromItem({ id: 1, code: 'H', description: 'High', weight: 80, is_active: true, created_at: '' }),
    ).toEqual({ code: 'H', description: 'High', weight: '80', is_active: true });
  });
});
