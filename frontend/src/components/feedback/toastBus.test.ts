import { describe, expect, it, vi } from 'vitest';
import { emitToast, errorMessage, registerToastHandler } from './toastBus';

describe('toastBus', () => {
  it('delivers severity and message to the registered handler', () => {
    const handler = vi.fn();
    const off = registerToastHandler(handler);
    emitToast('error', 'Nope');
    expect(handler).toHaveBeenCalledWith('error', 'Nope');
    off();
  });

  it('an old unsubscribe does not remove a newer handler', () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = registerToastHandler(a);
    const offB = registerToastHandler(b);
    offA();
    emitToast('info', 'x');
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
    offB();
  });

  it('prefers the API detail in errorMessage', () => {
    expect(errorMessage({ response: { data: { detail: 'Bad input' } } })).toBe('Bad input');
  });
});
