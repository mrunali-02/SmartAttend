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
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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

const SubjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubjectDetails = async () => {
    setLoading(true);
    try {
      // Get subject stats
      const subRes = await api.get(`/timetable/subjects/${id}/`);
      setSubject(subRes.data);

      // Get history filtered by this subject
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

  // Smart calculations
  const attended = subject.present_count + subject.late_count;
  const total = subject.total_lectures;
  const percentage = subject.attendance_percentage;
  const target = 75; // Default college goal 75%
  
  let adviceMessage = '';
  let adviceColor = 'info.main';

  if (percentage < target && total > 0) {
    // Needs consecutive lectures
    const needed = Math.ceil((0.75 * total - attended) / 0.25);
    adviceMessage = `You need to attend the next ${needed} lecture${needed > 1 ? 's' : ''} consecutively to reach the ${target}% threshold.`;
    adviceColor = 'error.main';
  } else if (total === 0) {
    adviceMessage = 'No attendance recorded yet. Attend your next class to establish a record!';
  } else {
    // Safe, calculate miss budget
    const maxMiss = Math.floor(attended / 0.75 - total);
    if (maxMiss > 0) {
      adviceMessage = `You are in good standing! You can safely miss the next ${maxMiss} lecture${maxMiss > 1 ? 's' : ''} without falling below ${target}%.`;
      adviceColor = 'success.main';
    } else {
      adviceMessage = `You are exactly at the threshold. Avoid missing the next lecture to maintain your standing.`;
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
          {/* Card 1: Attendance Percentage Progress */}
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
                      stroke={percentage >= 75 ? '#10b981' : '#f59e0b'} 
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

          {/* Card 2: Counts & Advice */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%', borderRadius: 3, display: 'flex', flexDirection: 'column', justify: 'space-between' }} variant="outlined">
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold" color="text.secondary" gutterBottom>
                    Attendance Statistics
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                        <Typography variant="h4" fontWeight="bold">{subject.present_count}</Typography>
                        <Typography variant="caption" display="block">Present</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                        <Typography variant="h4" fontWeight="bold">{subject.late_count}</Typography>
                        <Typography variant="caption" display="block">Late</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                        <Typography variant="h4" fontWeight="bold">{subject.absent_count}</Typography>
                        <Typography variant="caption" display="block">Absent</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                <Box bgcolor="action.hover" p={2.5} borderRadius={3} borderLeft={`5px solid ${percentage >= 75 ? '#10b981' : '#ef4444'}`}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: adviceColor, mb: 0.5 }}>
                    Smart Guidance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {adviceMessage}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

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
