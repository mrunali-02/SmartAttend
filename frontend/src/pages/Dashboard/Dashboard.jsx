import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import AppLayout from '../../components/layout/AppLayout';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  Grid,
  Skeleton,
  LinearProgress,
  List,
  ListItem
} from '@mui/material';
import { 
  CheckCircle2 as CheckCircleIcon, 
  Clock as AccessTimeIcon, 
  AlertTriangle as WarningIcon, 
  Sparkles as AutoAwesomeIcon 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Simple animated counter using RAF
const AnimatedCount = ({ value }) => {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let start = 0;
    const duration = 1200;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplay(progress * value);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span>{display.toFixed(1)}%</span>;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [todayLectures, setTodayLectures] = useState([]);
  const [aiInsights, setAiInsights] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const showToast = (message, severity = 'success') => {
    if (severity === 'success') toast.success(message);
    else if (severity === 'error') toast.error(message);
    else if (severity === 'warning') toast.warning(message);
    else toast(message);
  };

  const fetchDashboardData = async () => {
    try {
      const analyticRes = await api.get('/analytics/dashboard/');
      setAnalytics(analyticRes.data);

      const todayRes = await api.get('/timetable/slots/today/');
      setTodayLectures(todayRes.data.lectures || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    try {
      const aiRes = await api.get('/ai/insights/');
      setAiInsights(aiRes.data.insights || '');
    } catch (err) {
      console.error('Failed to load AI insights:', err);
      setAiInsights('Attend today\'s classes to maintain your attendance standing.');
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAIInsights();

    // Listen for attendance updates from Quick Mark or Attendance Page
    const handleRefresh = () => {
      fetchDashboardData();
      fetchAIInsights();
    };
    window.addEventListener('attendanceMarked', handleRefresh);
    return () => window.removeEventListener('attendanceMarked', handleRefresh);
  }, []);

  const handleDirectMark = async (lecture, statusVal) => {
    setSubmittingId(lecture.id);
    const deviceTimeStr = new Date().toISOString();
    const todayDateStr = new Date().toLocaleDateString('en-CA');

    let lat = null;
    let lon = null;
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
      });
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch (err) {
      console.warn('GPS coordinates skipped for direct mark:', err);
    }

    try {
      await api.post('/attendance/records/mark/', {
        lecture_slot_id: lecture.id,
        date: todayDateStr,
        status: statusVal,
        device_time: deviceTimeStr,
        remarks: `Marked ${statusVal} from Dashboard`,
        latitude: lat,
        longitude: lon
      });
      showToast(`Marked ${lecture.subject_details?.name} as ${statusVal}!`);
      // Notify other components
      window.dispatchEvent(new CustomEvent('attendanceMarked'));
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to check-in.';
      showToast(errorMsg, 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  const getCurrentAndNextLecture = () => {
    if (!todayLectures || todayLectures.length === 0) {
      return { current: null, next: null };
    }

    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}:00`;

    let current = null;
    let next = null;

    const sorted = [...todayLectures].sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (let i = 0; i < sorted.length; i++) {
      const lec = sorted[i];
      if (currentTimeStr >= lec.start_time && currentTimeStr <= lec.end_time) {
        current = lec;
      }
    }

    for (let i = 0; i < sorted.length; i++) {
      const lec = sorted[i];
      if (lec.start_time > currentTimeStr) {
        next = lec;
        break;
      }
    }

    return { current, next };
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hr = parseInt(hours);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <AppLayout>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 3 }} />
          <Skeleton variant="text" width="40%" height={30} />
          <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3 }} />
        </Box>
      </AppLayout>
    );
  }

  // Calculate if there are any subjects at warning status (below preferred goal)
  const targetGoal = user?.goal || 75;
  const warningSubjects = analytics?.subjects?.filter(sub => sub.percentage < targetGoal) || [];
  const overallPercentage = analytics?.overall_attendance || 0;

  const { current: currentLec, next: nextLec } = getCurrentAndNextLecture();

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          
          {/* Welcome Header */}
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Good Morning, {user?.full_name || user?.name || 'Mrunali'} 👋
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Here is your attendance overview for today.
            </Typography>
          </Box>

          {/* Overall Attendance Circle/Card */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              variant="outlined"
              sx={{ borderRadius: 4, bgcolor: 'background.paper', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)' } }}
            >
              <Box>
                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">Overall Attendance</Typography>
                <Typography variant="h2" fontWeight="bold" color="primary.main" sx={{ mt: 1 }}>
                  <AnimatedCount value={overallPercentage} />
                </Typography>
              </Box>
              <Box sx={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress
                  variant="determinate"
                  value={overallPercentage}
                  size={80}
                  thickness={6.5}
                  color={overallPercentage >= targetGoal ? 'success' : 'error'}
                />
              </Box>
            </Card>
          </motion.div>

          {/* Current & Next Lecture Grid */}
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%' }}
              >
                <Card
                  variant="outlined"
                  sx={{ borderRadius: 4, height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)' } }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 1.1 }}>CURRENT LECTURE</Typography>
                    {currentLec ? (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="body1" fontWeight="bold" color="text.primary">
                          {currentLec.subject_details?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} sx={{ mt: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 13 }} />
                          {formatTime(currentLec.start_time.substring(0, 5))} - {formatTime(currentLec.end_time.substring(0, 5))} &bull; Room {currentLec.classroom || 'TBD'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        No active lecture right now.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={6}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%' }}
              >
                <Card
                  variant="outlined"
                  sx={{ borderRadius: 4, height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)' } }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 1.1 }}>NEXT LECTURE</Typography>
                    {nextLec ? (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="body1" fontWeight="bold" color="text.primary">
                          {nextLec.subject_details?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} sx={{ mt: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 13 }} />
                          {formatTime(nextLec.start_time.substring(0, 5))} - {formatTime(nextLec.end_time.substring(0, 5))} &bull; Room {nextLec.classroom || 'TBD'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        No more lectures remaining today.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>

          {/* Today's Lectures Section */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
              Today's Schedule
            </Typography>
            
            {todayLectures.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No classes scheduled for today. Free day!
                </Typography>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <List disablePadding>
                  {todayLectures.map((lecture, index) => {
                    const isMarked = lecture.attendance_status !== null;
                    const isSubmitting = submittingId === lecture.id;

                    return (
                      <Box key={lecture.id}>
                        <ListItem sx={{ py: 2.5, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                          <Box display="flex" gap={2} alignItems="center">
                            <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: 65, fontWeight: 'bold' }}>
                              {formatTime(lecture.start_time.substring(0, 5))}
                            </Typography>
                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                            <Box>
                              <Typography variant="body1" fontWeight="bold">
                                {lecture.subject_details?.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {lecture.lecture_type} • Room {lecture.classroom || 'TBD'}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box>
                            {isMarked ? (
                              <Chip
                                label={lecture.attendance_status}
                                color={
                                  lecture.attendance_status === 'Present' ? 'success' :
                                  lecture.attendance_status === 'Absent' ? 'error' :
                                  lecture.attendance_status === 'Cancelled' ? 'warning' : 'default'
                                }
                                size="medium"
                                icon={<CheckCircleIcon />}
                                sx={{ fontWeight: 'bold', borderRadius: 2 }}
                              />
                            ) : (
                              <Box display="flex" gap={1}>
                                {isSubmitting ? (
                                  <CircularProgress size={20} sx={{ mx: 2 }} />
                                ) : (
                                  ['Present', 'Absent', 'Cancelled'].map((status) => (
                                    <Chip
                                      key={status}
                                      label={status}
                                      onClick={() => handleDirectMark(lecture, status)}
                                      color={status === 'Present' ? 'success' : status === 'Absent' ? 'error' : 'warning'}
                                      variant="outlined"
                                      sx={{
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        borderRadius: 2,
                                        '&:hover': { bgcolor: 'action.hover' }
                                      }}
                                    />
                                  ))
                                )}
                              </Box>
                            )}
                          </Box>
                        </ListItem>
                        {index < todayLectures.length - 1 && <Divider />}
                      </Box>
                    );
                  })}
                </List>
              </Paper>
            )}
          </Box>

          {/* Subject Attendance Section */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
              Subject Attendance
            </Typography>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {analytics?.subjects?.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center">
                  No subject tracking setup yet. Timetable needs upload.
                </Typography>
              ) : (
                analytics?.subjects?.map((sub) => {
                  const subColor = sub.color || '#3b82f6';
                  const isUnderGoal = sub.percentage < targetGoal;
                  return (
                    <motion.div
                      key={sub.id}
                      whileHover={{ scale: 1.008, x: 2 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Box
                        onClick={() => navigate(`/subjects/${sub.id}`)}
                        sx={{
                          cursor: 'pointer',
                          p: 1.5,
                          borderRadius: 2,
                          '&:hover': { bgcolor: 'action.hover' },
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.8}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {sub.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {sub.code} • Attended: {sub.present + sub.late}/{sub.total}
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="bold" color={isUnderGoal ? 'error.main' : 'text.primary'}>
                            {sub.percentage}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={sub.percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'action.selected',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: subColor,
                              borderRadius: 4
                            }
                          }}
                        />
                      </Box>
                    </motion.div>
                  );
                })
              )}
            </Paper>
          </Box>

          {/* Bottom AI Suggestion/Reminder Area */}
          <Box>
            {warningSubjects.length > 0 ? (
              // Show alert box if subjects are below target goal
              <motion.div
                whileHover={{ scale: 1.005 }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <WarningIcon sx={{ color: 'error.main' }} />
                    <Typography variant="body2" fontWeight="medium" color="error.dark">
                      <strong>⚠ {warningSubjects[0].name} ({warningSubjects[0].percentage}%)</strong> is below your {targetGoal}% target. Need next {Math.ceil(((targetGoal/100) * warningSubjects[0].total - (warningSubjects[0].present + warningSubjects[0].late)) / (1 - (targetGoal/100)))} lectures.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => window.dispatchEvent(new CustomEvent('openAiDrawer'))}
                    sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
                  >
                    View
                  </Button>
                </Paper>
              </motion.div>
            ) : (
              // Default AI Advice card (one line suggestion)
              <motion.div
                whileHover={{ scale: 1.005 }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <AutoAwesomeIcon color="secondary" sx={{ fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary">
                      <strong>AI Suggestion:</strong> {aiInsights ? aiInsights.split('.')[0] + '.' : 'Attend today\'s lectures to stay on track.'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => window.dispatchEvent(new CustomEvent('openAiDrawer'))}
                    sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
                  >
                    Open AI
                  </Button>
                </Paper>
              </motion.div>
            )}
          </Box>

        </Box>
      </motion.div>
    </AppLayout>
  );
};

export default Dashboard;
