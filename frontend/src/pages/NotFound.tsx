/**
 * NotFound - 404 page for unmatched routes.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import ErrorState from '../components/common/ErrorState';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ErrorState
      icon={<SearchOffIcon />}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      action={
        <Button variant="contained" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      }
    />
  );
};

export default NotFound;
