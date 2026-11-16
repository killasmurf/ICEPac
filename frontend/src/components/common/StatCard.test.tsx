import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renders label, value, hint and trend', () => {
    renderWithProviders(<StatCard label="Projects" value="12" hint="3 active" trend={{ value: 4.2, label: 'vs last month' }} />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3 active')).toBeInTheDocument();
    expect(screen.getByTestId('stat-trend')).toHaveTextContent('4.2% vs last month');
    expect(screen.getByLabelText('Up')).toBeInTheDocument();
  });

  it('shows a down arrow for negative trends', () => {
    renderWithProviders(<StatCard label="x" value="1" trend={{ value: -2 }} />);
    expect(screen.getByLabelText('Down')).toBeInTheDocument();
  });

  it('is not a button without onClick', () => {
    renderWithProviders(<StatCard label="x" value="1" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is keyboard-activatable when clickable', async () => {
    const onClick = vi.fn();
    renderWithProviders(<StatCard label="Open" value="5" onClick={onClick} />);
    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('hides the value while loading', () => {
    renderWithProviders(<StatCard label="x" value="99" loading />);
    expect(screen.queryByText('99')).toBeNull();
  });
});
