import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Chip, Divider, IconButton, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { useAuth } from '../../auth/AuthContext';
import { brand } from '../../theme/tokens';

export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/[\s._@-]+/).filter(Boolean);
  if (words.length === 0) return '';
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0];
  return letters.toUpperCase();
}

const UserMenu: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  const displayName = user?.full_name || user?.username || '';
  const initials = initialsOf(displayName || user?.email);

  return (
    <>
      <IconButton
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={anchor ? true : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        size="small"
        sx={{ ml: 0.5 }}
      >
        <Avatar sx={{ width: 34, height: 34, fontSize: '0.8125rem', fontWeight: 700, bgcolor: brand.navy, color: brand.white }}>
          {initials || <PersonOutlineIcon fontSize="small" />}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 240, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {displayName || 'Signed in'}
          </Typography>
          {user?.email && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          )}
          {role && <Chip label={role} size="small" sx={{ mt: 1, textTransform: 'capitalize' }} />}
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            navigate('/help');
          }}
        >
          <ListItemIcon>
            <HelpOutlineIcon fontSize="small" />
          </ListItemIcon>
          Help
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            logout();
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;
