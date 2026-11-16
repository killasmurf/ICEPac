import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import NotFound from './NotFound';

describe('NotFound page', () => {
  it('renders the 404 message and a way back', () => {
    renderWithProviders(<NotFound />, { route: '/nowhere' });
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
  });
});
