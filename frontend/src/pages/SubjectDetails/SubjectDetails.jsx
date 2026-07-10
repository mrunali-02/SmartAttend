import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SubjectIcon from '@mui/icons-material/Subject';
import PersonIcon from '@mui/icons-material/Person';
import GradeIcon from '@mui/icons-material/Grade';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

// Recharts imports
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const SubjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubjectDetails = async () => {
    setLoading(true);
    try {
      const subRes = await api.get(`/timetable/subjects/${id}/`);
      setSubject(subRes.data);

      const histRes = await api.get('/attendance/records/', { params: { subject: id } });
      setHistory(histRes.data);
    } catch (err) {
      console.error('Failed to load subject details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjectDetails();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" py={12}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (!subject) {
    return (
      <AppLayout>
        <Box py={6} textAlign="center">
          <Typography variant="h6" color="error">Subject not found.</Typography>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
            Go Back
          </Button>
        </Box>
      </AppLayout>
    );
  }

  // Calculate cumulative attendance over time for AreaChart
  const getCumulativeChartData = () => {
    // Sort history by date ascending
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    
    let runningTotal = 0;
    let runningAttended = 0;
    
    return sorted.map((record) => {
      runningTotal += 1;
      if (record.status === 'Present' || record.status === 'Late') {
        runningAttended += 1;
      }
      return {
        date: new Date(record.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        percentage: Math.round((runningAttended / runningTotal) * 100)
      };
    });
  };

  // Pie chart data
  const pieData = [
    { name: 'Present', value: subject.present_count, color: '#10b981' },
    { name: 'Late', value: subject.late_count, color: '#fbbf24' },
    { name: 'Absent', value: subject.absent_count, color: '#ef4444' }
  ].filter(d => d.value > 0); // hide 0 value slices

  // Smart bunk calculator
  const attended = subject.present_count + subject.late_count;
  const total = subject.total_lectures;
  const percentage = subject.attendance_percentage;
  const target = 75;
  
  let adviceMessage = '';
  let adviceColor = 'info.main';

  if (percentage < target && total > 0) {
    const needed = Math.ceil((0.75 * total - attended) / 0.25);
    adviceMessage = `Do not miss your upcoming classes. You need to attend the next ${needed} lecture${needed > 1 ? 's' : ''} consecutively to bring your average back to ${target}%.`;
    adviceColor = 'error.main';
  } else if (total === 0) {
    adviceMessage = 'No attendance recorded yet. Attend your next class to establish a record!';
  } else {
    const maxMiss = Math.floor(attended / 0.75 - total);
    if (maxMiss > 0) {
      adviceMessage = `Safe Bunking: You can safely miss the next ${maxMiss} lecture${maxMiss > 1 ? 's' : ''} without falling below the ${target}% requirement.`;
      adviceColor = 'success.main';
    } else {
      adviceMessage = `Warning: You are exactly at the threshold. Bunking the next class will put you in the critical attendance zone.`;
      adviceColor = 'warning.main';
    }
  }

  return (
    <AppLayout>
      <Box display="flex" flexDirection="column" gap={3}>
        {/* Back Button */}
        <Box display="flex" alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ fontWeight: 'bold' }}>
            Back to Dashboard
          </Button>
        </Box>

        {/* Hero Card */}
        <Card 
          variant="outlined" 
          sx={{ 
            borderRadius: 3, 
            borderLeft: `8px solid ${subject.color || '#3b82f6'}`,
            bgcolor: 'background.paper'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {subject.name}
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 1 }}>
                  <Grid item display="flex" alignItems="center" gap={0.5}>
                    <SubjectIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">Code: {subject.code}</Typography>
                  </Grid>
                  <Grid item sx={{ mx: 1.5 }} color="divider">|</Grid>
                  <Grid item display="flex" alignItems="center" gap={0.5}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">Faculty: {subject.faculty_name}</Typography>
                  </Grid>
                  <Grid item sx={{ mx: 1.5 }} color="divider">|</Grid>
                  <Grid item display="flex" alignItems="center" gap={0.5}>
                    <GradeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">Credits: {subject.credits}</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Chip label={`Semester ${subject.semester} - Div ${subject.division}`} color="primary" variant="outlined" sx={{ fontWeight: 'bold' }} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <Grid container spacing={3}>
          {/* Card 1: Attendance Percentage Ring */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%', borderRadius: 3 }} variant="outlined">
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <Typography variant="h6" fontWeight="bold" color="text.secondary" gutterBottom>
                  Subject Attendance
                </Typography>
                <Box display="flex" justifyContent="center" alignItems="center" py={4} position="relative">
                  <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="90" cy="90" r="75" fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth="14" />
                    <circle 
                      cx="90" cy="90" r="75" 
                      fill="transparent" 
                      stroke={percentage >= 75 ? '#10b981' : '#ef4444'} 
                      strokeWidth="14" 
                      strokeDasharray="471" 
                      strokeDashoffset={471 - (471 * percentage) / 100} 
                      strokeLinecap="round"
                    />
                  </svg>
                  <Box position="absolute" display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="h2" fontWeight="bold">
                      {percentage}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                      {percentage >= 75 ? 'Good Standing' : 'Low Attendance'}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" align="center" mt={1}>
                  Total Lectures Attended: <strong>{attended}</strong> / {total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2: Pie Ratio & Smart Bunk Calculator */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%', borderRadius: 3, display: 'flex', flexDirection: 'column', justify: 'space-between' }} variant="outlined">
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                    Attendance Distribution
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={6} display="flex" flexDirection="column" gap={1.5}>
                      <Box display="flex" justify="space-between" p={1} component={Paper} variant="outlined">
                        <Typography variant="caption" color="text.secondary">Present</Typography>
                        <Typography variant="caption" fontWeight="bold" color="success.main">{subject.present_count}</Typography>
                      </Box>
                      <Box display="flex" justify="space-between" p={1} component={Paper} variant="outlined">
                        <Typography variant="caption" color="text.secondary">Late</Typography>
                        <Typography variant="caption" fontWeight="bold" color="warning.main">{subject.late_count}</Typography>
                      </Box>
                      <Box display="flex" justify="space-between" p={1} component={Paper} variant="outlined">
                        <Typography variant="caption" color="text.secondary">Absent</Typography>
                        <Typography variant="caption" fontWeight="bold" color="error.main">{subject.absent_count}</Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6} sx={{ height: 130 }}>
                      {pieData.length === 0 ? (
                        <Box display="flex" justify="center" align="center" height="100%">
                          <Typography variant="caption" color="text.secondary">No ratio details</Typography>
                        </Box>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={50}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} Lectures`, 'Total']} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </Grid>
                  </Grid>
                </Box>

                <Box bgcolor="action.hover" p={2.5} borderRadius={3} borderLeft={`5px solid ${percentage >= 75 ? '#10b981' : '#ef4444'}`}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: adviceColor, mb: 0.5 }}>
                    Smart Bunk Calculator
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {adviceMessage}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Hub */}
        {history.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 3, height: 350 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>Cumulative Attendance Over Time</Typography>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={getCumulativeChartData()}>
                  <defs>
                    <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={subject.color || '#3b82f6'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={subject.color || '#3b82f6'} stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
                  <Area type="monotone" dataKey="percentage" stroke={subject.color || '#3b82f6'} strokeWidth={3} fillOpacity={1} fill="url(#colorPct)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* History List */}
        <Box mt={2}>
          <Typography variant="h6" fontWeight="bold" mb={2}>Recent Attendance Logs</Typography>
          {history.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }} variant="outlined">
              <HourglassEmptyIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">No attendance recorded yet for this subject.</Typography>
            </Paper>
          ) : (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <List sx={{ p: 0 }}>
                {history.map((record, idx) => (
                  <React.Fragment key={record.id}>
                    <ListItem sx={{ py: 2, px: 3 }}>
                      <ListItemIcon>
                        {record.status === 'Present' ? (
                          <CheckCircleIcon color="success" />
                        ) : record.status === 'Absent' ? (
                          <CancelIcon color="error" />
                        ) : (
                          <AccessTimeIcon color="warning" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="bold">
                            Marked {record.status} on {new Date(record.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </Typography>
                        }
                        secondary={
                          record.time_difference !== null ? (
                            <Typography variant="caption" color="text.secondary">
                              Checked in {record.time_difference === 0 ? 'exactly on time' : record.time_difference > 0 ? `+${record.time_difference} mins late` : `${record.time_difference} mins early`} • {record.remarks || 'No remarks'}
                            </Typography>
                          ) : '-'
                        }
                      />
                      <Chip label={record.status} size="small" color={record.status === 'Present' ? 'success' : record.status === 'Absent' ? 'error' : 'warning'} sx={{ fontWeight: 'bold' }} />
                    </ListItem>
                    {idx < history.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Card>
          )}
        </Box>
      </Box>
    </AppLayout>
  );
};

export default SubjectDetails;
