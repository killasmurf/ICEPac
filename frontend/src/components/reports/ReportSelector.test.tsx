import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import ReportSelector from './ReportSelector';

const catalog = {
  cost: { label: 'Cost', reports: [{ type: 'cost_by_wbs', label: 'Cost by WBS', description: 'd1' }, { type: 'cost_by_resource', label: 'Cost by Resource', description: 'd2' }] },
  risk: { label: 'Risk', reports: [{ type: 'risk_summary', label: 'Risk Summary', description: 'd3' }] },
};

describe('ReportSelector', () => {
  it('exposes a radio group with the selected card checked', () => {
    renderWithProviders(<ReportSelector catalog={catalog} selected="cost_by_resource" onSelect={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Report type' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /Cost by Resource/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Cost by WBS/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('only the selected card (or the first) is a tab stop', () => {
    renderWithProviders(<ReportSelector catalog={catalog} selected={null} onSelect={() => {}} />);
    expect(screen.getByRole('radio', { name: /Cost by WBS/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: /Risk Summary/ })).toHaveAttribute('tabindex', '-1');
  });

  it('arrow keys move selection across categories and wrap', async () => {
    const onSelect = vi.fn();
    renderWithProviders(<ReportSelector catalog={catalog} selected="cost_by_resource" onSelect={onSelect} />);
    screen.getByRole('radio', { name: /Cost by Resource/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith('risk_summary');
    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith('cost_by_wbs');
  });

  it('Space selects the focused card', async () => {
    const onSelect = vi.fn();
    renderWithProviders(<ReportSelector catalog={catalog} selected={null} onSelect={onSelect} />);
    screen.getByRole('radio', { name: /Risk Summary/ }).focus();
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenCalledWith('risk_summary');
  });
});
