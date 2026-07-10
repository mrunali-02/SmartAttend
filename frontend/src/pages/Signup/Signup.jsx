import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const Signup = () => {
  const navigate = useNavigate();
  const { register: registerApi } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirm_password: '',
      college_name: '',
      department: '',
      semester: '',
      division: '',
      roll_number: '',
      batch: '',
    }
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    setApiError('');
    setSuccessMsg('');
    setLoading(true);
    const result = await registerApi(data);
    if (result.success) {
      setSuccessMsg("Registration successful! Redirecting to login page...");
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      if (typeof result.error === 'object') {
        const errorMsg = Object.entries(result.error)
          .map(([key, val]) => `${key.replace('_', ' ')}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setApiError(errorMsg);
      } else {
        setApiError(result.error);
      }
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
        py: 4,
        px: 2,
        background: (theme) => 
          theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' 
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      <Card sx={{ maxWidth: 700, width: '100%', py: 1 }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box
              sx={{
                p: 1.2,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                mb: 1.5,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h5" component="h2" fontWeight="bold">
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set up your profile to start tracking attendance
            </Typography>
          </Box>

          {apiError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {apiError}
            </Alert>
          )}
          {successMsg && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {successMsg}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  {...register('full_name', { required: 'Full name is required' })}
                  error={!!errors.full_name}
                  helperText={errors.full_name?.message}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
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
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
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
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          disabled={loading}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  {...register('confirm_password', {
                    required: 'Confirm password is required',
                    validate: (value) =>
                      value === password || 'Passwords do not match',
                  })}
                  error={!!errors.confirm_password}
                  helperText={errors.confirm_password?.message}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="College Name"
                  {...register('college_name', { required: 'College name is required' })}
                  error={!!errors.college_name}
                  helperText={errors.college_name?.message}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  {...register('department', { required: 'Department is required' })}
                  error={!!errors.department}
                  helperText={errors.department?.message}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Semester"
                  {...register('semester', { required: 'Required' })}
                  error={!!errors.semester}
                  helperText={errors.semester?.message}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Division"
                  {...register('division', { required: 'Required' })}
                  error={!!errors.division}
                  helperText={errors.division?.message}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Roll Number"
                  {...register('roll_number', { required: 'Required' })}
                  error={!!errors.roll_number}
                  helperText={errors.roll_number?.message}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Batch"
                  placeholder="e.g., 2024"
                  {...register('batch', { required: 'Required' })}
                  error={!!errors.batch}
                  helperText={errors.batch?.message}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sx={{ mt: 1 }}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
                </Button>
              </Grid>
            </Grid>
          </form>

          <Box display="flex" justifyContent="center" mt={3}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                component={RouterLink}
                to="/login"
                fontWeight="bold"
                sx={{ textDecoration: 'none' }}
              >
                Log In
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Signup;
