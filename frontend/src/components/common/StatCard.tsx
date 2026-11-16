import React from 'react';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { motion } from '../../theme/tokens';

export interface StatCardTrend {
  /** Signed change, e.g. 4.2 for +4.2%. Positive is shown as up, negative as down. */
  value: number;
  /** Text after the figure, e.g. "vs last month". */
  label?: string;
}

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactElement;
  hint?: React.ReactNode;
  trend?: StatCardTrend;
  /** When set the whole card is a button: lifts on hover and shows a focus ring. */
  onClick?: () => void;
  loading?: boolean;
}

export function StatCard({ label, value, icon, hint, trend, onClick, loading }: StatCardProps) {
  const body = (
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        {icon && (
          <Box aria-hidden sx={{ color: 'text.secondary', display: 'flex' }}>
            {icon}
          </Box>
        )}
      </Box>
      {loading ? (
        <Skeleton animation="wave" variant="text" width="60%" height={40} />
      ) : (
        <Typography variant="h4" component="div" sx={{ fontVariantNumeric: 'tabular-nums', mt: 0.5 }}>
          {value}
        </Typography>
      )}
      {!loading && (trend || hint) && (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
          {trend && (
            <Typography
              variant="caption"
              data-testid="stat-trend"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                fontWeight: 600,
                color: trend.value > 0 ? 'success.main' : trend.value < 0 ? 'error.main' : 'text.secondary',
              }}
            >
              {trend.value > 0 && <ArrowUpward aria-label="Up" sx={{ fontSize: 14 }} />}
              {trend.value < 0 && <ArrowDownward aria-label="Down" sx={{ fontSize: 14 }} />}
              {Math.abs(trend.value)}%{trend.label ? ` ${trend.label}` : ''}
            </Typography>
          )}
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </Box>
      )}
    </CardContent>
  );

  return (
    <Card
      sx={
        onClick
          ? {
              transition: `transform ${motion.base}ms ${motion.easing}`,
              '&:hover': { transform: 'translateY(-2px)' },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
            }
          : undefined
      }
    >
      {onClick ? (
        <CardActionArea
          onClick={onClick}
          sx={{ '&.Mui-focusVisible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main', outlineOffset: 2 } }}
        >
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}

export default StatCard;
