import React, { useState } from 'react';
import { Button, TextField, Typography, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { adminTokens as t } from './admin/admin-tokens';

const FEATURES = [
  'Project cost estimation & WBS planning',
  'Resource library & supplier management',
  'Audit trails & role-based access control',
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      const response = await client.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      localStorage.setItem('access_token', response.data.access_token);
      navigate('/');
    } catch {
      setError('Invalid credentials. Please check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: t.fontSans }}>

      {/* ── Left decorative panel ─────────────────────────────── */}
      <div style={{
        width: '42%', flexShrink: 0,
        background: 'linear-gradient(160deg, #0F172A 0%, #0F2D54 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 56px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Dot-grid texture */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
          <defs>
            <pattern id="loginDots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="rgba(148,163,184,0.2)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#loginDots)" />
        </svg>

        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: '-140px', right: '-140px',
          width: '440px', height: '440px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Brand content */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '52px', height: '52px', backgroundColor: t.blue,
            borderRadius: t.radiusMd, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, fontSize: '18px', color: '#fff',
            marginBottom: '28px', boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
          }}>IC</div>

          <h1 style={{ fontSize: '34px', fontWeight: 700, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            ICEPac
          </h1>
          <p style={{ fontSize: '15px', color: t.slate400, margin: '0 0 48px', lineHeight: 1.6, maxWidth: '280px' }}>
            Integrated Cost Engineering &amp; Project Analysis Console
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                  backgroundColor: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <polyline points="1.5 6.5 4.5 9.5 10.5 2.5" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: '14px', color: t.slate300, lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '32px', left: '56px', fontSize: '12px', color: t.slate700 }}>
          ICEPac v1.0 · Project Management Suite
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: t.slate50, padding: '40px',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ marginBottom: '36px' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: t.navy, mb: 1 }}>
              Welcome back
            </Typography>
            <Typography variant="body2" sx={{ color: t.slate500 }}>
              Sign in to your account to continue
            </Typography>
          </div>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth label="Username" margin="normal"
              value={username} onChange={e => setUsername(e.target.value)}
              disabled={loading} autoComplete="username" autoFocus
            />
            <TextField
              fullWidth label="Password" type="password" margin="normal"
              value={password} onChange={e => setPassword(e.target.value)}
              disabled={loading} autoComplete="current-password"
              sx={{ mb: error ? 0 : 3 }}
            />

            {error && (
              <div style={{
                margin: '12px 0 20px',
                padding: '10px 14px',
                backgroundColor: t.redL,
                border: `1px solid ${t.red}40`,
                borderRadius: t.radiusMd,
                display: 'flex', alignItems: 'flex-start', gap: '8px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.red} strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <Typography variant="body2" sx={{ color: t.redD, fontWeight: 500 }}>{error}</Typography>
              </div>
            )}

            <Button
              fullWidth variant="contained" type="submit" size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{ py: 1.5, fontWeight: 600, fontSize: '15px' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
