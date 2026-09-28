import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import ReportsList from '../components/reports/ReportsList';

const Reports: React.FC = () => {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(projectIdParam);

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/projects/${projectId}`)}
        sx={{ mb: 2 }}
      >
        Back to Project
      </Button>
      <Typography variant="h5" sx={{ mb: 3 }}>Reports</Typography>
      <ReportsList projectId={projectId} />
    </Box>
  );
};

export default Reports;
