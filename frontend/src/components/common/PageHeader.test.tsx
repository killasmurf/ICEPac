import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders title as h1, subtitle and actions', () => {
    renderWithProviders(<PageHeader title="Projects" subtitle="All projects" actions={<button>New</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('All projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
  });

  it('omits optional slots', () => {
    renderWithProviders(<PageHeader title="Only" />);
    expect(screen.queryByTestId('page-header-actions')).toBeNull();
  });
});
