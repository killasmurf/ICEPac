import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddCircleOutline from '@mui/icons-material/AddCircleOutline';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import type { RecentActivity as Activity } from '../../api/dashboard';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDateTime } from '../../utils/format';
import { activityTarget, describeAction, relativeTime } from './dashboardUtils';
import Panel from './Panel';

const ICONS = {
  create: AddCircleOutline,
  update: EditOutlined,
  delete: DeleteOutline,
  other: HistoryOutlined,
} as const;

export function RecentActivity({ items, children }: { items?: Activity[]; children?: React.ReactNode }) {
  return (
    <Panel title="Recent activity" subtitle="Latest changes across ICEPac">
      {children ??
        (items && items.length > 0 ? (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column' }}>
            {items.map((a) => {
              const { verb, icon } = describeAction(a.action);
              const Icon = ICONS[icon];
              return (
                <Box
                  component="li"
                  key={a.id}
                  sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.25, borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0, pt: 0 } }}
                >
                  <Box aria-hidden sx={{ display: 'flex', color: 'text.secondary', mt: '2px' }}>
                    <Icon fontSize="small" />
                  </Box>
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                    <strong>{a.username || 'System'}</strong> {verb} {activityTarget(a)}
                  </Typography>
                  <Tooltip title={formatDateTime(a.created_at)} describeChild>
                    <Typography
                      component="time"
                      dateTime={a.created_at ?? undefined}
                      variant="caption"
                      color="text.secondary"
                      tabIndex={0}
                      sx={{ flexShrink: 0, mt: '2px', borderRadius: 0.5, '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main', outlineOffset: 2 } }}
                    >
                      {relativeTime(a.created_at)}
                    </Typography>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
        ) : (
          <EmptyState icon={<HistoryOutlined />} title="No activity yet" description="Changes made in ICEPac will appear here." />
        ))}
    </Panel>
  );
}

export default RecentActivity;
