import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ConfirmDialog } from './ConfirmDialog';

const base = { open: true, title: 'Delete project', message: 'Are you sure?', confirmLabel: 'Delete' };

describe('ConfirmDialog', () => {
  it('calls onConfirm and onClose', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<ConfirmDialog {...base} onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Delete project' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the error colour when destructive', () => {
    renderWithProviders(<ConfirmDialog {...base} destructive onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Delete' }).className).toMatch(/colorError/);
  });

  it('disables both buttons while loading', () => {
    renderWithProviders(<ConfirmDialog {...base} loading onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    renderWithProviders(<ConfirmDialog {...base} onConfirm={vi.fn()} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    renderWithProviders(<ConfirmDialog {...base} open={false} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
