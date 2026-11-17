import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { AnimatedNumber } from './AnimatedNumber';

function mockMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

const money = (v: number) => `$${Math.round(v)}`;

describe('AnimatedNumber', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('with reduced motion', () => {
    beforeEach(() => mockMotion(true));

    it('renders the final value synchronously', () => {
      const { container } = render(<AnimatedNumber value={1500} format={money} />);
      expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('$1500');
      expect(container).toHaveTextContent('$1500$1500');
    });

    it('jumps straight to a new value', () => {
      const { container, rerender } = render(<AnimatedNumber value={10} format={money} />);
      rerender(<AnimatedNumber value={99} format={money} />);
      expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('$99');
    });
  });

  describe('with motion', () => {
    beforeEach(() => {
      mockMotion(false);
      vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    });

    it('counts up over 600 ms and ends on the final value', () => {
      const { container } = render(<AnimatedNumber value={1000} format={money} />);
      const animated = () => container.querySelector('[aria-hidden="true"]')?.textContent;
      act(() => {
        vi.advanceTimersByTime(300);
      });
      const mid = Number(animated()?.replace('$', ''));
      expect(mid).toBeGreaterThan(0);
      expect(mid).toBeLessThan(1000);
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(animated()).toBe('$1000');
    });

    it('always exposes the final value as the accessible text', () => {
      const { container } = render(<AnimatedNumber value={1000} format={money} />);
      act(() => {
        vi.advanceTimersByTime(100);
      });
      const hidden = container.querySelector('span:not([aria-hidden])');
      expect(hidden).toHaveTextContent('$1000');
      expect(container.querySelector('[aria-hidden="true"]')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
