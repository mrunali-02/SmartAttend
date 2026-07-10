import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import { useForm } from 'react-hook-form';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
      college_name: user?.college_name || '',
      department: user?.department || '',
      semester: user?.semester || '',
      division: user?.division || '',
      roll_number: user?.roll_number || '',
      batch: user?.batch || '',
    }
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    Object.entries(data).forEach(([key, val]) => {
      formData.append(key, val);
    });

    if (selectedFile) {
      formData.append('profile_photo', selectedFile);
    }

    const result = await updateProfile(formData);
    setLoading(false);
    if (result.success) {
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
      setSelectedFile(null);
      setImagePreview(null);
    } else {
      if (typeof result.error === 'object') {
        const err = Object.entries(result.error)
          .map(([key, val]) => `${key.replace('_', ' ')}: ${val}`)
          .join(', ');
        setErrorMsg(err);
      } else {
        setErrorMsg(result.error);
      }
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedFile(null);
    setImagePreview(null);
    setIsEditing(false);
  };

  return (
    <AppLayout>
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
        {successMsg && <Alert severity="success" sx={{ mb: 3 }}>{successMsg}</Alert>}
        {errorMsg && <Alert severity="error" sx={{ mb: 3 }}>{errorMsg}</Alert>}

        <Grid container spacing={3}>
          {/* Left Column - Photo & Basic Info */}
          <Grid item xs={12} md={4}>
            <Card sx={{ textAlign: 'center', py: 4 }}>
              <CardContent>
                <Box position="relative" display="inline-block" sx={{ mb: 3 }}>
                  <Avatar
                    alt={user?.full_name}
                    src={imagePreview || user?.profile_photo || ''}
                    sx={{ width: 120, height: 120, mx: 'auto', border: '4px solid', borderColor: 'primary.light', bgcolor: 'primary.main', fontSize: '3rem' }}
                  >
                    {user?.full_name?.charAt(0)}
                  </Avatar>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <IconButton
                    onClick={triggerFileInput}
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 10,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': { bgcolor: 'primary.dark' },
                      width: 36,
                      height: 36,
                      border: '2px solid white'
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {user?.full_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {user?.email}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 3 }}>
                  Joined: {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
                </Typography>
                {!isEditing && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                    fullWidth
                  >
                    Edit Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Academic and Profile Details */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Profile Details
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <form onSubmit={handleSubmit(onSubmit)}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        {...register('full_name', { required: 'Full name is required' })}
                        error={!!errors.full_name}
                        helperText={errors.full_name?.message}
                        disabled={!isEditing || loading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="College Name"
                        {...register('college_name', { required: 'College name is required' })}
                        error={!!errors.college_name}
                        helperText={errors.college_name?.message}
                        disabled={!isEditing || loading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Department"
                        {...register('department', { required: 'Department is required' })}
                        error={!!errors.department}
                        helperText={errors.department?.message}
                        disabled={!isEditing || loading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Semester"
                        {...register('semester', { required: 'Required' })}
                        error={!!errors.semester}
                        helperText={errors.semester?.message}
                        disabled={!isEditing || loading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Division"
                        {...register('division', { required: 'Required' })}
                        error={!!errors.division}
                        helperText={errors.division?.message}
                        disabled={!isEditing || loading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Roll Number"
                        {...register('roll_number', { required: 'Required' })}
                        error={!!errors.roll_number}
                        helperText={errors.roll_number?.message}
                        disabled={!isEditing || loading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Batch"
                        {...register('batch', { required: 'Required' })}
                        error={!!errors.batch}
                        helperText={errors.batch?.message}
                        disabled={!isEditing || loading}
                      />
                    </Grid>

                    {isEditing && (
                      <Grid item xs={12} display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          color="inherit"
                          startIcon={<CancelIcon />}
                          onClick={handleCancel}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                          disabled={loading}
                        >
                          Save Changes
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
};

export default Profile;
