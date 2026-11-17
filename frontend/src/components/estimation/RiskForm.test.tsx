import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { makeRisk } from './testHelpers';
import RiskForm from './RiskForm';

const lookups = {
  riskCategories: [{ code: 'TECH', description: 'Technical' }],
  probabilityLevels: [{ code: 'M', description: 'Medium', weight: 0.5 }],
  severityLevels: [{ code: 'H', description: 'High', weight: 2 }],
};

const setup = (props: Partial<React.ComponentProps<typeof RiskForm>> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  renderWithProviders(<RiskForm open onClose={onClose} onSubmit={onSubmit} {...lookups} {...props} />);
  return { onSubmit, onClose };
};

vi.setConfig({ testTimeout: 20_000 });

const setValue = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('RiskForm', () => {
  it('requires a category, previews exposure, and submits the payload', async () => {
    const { onSubmit } = setup();
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toBeDisabled();

    await userEvent.click(screen.getByRole('combobox', { name: /Risk Category/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'TECH - Technical' }));
    setValue('Risk Cost', '10000');
    await userEvent.click(screen.getByRole('combobox', { name: 'Probability' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Medium (50%)' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Severity' }));
    await userEvent.click(await screen.findByRole('option', { name: 'High (2x)' }));

    expect(screen.getByTestId('risk-exposure-preview')).toHaveTextContent('Risk Exposure: $10,000.00');
    expect(create).toBeEnabled();
    await userEvent.click(create);
    expect(onSubmit).toHaveBeenCalledWith({
      risk_category_code: 'TECH',
      risk_cost: 10000,
      probability_code: 'M',
      severity_code: 'H',
      mitigation_plan: '',
    });
  });

  it('rejects a negative cost with helper text', async () => {
    setup({ risk: makeRisk() });
    setValue('Risk Cost', '-1');
    expect(screen.getByText('Must be 0 or more')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
  });

  it('prefills when editing', () => {
    setup({ risk: makeRisk({ risk_cost: 2500, mitigation_plan: 'Add a spike' }) });
    expect(screen.getByText('Edit Risk')).toBeInTheDocument();
    expect(screen.getByLabelText('Risk Cost')).toHaveValue(2500);
    expect(screen.getByLabelText('Mitigation Plan')).toHaveValue('Add a spike');
  });
});
