import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { BrandMark, AdalexLogo } from '../brand/BrandMark';
import { brand, layout, motion } from '../../theme/tokens';
import { useAuth } from '../../auth/AuthContext';
import { getVisibleSections, isNavActive } from './navConfig';

interface SidebarProps {
  /** Permanent drawer (md and up) when true, temporary drawer otherwise. */
  desktop: boolean;
  /** Rail mode; only applies to the permanent drawer. */
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ desktop, collapsed, mobileOpen, onMobileClose }) => {
  const { pathname } = useLocation();
  const { role } = useAuth();
  const theme = useTheme();
  const rail = desktop && collapsed;
  const width = rail ? layout.sidebarRail : layout.sidebarWidth;
  const sections = getVisibleSections(role);

  const onSurface = (a: number) => alpha(brand.white, a);

  const content = (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        color: onSurface(0.7),
        // The sidebar is dark in both colour modes, so its focus ring is always gold.
        '& :focus-visible': { outline: `2px solid ${brand.gold}`, outlineOffset: 2 },
      }}
    >
      <Box
        sx={{
          height: layout.headerHeight,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: rail ? 'center' : 'flex-start',
          px: rail ? 0 : 2.5,
          borderBottom: `1px solid ${onSurface(0.08)}`,
          // Keep the "by Adalex Consulting" line on one row inside the 248px sidebar.
          '& .MuiTypography-overline': { whiteSpace: 'nowrap', fontSize: '0.625rem' },
        }}
      >
        <BrandMark variant="dark" collapsed={rail} />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5, px: 1.5 }}>
        {sections.map((section) => (
          <Box key={section.id} sx={{ mb: 1.5 }}>
            {rail ? (
              <Box id={`nav-${section.id}`} component="span" sx={visuallyHidden}>
                {section.label}
              </Box>
            ) : (
              <Typography
                id={`nav-${section.id}`}
                variant="overline"
                component="div"
                sx={{ display: 'block', px: 1.5, pt: 1, pb: 0.5, color: onSurface(0.5), lineHeight: 2 }}
              >
                {section.label}
              </Typography>
            )}
            <List disablePadding aria-labelledby={`nav-${section.id}`}>
              {section.items.map((item) => {
                const active = isNavActive(item, pathname);
                const button = (
                  <ListItemButton
                    component={RouterLink}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    aria-label={rail ? item.label : undefined}
                    onClick={desktop ? undefined : onMobileClose}
                    sx={{
                      position: 'relative',
                      borderRadius: 1,
                      minHeight: 44,
                      px: rail ? 0 : 1.5,
                      justifyContent: rail ? 'center' : 'flex-start',
                      color: active ? brand.white : 'inherit',
                      bgcolor: active ? onSurface(0.1) : 'transparent',
                      transition: `background-color ${motion.fast}ms ${motion.easing}`,
                      '&:hover': { bgcolor: active ? onSurface(0.12) : onSurface(0.08) },
                      '&:focus-visible': { outline: `2px solid ${brand.gold}`, outlineOffset: -2 },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 8,
                        bottom: 8,
                        width: 3,
                        borderRadius: '0 3px 3px 0',
                        bgcolor: brand.gold,
                        opacity: active ? 1 : 0,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: rail ? 0 : 40, color: 'inherit', justifyContent: 'center' }}>
                      {item.icon}
                    </ListItemIcon>
                    {!rail && (
                      <ListItemText
                        primary={item.label}
                        slotProps={{ primary: { noWrap: true, sx: { fontSize: '0.875rem', fontWeight: active ? 600 : 500 } } }}
                      />
                    )}
                  </ListItemButton>
                );
                return (
                  <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
                    {rail ? (
                      <Tooltip title={item.label} placement="right">
                        {button}
                      </Tooltip>
                    ) : (
                      button
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {!rail && (
        <Box sx={{ flexShrink: 0, px: 2.5, py: 2, borderTop: `1px solid ${onSurface(0.08)}` }}>
          <AdalexLogo variant="dark" height={24} />
        </Box>
      )}
    </Box>
  );

  const paperSx = {
    width,
    boxSizing: 'border-box',
    bgcolor: brand.navyDeep,
    color: onSurface(0.7),
    backgroundImage: 'none',
    borderRight: `1px solid ${onSurface(0.06)}`,
    overflowX: 'hidden',
    transition: theme.transitions.create('width', { duration: motion.base }),
  } as const;

  if (!desktop) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: false }}
        sx={{ '& .MuiDrawer-paper': { ...paperSx, width: layout.sidebarWidth } }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      open
      sx={{
        width,
        flexShrink: 0,
        transition: theme.transitions.create('width', { duration: motion.base }),
        '& .MuiDrawer-paper': paperSx,
      }}
    >
      {content}
    </Drawer>
  );
};

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

export default Sidebar;
