import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { FormDialog } from './FormDialog';

const field = <input aria-label="Name" />;

describe('FormDialog', () => {
  it('submits via the button', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<FormDialog open title="New user" onClose={vi.fn()} onSubmit={onSubmit} submitLabel="Create">{field}</FormDialog>);
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('submits on Enter inside a field', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<FormDialog open title="New user" onClose={vi.fn()} onSubmit={onSubmit}>{field}</FormDialog>);
    await userEvent.type(screen.getByLabelText('Name'), 'abc{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('cancel calls onClose and does not submit', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<FormDialog open title="New user" onClose={onClose} onSubmit={onSubmit}>{field}</FormDialog>);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit while loading', () => {
    renderWithProviders(<FormDialog open title="t" onClose={vi.fn()} onSubmit={vi.fn()} loading>{field}</FormDialog>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('disables submit and ignores Enter when submitDisabled', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<FormDialog open title="t" onClose={vi.fn()} onSubmit={onSubmit} submitDisabled>{field}</FormDialog>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Name'), 'abc{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('turns native validation off by default and on when asked', () => {
    const { rerender } = renderWithProviders(
      <FormDialog open title="t" onClose={vi.fn()} onSubmit={vi.fn()}>{field}</FormDialog>,
    );
    expect(screen.getByRole('dialog')).toHaveProperty('noValidate', true);
    rerender(<FormDialog open title="t" onClose={vi.fn()} onSubmit={vi.fn()} noValidate={false}>{field}</FormDialog>);
    expect(screen.getByRole('dialog')).toHaveProperty('noValidate', false);
  });
});
