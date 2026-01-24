import React, { useState, useEffect } from 'react';
import { Typography, Grid, Paper, Box, CircularProgress } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import HelpIcon from '@mui/icons-material/Help';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../api/projects';
import { getTopics } from '../api/help';

interface StatCardProps {
  title: string;
  value: number | null;
  icon: React.ReactNode;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, onClick }) => (
  <Paper
    sx={{ p: 3, cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { bgcolor: 'action.hover' } : {} }}
    onClick={onClick}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        {value === null ? (
          <CircularProgress size={24} sx={{ mt: 1 }} />
        ) : (
          <Typography variant="h3">{value}</Typography>
        )}
      </Box>
      <Box sx={{ color: 'text.secondary' }}>{icon}</Box>
    </Box>
  </Paper>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [helpTopicCount, setHelpTopicCount] = useState<number | null>(null);

  useEffect(() => {
    getProjects(0, 1)
      .then((data) => setProjectCount(data.total))
      .catch(() => setProjectCount(0));

    getTopics(0, 1)
      .then((data) => setHelpTopicCount(data.total))
      .catch(() => setHelpTopicCount(0));
  }, []);

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Active Projects"
            value={projectCount}
            icon={<FolderIcon fontSize="large" />}
            onClick={() => navigate('/projects')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Help Topics"
            value={helpTopicCount}
            icon={<HelpIcon fontSize="large" />}
            onClick={() => navigate('/help')}
          />
        </Grid>
      </Grid>
    </>
  );
};

export default Dashboard;
