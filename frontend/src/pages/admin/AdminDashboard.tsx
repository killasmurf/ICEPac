/**
 * AdminDashboard - admin overview: headline counts, recent activity and links to each admin page.
 * Data: GET /dashboard/stats (`admin` block and `recent_activity`).
 */
import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import HistoryIcon from '@mui/icons-material/History';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import TuneIcon from '@mui/icons-material/Tune';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { getDashboardStats } from '../../api/dashboard';
import CardSkeleton from '../../components/common/CardSkeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import { formatDateTime, formatNumber } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';
import { formatActionLabel } from './auditFormat';

const quickLinks: { label: string; description: string; path: string; icon: React.ReactElement; adminOnly?: boolean }[] = [
  { label: 'Users', description: 'Accounts, roles and passwords', path: '/admin/users', icon: <PeopleOutlineIcon /> },
  { label: 'Resources', description: 'Resource library and rates', path: '/admin/resources', icon: <Inventory2OutlinedIcon /> },
  { label: 'Suppliers', description: 'Supplier contacts', path: '/admin/suppliers', icon: <BusinessOutlinedIcon /> },
  { label: 'Config Tables', description: 'Lookup values for forms', path: '/admin/config', icon: <TuneIcon /> },
  { label: 'Audit Logs', description: 'Who changed what, and when', path: '/admin/audit-logs', icon: <HistoryIcon />, adminOnly: true },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const query = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: getDashboardStats });
  const admin = query.data?.admin;
  const activity = query.data?.recent_activity ?? [];
  const loading = query.isPending;

  const stats = [
    { label: 'Users', value: admin?.users, icon: <PeopleOutlineIcon />, path: '/admin/users' },
    { label: 'Active users', value: admin?.active_users, icon: <HowToRegOutlinedIcon />, path: '/admin/users' },
    { label: 'Resources', value: admin?.resources, icon: <Inventory2OutlinedIcon />, path: '/admin/resources', hint: 'Active only' },
    { label: 'Suppliers', value: admin?.suppliers, icon: <BusinessOutlinedIcon />, path: '/admin/suppliers', hint: 'Active only' },
  ];

  return (
    <Box>
      <PageHeader title="Administration" subtitle="Overview of users, libraries and recent changes." />

      {query.isError ? (
        <Card>
          <ErrorState
            title="Could not load the overview"
            description="Something went wrong while loading. Check your connection and try again."
            action={
              <Button variant="outlined" onClick={() => void query.refetch()}>
                Retry
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Box
            sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2, mb: 3 }}
          >
            {stats.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={formatNumber(s.value)}
                icon={s.icon}
                hint={s.hint}
                loading={loading}
                onClick={() => navigate(s.path)}
              />
            ))}
          </Box>

          <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>
            Recent activity
          </Typography>
          {loading ? (
            <CardSkeleton lines={4} />
          ) : activity.length === 0 ? (
            <EmptyState
              icon={<HistoryIcon />}
              title="No recent activity"
              description="Changes made in the admin area will appear here."
            />
          ) : (
            <Card>
              <List disablePadding>
                {activity.map((a, i) => (
                  <ListItem
                    key={a.id}
                    divider={i < activity.length - 1}
                    secondaryAction={
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        {formatDateTime(a.created_at)}
                      </Typography>
                    }
                  >
                    <ListItemText
                      disableTypography
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                          <Chip size="small" variant="outlined" label={formatActionLabel(a.action)} />
                          <Typography variant="body2">
                            {a.entity_type}
                            {a.entity_id != null ? ` #${a.entity_id}` : ''}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          by {a.username || 'System'}
                          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                            {' · '}
                            {formatDateTime(a.created_at)}
                          </Box>
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Card>
          )}

          <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 1.5 }}>
            Manage
          </Typography>
          <Box
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}
          >
            {quickLinks.filter((l) => !l.adminOnly || role === 'admin').map((l) => (
              <Card key={l.path}>
                <CardActionArea component={RouterLink} to={l.path}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box aria-hidden sx={{ color: 'text.secondary', display: 'flex' }}>
                      {l.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1">{l.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {l.description}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
