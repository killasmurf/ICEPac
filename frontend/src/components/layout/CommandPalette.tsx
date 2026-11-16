import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Dialog,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Typography,
  type PaperProps,
  type PopperProps,
} from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import { useAuth } from '../../auth/AuthContext';
import { getVisibleSections } from './navConfig';
import { useProjectOptions } from './useLookups';

interface PaletteOption {
  id: string;
  label: string;
  group: 'Go to' | 'Projects' | 'Actions';
  secondary?: string;
  icon: React.ReactElement;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** Renders the listbox inline under the input instead of in a floating popper. */
const InlinePopper = ({ children }: PopperProps) => (
  <Box sx={{ borderTop: 1, borderColor: 'divider' }}>{typeof children === 'function' ? null : children}</Box>
);
const FlatPaper: React.FC<PaperProps> = (props) => <Paper {...props} elevation={0} sx={{ bgcolor: 'transparent', borderRadius: 0 }} />;

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const { colorScheme, setMode } = useColorScheme();
  const { projects, loading } = useProjectOptions(open);

  const options = useMemo<PaletteOption[]>(() => {
    const go = (path: string) => () => navigate(path);
    const destinations = getVisibleSections(role).flatMap((section) =>
      section.items.map<PaletteOption>((item) => ({
        id: `nav:${item.path}`,
        label: item.label,
        secondary: section.id === 'admin' ? 'Administration' : undefined,
        group: 'Go to',
        icon: item.icon,
        run: go(item.path),
      })),
    );
    const projectOptions = projects.map<PaletteOption>((p) => ({
      id: `project:${p.id}`,
      label: p.project_name,
      secondary: p.project_manager ?? undefined,
      group: 'Projects',
      icon: <FolderOutlinedIcon />,
      run: go(`/projects/${p.id}`),
    }));
    const actions: PaletteOption[] = [
      // The projects screen owns the create dialog; Phase 4 can open it directly from here.
      { id: 'action:new-project', label: 'New project', group: 'Actions', icon: <AddIcon />, run: go('/projects') },
      {
        id: 'action:toggle-mode',
        label: 'Toggle colour mode',
        group: 'Actions',
        icon: <Brightness4Icon />,
        run: () => setMode(colorScheme === 'dark' ? 'light' : 'dark'),
      },
      { id: 'action:sign-out', label: 'Sign out', group: 'Actions', icon: <LogoutIcon />, run: logout },
    ];
    return [...destinations, ...projectOptions, ...actions];
  }, [role, projects, navigate, logout, setMode, colorScheme]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-label="Command palette"
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
      slotProps={{ paper: { sx: { mt: { xs: 2, sm: 12 }, mx: 2, width: '100%' } } }}
    >
      <Autocomplete<PaletteOption>
        open
        value={null}
        options={options}
        groupBy={(o) => o.group}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        autoHighlight
        loading={loading}
        loadingText="Loading projects…"
        noOptionsText="No matches"
        forcePopupIcon={false}
        onClose={(_e, reason) => {
          if (reason === 'escape') onClose();
        }}
        onChange={(_e, option) => {
          if (!option) return;
          onClose();
          option.run();
        }}
        slots={{ popper: InlinePopper, paper: FlatPaper }}
        slotProps={{ listbox: { sx: { maxHeight: 360 } } }}
        renderInput={(params) => (
          <TextField
            {...params}
            autoFocus
            placeholder="Search pages, projects and actions"
            slotProps={{
              htmlInput: { ...params.inputProps, 'aria-label': 'Search pages, projects and actions' },
              input: {
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                sx: { py: 0.75, '& fieldset': { border: 0 } },
              },
            }}
          />
        )}
        renderGroup={(params) => (
          <li key={params.key}>
            <Typography
              variant="overline"
              component="div"
              sx={{ px: 2, pt: 1.5, pb: 0.5, color: 'text.secondary', lineHeight: 1.8 }}
            >
              {params.group}
            </Typography>
            <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
              {params.children}
            </Box>
          </li>
        )}
        renderOption={(props, option) => {
          const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
          return (
            <Box component="li" key={key} {...rest} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1 }}>
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>{option.icon}</ListItemIcon>
              <ListItemText primary={option.label} secondary={option.secondary} />
            </Box>
          );
        }}
      />
    </Dialog>
  );
};

export default CommandPalette;
