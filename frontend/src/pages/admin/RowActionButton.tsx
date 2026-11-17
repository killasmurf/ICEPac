import React from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

export interface RowActionButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: 'default' | 'error';
  /** When set the button is disabled and the tooltip explains why. */
  disabledReason?: string;
}

/** Icon-only table action with an accessible name and a tooltip (also on a disabled button). */
export function RowActionButton({ label, icon, onClick, color = 'default', disabledReason }: RowActionButtonProps) {
  const disabled = Boolean(disabledReason);
  return (
    <Tooltip title={disabledReason ?? label}>
      <span>
        <IconButton size="small" aria-label={label} color={color} disabled={disabled} onClick={onClick}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default RowActionButton;
