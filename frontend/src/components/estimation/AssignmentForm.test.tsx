import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { makeAssignment } from './testHelpers';
import AssignmentForm from './AssignmentForm';
import { resourcesApi } from '../../api/admin';

const lookups = {
  resources: [{ code: 'ENG', description: 'Engineer' }, { code: 'PM', description: 'Project manager' }],
  suppliers: [{ code: 'ACME', name: 'Acme Pty Ltd' }],
  costTypes: [],
  regions: [],
  businessAreas: [],
  estimatingTechniques: [],
};

const setup = (props: Partial<React.ComponentProps<typeof AssignmentForm>> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  renderWithProviders(<AssignmentForm open onClose={onClose} onSubmit={onSubmit} {...lookups} {...props} />);
  return { onSubmit, onClose };
};

const chooseResource = async (name: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: /Resource/ }));
  await userEvent.click(await screen.findByRole('option', { name }));
};

vi.setConfig({ testTimeout: 20_000 });

const setValue = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('AssignmentForm', () => {
  it('disables Create until a resource is chosen, then submits the payload', async () => {
    const { onSubmit, onClose } = setup();
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toBeDisabled();
    expect(screen.getByText('Select a resource')).toBeInTheDocument();

    await chooseResource('ENG - Engineer');
    setValue('Best Estimate', '100');
    setValue('Likely Estimate', '200');
    setValue('Worst Estimate', '400');
    expect(create).toBeEnabled();

    await userEvent.click(create);
    expect(onSubmit).toHaveBeenCalledWith({
      resource_code: 'ENG',
      supplier_code: '',
      cost_type_code: '',
      region_code: '',
      bus_area_code: '',
      estimating_technique_code: '',
      best_estimate: 100,
      likely_estimate: 200,
      worst_estimate: 400,
      duty_pct: 0,
      import_content_pct: 0,
      aii_pct: 0,
    });
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows a live PERT preview from the helpers', async () => {
    setup();
    setValue('Best Estimate', '100');
    setValue('Likely Estimate', '200');
    setValue('Worst Estimate', '400');
    const preview = screen.getByTestId('pert-preview');
    expect(preview).toHaveTextContent('PERT Estimate: $216.67');
    expect(preview).toHaveTextContent('Std Deviation: $50.00');
    expect(screen.getByRole('img', { name: /Best case \$100\.00/ })).toBeInTheDocument();
  });

  it('validates best <= likely <= worst with helper text and disables submit', async () => {
    setup({ assignment: makeAssignment() });
    const update = screen.getByRole('button', { name: 'Update' });
    expect(update).toBeEnabled();

    setValue('Best Estimate', '300');
    expect(screen.getByText('Best must not be more than likely')).toBeInTheDocument();
    expect(update).toBeDisabled();
    expect(screen.getByTestId('pert-preview')).toHaveTextContent('PERT Estimate: —');

    setValue('Best Estimate', '100');
    setValue('Worst Estimate', '150');
    expect(screen.getByText('Worst must not be less than likely')).toBeInTheDocument();
    expect(update).toBeDisabled();
  });

  it('rejects negative amounts and out-of-range percentages', async () => {
    setup({ assignment: makeAssignment() });
    setValue('Best Estimate', '-5');
    expect(screen.getByText('Must be 0 or more')).toBeInTheDocument();
    setValue('Best Estimate', '100');
    setValue('Duty %', '120');
    expect(screen.getByText('Must be between 0 and 100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
  });

  it('prefills when editing and uses a currency adornment', () => {
    setup({ assignment: makeAssignment({ resource_code: 'PM' }) });
    expect(screen.getByText('Edit Assignment')).toBeInTheDocument();
    expect(screen.getByLabelText('Best Estimate')).toHaveValue(100);
    expect(screen.getAllByText('$').length).toBeGreaterThanOrEqual(3);
  });

  it('keeps the dialog open when the save fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'));
    const onClose = vi.fn();
    setup({ assignment: makeAssignment(), onSubmit, onClose });
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled());
  });

  describe('default supplier of the chosen resource', () => {
    const supplierLookups = {
      resources: [
        { code: 'ENG', description: 'Engineer', supplier_code: 'ACME' },
        { code: 'PM', description: 'Project manager', supplier_code: null },
      ],
      suppliers: [
        { code: 'ACME', name: 'Acme Pty Ltd' },
        { code: 'ZED', name: 'Zed Ltd' },
      ],
    };
    const supplierBox = () => screen.getByRole('combobox', { name: 'Supplier' });

    it('pre-fills the supplier when the field is empty', async () => {
      setup(supplierLookups);
      await chooseResource('ENG - Engineer');
      expect(supplierBox()).toHaveTextContent('ACME - Acme Pty Ltd');
    });

    it('leaves the supplier empty for a resource without one', async () => {
      setup(supplierLookups);
      await chooseResource('PM - Project manager');
      expect(supplierBox()).not.toHaveTextContent('ACME');
    });

    it('does not overwrite a supplier the user already chose', async () => {
      setup(supplierLookups);
      await userEvent.click(supplierBox());
      await userEvent.click(await screen.findByRole('option', { name: 'ZED - Zed Ltd' }));
      await chooseResource('ENG - Engineer');
      expect(supplierBox()).toHaveTextContent('ZED - Zed Ltd');
    });

    it('does not overwrite the supplier of an assignment being edited', async () => {
      setup({ ...supplierLookups, assignment: makeAssignment({ resource_code: 'PM', supplier_code: 'ZED' }) });
      await chooseResource('ENG - Engineer');
      expect(supplierBox()).toHaveTextContent('ZED - Zed Ltd');
    });

    it('looks the default up from the server when the resource list carries no suppliers', async () => {
      const list = vi.spyOn(resourcesApi, 'list').mockResolvedValue({
        items: [
          { id: 1, resource_code: 'ENG-2', description: 'x', eoc: null, cost: 1, units: null, supplier_code: 'ZED', is_active: true, created_at: '', updated_at: '' },
          { id: 2, resource_code: 'ENG', description: 'Engineer', eoc: null, cost: 1, units: null, supplier_code: 'ACME', is_active: true, created_at: '', updated_at: '' },
        ],
        total: 2,
        skip: 0,
        limit: 100,
      });
      setup({ suppliers: supplierLookups.suppliers });
      await chooseResource('ENG - Engineer');
      await vi.waitFor(() => expect(supplierBox()).toHaveTextContent('ACME - Acme Pty Ltd'));
      expect(list).toHaveBeenCalledWith({ search: 'ENG', limit: 100 });
      list.mockRestore();
    });
  });
});
