import React, { useState, useEffect } from 'react';
import { Typography, Grid, Paper, Box, CircularProgress, Chip } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import HelpIcon from '@mui/icons-material/Help';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../api/projects';
import { getTopics } from '../api/help';

interface StatCardProps {
  title: string;
  value: number | null;
  icon: React.ReactNode;
  color?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onClick }) => (
  <Paper
    sx={{ p: 3, cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { bgcolor: 'action.hover', transform: 'translateY(-2px)', transition: 'all 0.15s' } : {},
      transition: 'all 0.15s' }}
    onClick={onClick}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        {value === null ? (
          <CircularProgress size={24} sx={{ mt: 1 }} />
        ) : (
          <Typography variant="h3" sx={{ color: color || 'text.primary' }}>{value}</Typography>
        )}
      </Box>
      <Box sx={{ color: color || 'text.secondary' }}>{icon}</Box>
    </Box>
  </Paper>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [helpTopicCount, setHelpTopicCount] = useState<number | null>(null);

  useEffect(() => {
    getProjects(0, 1).then((data) => setProjectCount(data.total)).catch(() => setProjectCount(0));
    getTopics(0, 1).then((data) => setHelpTopicCount(data.total)).catch(() => setHelpTopicCount(0));
  }, []);

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
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Active Projects" value={projectCount} color="#3b82f6"
            icon={<FolderIcon fontSize="large" />} onClick={() => navigate('/projects')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Reports Available" value={16} color="#8b5cf6"
            icon={<AssessmentIcon fontSize="large" />} onClick={() => navigate('/reports')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Help Topics" value={helpTopicCount} color="#10b981"
            icon={<HelpIcon fontSize="large" />} onClick={() => navigate('/help')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Admin" value={null} color="#f59e0b"
            icon={<PeopleIcon fontSize="large" />} onClick={() => navigate('/admin')} />
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
