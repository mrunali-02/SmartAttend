import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';
import { useColorMode } from '../../context/ThemeContext';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  CircularProgress,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Snackbar,
  Alert,
  Paper
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const Settings = () => {
  const { mode, toggleColorMode } = useColorMode();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  
  // Settings values state
  const [goal, setGoal] = useState(75);
  const [reminderMins, setReminderMins] = useState(15);
  const [syncCalendar, setSyncCalendar] = useState(false);
  const [favoriteLayout, setFavoriteLayout] = useState('Default');
  const [geofencing, setGeofencing] = useState(false);
  const [latitude, setLatitude] = useState(19.076);
  const [longitude, setLongitude] = useState(72.8777);
  const [radius, setRadius] = useState(200);

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/memory/');
      setGoal(res.data.preferred_goal);
      setReminderMins(res.data.reminder_time_mins);
      setSyncCalendar(res.data.sync_calendar);
      setFavoriteLayout(res.data.favorite_layout);
      setGeofencing(res.data.geofencing_enabled);
      setLatitude(res.data.college_latitude);
      setLongitude(res.data.college_longitude);
      setRadius(res.data.geofence_radius_meters);
    } catch (err) {
      showNotification('Failed to fetch user settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/ai/memory/', {
        preferred_goal: goal,
        reminder_time_mins: reminderMins,
        sync_calendar: syncCalendar,
        favorite_layout: favoriteLayout,
        geofencing_enabled: geofencing,
        college_latitude: latitude,
        college_longitude: longitude,
        geofence_radius_meters: radius
      });
      showNotification('Preferences updated successfully.');
    } catch (err) {
      showNotification('Failed to save preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearChatHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your AI Assistant chat logs? This cannot be undone.')) return;
    setClearingChat(true);
    try {
      await api.delete('/ai/chat/history/');
      showNotification('AI chat conversation history deleted.');
    } catch (err) {
      showNotification('Failed to clear chat history.', 'error');
    } finally {
      setClearingChat(false);
    }
  };

  const handleExportICS = async () => {
    try {
      // Stream ICS calendar download
      const response = await api.get('/timetable/calendar/export/', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'smartttend_timetable_schedule.ics');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      showNotification('iCalendar (ICS) schedule downloaded successfully.');
    } catch (err) {
      showNotification('Failed to download calendar schedule.', 'error');
    }
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
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight="bold" mb={3}>Preferences & Settings</Typography>

            <Grid container spacing={4}>
              {/* Left Column: Theme & General Settings */}
              <Grid item xs={12} md={6} display="flex" flexDirection="column" gap={3.5}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" mb={1.5}>Appearance</Typography>
                  <FormControlLabel
                    control={<Switch checked={mode === 'dark'} onChange={toggleColorMode} />}
                    label="Dark Mode Theme"
                  />
                </Box>

                <Divider />

                <Box display="flex" flexDirection="column" gap={2}>
                  <Typography variant="subtitle1" fontWeight="bold">Attendance Goals & Rules</Typography>
                  
                  <TextField
                    label="Preferred Attendance Goal (%)"
                    type="number"
                    size="small"
                    value={goal}
                    onChange={(e) => setGoal(parseInt(e.target.value) || 75)}
                    helperText="Minimum class attendance ratio percentage (e.g. 75% or 80%)"
                  />

                  <TextField
                    label="Lecture Reminders Timing (mins before)"
                    select
                    size="small"
                    value={reminderMins}
                    onChange={(e) => setReminderMins(e.target.value)}
                    helperText="Alert timing before classes start"
                  >
                    <MenuItem value={5}>5 minutes before</MenuItem>
                    <MenuItem value={10}>10 minutes before</MenuItem>
                    <MenuItem value={15}>15 minutes before</MenuItem>
                    <MenuItem value={30}>30 minutes before</MenuItem>
                  </TextField>
                </Box>

                <Divider />

                {/* Calendar Sync Widget */}
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CalendarTodayIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">Calendar Integration</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Export your timetable to Google Calendar, Apple Calendar, or Microsoft Outlook. Syncing generates recurring weekly events based on your slot registry.
                  </Typography>
                  
                  <FormControlLabel
                    control={<Switch checked={syncCalendar} onChange={(e) => setSyncCalendar(e.target.checked)} />}
                    label="Enable Background Sync"
                  />
                  
                  <Box>
                    <Button variant="outlined" startIcon={<CloudDownloadIcon />} onClick={handleExportICS}>
                      Download ICS Calendar File
                    </Button>
                  </Box>
                </Box>
              </Grid>

              {/* Right Column: Geofencing & Danger Zone */}
              <Grid item xs={12} md={6} display="flex" flexDirection="column" gap={3.5}>
                {/* Geofencing configuration */}
                <Box display="flex" flexDirection="column" gap={2.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationOnIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">Campus Geofencing</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Optionally restrict attendance check-ins to campus boundaries. Checks your current coordinates before marking check-ins.
                  </Typography>

                  <FormControlLabel
                    control={<Switch checked={geofencing} onChange={(e) => setGeofencing(e.target.checked)} />}
                    label="Require Campus Location Verification"
                  />

                  {geofencing && (
                    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 2 }}>
                      <TextField
                        label="College Latitude"
                        type="number"
                        size="small"
                        value={latitude}
                        onChange={(e) => setLatitude(parseFloat(e.target.value) || 0.0)}
                      />
                      <TextField
                        label="College Longitude"
                        type="number"
                        size="small"
                        value={longitude}
                        onChange={(e) => setLongitude(parseFloat(e.target.value) || 0.0)}
                      />
                      <TextField
                        label="Allowed Radius Bounds (meters)"
                        type="number"
                        size="small"
                        value={radius}
                        onChange={(e) => setRadius(parseInt(e.target.value) || 100)}
                      />
                    </Paper>
                  )}
                </Box>

                <Divider />

                {/* Chat cleanup / Danger zone */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" color="error.main" mb={2}>Danger Zone</Typography>
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleClearChatHistory} disabled={clearingChat}>
                    {clearingChat ? <CircularProgress size={20} color="inherit" /> : 'Clear AI Chat History'}
                  </Button>
                </Box>
              </Grid>
            </Grid>

            <Box mt={4} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                disabled={saving}
                sx={{ px: 4, py: 1, fontWeight: 'bold', borderRadius: 2 }}
              >
                {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Preferences'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Snackbar alerts */}
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default Settings;
