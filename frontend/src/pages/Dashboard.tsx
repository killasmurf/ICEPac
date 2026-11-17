import React from 'react';
import { Typography, Grid, Paper, Box, Chip } from '@mui/material';
import PageHeader from '../components/common/PageHeader';
import { useQuery } from '@tanstack/react-query';
import FolderIcon from '@mui/icons-material/Folder';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HelpIcon from '@mui/icons-material/Help';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../api/projects';
import { getTopics } from '../api/help';
import StatCard from '../components/common/StatCard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const projects = useQuery({
    queryKey: ['dashboard', 'counts', 'projects'],
    queryFn: async () => (await getProjects(0, 1)).total,
  });
  const topics = useQuery({
    queryKey: ['dashboard', 'counts', 'help'],
    queryFn: async () => (await getTopics(0, 1)).total,
  });

  const systemStatus = [
    { label: 'Authentication', status: 'operational' },
    { label: 'Admin Circuit', status: 'operational' },
    { label: 'Help Circuit', status: 'operational' },
    { label: 'Project Import', status: 'operational' },
    { label: 'Estimation Engine', status: 'operational' },
    { label: 'Report Engine', status: 'operational' },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your projects, reports and help at a glance." />
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard label="Active Projects" value={projects.data ?? 0} loading={projects.isLoading}
            icon={<FolderIcon />} onClick={() => navigate('/projects')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard label="Reports Available" value={16}
            icon={<AssessmentIcon />} onClick={() => navigate('/reports')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard label="Help Topics" value={topics.data ?? 0} loading={topics.isLoading}
            icon={<HelpIcon />} onClick={() => navigate('/help')} />
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>System Status</Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {systemStatus.map(({ label, status }) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                <Typography variant="body2">{label}</Typography>
                <Chip label={status} size="small" color="success" variant="outlined" sx={{ ml: 'auto' }} />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </>
  );
};

export default Dashboard;
