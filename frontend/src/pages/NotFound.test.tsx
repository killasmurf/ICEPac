import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import NotFound from './NotFound';

describe('NotFound page', () => {
  it('renders the not-found message and a way back', () => {
    renderWithProviders(<NotFound />, { route: '/nowhere' });
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to dashboard' })).toBeInTheDocument();
  });
});
