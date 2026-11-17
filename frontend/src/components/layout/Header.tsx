import React from 'react';
import { AppBar, Box, Button, IconButton, Toolbar, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import SearchIcon from '@mui/icons-material/Search';
import { layout } from '../../theme/tokens';
import Breadcrumbs from './Breadcrumbs';
import ColorModeToggle from './ColorModeToggle';
import GlobalProgress from './GlobalProgress';
import UserMenu from './UserMenu';

interface HeaderProps {
  desktop: boolean;
  sidebarCollapsed: boolean;
  /** Mobile: open the drawer. Desktop: collapse/expand the rail. */
  onMenuClick: () => void;
  onSearchClick: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const SHORTCUT_LABEL = isMac ? '⌘K' : 'Ctrl K';

const Header: React.FC<HeaderProps> = ({ desktop, sidebarCollapsed, onMenuClick, onSearchClick }) => {
  const menuLabel = desktop
    ? sidebarCollapsed
      ? 'Expand sidebar'
      : 'Collapse sidebar'
    : 'Open navigation menu';

  return (
    <AppBar position="sticky" sx={{ height: layout.headerHeight }}>
      <Toolbar sx={{ height: layout.headerHeight, minHeight: `${layout.headerHeight}px !important`, gap: 1, px: { xs: 1, md: 2 } }}>
        <Tooltip title={menuLabel}>
          <IconButton aria-label={menuLabel} onClick={onMenuClick} edge="start" sx={{ color: 'text.secondary' }}>
            {desktop && !sidebarCollapsed ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
        </Tooltip>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Breadcrumbs />
        </Box>

        <Button
          variant="outlined"
          color="inherit"
          onClick={onSearchClick}
          startIcon={<SearchIcon />}
          sx={{
            display: { xs: 'none', md: 'inline-flex' },
            color: 'text.secondary',
            borderColor: 'divider',
            fontWeight: 500,
            minWidth: 240,
            justifyContent: 'flex-start',
          }}
        >
          <Box component="span" sx={{ flex: 1, textAlign: 'left' }}>
            Search&hellip;
          </Box>
          <Box
            component="kbd"
            sx={{
              fontFamily: 'inherit',
              fontSize: '0.75rem',
              px: 0.75,
              py: 0.25,
              borderRadius: 0.5,
              border: 1,
              borderColor: 'divider',
              color: 'text.secondary',
            }}
          >
            {SHORTCUT_LABEL}
          </Box>
        </Button>
        <IconButton aria-label="Search" onClick={onSearchClick} sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.secondary' }}>
          <SearchIcon />
        </IconButton>

        <ColorModeToggle />
        <UserMenu />
      </Toolbar>
      <GlobalProgress />
    </AppBar>
  );
};

export default Header;
