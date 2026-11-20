import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ArchivedProjectBanner } from './ArchivedProjectBanner';

const api = vi.hoisted(() => ({ restoreProject: vi.fn() }));
const auth = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('../../api/projects', () => api);
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ role: auth.role }) }));

const archived = { id: 4, project_name: 'Old Wharf', archived: true };

beforeEach(() => {
  vi.resetAllMocks();
  auth.role = 'admin';
});

describe('ArchivedProjectBanner', () => {
  it('renders nothing for an active project', () => {
    const { container } = renderWithProviders(<ArchivedProjectBanner project={{ ...archived, archived: false }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a non-dismissable alert with a Restore button for managers', () => {
    auth.role = 'manager';
    renderWithProviders(<ArchivedProjectBanner project={archived} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This project is archived');
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('hides the Restore button from users and viewers', () => {
    auth.role = 'viewer';
    renderWithProviders(<ArchivedProjectBanner project={archived} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This project is archived');
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument();
  });

  it('restores the project and toasts', async () => {
    const user = userEvent.setup();
    api.restoreProject.mockResolvedValue({ ...archived, archived: false });
    renderWithProviders(<ArchivedProjectBanner project={archived} />);
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(api.restoreProject).toHaveBeenCalledWith(4));
    expect(await screen.findByText('Project restored')).toBeInTheDocument();
  });
});
