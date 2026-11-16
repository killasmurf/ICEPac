import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Box, LinearProgress, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';
import { layout } from '../../theme/tokens';
import CommandPalette from './CommandPalette';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSidebarCollapsed } from './useSidebarCollapsed';

const AppLayout: React.FC = () => {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar desktop={desktop} collapsed={collapsed} mobileOpen={mobileOpen} onMobileClose={closeMobile} />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header
          desktop={desktop}
          sidebarCollapsed={collapsed}
          onMenuClick={desktop ? toggleCollapsed : () => setMobileOpen(true)}
          onSearchClick={() => setPaletteOpen(true)}
        />
        <Box component="main" sx={{ flex: 1, position: 'relative', p: { xs: 2, md: 3 } }}>
          <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto' }}>
            <Suspense
              fallback={<LinearProgress aria-label="Loading page" sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
            >
              <Outlet />
            </Suspense>
          </Box>
        </Box>
      </Box>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </Box>
  );
};

export default AppLayout;
