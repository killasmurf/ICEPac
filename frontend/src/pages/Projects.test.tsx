import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/renderWithProviders';
import type { Project } from '../api/projects';
import Projects from './Projects';

const api = vi.hoisted(() => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  restoreProject: vi.fn(),
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
    expect(api.getProjects).toHaveBeenCalledWith(0, 12, undefined, { archived: false, status: undefined, sort: undefined, order: undefined });
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
    expect(screen.getByText(/restore it later from the Archived view/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Archive project' }));
    await waitFor(() => expect(api.deleteProject).toHaveBeenCalledWith(1));
  });

  it('remembers the view in localStorage', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />, { route: '/projects' });
    await user.click(await screen.findByRole('button', { name: 'Table view' }));
    expect(window.localStorage.getItem('icepac.projectsView')).toBe('table');
  });

  describe('archived view', () => {
    const archivedProject = project({ id: 5, project_name: 'Old Wharf', archived: true });
    beforeEach(() => {
      api.getProjects.mockResolvedValue({ items: [archivedProject], total: 1, skip: 0, limit: 12 });
    });

    it('toggling to Archived requests archived projects and hides New project', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Projects />, { route: '/projects' });
      await screen.findByRole('link', { name: 'Old Wharf' });
      expect(screen.getAllByRole('button', { name: 'New project' }).length).toBeGreaterThan(0);
      await user.click(screen.getByRole('button', { name: 'Archived' }));
      await waitFor(() => expect(api.getProjects).toHaveBeenLastCalledWith(0, 12, undefined, expect.objectContaining({ archived: true })));
      expect(screen.queryByRole('button', { name: 'New project' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Archived' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('reads ?archived=1, marks rows Archived and offers Restore instead of Archive', async () => {
      renderWithProviders(<Projects />, { route: '/projects?archived=1' });
      expect(await screen.findByRole('link', { name: 'Old Wharf' })).toBeInTheDocument();
      expect(api.getProjects).toHaveBeenCalledWith(0, 12, undefined, expect.objectContaining({ archived: true }));
      expect(screen.getAllByText('Archived').length).toBeGreaterThan(1);
      expect(screen.getByRole('button', { name: 'Restore Old Wharf' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Archive Old Wharf' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'New project' })).not.toBeInTheDocument();
      expect(screen.getByText('1 archived project')).toBeInTheDocument();
    });

    it('does not open the create dialog from ?new=1 in the archived view', async () => {
      renderWithProviders(<Projects />, { route: '/projects?archived=1&new=1' });
      await screen.findByRole('link', { name: 'Old Wharf' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('restores through a non-destructive confirmation and toasts', async () => {
      const user = userEvent.setup();
      api.restoreProject.mockResolvedValue({ ...archivedProject, archived: false });
      renderWithProviders(<Projects />, { route: '/projects?archived=1' });
      await user.click(await screen.findByRole('button', { name: 'Restore Old Wharf' }));
      const dialog = screen.getByRole('dialog', { name: 'Restore project?' });
      await user.click(within(dialog).getByRole('button', { name: 'Restore project' }));
      await waitFor(() => expect(api.restoreProject).toHaveBeenCalledWith(5));
      expect(await screen.findByText('Project restored')).toBeInTheDocument();
      await waitFor(() => expect(api.getProjects.mock.calls.length).toBeGreaterThan(1));
    });

    it('shows an archived empty state without a create action', async () => {
      api.getProjects.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 12 });
      renderWithProviders(<Projects />, { route: '/projects?archived=1' });
      expect(await screen.findByText('No archived projects')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'New project' })).not.toBeInTheDocument();
    });
  });

  describe('sorting and status filter', () => {
    const pickOption = async (user: ReturnType<typeof userEvent.setup>, name: string, option: string) => {
      await user.click(await screen.findByRole('combobox', { name }));
      await user.click(await screen.findByRole('option', { name: option }));
    };

    it('sends the status filter and sort to the API', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Projects />, { route: '/projects' });
      await screen.findByRole('link', { name: 'Harbour Bridge' });
      await pickOption(user, 'Status', 'Draft');
      await waitFor(() => expect(api.getProjects).toHaveBeenLastCalledWith(0, 12, undefined, expect.objectContaining({ status: 'draft' })));
      await pickOption(user, 'Sort by', 'Name Z to A');
      await waitFor(() =>
        expect(api.getProjects).toHaveBeenLastCalledWith(0, 12, undefined, { archived: false, status: 'draft', sort: 'name', order: 'desc' }),
      );
    });

    it('reads status, sort and order from the URL', async () => {
      renderWithProviders(<Projects />, { route: '/projects?status=active&sort=manager&order=desc' });
      await screen.findByRole('link', { name: 'Harbour Bridge' });
      expect(api.getProjects).toHaveBeenCalledWith(0, 12, undefined, { archived: false, status: 'active', sort: 'manager', order: 'desc' });
      expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveTextContent('Manager Z to A');
      expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Active');
    });

    it('ignores unknown URL values', async () => {
      renderWithProviders(<Projects />, { route: '/projects?status=bogus&sort=bogus&order=desc' });
      await screen.findByRole('link', { name: 'Harbour Bridge' });
      expect(api.getProjects).toHaveBeenCalledWith(0, 12, undefined, { archived: false, status: undefined, sort: undefined, order: undefined });
    });

    it('returns to the first page when the sort changes', async () => {
      const user = userEvent.setup();
      api.getProjects.mockResolvedValue({ items: [project()], total: 30, skip: 0, limit: 12 });
      renderWithProviders(<Projects />, { route: '/projects' });
      await user.click(await screen.findByRole('button', { name: 'Go to page 2' }));
      await waitFor(() => expect(api.getProjects).toHaveBeenLastCalledWith(12, 12, undefined, expect.anything()));
      await pickOption(user, 'Sort by', 'Oldest first');
      await waitFor(() =>
        expect(api.getProjects).toHaveBeenLastCalledWith(0, 12, undefined, expect.objectContaining({ sort: 'created_at', order: 'asc' })),
      );
    });

    it('table headers sort on the server', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Projects />, { route: '/projects' });
      await user.click(await screen.findByRole('button', { name: 'Table view' }));
      await user.click(await screen.findByRole('columnheader', { name: /Project/ }));
      await waitFor(() =>
        expect(api.getProjects).toHaveBeenLastCalledWith(0, 10, undefined, expect.objectContaining({ sort: 'name', order: 'asc' })),
      );
    });
  });
});
