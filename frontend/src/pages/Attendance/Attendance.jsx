import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';
import { queueOfflineCheckIn } from '../../services/offlineSync';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ScheduleIcon from '@mui/icons-material/Schedule';
import InfoIcon from '@mui/icons-material/Info';

const Attendance = () => {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Mark Attendance Dialog state
  const [markDialog, setMarkDialog] = useState({ open: false, slot: null });
  const [statusVal, setStatusVal] = useState('Present');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Snackbar Notification State
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const fetchTodayLectures = async () => {
    try {
      const res = await api.get('/timetable/slots/today/');
      setLectures(res.data.lectures);
    } catch (err) {
      showNotification('Failed to fetch today\'s schedule.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayLectures();

    // Clock ticker to update counts and times every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // every 10 seconds

    return () => clearInterval(timer);
  }, []);

  const handleOpenMarkDialog = (slot) => {
    setStatusVal('Present');
    setRemarks('');
    setMarkDialog({ open: true, slot });
  };

  const handleMarkAttendance = async () => {
    const slot = markDialog.slot;
    if (!slot) return;

    setSubmitting(true);
    
    const deviceTimeStr = new Date().toISOString();
    const todayDateStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format

    // Check Offline status
    if (!navigator.onLine) {
      const payload = {
        lecture_slot_id: slot.id,
        date: todayDateStr,
        status: statusVal,
        device_time: deviceTimeStr,
        remarks: remarks
      };
      
      queueOfflineCheckIn(payload);
      showNotification('You are offline. Attendance check-in queued locally! It will auto-sync when online.', 'warning');
      
      // Optimistically update list
      setLectures(prev => prev.map(l => l.id === slot.id ? { ...l, attendance_status: statusVal } : l));
      setMarkDialog({ open: false, slot: null });
      setSubmitting(false);
      return;
    }

    // Retrieve browser GPS coordinates
    let lat = null;
    let lon = null;
    
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
      });
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch (err) {
      console.warn('Geolocation coordinates retrieval failed or timed out:', err);
    }

    try {
      const res = await api.post('/attendance/records/mark/', {
        lecture_slot_id: slot.id,
        date: todayDateStr,
        status: statusVal,
        device_time: deviceTimeStr,
        remarks: remarks,
        latitude: lat,
        longitude: lon
      });

      showNotification(res.data.detail || 'Attendance marked successfully!');
      setMarkDialog({ open: false, slot: null });
      fetchTodayLectures(); // Refresh list
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to mark attendance.';
      showNotification(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to check if the lecture is within its valid marking window
  // Returns: { status: 'upcoming' | 'active' | 'ended', label: string, color: string, canMark: boolean }
  const getLectureWindowStatus = (slot) => {
    const today = new Date();
    
    // Parse times
    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    
    const startDt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM, 0);
    const endDt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM, 0);
    
    // Check-in windows
    const windowStart = new Date(startDt.getTime() - 5 * 60 * 1000); // 5 mins early
    const windowEnd = new Date(endDt.getTime() + 10 * 60 * 1000);    // 10 mins late
    
    if (today < windowStart) {
      // Upcoming
      const diffMs = startDt - today;
      const diffMin = Math.round(diffMs / 60 / 1000);
      let label = `Starts in ${diffMin} mins`;
      if (diffMin > 60) {
        const hrs = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        label = `Starts in ${hrs}h ${mins}m`;
      }
      return { status: 'upcoming', label, color: 'info', canMark: false };
    } else if (today > windowEnd) {
      // Ended
      return { status: 'ended', label: 'Lecture Ended', color: 'error', canMark: false };
    } else {
      // Active / Window open
      const diffMs = endDt - today;
      const diffMin = Math.round(diffMs / 60 / 1000);
      
      let label = 'Active Now';
      if (today >= startDt && today <= endDt) {
        label = `${slot.subject_details?.name} ends in ${diffMin} mins`;
      } else if (today < startDt) {
        label = `Check-in open (Starts in ${Math.round((startDt - today) / 60 / 1000)} mins)`;
      } else {
        label = `Check-in closing in ${Math.round((windowEnd - today) / 60 / 1000)} mins`;
      }
      
      return { status: 'active', label, color: 'success', canMark: true };
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hr = parseInt(hours);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${minutes} ${ampm}`;
  };

  return (
    <AppLayout>
      <Box display="flex" flexDirection="column" gap={3}>
        {/* Helper Banner */}
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: 'action.hover',
            borderLeft: '5px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
          variant="outlined"
        >
          <InfoIcon color="success" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="body1" fontWeight="bold">
              Smart Attendance Check-In
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Attendance can only be checked in between **5 minutes before** the lecture starts and **10 minutes after** the lecture ends. 
              The system automatically calculates time differences to prevent proxy check-ins.
            </Typography>
          </Box>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
          </Box>
        ) : lectures.length === 0 ? (
          <Paper sx={{ py: 8, px: 3, textAlign: 'center', borderRadius: 3 }} variant="outlined">
            <HourglassEmptyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold">
              No lectures scheduled right now.
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              You have no lectures scheduled for today. Enjoy your free time!
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {lectures.map((lecture) => {
              const windowStatus = getLectureWindowStatus(lecture);
              const isMarked = lecture.attendance_status !== null;

              return (
                <Grid item xs={12} sm={6} md={4} key={lecture.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: 3,
                      borderLeft: `6px solid ${lecture.subject_details?.color || '#3b82f6'}`,
                      position: 'relative',
                      boxShadow: windowStatus.status === 'active' && !isMarked ? '0 4px 20px rgba(16, 185, 129, 0.15)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                        <Chip 
                          label={lecture.lecture_type} 
                          size="small" 
                          color={lecture.lecture_type === 'Theory' ? 'primary' : 'secondary'} 
                        />
                        <Chip 
                          label={isMarked ? `${lecture.attendance_status} ✓` : windowStatus.label} 
                          size="small" 
                          color={isMarked ? (lecture.attendance_status === 'Absent' ? 'error' : 'success') : windowStatus.color}
                          variant={isMarked ? 'filled' : 'outlined'}
                          icon={isMarked ? <CheckCircleIcon /> : <ScheduleIcon />}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>

                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {lecture.subject_details?.name}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {lecture.subject_details?.code} • {lecture.subject_details?.faculty_name}
                      </Typography>

                      <Divider sx={{ my: 1.5 }} />

                      <Box display="flex" alignItems="center" gap={1} mb={2.5}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="bold">
                          {formatTime(lecture.start_time)} - {formatTime(lecture.end_time)}
                        </Typography>
                      </Box>

                      {isMarked ? (
                        <Button 
                          variant="outlined" 
                          color="success" 
                          fullWidth 
                          disabled 
                          startIcon={<CheckCircleIcon />}
                          sx={{ 
                            borderRadius: 2, 
                            borderWidth: 2, 
                            fontWeight: 'bold', 
                            '&.Mui-disabled': { color: 'success.main', borderColor: 'success.main' }
                          }}
                        >
                          {lecture.attendance_status} ✓
                        </Button>
                      ) : (
                        <Button
                          variant={windowStatus.canMark ? 'contained' : 'outlined'}
                          color={windowStatus.canMark ? 'success' : 'inherit'}
                          fullWidth
                          disabled={!windowStatus.canMark}
                          onClick={() => handleOpenMarkDialog(lecture)}
                          sx={{ borderRadius: 2, fontWeight: 'bold' }}
                        >
                          {windowStatus.status === 'upcoming' 
                            ? 'Not Started Yet' 
                            : windowStatus.status === 'ended' 
                              ? 'Ended' 
                              : 'Mark Present'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Mark Attendance Dialog */}
      <Dialog open={markDialog.open} onClose={() => setMarkDialog({ open: false, slot: null })} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Mark Attendance</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2.5}>
            <Typography variant="body2" color="text.secondary">
              Configure attendance status for <strong>{markDialog.slot?.subject_details?.name}</strong>:
            </Typography>

            <TextField
              label="Attendance Status"
              select
              fullWidth
              size="small"
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value)}
            >
              <MenuItem value="Present">Present</MenuItem>
              <MenuItem value="Late">Late (Arrived Late)</MenuItem>
            </TextField>

            <TextField
              label="Remarks"
              placeholder="Add optional notes (e.g. medical reason, class delay)"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkDialog({ open: false, slot: null })} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleMarkAttendance} 
            disabled={submitting}
            sx={{ fontWeight: 'bold' }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Confirm Check-In'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar alerts */}
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default Attendance;
