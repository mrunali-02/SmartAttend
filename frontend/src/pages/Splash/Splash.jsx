import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, Typography, CircularProgress, Fade } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const Splash = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) => 
          theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' 
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      <Fade in={true} timeout={1000}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Box
            sx={{
              p: 2,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              mb: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              animation: 'pulse 2s infinite ease-in-out',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(30, 58, 138, 0.4)' },
                '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 15px rgba(30, 58, 138, 0)' },
                '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(30, 58, 138, 0)' },
              }
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 48 }} />
          </Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              mb: 1,
              background: (theme) => 
                theme.palette.mode === 'light'
                  ? 'linear-gradient(45deg, #1e3a8a, #3b82f6)'
                  : 'linear-gradient(45deg, #6366f1, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: 'center',
            }}
          >
            AI Attendance Assistant
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Your Smart Classroom Companion
          </Typography>
          <CircularProgress size={36} color="primary" />
        </Box>
      </Fade>
    </Box>
  );
};

export default Splash;
