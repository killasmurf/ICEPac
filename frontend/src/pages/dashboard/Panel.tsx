import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export interface PanelProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Right of the title, e.g. a badge. */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** A titled dashboard card. `minWidth: 0` lets charts shrink with the grid cell instead of overflowing it. */
export function Panel({ title, subtitle, action, children }: PanelProps) {
  const id = React.useId();
  return (
    <Card component="section" aria-labelledby={id} sx={{ height: '100%', minWidth: 0 }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography id={id} variant="h6" component="h2">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

export default Panel;
