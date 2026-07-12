import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClerk } from '@clerk/clerk-react';
import AppLayout from '../../components/layout/AppLayout';
import { useForm, Controller } from 'react-hook-form';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
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
  CircularProgress,
  Chip,
  Switch,
  FormControlLabel,
  MenuItem,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  User as UserIcon,
  Mail as MailIcon,
  Phone as PhoneIcon,
  BookOpen as BookIcon,
  GraduationCap as GradIcon,
  School as CollegeIcon,
  Bell as BellIcon,
  Camera as CameraIcon,
  Trash2 as TrashIcon,
  Award as StatsIcon,
  Calendar as CalendarIcon,
  Smile as GenderIcon,
  Percent as PercentIcon,
  UserCheck as StatusIcon,
  BookMarked as SubjectIcon,
  ListCollapse as TrackIcon,
  CheckCircle2 as PresentIcon,
  XCircle as AbsentIcon,
  Ban as CancelledIcon,
  ExternalLink as LinkIcon,
  AlertCircle as AlertIcon
} from 'lucide-react';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const clerk = useClerk();
  
  const [analytics, setAnalytics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isDirty }
  } = useForm({
    defaultValues: {
      full_name: '',
      mobile_number: '',
      student_id: '',
      prn_number: '',
      roll_number: '',
      date_of_birth: '',
      gender: '',
      college_name: '',
      department: '',
      degree: '',
      semester: '',
      division: '',
      batch: '',
      academic_year: '',
      current_year: '',
      student_status: '',
      university: '',
      course: '',
      class_teacher: '',
      teacher_guardian: '',
      parent_contact: '',
      lecture_reminder: true,
      low_attendance_alert: true,
      ai_daily_brief: true,
      weekly_report: true,
      reminder_time: '15 minutes'
    }
  });

  // Watch form values for snapshot and dynamic preview
  const watchedName = watch('full_name');
  const watchedCollege = watch('college_name');
  const watchedDept = watch('department');
  const watchedSem = watch('semester');
  const watchedDiv = watch('division');
  const watchedBatch = watch('batch');
  const watchedRoll = watch('roll_number');
  const watchedGoal = watch('attendance_goal') || '85%';
  const watchedReminder = watch('lecture_reminder');

  // Load user data and statistics
  useEffect(() => {
    if (user) {
      reset({
        full_name: user.full_name || '',
        mobile_number: user.mobile_number || '',
        student_id: user.student_id || '',
        prn_number: user.prn_number || '',
        roll_number: user.roll_number || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        college_name: user.college_name || '',
        department: user.department || '',
        degree: user.degree || '',
        semester: user.semester || '',
        division: user.division || '',
        batch: user.batch || '',
        academic_year: user.academic_year || '',
        current_year: user.current_year || '',
        student_status: user.student_status || '',
        university: user.university || '',
        course: user.course || '',
        class_teacher: user.class_teacher || '',
        teacher_guardian: user.teacher_guardian || '',
        parent_contact: user.parent_contact || '',
        lecture_reminder: localStorage.getItem('pref_lecture_reminder') !== 'false',
        low_attendance_alert: localStorage.getItem('pref_low_attendance_alert') !== 'false',
        ai_daily_brief: localStorage.getItem('pref_ai_daily_brief') !== 'false',
        weekly_report: localStorage.getItem('pref_weekly_report') !== 'false',
        reminder_time: localStorage.getItem('pref_reminder_time') || '15 minutes'
      });
    }
  }, [user, reset]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoadingStats(true);
        const res = await api.get('/analytics/dashboard/');
        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Compute profile completion score & missing fields
  const getCompletionDetails = () => {
    const fields = {
      full_name: { label: 'Full Name', value: watch('full_name') },
      mobile_number: { label: 'Mobile Number', value: watch('mobile_number') },
      student_id: { label: 'Student ID', value: watch('student_id') },
      prn_number: { label: 'PRN Number', value: watch('prn_number') },
      roll_number: { label: 'Roll Number', value: watch('roll_number') },
      date_of_birth: { label: 'Date of Birth', value: watch('date_of_birth') },
      gender: { label: 'Gender', value: watch('gender') },
      college_name: { label: 'College Name', value: watch('college_name') },
      department: { label: 'Department', value: watch('department') },
      degree: { label: 'Degree', value: watch('degree') },
      semester: { label: 'Semester', value: watch('semester') },
      division: { label: 'Division', value: watch('division') },
      batch: { label: 'Batch ID', value: watch('batch') },
      parent_contact: { label: 'Parent Contact', value: watch('parent_contact') },
      class_teacher: { label: 'Class Teacher', value: watch('class_teacher') }
    };

    const total = Object.keys(fields).length;
    const filled = Object.values(fields).filter(f => f.value && String(f.value).trim() !== '').length;
    const score = Math.round((filled / total) * 100);
    const missing = Object.values(fields)
      .filter(f => !f.value || String(f.value).trim() === '')
      .map(f => f.label);

    return { score, missing };
  };

  const { score: completionScore, missing: missingFields } = getCompletionDetails();

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

  const handleRemovePhoto = async () => {
    if (window.confirm('Are you sure you want to remove your profile photo?')) {
      setImagePreview(null);
      setSelectedFile(null);
      setSaving(true);
      try {
        await updateProfile({ remove_photo: 'true' });
        setToast({ open: true, message: 'Profile photo removed successfully.', severity: 'success' });
      } catch (err) {
        setToast({ open: true, message: 'Failed to remove photo.', severity: 'error' });
      } finally {
        setSaving(false);
      }
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Save notification preferences locally
      localStorage.setItem('pref_lecture_reminder', String(data.lecture_reminder));
      localStorage.setItem('pref_low_attendance_alert', String(data.low_attendance_alert));
      localStorage.setItem('pref_ai_daily_brief', String(data.ai_daily_brief));
      localStorage.setItem('pref_weekly_report', String(data.weekly_report));
      localStorage.setItem('pref_reminder_time', data.reminder_time);

      // Prepare form data for API
      const formData = new FormData();
      Object.entries(data).forEach(([key, val]) => {
        if (!key.startsWith('pref_') && key !== 'lecture_reminder' && key !== 'low_attendance_alert' && key !== 'ai_daily_brief' && key !== 'weekly_report' && key !== 'reminder_time') {
          formData.append(key, val || '');
        }
      });

      if (selectedFile) {
        formData.append('profile_photo', selectedFile);
      }

      const result = await updateProfile(formData);
      if (result.success) {
        setToast({ open: true, message: 'Academic profile updated successfully.', severity: 'success' });
        setSelectedFile(null);
        setImagePreview(null);
        reset(data); // reset form dirty state
      } else {
        throw new Error(typeof result.error === 'object' ? JSON.stringify(result.error) : result.error);
      }
    } catch (err) {
      setToast({ open: true, message: `Failed to save changes: ${err.message}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedFile(null);
    setImagePreview(null);
  };

  return (
    <AppLayout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', py: 3, px: { xs: 2, md: 3 }, pb: 16 }}>
        
        {/* Toast Messages */}
        <AnimatePresence>
          {toast.open && (
            <Alert
              severity={toast.severity}
              onClose={() => setToast({ ...toast, open: false })}
              sx={{ mb: 3, borderRadius: 3, boxShadow: 1 }}
              component={motion.div}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {toast.message}
            </Alert>
          )}
        </AnimatePresence>

        {/* 1. Profile Header Card */}
        <Card
          variant="outlined"
          sx={{
            borderRadius: 5,
            mb: 4,
            position: 'relative',
            overflow: 'visible',
            bgcolor: 'background.paper',
            borderColor: 'divider',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}
        >
          {/* Header Accent Band */}
          <Box
            sx={{
              height: 120,
              borderTopLeftRadius: '19px',
              borderTopRightRadius: '19px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              position: 'relative'
            }}
          />

          <CardContent sx={{ p: { xs: 3, md: 4 }, pt: 0 }}>
            <Grid container spacing={3}>
              {/* Profile Image & Quick Details */}
              <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, mt: -6, alignItems: { xs: 'center', sm: 'flex-start' } }}>
                <Box position="relative" display="inline-block">
                  <Avatar
                    src={imagePreview || user?.profile_photo || user?.profile_photo_url || ''}
                    sx={{
                      width: 120,
                      height: 120,
                      border: '4px solid',
                      borderColor: 'background.paper',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      bgcolor: 'primary.main',
                      fontSize: '3rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {watchedName?.charAt(0) || user?.full_name?.charAt(0)}
                  </Avatar>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <IconButton
                    onClick={() => fileInputRef.current.click()}
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 4,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': { bgcolor: 'primary.dark' },
                      width: 34,
                      height: 34,
                      border: '2px solid',
                      borderColor: 'background.paper'
                    }}
                  >
                    <CameraIcon size={16} />
                  </IconButton>
                </Box>

                <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, pt: { sm: 6 } }}>
                  <Typography variant="h5" fontWeight="800" gutterBottom>
                    {watchedName || 'Student Name'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyXcontent: { xs: 'center', sm: 'flex-start' }, gap: 1, mb: 1 }}>
                    <MailIcon size={14} /> {user?.email || 'N/A'} (Read Only)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    ID: {watch('student_id') || 'N/A'} &bull; Dept: {watchedDept || 'N/A'}
                  </Typography>

                  <Box display="flex" gap={1} flexWrap="wrap" justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                    {watchedSem && <Chip size="small" variant="outlined" label={`Semester ${watchedSem}`} sx={{ borderRadius: 2, fontWeight: 'bold' }} />}
                    {watchedDiv && <Chip size="small" variant="outlined" label={`Div ${watchedDiv}`} sx={{ borderRadius: 2, fontWeight: 'bold' }} />}
                    {watchedBatch && <Chip size="small" variant="outlined" label={`Batch ${watchedBatch}`} sx={{ borderRadius: 2, fontWeight: 'bold' }} />}
                    {watchedRoll && <Chip size="small" variant="outlined" label={`Roll ${watchedRoll}`} sx={{ borderRadius: 2, fontWeight: 'bold' }} />}
                  </Box>

                  <Box display="flex" gap={1.5} mt={2.5} justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => fileInputRef.current.click()}
                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}
                    >
                      Change Photo
                    </Button>
                    {(user?.profile_photo || imagePreview) && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={handleRemovePhoto}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}
                      >
                        Remove
                      </Button>
                    )}
                  </Box>
                </Box>
              </Grid>

              {/* Top-Right Academic Snapshot */}
              <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 4,
                    width: '100%',
                    maxWidth: 360,
                    bgcolor: 'background.default',
                    borderStyle: 'dashed'
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'primary.main' }}>
                    🎓 Academic Snapshot
                  </Typography>
                  <Grid container spacing={1}>
                    {[
                      { label: 'College', value: watchedCollege || 'N/A' },
                      { label: 'Department', value: watchedDept || 'N/A' },
                      { label: 'Semester/Div', value: watchedSem && watchedDiv ? `Sem ${watchedSem} - Div ${watchedDiv}` : 'N/A' },
                      { label: 'Batch/Roll', value: watchedBatch && watchedRoll ? `${watchedBatch} (#${watchedRoll})` : 'N/A' },
                      { label: 'Attendance Goal', value: `${watchedGoal}` },
                      { label: 'Current Attendance', value: loadingStats ? '...' : `${analytics?.overall_attendance || 0}%` }
                    ].map((row, i) => (
                      <React.Fragment key={i}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                        </Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" fontWeight="bold" color="text.primary">{row.value}</Typography>
                        </Grid>
                      </React.Fragment>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* main content columns */}
        <Grid container spacing={4}>
          {/* Left Column: Stats & Meta details */}
          <Grid item xs={12} md={4}>
            <Box display="flex" flexDirection="column" gap={4}>
              
              {/* Profile Completion Indicator */}
              <Card variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle2" fontWeight="800" gutterBottom>
                    Profile Completion
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} my={2}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={completionScore}
                        sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover' }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" fontWeight="bold" color="primary">{completionScore}%</Typography>
                    </Box>
                  </Box>
                  {missingFields.length > 0 ? (
                    <Box display="flex" flexDirection="column" gap={1} mt={1.5}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">Missing Details:</Typography>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {missingFields.slice(0, 3).map((f, i) => (
                          <Chip key={i} size="small" color="warning" variant="outlined" label={f} sx={{ borderRadius: 1.5, fontSize: '0.7rem' }} />
                        ))}
                        {missingFields.length > 3 && (
                          <Chip size="small" variant="outlined" label={`+${missingFields.length - 3} more`} sx={{ borderRadius: 1.5, fontSize: '0.7rem' }} />
                        )}
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'bold' }}>
                      <PresentIcon size={14} /> Profile is complete and fully synchronized!
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Quick Statistics Card */}
              <Card variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle2" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                    <StatsIcon size={16} color="#3b82f6" /> Quick Statistics
                  </Typography>
                  {loadingStats ? (
                    <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
                  ) : (
                    <Box display="flex" flexDirection="column" gap={1.8}>
                      {[
                        { label: 'Attendance', value: `${analytics?.overall_attendance || 0}%`, icon: <PercentIcon size={16} /> },
                        { label: 'Subjects Count', value: analytics?.total_subjects || 0, icon: <SubjectIcon size={16} /> },
                        { label: 'Tracked Lectures', value: analytics?.total_lectures || 0, icon: <TrackIcon size={16} /> },
                        { label: 'Present', value: analytics?.present_count || 0, icon: <PresentIcon size={16} color="#10b981" /> },
                        { label: 'Absent', value: analytics?.absent_count || 0, icon: <AbsentIcon size={16} color="#ef4444" /> },
                        { label: 'Cancelled', value: analytics?.subjects?.reduce((acc, sub) => acc + (sub.cancelled || 0), 0) || 0, icon: <CancelledIcon size={16} color="#6b7280" /> }
                      ].map((item, i) => (
                        <Box key={i} display="flex" justifyContent="space-between" alignItems="center">
                          <Box display="flex" alignItems="center" gap={1.5} color="text.secondary">
                            {item.icon}
                            <Typography variant="body2">{item.label}</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="bold">{item.value}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Connected Account details */}
              <Card variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 2.5 }}>
                    Connected Account
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar
                      src={user?.profile_photo_url || ''}
                      sx={{ width: 44, height: 44, border: '1px solid', borderColor: 'divider' }}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">Google Account</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{user?.email}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight="medium">Provider: Clerk Secure</Typography>
                    </Box>
                  </Box>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<LinkIcon size={14} />}
                    onClick={() => clerk.openUserProfile()}
                    sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 'bold', py: 1 }}
                  >
                    Manage Account
                  </Button>
                </CardContent>
              </Card>

            </Box>
          </Grid>

          {/* Right Column: Editable forms */}
          <Grid item xs={12} md={8}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box display="flex" flexDirection="column" gap={4}>
                
                {/* Card 1: Personal Information */}
                <Card variant="outlined" sx={{ borderRadius: 4 }}>
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography variant="subtitle1" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: 'primary.main' }}>
                      <UserIcon size={20} /> Personal Information
                    </Typography>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Full Name"
                          {...register('full_name', { required: 'Full name is required' })}
                          error={!!errors.full_name}
                          helperText={errors.full_name?.message}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Email Address"
                          value={user?.email || ''}
                          disabled
                          helperText="Managed by Google Identity"
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Mobile Number"
                          placeholder="e.g. +91 9876543210"
                          {...register('mobile_number')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Student ID"
                          placeholder="e.g. 2023FHIT127"
                          {...register('student_id')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="PRN Number"
                          placeholder="e.g. 7"
                          {...register('prn_number')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Roll Number"
                          placeholder="e.g. 56"
                          {...register('roll_number')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Date of Birth (Optional)"
                          type="date"
                          slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2.5 } } }}
                          {...register('date_of_birth')}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="gender"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              select
                              fullWidth
                              label="Gender (Optional)"
                              slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                              {...field}
                            >
                              <MenuItem value="Male">Male</MenuItem>
                              <MenuItem value="Female">Female</MenuItem>
                              <MenuItem value="Other">Other</MenuItem>
                              <MenuItem value="Prefer Not To Say">Prefer Not To Say</MenuItem>
                            </TextField>
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Card 2: Academic Information */}
                <Card variant="outlined" sx={{ borderRadius: 4 }}>
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography variant="subtitle1" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: 'primary.main' }}>
                      <GradIcon size={20} /> Academic Information
                    </Typography>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="College / Institute Name"
                          {...register('college_name')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Department"
                          {...register('department')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="degree"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              select
                              fullWidth
                              label="Degree Program"
                              slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                              {...field}
                            >
                              <MenuItem value="B.E.">B.E.</MenuItem>
                              <MenuItem value="B.Tech">B.Tech</MenuItem>
                              <MenuItem value="MCA">MCA</MenuItem>
                              <MenuItem value="M.Tech">M.Tech</MenuItem>
                              <MenuItem value="B.Sc">B.Sc</MenuItem>
                              <MenuItem value="M.Sc">M.Sc</MenuItem>
                            </TextField>
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Semester"
                          placeholder="e.g. 7"
                          {...register('semester')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Division"
                          placeholder="e.g. B"
                          {...register('division')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Batch"
                          placeholder="e.g. B3"
                          {...register('batch')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Academic Year"
                          placeholder="e.g. 2026-2027"
                          {...register('academic_year')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="current_year"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              select
                              fullWidth
                              label="Current Year"
                              slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                              {...field}
                            >
                              <MenuItem value="First Year">First Year</MenuItem>
                              <MenuItem value="Second Year">Second Year</MenuItem>
                              <MenuItem value="Third Year">Third Year</MenuItem>
                              <MenuItem value="Fourth Year">Fourth Year</MenuItem>
                            </TextField>
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="student_status"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              select
                              fullWidth
                              label="Student Status"
                              slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                              {...field}
                            >
                              <MenuItem value="Regular">Regular</MenuItem>
                              <MenuItem value="Detained">Detained</MenuItem>
                              <MenuItem value="Alumni">Alumni</MenuItem>
                            </TextField>
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="attendance_goal"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              select
                              fullWidth
                              label="Preferred Attendance Goal"
                              slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                              {...field}
                            >
                              <MenuItem value="75%">75%</MenuItem>
                              <MenuItem value="80%">80%</MenuItem>
                              <MenuItem value="85%">85%</MenuItem>
                              <MenuItem value="90%">90%</MenuItem>
                            </TextField>
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Card 3: College Information */}
                <Card variant="outlined" sx={{ borderRadius: 4 }}>
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography variant="subtitle1" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: 'primary.main' }}>
                      <CollegeIcon size={20} /> College Information
                    </Typography>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="University / Board"
                          placeholder="e.g. Mumbai University"
                          {...register('university')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Course Code"
                          placeholder="e.g. IT-BE"
                          {...register('course')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Class Teacher"
                          placeholder="e.g. Dr. K. Patil"
                          {...register('class_teacher')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Teacher Guardian (Optional)"
                          placeholder="e.g. Prof. J. Sen"
                          {...register('teacher_guardian')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Parent / Emergency Contact Number"
                          placeholder="e.g. +91 9876543222"
                          {...register('parent_contact')}
                          slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Card 4: Notification Preferences */}
                <Card variant="outlined" sx={{ borderRadius: 4 }}>
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography variant="subtitle1" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: 'primary.main' }}>
                      <BellIcon size={20} /> Notification Preferences
                    </Typography>

                    <Box display="flex" flexDirection="column" gap={2}>
                      <Controller
                        name="lecture_reminder"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight="bold">Lecture Reminder</Typography>
                                <Typography variant="caption" color="text.secondary">Alert me before my scheduled class starts.</Typography>
                              </Box>
                            }
                          />
                        )}
                      />

                      {watchedReminder && (
                        <Box sx={{ pl: 7, maxWidth: 300 }}>
                          <Controller
                            name="reminder_time"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                select
                                fullWidth
                                label="Reminder Offset"
                                slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
                                {...field}
                              >
                                <MenuItem value="5 minutes">5 minutes before</MenuItem>
                                <MenuItem value="10 minutes">10 minutes before</MenuItem>
                                <MenuItem value="15 minutes">15 minutes before</MenuItem>
                              </TextField>
                            )}
                          />
                        </Box>
                      )}

                      <Divider sx={{ my: 1 }} />

                      <Controller
                        name="low_attendance_alert"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight="bold">Low Attendance Alert</Typography>
                                <Typography variant="caption" color="text.secondary">Notify me if any subject percentage slips below preferred goal limit.</Typography>
                              </Box>
                            }
                          />
                        )}
                      />

                      <Divider sx={{ my: 1 }} />

                      <Controller
                        name="ai_daily_brief"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight="bold">AI Daily Brief</Typography>
                                <Typography variant="caption" color="text.secondary">Generate a brief daily summary of your attendance standing details.</Typography>
                              </Box>
                            }
                          />
                        )}
                      />

                      <Divider sx={{ my: 1 }} />

                      <Controller
                        name="weekly_report"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight="bold">Weekly Report</Typography>
                                <Typography variant="caption" color="text.secondary">Receive weekly email statistics overview reports.</Typography>
                              </Box>
                            }
                          />
                        )}
                      />
                    </Box>
                  </CardContent>
                </Card>

              </Box>

              {/* absolute sticky edit footer */}
              <AnimatePresence>
                {isDirty && (
                  <Box
                    component={motion.div}
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    sx={{
                      position: 'fixed',
                      bottom: 24,
                      left: { xs: 16, md: 280 },
                      right: 16,
                      bgcolor: 'background.paper',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      borderRadius: 4,
                      p: 2,
                      zIndex: 1000,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid',
                      borderColor: 'primary.light'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'medium' }}>
                      <AlertIcon size={16} color="#3b82f6" /> Unsaved changes detected
                    </Typography>
                    <Box display="flex" gap={2}>
                      <Button
                        variant="outlined"
                        onClick={handleCancel}
                        disabled={saving}
                        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 'bold', px: 3 }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={saving}
                        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 'bold', px: 4 }}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </AnimatePresence>
            </form>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
};

export default Profile;
