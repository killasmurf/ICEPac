import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import { AuthProvider } from '../auth/AuthContext';
import Login from './Login';
import { login, getMe } from '../api/auth';

vi.mock('../api/auth', () => ({ login: vi.fn(), getMe: vi.fn() }));

function renderLogin(route = '/login') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/projects" element={<p>Projects page</p>} />
            <Route path="/" element={<p>Home page</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

describe('Login page', () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
    vi.mocked(getMe).mockReset().mockResolvedValue({} as never);
    localStorage.clear();
  });

  it('shows "Invalid credentials" when the request is rejected', async () => {
    vi.mocked(login).mockRejectedValue(new Error('401'));
    renderLogin();

    await userEvent.type(screen.getByLabelText('Username'), 'alice');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(/Invalid credentials/)).toBeInTheDocument();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('stores both tokens on success and goes home', async () => {
    const access = jwt({ role: 'user', exp: 4102444800 });
    vi.mocked(login).mockResolvedValue({ access_token: access, refresh_token: 'ref' });
    renderLogin();

    await userEvent.type(screen.getByLabelText('Username'), 'alice');
    await userEvent.type(screen.getByLabelText('Password'), 'right');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(localStorage.getItem('access_token')).toBe(access);
    expect(localStorage.getItem('refresh_token')).toBe('ref');
    expect(login).toHaveBeenCalledWith('alice', 'right');
  });

  it('returns to the ?next= path after login', async () => {
    vi.mocked(login).mockResolvedValue({ access_token: jwt({ role: 'user', exp: 4102444800 }), refresh_token: 'r' });
    renderLogin('/login?next=%2Fprojects');
    await userEvent.type(screen.getByLabelText('Username'), 'a');
    await userEvent.type(screen.getByLabelText('Password'), 'b');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Projects page')).toBeInTheDocument();
  });
});
