import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
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
  Button
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EventNoteIcon from '@mui/icons-material/EventNote';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SubjectIcon from '@mui/icons-material/Subject';
import StarBorderIcon from '@mui/icons-material/StarBorder';

const Dashboard = () => {
  const { user } = useAuth();

  const overallAttendance = 78;
  const attendanceGoal = 85;

  const lectures = [
    { id: 1, subject: 'Database Management Systems', time: '09:00 AM - 10:00 AM', room: 'Lab 3', status: 'Completed' },
    { id: 2, subject: 'Operating Systems', time: '10:15 AM - 11:15 AM', room: 'Room 402', status: 'Completed' },
    { id: 3, subject: 'Computer Networks', time: '11:30 AM - 12:30 PM', room: 'Room 402', status: 'Upcoming' },
    { id: 4, subject: 'Software Engineering', time: '02:00 PM - 03:00 PM', room: 'Auditorium A', status: 'Upcoming' },
  ];

  const subjects = [
    { name: 'Database Management Systems', code: 'CS301', attended: 22, total: 25, percentage: 88 },
    { name: 'Operating Systems', code: 'CS302', attended: 17, total: 25, percentage: 68 },
    { name: 'Computer Networks', code: 'CS303', attended: 20, total: 27, percentage: 74 },
    { name: 'Software Engineering', code: 'CS304', attended: 24, total: 26, percentage: 92 },
  ];

  const recentActivity = [
    { id: 1, type: 'Present', subject: 'Operating Systems', date: 'Today, 10:30 AM' },
    { id: 2, type: 'Present', subject: 'Database Management Systems', date: 'Today, 09:15 AM' },
    { id: 3, type: 'Absent', subject: 'Computer Networks', date: 'Yesterday, 11:45 AM' },
    { id: 4, type: 'Present', subject: 'Software Engineering', date: 'July 8, 2026, 02:05 PM' },
  ];

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
          }}
        >
          <CardContent sx={{ p: 3 }}>
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
                    Tip: Attend today's "Computer Networks" lecture to push your attendance above 75% in that subject!
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Button 
                  variant="contained" 
                  onClick={() => alert("AI Advice is interface only in Phase 1")}
                  sx={{ 
                    bgcolor: '#f59e0b', 
                    color: '#000000',
                    fontWeight: 'bold',
                    '&:hover': { bgcolor: '#d97706' }
                  }}
                >
                  Ask AI Assistant
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <Grid container spacing={3}>
          {/* Card 1: Overall Attendance */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold">
                  Overall Attendance
                </Typography>
                <Box display="flex" justifyContent="center" alignItems="center" py={3} position="relative">
                  <svg width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="75" cy="75" r="60" fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth="12" />
                    <circle 
                      cx="75" cy="75" r="60" 
                      fill="transparent" 
                      stroke={overallAttendance >= 75 ? '#10b981' : '#f59e0b'} 
                      strokeWidth="12" 
                      strokeDasharray="377" 
                      strokeDashoffset={377 - (377 * overallAttendance) / 100} 
                      strokeLinecap="round"
                    />
                  </svg>
                  <Box position="absolute" display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="h3" fontWeight="bold">
                      {overallAttendance}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Good Standing
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 4: Attendance Goal */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold">
                    Attendance Goal
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={3} mb={1}>
                    <Typography variant="h4" fontWeight="bold">
                      {overallAttendance}% <Typography component="span" variant="body1" color="text.secondary">/ {attendanceGoal}% Goal</Typography>
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(overallAttendance / attendanceGoal) * 100} 
                    sx={{ height: 8, borderRadius: 4, mb: 3 }}
                  />
                </Box>
                <Box bgcolor="action.hover" p={2} borderRadius={2}>
                  <Box display="flex" gap={1} alignItems="flex-start">
                    <WarningAmberIcon color="warning" />
                    <Typography variant="body2" color="text.secondary">
                      You need to attend the next <strong>4 lectures</strong> consecutively to raise your total average to the <strong>{attendanceGoal}%</strong> target.
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2: Today's Lectures */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold">
                  Today's Lectures
                </Typography>
                <List>
                  {lectures.map((lecture, index) => (
                    <Box key={lecture.id}>
                      <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                          <EventNoteIcon color={lecture.status === 'Completed' ? 'action' : 'primary'} />
                        </ListItemIcon>
                        <ListItemText
                          primary={lecture.subject}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                          secondary={
                            <Typography component="span" variant="caption" color="text.secondary">
                              {lecture.time} • {lecture.room}
                            </Typography>
                          }
                        />
                        <Box sx={{ ml: 'auto' }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              px: 1, 
                              py: 0.2, 
                              borderRadius: 1,
                              bgcolor: lecture.status === 'Completed' ? 'action.selected' : 'primary.light',
                              color: lecture.status === 'Completed' ? 'text.secondary' : 'primary.contrastText',
                              fontWeight: 'bold'
                            }}
                          >
                            {lecture.status}
                          </Typography>
                        </Box>
                      </ListItem>
                      {index < lectures.length - 1 && <Divider component="li" />}
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 3: Subjects List */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  Subject-wise Attendance
                </Typography>
                <Grid container spacing={2}>
                  {subjects.map((subj) => (
                    <Grid item xs={12} key={subj.code}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Box display="flex" justifyContent="space-between" mb={1} alignItems="center">
                          <Box display="flex" alignItems="center" gap={1}>
                            <SubjectIcon color="primary" />
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {subj.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {subj.code} • Attended: {subj.attended}/{subj.total}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography 
                            variant="body2" 
                            fontWeight="bold" 
                            color={subj.percentage >= 75 ? 'success.main' : 'warning.main'}
                          >
                            {subj.percentage}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={subj.percentage} 
                          color={subj.percentage >= 75 ? 'success' : 'warning'}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 5: Recent Activity */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="bold">
                  Recent Activity
                </Typography>
                <List>
                  {recentActivity.map((activity, index) => (
                    <Box key={activity.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <StarBorderIcon color={activity.type === 'Present' ? 'success' : 'error'} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight="medium">
                              Marked <strong>{activity.type}</strong> in {activity.subject}
                            </Typography>
                          }
                          secondary={activity.date}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                      {index < recentActivity.length - 1 && <Divider component="li" />}
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
};

export default Dashboard;
