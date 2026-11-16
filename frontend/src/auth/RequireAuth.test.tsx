import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import { AuthProvider } from './AuthContext';
import { RequireAuth, RequireRole } from './RequireAuth';

vi.mock('../api/auth', () => ({ login: vi.fn(), getMe: vi.fn().mockResolvedValue({}) }));

const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;
const Where = () => {
  const l = useLocation();
  return <p>at {l.pathname + l.search}</p>;
};

function setup(route: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Where />} />
            <Route element={<RequireAuth />}>
              <Route path="/projects" element={<p>Projects</p>} />
              <Route path="/admin" element={<RequireRole role="admin" />}>
                <Route index element={<p>Admin</p>} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('route guards', () => {
  beforeEach(() => localStorage.clear());

  it('redirects to /login?next= without a token', () => {
    setup('/projects');
    expect(screen.getByText('at /login?next=%2Fprojects')).toBeInTheDocument();
  });

  it('redirects when the token is expired', () => {
    localStorage.setItem('access_token', jwt({ role: 'admin', exp: 1 }));
    setup('/projects');
    expect(screen.getByText(/at \/login/)).toBeInTheDocument();
  });

  it('shows Not authorised for a non-admin', () => {
    localStorage.setItem('access_token', jwt({ role: 'user', exp: 4102444800 }));
    setup('/admin');
    expect(screen.getByRole('heading', { name: 'Not authorised' })).toBeInTheDocument();
  });

  it('lets an admin in', () => {
    localStorage.setItem('access_token', jwt({ role: 'admin', exp: 4102444800 }));
    setup('/admin');
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
