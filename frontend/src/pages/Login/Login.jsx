import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Paper
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const Login = () => {
  const navigate = useNavigate();
  const { openSignIn } = useClerk();
  const { isSignedIn } = useUser();
  
  // If Clerk publishable key env variable is missing, we operate in dev fallback mode
  const isMockMode = !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  const handleDevMockLogin = () => {
    localStorage.setItem('mockAccessToken', 'mock-developer-jwt');
    navigate('/dashboard');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background: (theme) => 
          theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' 
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%', py: 4, px: 2, borderRadius: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                mb: 2.5,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" align="center">
              AI Attendance Assistant
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 1 }}>
              Sign in with your Google account
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {isMockMode ? (
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<GoogleIcon />}
                onClick={handleDevMockLogin}
                sx={{
                  py: 1.8,
                  fontWeight: 'bold',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                Continue with Google (Dev Mock Mode)
              </Button>
            ) : (
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<GoogleIcon />}
                onClick={() => {
                  if (isSignedIn) {
                    navigate('/dashboard');
                  } else {
                    openSignIn({ forceRedirectUrl: '/dashboard' });
                  }
                }}
                sx={{
                  py: 1.8,
                  fontWeight: 'bold',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
                }}
              >
                Continue with Google
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Typography variant="caption" color="text.secondary" align="center">
              Secured & Managed by Clerk
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
