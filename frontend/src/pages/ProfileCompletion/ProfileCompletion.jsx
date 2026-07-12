import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Container,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  MenuItem
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const ProfileCompletion = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || user?.name || '');
  const [studentId, setStudentId] = useState(user?.student_id || '');
  const [prnNumber, setPrnNumber] = useState(user?.prn_number || '');
  const [roll, setRoll] = useState(user?.roll_number || '');
  const [batch, setBatch] = useState(user?.batch || '');
  const [division, setDivision] = useState(user?.division || '');
  const [semester, setSemester] = useState(user?.semester || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [college, setCollege] = useState(user?.college_name || '');
  const [academicYear, setAcademicYear] = useState(user?.academic_year || '');
  const [goal, setGoal] = useState(75);

  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !fullName ||
      !studentId ||
      !prnNumber ||
      !roll ||
      !batch ||
      !division ||
      !semester ||
      !department ||
      !college ||
      !academicYear
    ) {
      showNotification('Please fill in all required profile fields.', 'warning');
      return;
    }

    setSaving(true);
    try {
      // 1. Update academic and personal profile details
      const profileRes = await updateProfile({
        full_name: fullName,
        name: fullName,
        student_id: studentId,
        prn_number: prnNumber,
        roll_number: roll,
        batch: batch,
        division: division,
        semester: semester,
        department: department,
        college_name: college,
        academic_year: academicYear
      });

      if (!profileRes.success) {
        throw new Error(profileRes.error);
      }

      // 2. Set preferred goal in AI settings
      await api.put('/ai/memory/', {
        preferred_goal: goal
      });

      showNotification('Student profile completed successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (err) {
      showNotification(err.message || 'Failed to finalize setup.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="md">
        <Paper elevation={4} sx={{ p: 4, borderRadius: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={1} mb={4}>
            <AutoAwesomeIcon color="primary" sx={{ fontSize: 44 }} />
            <Typography variant="h5" fontWeight="bold">Complete Your Student Profile</Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Please finalize your enrollment details to synchronize your timetable and attendance tracker.
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2.5}>
              {/* Personal Information */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary">Personal Information</Typography>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={user?.email || ''}
                  disabled
                  helperText="Email is managed by Google accounts"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Student ID Number"
                  placeholder="e.g. STU99281"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="PRN Number"
                  placeholder="e.g. PRN202401827"
                  value={prnNumber}
                  onChange={(e) => setPrnNumber(e.target.value)}
                  required
                />
              </Grid>

              {/* Academic Details */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary">Academic Details</Typography>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="College / Institute Name"
                  placeholder="e.g. Datta Meghe College of Engineering"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department / Branch"
                  placeholder="e.g. Information Technology"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Semester"
                  placeholder="e.g. 7"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Division"
                  placeholder="e.g. B"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Roll Number"
                  placeholder="e.g. 42"
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Batch"
                  placeholder="e.g. B3"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Academic Year"
                  placeholder="e.g. 2026-2027"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Target Attendance Cutoff (%)"
                  value={goal}
                  onChange={(e) => setGoal(parseInt(e.target.value) || 75)}
                  required
                >
                  {[75, 80, 85, 90, 95].map((g) => (
                    <MenuItem key={g} value={g}>{g}%</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sx={{ mt: 3 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={saving}
                  sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 3 }}
                >
                  {saving ? <CircularProgress size={24} color="inherit" /> : 'Finalize Profile & Onboard'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>

      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfileCompletion;
