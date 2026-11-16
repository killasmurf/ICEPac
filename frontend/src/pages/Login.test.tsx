import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/renderWithProviders';
import Login from './Login';
import { login } from '../api/auth';

vi.mock('../api/auth', () => ({ login: vi.fn() }));

describe('Login page', () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
    localStorage.clear();
  });

  it('shows "Invalid credentials" when the request is rejected', async () => {
    vi.mocked(login).mockRejectedValue(new Error('401'));
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText('Username'), 'alice');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('stores both tokens on success', async () => {
    vi.mocked(login).mockResolvedValue({ access_token: 'acc', refresh_token: 'ref' });
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText('Username'), 'alice');
    await userEvent.type(screen.getByLabelText('Password'), 'right');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await vi.waitFor(() => expect(localStorage.getItem('access_token')).toBe('acc'));
    expect(localStorage.getItem('refresh_token')).toBe('ref');
    expect(login).toHaveBeenCalledWith('alice', 'right');
  });
});
