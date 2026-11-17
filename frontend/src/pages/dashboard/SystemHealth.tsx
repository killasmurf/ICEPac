import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { HealthStatus } from '../../api/dashboard';
import { healthRows, type HealthTone } from './dashboardUtils';
import Panel from './Panel';

export interface SystemHealthProps {
  health?: HealthStatus;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}

const dotColor = (tone: HealthTone) => (tone === 'neutral' ? 'text.disabled' : `${tone}.main`);

export function SystemHealth({ health, loading, failed, onRetry }: SystemHealthProps) {
  let badge: React.ReactNode = null;
  let body: React.ReactNode;

  if (loading) {
    body = (
      <Box role="status" aria-busy="true" aria-label="Loading system health">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} animation="wave" variant="text" height={32} />
        ))}
      </Box>
    );
  } else if (failed || !health) {
    badge = <Chip size="small" variant="outlined" label="Unavailable" />;
    body = (
      <Box data-testid="health-unavailable" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
        <Typography variant="subtitle2" component="p">
          Health unavailable
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The health check could not be reached, so ICEPac cannot say whether its services are running. It is retried every minute.
        </Typography>
        <Button size="small" variant="outlined" onClick={onRetry}>
          Check again
        </Button>
      </Box>
    );
  } else {
    const rows = healthRows(health);
    const overallOk = health.overall === 'healthy';
    badge = <Chip size="small" color={overallOk ? 'success' : 'warning'} variant="outlined" label={overallOk ? 'All systems healthy' : 'Degraded'} />;
    body = (
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {rows.map((r) => (
          <Box
            component="li"
            key={r.key}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0, pt: 0 } }}
          >
            <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: dotColor(r.tone) }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {r.label}
              </Typography>
              {r.detail && (
                <Typography variant="caption" color="text.secondary" component="p" sx={{ overflowWrap: 'anywhere' }}>
                  {r.detail}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" sx={{ color: r.tone === 'neutral' ? 'text.secondary' : 'text.primary' }}>
              {r.statusLabel}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Panel title="System health" subtitle="Live service checks" action={badge}>
      {body}
    </Panel>
  );
}

export default SystemHealth;
