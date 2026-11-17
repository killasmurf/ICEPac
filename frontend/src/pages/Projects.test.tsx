import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/renderWithProviders';
import type { Project } from '../api/projects';
import Projects from './Projects';

const api = vi.hoisted(() => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));
vi.mock('../api/projects', () => api);
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ role: 'admin' }) }));

const project = (over: Partial<Project> = {}): Project => ({
  id: 1,
  project_name: 'Harbour Bridge',
  project_manager: 'Jordan Lee',
  description: null,
  archived: false,
  status: 'imported',
  source_file: null,
  source_format: null,
  start_date: null,
  finish_date: null,
  baseline_start: null,
  baseline_finish: null,
  task_count: 142,
  resource_count: 2,
  owner_id: 1,
  created_at: '2026-01-05T09:30:00Z',
  updated_at: '2026-03-02T14:05:00Z',
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
  api.getProjects.mockResolvedValue({ items: [project()], total: 1, skip: 0, limit: 12 });
});

describe('Projects page', () => {
  it('renders project cards with status and task count', async () => {
    renderWithProviders(<Projects />, { route: '/projects' });
    expect(await screen.findByRole('link', { name: 'Harbour Bridge' })).toHaveAttribute('href', '/projects/1');
    expect(screen.getByText('Imported')).toBeInTheDocument();
    expect(screen.getByText('142 tasks')).toBeInTheDocument();
    expect(api.getProjects).toHaveBeenCalledWith(0, 12, undefined);
  });

  it('shows the empty state with a create action', async () => {
    api.getProjects.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 12 });
    renderWithProviders(<Projects />, { route: '/projects' });
    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'New project' }).length).toBeGreaterThan(0);
  });

  it('shows the error state and retries', async () => {
    const user = userEvent.setup();
    api.getProjects.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ items: [project()], total: 1, skip: 0, limit: 12 });
    renderWithProviders(<Projects />, { route: '/projects' });
    await user.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'Harbour Bridge' })).toBeInTheDocument();
  });

  it('opens the create dialog from ?new=1 and creates with only the filled fields', async () => {
    const user = userEvent.setup();
    api.createProject.mockResolvedValue(project({ id: 9 }));
    renderWithProviders(<Projects />, { route: '/projects?new=1' });
    await user.type(await screen.findByLabelText(/Project name/), 'Tunnel');
    await user.click(screen.getByRole('button', { name: 'Create project' }));
    await waitFor(() => expect(api.createProject).toHaveBeenCalledWith({ project_name: 'Tunnel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('requires a project name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />, { route: '/projects?new=1' });
    await user.click(await screen.findByRole('button', { name: 'Create project' }));
    expect(await screen.findByText('Project name is required')).toBeInTheDocument();
    expect(api.createProject).not.toHaveBeenCalled();
  });

  it('archives through a confirmation dialog', async () => {
    const user = userEvent.setup();
    api.deleteProject.mockResolvedValue(undefined);
    renderWithProviders(<Projects />, { route: '/projects' });
    await user.click(await screen.findByRole('button', { name: 'Archive Harbour Bridge' }));
    expect(screen.getByText(/will be hidden from the projects list/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Archive project' }));
    await waitFor(() => expect(api.deleteProject).toHaveBeenCalledWith(1));
  });

  it('remembers the view in localStorage', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />, { route: '/projects' });
    await user.click(await screen.findByRole('button', { name: 'Table view' }));
    expect(window.localStorage.getItem('icepac.projectsView')).toBe('table');
  });
});
