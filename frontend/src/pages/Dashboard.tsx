import React, { useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import PaidOutlined from '@mui/icons-material/PaidOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import { getDashboardStats, getHealth, getPortfolio } from '../api/dashboard';
import { useAuth } from '../auth/AuthContext';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { CardSkeleton } from '../components/common/CardSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import PageHeader from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';
import { ApprovalStatus } from './dashboard/ApprovalStatus';
import { EstimateByProject } from './dashboard/EstimateByProject';
import Panel from './dashboard/Panel';
import { RecentActivity } from './dashboard/RecentActivity';
import { SystemHealth } from './dashboard/SystemHealth';
import { firstName, greetingFor } from './dashboard/dashboardUtils';

const PORTFOLIO_LIMIT = 20;
const compactCurrency = (v: number) => formatCurrency(v, { compact: true });

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const canCreate = role === 'admin' || role === 'manager';

  const stats = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: getDashboardStats });
  const portfolio = useQuery({ queryKey: ['dashboard', 'portfolio', PORTFOLIO_LIMIT], queryFn: () => getPortfolio(PORTFOLIO_LIMIT) });
  const health = useQuery({
    queryKey: ['dashboard', 'health'],
    queryFn: getHealth,
    meta: { silent: true },
    refetchInterval: 60_000,
    retry: false,
  });

  const now = useMemo(() => new Date(), []);
  const name = firstName(user?.full_name, user?.username);
  const greeting = `${greetingFor(now)}${name ? `, ${name}` : ''}`;

  const statsRetry = (
    <Button variant="outlined" onClick={() => void stats.refetch()}>
      Retry
    </Button>
  );
  const portfolioRetry = (
    <Button variant="outlined" onClick={() => void portfolio.refetch()}>
      Retry
    </Button>
  );
  const newProject = (
    <Button component={RouterLink} to="/projects?new=1" color="secondary" variant="contained" startIcon={<AddIcon />}>
      New project
    </Button>
  );

  const s = stats.data;
  let statCards: React.ReactNode;
  if (stats.isError) {
    statCards = (
      <Grid size={12}>
        <Card data-testid="stats-error">
          <ErrorState
            compact
            headingLevel="h2"
            title="Could not load the headline figures"
            description="Something went wrong while loading. Check your connection and try again."
            action={statsRetry}
          />
        </Card>
      </Grid>
    );
  } else {
    const cards: Array<{ label: string; value: React.ReactNode; icon: React.ReactElement; hint?: string; to?: string }> = [
      {
        label: 'Active projects',
        value: s ? formatNumber(s.projects.active) : null,
        hint: s ? `of ${formatNumber(s.projects.total)} projects` : undefined,
        icon: <FolderOpenOutlined />,
        to: '/projects',
      },
      {
        label: 'Total estimate',
        value: s ? <AnimatedNumber value={s.estimation.total_pert} format={compactCurrency} /> : null,
        hint: s ? `across ${formatNumber(s.estimation.assignments)} assignments` : undefined,
        icon: <PaidOutlined />,
        to: '/reports',
      },
      {
        label: 'WBS awaiting approval',
        value: s ? formatNumber(s.wbs.pending) : null,
        hint: s ? `of ${formatNumber(s.wbs.total)} WBS items` : undefined,
        icon: <AssignmentTurnedInOutlined />,
      },
      {
        // The stats endpoint counts every risk, not only open ones, so the label says "Risks".
        label: 'Risks',
        value: s ? formatNumber(s.estimation.risks) : null,
        hint: s ? `across ${formatNumber(s.projects.total)} projects` : undefined,
        icon: <WarningAmberOutlined />,
      },
    ];
    statCards = cards.map((c) => (
      <Grid key={c.label} size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          label={c.label}
          value={c.value}
          hint={c.hint}
          icon={c.icon}
          loading={stats.isLoading}
          onClick={c.to ? () => navigate(c.to as string) : undefined}
        />
      </Grid>
    ));
  }

  const projects = portfolio.data?.projects ?? [];
  let charts: React.ReactNode;
  if (portfolio.isLoading) {
    charts = (
      <>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card aria-busy="true" aria-label="Loading estimate by project" sx={{ p: 2, height: '100%' }}>
            <Skeleton animation="wave" variant="text" width="40%" height={28} />
            <Skeleton animation="wave" variant="rounded" height={320} sx={{ mt: 2 }} />
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card aria-busy="true" aria-label="Loading approval status" sx={{ p: 2, height: '100%' }}>
            <Skeleton animation="wave" variant="text" width="50%" height={28} />
            <Skeleton animation="wave" variant="circular" width={190} height={190} sx={{ mx: 'auto', mt: 2 }} />
          </Card>
        </Grid>
      </>
    );
  } else if (portfolio.isError || !portfolio.data) {
    charts = (
      <Grid size={12}>
        <Card data-testid="portfolio-error">
          <ErrorState
            compact
            headingLevel="h2"
            title="Could not load the portfolio charts"
            description="Something went wrong while loading. Check your connection and try again."
            action={portfolioRetry}
          />
        </Card>
      </Grid>
    );
  } else if (projects.length === 0) {
    charts = (
      <Grid size={12}>
        <EmptyState
          icon={<FolderOpenOutlined />}
          title="No projects yet"
          description="Create a project or import a schedule, and the portfolio charts will appear here."
          action={canCreate ? newProject : undefined}
        />
      </Grid>
    );
  } else {
    charts = (
      <>
        <Grid size={{ xs: 12, md: 8 }}>
          <EstimateByProject projects={projects} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ApprovalStatus totals={portfolio.data.approval_totals} />
        </Grid>
      </>
    );
  }

  let activity: React.ReactNode;
  if (stats.isLoading) {
    activity = <CardSkeleton lines={4} />;
  } else if (stats.isError) {
    activity = (
      <Panel title="Recent activity">
        <ErrorState compact headingLevel="h3" title="Could not load activity" action={statsRetry} />
      </Panel>
    );
  } else {
    activity = <RecentActivity items={s?.recent_activity ?? []} />;
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          <>
            <Typography variant="h6" component="p" color="text.primary">
              {greeting}
            </Typography>
            <Box component="span">{formatDate(now.toISOString())}</Box>
          </>
        }
        actions={canCreate ? newProject : undefined}
      />
      <Grid container spacing={3}>
        {statCards}
        {charts}
        <Grid size={{ xs: 12, md: 7 }}>{activity}</Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <SystemHealth health={health.data} loading={health.isLoading} failed={health.isError} onRetry={() => void health.refetch()} />
        </Grid>
      </Grid>
    </>
  );
};

export default Dashboard;
