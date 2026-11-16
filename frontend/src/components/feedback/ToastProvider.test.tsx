import { describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useToast } from './ToastProvider';
import { emitToast } from './toastBus';

function Buttons() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success('Saved')}>ok</button>
      <button onClick={() => toast.error('Failed')}>bad</button>
      <button onClick={() => { toast.info('First'); toast.info('Second'); }}>two</button>
    </>
  );
}

describe('ToastProvider', () => {
  it('shows an alert for success', async () => {
    renderWithProviders(<Buttons />);
    await userEvent.click(screen.getByText('ok'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Saved');
  });

  it('shows errors', async () => {
    renderWithProviders(<Buttons />);
    await userEvent.click(screen.getByText('bad'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed');
  });

  it('receives toasts from the bus', async () => {
    renderWithProviders(<div />);
    act(() => emitToast('error', 'From bus'));
    expect(await screen.findByRole('alert')).toHaveTextContent('From bus');
  });

  it('queues one at a time and auto-hides', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderWithProviders(<Buttons />);
      await userEvent.click(screen.getByText('two'));
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(screen.getByRole('alert')).toHaveTextContent('First');
      await act(async () => { await vi.advanceTimersByTimeAsync(4500); });
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
      expect(screen.getByRole('alert')).toHaveTextContent('Second');
    } finally {
      vi.useRealTimers();
    }
  });

  it('throws when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderWithProvidersless()).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

import { render } from '@testing-library/react';
function renderWithProvidersless() {
  return render(<Buttons />);
}
