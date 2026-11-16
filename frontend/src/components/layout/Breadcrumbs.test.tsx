import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import Breadcrumbs from './Breadcrumbs';
import { resetLookupCache } from './useLookups';

vi.mock('../../api/projects', () => ({
  getProject: vi.fn().mockResolvedValue({ id: 7, project_name: 'Alpha' }),
  getProjects: vi.fn(),
}));
vi.mock('../../api/help', () => ({ getTopic: vi.fn().mockResolvedValue({ id: 2, title: 'Getting started' }) }));

const trail = () =>
  screen
    .getByRole('group', { name: 'Breadcrumb' })
    .textContent;

describe('Breadcrumbs', () => {
  beforeEach(() => resetLookupCache());

  it('shows Administration / Users', () => {
    renderWithProviders(<Breadcrumbs />, { route: '/admin/users' });
    expect(trail()).toBe('Administration/Users');
    expect(screen.getByRole('link', { name: 'Administration' })).toHaveAttribute('href', '/admin');
    expect(screen.getByText('Users')).toHaveAttribute('aria-current', 'page');
  });

  it('shows the project name for /projects/7', async () => {
    renderWithProviders(<Breadcrumbs />, { route: '/projects/7' });
    expect(screen.getByText('Project 7')).toBeInTheDocument();
    expect(await screen.findByText('Alpha')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
  });

  it('shows the topic title for /help/2', async () => {
    renderWithProviders(<Breadcrumbs />, { route: '/help/2' });
    expect(await screen.findByText('Getting started')).toBeInTheDocument();
  });
});
