import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useColorScheme } from '@mui/material/styles';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AdalexLogo, BrandMark } from '../components/brand/BrandMark';
import { brand } from '../theme/tokens';

/** Only same-origin absolute paths are allowed as a post-login target. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : '/';
}

const POINTS = [
  {
    icon: <InsightsOutlinedIcon />,
    title: 'Three-point PERT estimates',
    text: 'Best, likely and worst case, with 80% confidence ranges.',
  },
  {
    icon: <AccountTreeOutlinedIcon />,
    title: 'WBS import from Microsoft Project',
    text: 'Bring in an existing schedule and start estimating.',
  },
  {
    icon: <FactCheckOutlinedIcon />,
    title: 'Approvals, risks and reports',
    text: 'Sign off estimates, track risk registers and export reports.',
  },
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const { colorScheme } = useColorScheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const next = safeNext(params.get('next'));

  if (isAuthenticated) return <Navigate to={next} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(next, { replace: true });
    } catch {
      setError('Invalid credentials. Check your username and password and try again.');
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        data-testid="login-brand-panel"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: '1 1 50%',
          maxWidth: 720,
          p: { md: 5, lg: 7 },
          color: 'common.white',
          bgcolor: brand.navyDeep,
          backgroundImage: `radial-gradient(circle at 15% 10%, ${alpha(brand.blue, 0.6)} 0%, transparent 55%), radial-gradient(circle at 90% 100%, ${alpha(brand.blue, 0.35)} 0%, transparent 50%)`,
        }}
      >
        <BrandMark variant="dark" />

        <Box>
          <Typography variant="h2" component="p" sx={{ fontWeight: 700, color: 'common.white', maxWidth: 480 }}>
            Estimate with{' '}
            <Box component="span" sx={{ color: brand.gold }}>
              confidence.
            </Box>
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 5, display: 'grid', gap: 3, maxWidth: 480 }}>
            {POINTS.map((p) => (
              <Box component="li" key={p.title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box
                  aria-hidden
                  sx={{
                    display: 'flex',
                    p: 1.25,
                    borderRadius: 2,
                    color: brand.gold,
                    bgcolor: alpha(brand.white, 0.08),
                    border: 1,
                    borderColor: alpha(brand.white, 0.14),
                  }}
                >
                  {p.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: 'common.white' }}>{p.title}</Typography>
                  <Typography variant="body2" sx={{ color: alpha(brand.white, 0.75) }}>
                    {p.text}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <AdalexLogo variant="dark" height={28} />
      </Box>

      <Box
        component="main"
        sx={{ flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 4 } }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4 }}>
            <BrandMark variant={colorScheme === 'dark' ? 'dark' : 'light'} />
          </Box>

          <Typography variant="h3" component="h1" gutterBottom>
            Sign in
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Welcome back. Enter your details to continue to ICEPac.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              autoComplete="username"
              slotProps={{ htmlInput: { required: true } }}
              autoFocus
              value={username}
              disabled={submitting}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              disabled={submitting}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                htmlInput: { required: true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((s) => !s)}
                        onMouseDown={(e) => e.preventDefault()}
                        disabled={submitting}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              size="large"
              color="secondary"
              variant="contained"
              loading={submitting}
              sx={{ mt: 1 }}
            >
              Sign in
            </Button>
          </Box>

          <Box sx={{ mt: 6 }}>
            <Typography variant="caption" color="text.secondary">
              ICEPac by Adalex Consulting
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
