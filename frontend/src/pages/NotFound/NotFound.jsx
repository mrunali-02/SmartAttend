import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, Typography, Button, Container } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGoBack = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 2,
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 100, color: 'error.main' }} />
        <Typography variant="h3" fontWeight="bold">
          404 - Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 2 }}>
          Oops! The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </Typography>
        <Button variant="contained" size="large" onClick={handleGoBack}>
          {isAuthenticated ? 'Back to Dashboard' : 'Back to Login'}
        </Button>
      </Box>
    </Container>
  );
};

export default NotFound;
