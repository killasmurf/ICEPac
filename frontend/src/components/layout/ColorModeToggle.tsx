import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';

type Mode = 'light' | 'dark' | 'system';
const NEXT: Record<Mode, Mode> = { light: 'dark', dark: 'system', system: 'light' };
const LABEL: Record<Mode, string> = { light: 'Light', dark: 'Dark', system: 'System' };

/** Cycles light, dark, system. */
const ColorModeToggle: React.FC = () => {
  const { mode, setMode } = useColorScheme();
  const current: Mode = mode ?? 'system';
  const Icon = current === 'light' ? LightModeIcon : current === 'dark' ? DarkModeIcon : SettingsBrightnessIcon;

  return (
    <Tooltip title={`Colour mode: ${LABEL[current]}`}>
      <IconButton color="inherit" aria-label="Switch colour mode" onClick={() => setMode(NEXT[current])}>
        <Icon />
      </IconButton>
    </Tooltip>
  );
};

export default ColorModeToggle;
