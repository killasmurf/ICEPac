import React from 'react';
import { Box, Typography } from '@mui/material';

export interface TotalsItem {
  label: string;
  value: string;
  emphasis?: boolean;
}

interface TotalsStripProps {
  label: string;
  ariaLabel: string;
  items: TotalsItem[];
}

/** Totals block, passed as the `footer` of a DataTable so it sits inside the table's outlined container. */
const TotalsStrip: React.FC<TotalsStripProps> = ({ label, ariaLabel, items }) => (
  <Box
    role="group"
    aria-label={ariaLabel}
    sx={{
      px: 2,
      py: 1.5,
      bgcolor: 'action.hover',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      columnGap: 3,
      rowGap: 0.5,
    }}
  >
    <Typography variant="subtitle2" sx={{ flexBasis: { xs: '100%', md: 'auto' }, mr: { md: 'auto' } }}>
      {label}
    </Typography>
    {items.map((item) => (
      <Box key={item.label} sx={{ display: 'flex', gap: 0.75, alignItems: 'baseline' }}>
        <Typography variant="caption" color="text.secondary">
          {item.label}
        </Typography>
        <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: item.emphasis ? 700 : 600 }}>
          {item.value}
        </Typography>
      </Box>
    ))}
  </Box>
);

export default TotalsStrip;
