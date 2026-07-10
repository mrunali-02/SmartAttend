import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const onSubmit = async (data) => {
    setApiError('');
    setLoading(true);
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setApiError(result.error);
      setLoading(false);
    }
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
      <Card sx={{ maxWidth: 450, width: '100%', py: 2, px: 1 }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                mb: 1.5,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Login to access your AI attendance assistant
            </Typography>
          </Box>

          {apiError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {apiError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                fullWidth
                label="Email Address"
                variant="outlined"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register('password', {
                  required: 'Password is required',
                })}
                error={!!errors.password}
                helperText={errors.password?.message}
                disabled={loading}
              />

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <FormControlLabel
                  control={<Checkbox color="primary" size="small" />}
                  label={<Typography variant="body2">Remember me</Typography>}
                  disabled={loading}
                />
                <Link
                  component={RouterLink}
                  to="#"
                  variant="body2"
                  fontWeight="bold"
                  sx={{ textDecoration: 'none' }}
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Forgot Password interface only (Phase 1)");
                  }}
                >
                  Forgot Password?
                </Link>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.5, position: 'relative' }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
              </Button>
            </Box>
          </form>

          <Box my={3}>
            <Divider>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>
          </Box>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            sx={{ py: 1.2, mb: 3 }}
            onClick={() => alert("Continue with Google interface only (Phase 1)")}
            disabled={loading}
          >
            Continue with Google
          </Button>

          <Box display="flex" justifyContent="center">
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                component={RouterLink}
                to="/signup"
                fontWeight="bold"
                sx={{ textDecoration: 'none' }}
              >
                Sign Up
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
