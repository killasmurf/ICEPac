import React from 'react';
import { Typography, Grid, Paper } from '@mui/material';

const Dashboard: React.FC = () => {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Projects</Typography>
            <Typography variant="h3">0</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Active Estimates</Typography>
            <Typography variant="h3">0</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Pending Approvals</Typography>
            <Typography variant="h3">0</Typography>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};

export default Dashboard;
