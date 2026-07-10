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
  CardActionArea,
  Slider,
  Skeleton
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EventNoteIcon from '@mui/icons-material/EventNote';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SchoolIcon from '@mui/icons-material/School';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import ShowChartIcon from '@mui/icons-material/ShowChart';

// Recharts imports
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [todayLectures, setTodayLectures] = useState([]);
  const [aiInsights, setAiInsights] = useState('');
  const [aiLoading, setAiLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tickerTime, setTickerTime] = useState(new Date());

  // Slider simulator states
  const [missCount, setMissCount] = useState(0);
  const [attendCount, setAttendCount] = useState(0);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const analyticRes = await api.get('/analytics/dashboard/');
      setAnalytics(analyticRes.data);

      const todayRes = await api.get('/timetable/slots/today/');
      setTodayLectures(todayRes.data.lectures);
    } catch (err) {
      console.error('Failed to load analytics dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    setAiLoading(true);
    try {
      const aiRes = await api.get('/ai/insights/');
      setAiInsights(aiRes.data.insights);
    } catch (err) {
      console.error('Failed to load AI insights:', err);
      setAiInsights('Failed to generate insights. Please try again later.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAIInsights();

    const interval = setInterval(() => {
      setTickerTime(new Date());
    }, 20000);

    return () => clearInterval(interval);
  }, []);

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

  // Simulation calculations
  const actualLectures = analytics?.total_lectures || 0;
  const actualAttended = (analytics?.present_count || 0) + (analytics?.late_count || 0);
  
  const simulatedTotal = actualLectures + missCount + attendCount;
  const simulatedAttended = actualAttended + attendCount;
  const simulatedPct = simulatedTotal > 0 
    ? Math.round((simulatedAttended / simulatedTotal) * 100 * 10) / 10 
    : 100.0;

  const goal = 75; // cut off

  // Map calendar heatmap dates
  const renderHeatmap = () => {
    const today = new Date();
    const cells = [];
    const daysToShow = 28; // Last 4 weeks
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const checkDateStr = checkDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
      
      // Find matches in heatmap database
      const match = analytics?.calendar_heatmap?.find(c => c.date === checkDateStr);
      let color = 'rgba(0,0,0,0.06)'; // default gray
      let title = `${checkDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}: No Class`;

      if (match) {
        if (match.status === 'Present') {
          color = '#10b981';
          title = `${match.subject}: Present`;
        } else if (match.status === 'Late') {
          color = '#fbbf24';
          title = `${match.subject}: Late`;
        } else {
          color = '#ef4444';
          title = `${match.subject}: Absent`;
        }
      }
      
      cells.push(
        <Box 
          key={checkDateStr} 
          title={title}
          sx={{ 
            width: 20, 
            height: 20, 
            borderRadius: 0.5, 
            bgcolor: color,
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'scale(1.2)' }
          }} 
        />
      );
    }
    return cells;
  };

  if (loading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" py={12}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

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

        {/* AI Insights Panel */}
        <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #8b5cf6' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <AutoAwesomeIcon color="secondary" sx={{ fontSize: 24 }} />
              <Typography variant="h6" fontWeight="bold">Smartttend AI Advice & Insights</Typography>
            </Box>
            
            {aiLoading ? (
              <Box display="flex" flexDirection="column" gap={1}>
                <Skeleton width="95%" height={20} />
                <Skeleton width="90%" height={20} />
                <Skeleton width="60%" height={20} />
              </Box>
            ) : (
              <Box sx={{ whiteSpace: 'pre-line' }}>
                <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
                  {aiInsights}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Stats Row */}
        <Grid container spacing={3}>
          {/* Card 1: Overall Percentage & Score */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: 3 }} variant="outlined">
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold">
                  Overall Attendance
                </Typography>
                <Box display="flex" justifyContent="center" alignItems="center" py={2} position="relative">
                  <svg width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="75" cy="75" r="60" fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth="12" />
                    <circle 
                      cx="75" cy="75" r="60" 
                      fill="transparent" 
                      stroke={analytics?.overall_attendance >= goal ? '#10b981' : '#ef4444'} 
                      strokeWidth="12" 
                      strokeDasharray="377" 
                      strokeDashoffset={377 - (377 * (analytics?.overall_attendance || 0)) / 100} 
                      strokeLinecap="round"
                    />
                  </svg>
                  <Box position="absolute" display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="h3" fontWeight="bold">
                      {analytics?.overall_attendance}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                      Goal: {goal}%
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={`Consistency Score: ${analytics?.score}/100 (${analytics?.score_label})`} 
                  color={analytics?.score_color}
                  icon={<StarIcon />}
                  sx={{ mt: 1, fontWeight: 'bold' }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2: Streaks summary */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: 3 }} variant="outlined">
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6" color="text.secondary" fontWeight="bold">
                  Attendance Streaks
                </Typography>

                <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5} component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">Current Active Streak</Typography>
                  <Chip label={`${analytics?.current_streak} Classes`} color="success" size="small" sx={{ fontWeight: 'bold' }} />
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5} component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">Longest Present Streak</Typography>
                  <Chip label={`${analytics?.longest_present_streak} Classes`} color="primary" size="small" sx={{ fontWeight: 'bold' }} />
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5} component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">Longest Absence Streak</Typography>
                  <Chip label={`${analytics?.longest_absent_streak} Classes`} color="error" size="small" sx={{ fontWeight: 'bold' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 3: Heatmap calendar */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: 3 }} variant="outlined">
              <CardContent>
                <Typography variant="h6" color="text.secondary" fontWeight="bold" mb={2}>
                  Consistency Calendar
                </Typography>
                <Box display="flex" gap={1.2} flexWrap="wrap" sx={{ width: '100%', py: 1 }}>
                  {renderHeatmap()}
                </Box>
                <Box display="flex" gap={2} mt={3} justifyContent="space-between" flexWrap="wrap">
                  <Box display="flex" gap={0.5} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#10b981' }} />
                    <Typography variant="caption">Present</Typography>
                  </Box>
                  <Box display="flex" gap={0.5} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#fbbf24' }} />
                    <Typography variant="caption">Late</Typography>
                  </Box>
                  <Box display="flex" gap={0.5} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#ef4444' }} />
                    <Typography variant="caption">Absent</Typography>
                  </Box>
                  <Box display="flex" gap={0.5} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'rgba(0,0,0,0.06)' }} />
                    <Typography variant="caption">No Class</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Hub */}
        <Grid container spacing={3}>
          {/* Chart 1: Subject comparison BarChart */}
          <Grid item xs={12} md={7}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: 350 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="subtitle1" fontWeight="bold" mb={2}>Subject Comparison</Typography>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={analytics?.subjects || []} margin={{ bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="code" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
                    <Bar dataKey="percentage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Chart 2: Monthly trend LineChart */}
          <Grid item xs={12} md={5}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: 350 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="subtitle1" fontWeight="bold" mb={2}>Attendance Trends</Typography>
                {analytics?.monthly_distribution?.length === 0 ? (
                  <Box display="flex" justify="center" align="center" height="70%">
                    <Typography variant="body2" color="text.secondary">No historical trend data yet</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="80%">
                    <LineChart data={analytics?.monthly_distribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
                      <Line type="monotone" dataKey="percentage" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Scenario Simulator & Subject Grid */}
        <Grid container spacing={3}>
          {/* Left: Simulator */}
          <Grid item xs={12} md={5}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <ShowChartIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">Semester Simulator</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Drag the sliders below to simulate hypothetical check-in outcomes. Percentages refresh in real-time without database writes.
                </Typography>

                <Box>
                  <Typography variant="body2" fontWeight="bold" mb={1}>Attend upcoming classes: +{attendCount}</Typography>
                  <Slider 
                    value={attendCount} 
                    min={0} 
                    max={15} 
                    onChange={(e, val) => setAttendCount(val)} 
                    valueLabelDisplay="auto" 
                  />
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight="bold" mb={1} color="error.main">Miss upcoming classes: -{missCount}</Typography>
                  <Slider 
                    value={missCount} 
                    min={0} 
                    max={15} 
                    onChange={(e, val) => setMissCount(val)} 
                    valueLabelDisplay="auto"
                    color="error"
                  />
                </Box>

                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover' }} variant="outlined">
                  <Typography variant="body2" color="text.secondary">Simulated Final Percentage</Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: simulatedPct >= 75 ? 'success.main' : 'error.main', mt: 0.5 }}>
                    {simulatedPct}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {simulatedPct >= 75 ? 'Eligible for Exams ✓' : 'Below 75% limit ✗'}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>

          {/* Right: Subjects list */}
          <Grid item xs={12} md={7}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" mb={2}>Subject Details (Click to view analysis)</Typography>
                <Grid container spacing={2}>
                  {analytics?.subjects?.map((sub) => (
                    <Grid item xs={12} sm={6} key={sub.id}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardActionArea onClick={() => navigate(`/subjects/${sub.id}`)}>
                          <Box sx={{ p: 2, borderLeft: `5px solid ${sub.color}` }}>
                            <Box display="flex" justify="space-between" mb={1} alignItems="center">
                              <Typography variant="body2" fontWeight="bold">{sub.code}</Typography>
                              <Typography variant="body2" fontWeight="bold" color={sub.percentage >= goal ? 'success.main' : 'error.main'}>
                                {sub.percentage}%
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {sub.name}
                            </Typography>
                            <Box mt={1.5}>
                              <LinearProgress 
                                variant="determinate" 
                                value={sub.percentage} 
                                color={sub.percentage >= goal ? 'success' : 'error'}
                                sx={{ height: 5, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
};

export default Dashboard;
