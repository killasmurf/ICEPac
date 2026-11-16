import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { TableSkeleton } from './TableSkeleton';

describe('TableSkeleton', () => {
  it('renders header plus the requested rows and columns', () => {
    const { container } = renderWithProviders(<TableSkeleton rows={3} columns={5} />);
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(4);
    expect(container.querySelectorAll('.MuiSkeleton-wave')).toHaveLength(20);
  });
});
