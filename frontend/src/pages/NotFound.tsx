/**
 * NotFound - 404 page for unmatched routes.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography variant="h1" sx={{ fontSize: 96, fontWeight: 700, color: 'text.disabled' }}>404</Typography>
      <Typography variant="h5" sx={{ mb: 2, color: 'text.secondary' }}>Page not found</Typography>
      <Typography variant="body1" sx={{ mb: 4, color: 'text.disabled' }}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')}>Back to Dashboard</Button>
    </Box>
  );
};

export default NotFound;
