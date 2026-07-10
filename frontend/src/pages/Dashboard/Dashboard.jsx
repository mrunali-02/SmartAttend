import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Button,
  CircularProgress,
  Chip,
  CardActionArea
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EventNoteIcon from '@mui/icons-material/EventNote';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SubjectIcon from '@mui/icons-material/Subject';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import SchoolIcon from '@mui/icons-material/School';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [todayLectures, setTodayLectures] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tickerTime, setTickerTime] = useState(new Date());

  const fetchDashboardData = async () => {
    try {
      const summaryRes = await api.get('/attendance/records/summary/');
      setSummary(summaryRes.data);

      const todayRes = await api.get('/timetable/slots/today/');
      setTodayLectures(todayRes.data.lectures);

      const recentRes = await api.get('/attendance/records/', { params: { limit: 5 } });
      setRecentActivities(recentRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Setup periodic timer to refresh countdowns every 15 seconds
    const interval = setInterval(() => {
      setTickerTime(new Date());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" py={12}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  // Parse slot times into Date objects for comparison
  const parseSlotTime = (timeStr) => {
    const today = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0);
  };

  // Determine active and upcoming lectures
  let activeLecture = null;
  let nextLecture = null;
  let scheduleStateMsg = '';

  const todayDayName = tickerTime.toLocaleDateString('en-US', { weekday: 'long' });
  const isWeekend = todayDayName === 'Sunday' || todayDayName === 'Saturday';

  if (isWeekend) {
    scheduleStateMsg = 'Weekend! Enjoy your break and recharge.';
  } else if (todayLectures.length === 0) {
    scheduleStateMsg = 'You have no lectures scheduled for today.';
  } else {
    // Sort lectures by start time to process chronologically
    const sorted = [...todayLectures].sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    for (const lecture of sorted) {
      const startDt = parseSlotTime(lecture.start_time);
      const endDt = parseSlotTime(lecture.end_time);

      if (tickerTime >= startDt && tickerTime <= endDt) {
        activeLecture = lecture;
      } else if (startDt > tickerTime && !nextLecture) {
        nextLecture = lecture;
      }
    }

    if (!activeLecture && !nextLecture) {
      scheduleStateMsg = 'All scheduled lectures are completed for today!';
    } else if (!activeLecture) {
      // Check if currently in lunch break range (12:30 PM to 1:30 PM)
      const hour = tickerTime.getHours();
      const min = tickerTime.getMinutes();
      const currMin = hour * 60 + min;
      if (currMin >= 750 && currMin <= 810) {
        scheduleStateMsg = 'Lunch Break! Grab a bite and relax.';
      } else {
        scheduleStateMsg = 'Free Time! You have no active lecture right now.';
      }
    }
  }

  // Format countdown string
  const getCountdownString = (targetTimeStr) => {
    const targetDt = parseSlotTime(targetTimeStr);
    const diffMs = targetDt - tickerTime;
    if (diffMs <= 0) return 'starting now';
    const totalMin = Math.round(diffMs / 60 / 1000);
    if (totalMin > 60) {
      const hrs = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      return `${hrs}h ${mins}m`;
    }
    return `${totalMin} mins`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hr = parseInt(hours);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${minutes} ${ampm}`;
  };

  const overall = summary?.overall_percentage ?? 100.0;
  const goal = summary?.attendance_goal ?? 75;

  return (
    <AppLayout>
      <Box display="flex" flexDirection="column" gap={3}>
        {/* Welcome Card */}
        <Card
          sx={{
            background: (theme) => 
              theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
                : 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)',
            color: '#ffffff',
            boxShadow: '0 8px 32px rgba(30, 58, 138, 0.15)',
            borderRadius: 3
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                  Welcome back, {user?.full_name || 'Student'}!
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                  {user?.college_name || 'College Name'} • {user?.department || 'Department'} • Semester {user?.semester || 'Semester'} (Div {user?.division || 'Division'}, Roll No: {user?.roll_number || 'Roll No'})
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <AutoAwesomeIcon sx={{ color: '#fbbf24' }} />
                  <Typography variant="body2" sx={{ opacity: 0.95, fontWeight: 'medium' }}>
                    {activeLecture 
                      ? `Active Lecture: "${activeLecture.subject_details?.name}" is ongoing. Make sure to mark attendance!` 
                      : nextLecture 
                        ? `Next up is "${nextLecture.subject_details?.name}" in ${getCountdownString(nextLecture.start_time)}.` 
                        : scheduleStateMsg}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Button 
                  variant="contained" 
                  onClick={() => navigate('/attendance')}
                  sx={{ 
                    bgcolor: '#fbbf24', 
                    color: '#000000',
                    fontWeight: 'bold',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#f59e0b' }
                  }}
                >
                  Mark Attendance
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Dynamic Status / Active Lecture Card */}
        {(activeLecture || nextLecture) && (
          <Grid container spacing={3}>
            {activeLecture && (
              <Grid item xs={12} md={nextLecture ? 6 : 12}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 3, 
                    borderLeft: '6px solid #10b981', 
                    bgcolor: 'success.light',
                    color: 'success.contrastText' 
                  }}
                >
                  <CardContent sx={{ py: 2.5 }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <SchoolIcon />
                      <Box>
                        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>
                          Current Lecture (Active Now)
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {activeLecture.subject_details?.name} ({activeLecture.subject_details?.code})
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Ends in {getCountdownString(activeLecture.end_time)} ({formatTime(activeLecture.start_time)} - {formatTime(activeLecture.end_time)})
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {nextLecture && (
              <Grid item xs={12} md={activeLecture ? 6 : 12}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 3, 
                    borderLeft: '6px solid #3b82f6', 
                    bgcolor: 'info.light', 
                    color: 'info.contrastText' 
                  }}
                >
                  <CardContent sx={{ py: 2.5 }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <ScheduleIcon />
                      <Box>
                        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>
                          Next Lecture Scheduled
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {nextLecture.subject_details?.name} ({nextLecture.subject_details?.code})
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Starts in {getCountdownString(nextLecture.start_time)} ({formatTime(nextLecture.start_time)} - {formatTime(nextLecture.end_time)})
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        {/* Stats Grid */}
        <Grid container spacing={3}>
          {/* Card 1: Overall Attendance */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: 3 }} variant="outlined">
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold">
                  Overall Attendance
                </Typography>
                <Box display="flex" justifyContent="center" alignItems="center" py={3} position="relative">
                  <svg width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="75" cy="75" r="60" fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth="12" />
                    <circle 
                      cx="75" cy="75" r="60" 
                      fill="transparent" 
                      stroke={overall >= goal ? '#10b981' : '#f59e0b'} 
                      strokeWidth="12" 
                      strokeDasharray="377" 
                      strokeDashoffset={377 - (377 * overall) / 100} 
                      strokeLinecap="round"
                    />
                  </svg>
                  <Box position="absolute" display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="h3" fontWeight="bold">
                      {overall}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {overall >= goal ? 'Good Standing' : 'Low Average'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2: Attendance Goal */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} variant="outlined">
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold">
                    Attendance Goal
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={3} mb={1}>
                    <Typography variant="h4" fontWeight="bold">
                      {overall}% <Typography component="span" variant="body1" color="text.secondary">/ {goal}% Goal</Typography>
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min((overall / goal) * 100, 100)} 
                    color={overall >= goal ? 'success' : 'warning'}
                    sx={{ height: 8, borderRadius: 4, mb: 3 }}
                  />
                </Box>
                <Box bgcolor="action.hover" p={2} borderRadius={2} borderLeft={`4px solid ${overall >= goal ? '#10b981' : '#f59e0b'}`}>
                  <Box display="flex" gap={1} alignItems="flex-start">
                    <WarningAmberIcon color={overall >= goal ? 'success' : 'warning'} />
                    <Typography variant="body2" color="text.secondary">
                      {overall >= goal 
                        ? `You are currently above your target goal of ${goal}%! Keep checking in regularly to stay safe.`
                        : `You need to attend the next ${summary?.consecutive_needed ?? 0} lecture(s) consecutively to raise your total average to the ${goal}% target.`}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 3: Today's Lectures */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: 3 }} variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" color="text.secondary" fontWeight="bold">
                    Today's Lectures
                  </Typography>
                  <Chip label={todayDayName} size="small" variant="outlined" />
                </Box>
                {todayLectures.length === 0 ? (
                  <Box py={5} textAlign="center">
                    <Typography variant="body2" color="text.secondary">No lectures scheduled today</Typography>
                  </Box>
                ) : (
                  <List sx={{ maxH: 260, overflowY: 'auto' }}>
                    {todayLectures.map((lecture, index) => {
                      const isMarked = lecture.attendance_status !== null;
                      return (
                        <Box key={lecture.id}>
                          <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                              <EventNoteIcon color={isMarked ? 'success' : 'action'} />
                            </ListItemIcon>
                            <ListItemText
                              primary={lecture.subject_details?.name}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                              secondary={`${formatTime(lecture.start_time)} - ${formatTime(lecture.end_time)} • ${lecture.lecture_type}`}
                            />
                            <Box sx={{ ml: 'auto', alignSelf: 'center' }}>
                              <Chip 
                                label={isMarked ? lecture.attendance_status : 'Pending'} 
                                size="small" 
                                color={isMarked ? (lecture.attendance_status === 'Absent' ? 'error' : 'success') : 'default'}
                                sx={{ fontSize: '0.7rem', fontWeight: 'bold', height: 20 }}
                              />
                            </Box>
                          </ListItem>
                          {index < todayLectures.length - 1 && <Divider component="li" />}
                        </Box>
                      );
                    })}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Card 4: Subjects List */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%', borderRadius: 3 }} variant="outlined">
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  Subject-wise Attendance
                </Typography>
                <Grid container spacing={2}>
                  {summary?.subjects?.length === 0 ? (
                    <Grid item xs={12} textAlign="center" py={4}>
                      <Typography variant="body2" color="text.secondary">No subjects found. Open the Timetable tab to add subjects.</Typography>
                    </Grid>
                  ) : (
                    summary?.subjects?.map((subj) => (
                      <Grid item xs={12} key={subj.id}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardActionArea onClick={() => navigate(`/subjects/${subj.id}`)}>
                            <Box sx={{ p: 2 }}>
                              <Box display="flex" justifyContent="space-between" mb={1} alignItems="center">
                                <Box display="flex" alignItems="center" gap={1.5}>
                                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: subj.color }} />
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                      {subj.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {subj.code} • Attended: {subj.present_count + subj.late_count}/{subj.total_lectures}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Typography 
                                  variant="body2" 
                                  fontWeight="bold" 
                                  color={subj.percentage >= goal ? 'success.main' : 'warning.main'}
                                >
                                  {subj.percentage}%
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={subj.percentage} 
                                color={subj.percentage >= goal ? 'success' : 'warning'}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    ))
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 5: Recent Activity */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%', borderRadius: 3 }} variant="outlined">
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold">
                  Recent Activity
                </Typography>
                {recentActivities.length === 0 ? (
                  <Box py={5} textAlign="center">
                    <Typography variant="body2" color="text.secondary">No recent check-ins recorded yet.</Typography>
                  </Box>
                ) : (
                  <List>
                    {recentActivities.map((activity, index) => (
                      <Box key={activity.id}>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color={activity.status === 'Absent' ? 'error' : 'success'} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight="medium">
                                Marked <strong>{activity.status}</strong> in {activity.subject_details?.name}
                              </Typography>
                            }
                            secondary={new Date(activity.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                        {index < recentActivities.length - 1 && <Divider component="li" />}
                      </Box>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
};

export default Dashboard;
