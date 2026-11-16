import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PertRangeBar } from './PertRangeBar';

const left = (el: HTMLElement) => parseFloat(getComputedStyle(el).left);

describe('PertRangeBar', () => {
  it('places the PERT marker at 38.9% for best 10, likely 15, worst 25, pert 15.83', () => {
    renderWithProviders(<PertRangeBar best={10} likely={15} worst={25} pert={15.83} />);
    const marker = screen.getByTestId('pert-marker');
    expect(left(marker)).toBeCloseTo(38.9, 0);
    expect(Math.abs(left(marker) - 38.9)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(parseFloat(marker.dataset.position!) - 38.9)).toBeLessThanOrEqual(0.2);
    expect(left(screen.getByTestId('pert-likely'))).toBeCloseTo(33.33, 1);
  });

  it('draws the 80% band between low80 and high80', () => {
    renderWithProviders(<PertRangeBar best={10} likely={15} worst={25} pert={15.83} low80={12} high80={20} />);
    const band = screen.getByTestId('pert-band');
    expect(left(band)).toBeCloseTo(13.33, 1);
    expect(parseFloat(getComputedStyle(band).width)).toBeCloseTo(53.33, 1);
  });

  it('omits the band without 80% values', () => {
    renderWithProviders(<PertRangeBar best={10} likely={15} worst={25} pert={15} />);
    expect(screen.queryByTestId('pert-band')).toBeNull();
  });

  it('clamps values outside the range', () => {
    renderWithProviders(<PertRangeBar best={10} likely={15} worst={25} pert={40} />);
    expect(left(screen.getByTestId('pert-marker'))).toBe(100);
  });

  it('renders a single marker when worst equals best', () => {
    renderWithProviders(<PertRangeBar best={10} likely={10} worst={10} pert={10} />);
    expect(screen.getByTestId('pert-marker')).toBeInTheDocument();
    expect(screen.queryByTestId('pert-likely')).toBeNull();
    expect(screen.queryByTestId('pert-band')).toBeNull();
  });

  it('has an img role whose label reads the numbers', () => {
    renderWithProviders(<PertRangeBar best={10} likely={15} worst={25} pert={15.83} low80={12} high80={20} />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toContain('$10.00');
    expect(label).toContain('$25.00');
    expect(label).toContain('$15.83');
    expect(label).toMatch(/80% range \$12\.00 to \$20\.00/);
  });

  it('shows all values in a tooltip on keyboard focus', async () => {
    renderWithProviders(<PertRangeBar best={10} likely={15} worst={25} pert={15.83} />);
    await userEvent.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('PERT: $15.83');
  });
});
