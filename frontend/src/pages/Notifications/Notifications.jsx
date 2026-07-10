import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Snackbar,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventNoteIcon from '@mui/icons-material/EventNote';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const NotificationsCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState(0); // 0 = All, 1 = Warnings, 2 = Reminders, 3 = Goals
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/attendance/notifications/');
      setNotifications(res.data);
    } catch (err) {
      showNotification('Failed to fetch notifications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/attendance/notifications/read-all/');
      showNotification('All notifications marked as read.');
      fetchNotifications();
    } catch (err) {
      showNotification('Failed to update notifications.', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete all notifications?')) return;
    try {
      await api.post('/attendance/notifications/clear-all/');
      showNotification('All notifications cleared.');
      fetchNotifications();
    } catch (err) {
      showNotification('Failed to clear notifications.', 'error');
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/attendance/notifications/${id}/`);
      setNotifications(notifications.filter(n => n.id !== id));
      showNotification('Notification deleted.');
    } catch (err) {
      showNotification('Failed to delete notification.', 'error');
    }
  };

  const handleMarkSingleRead = async (id) => {
    try {
      await api.patch(`/attendance/notifications/${id}/`, { is_read: true });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Warning': return <WarningAmberIcon color="error" />;
      case 'Reminder': return <EventNoteIcon color="primary" />;
      case 'Goal': return <EmojiEventsIcon color="warning" />;
      default: return <NotificationsIcon color="action" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      default: return 'default';
    }
  };

  // Filtering logs
  const getFilteredNotifications = () => {
    if (filterTab === 0) return notifications;
    if (filterTab === 1) return notifications.filter(n => n.category === 'Warning');
    if (filterTab === 2) return notifications.filter(n => n.category === 'Reminder');
    return notifications.filter(n => n.category === 'Goal');
  };

  const filteredLogs = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppLayout>
      <Box display="flex" flexDirection="column" gap={3}>
        {/* Actions Row */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Tabs value={filterTab} onChange={(e, val) => setFilterTab(val)} textColor="primary" indicatorColor="primary">
              <Tab label="All Alerts" />
              <Tab label="Warnings" />
              <Tab label="Reminders" />
              <Tab label="Goals" />
            </Tabs>
            {unreadCount > 0 && (
              <Chip label={`${unreadCount} New`} color="error" size="small" sx={{ fontWeight: 'bold' }} />
            )}
          </Box>

          {notifications.length > 0 && (
            <Box display="flex" gap={1.5}>
              <Button variant="outlined" startIcon={<CheckCircleIcon />} onClick={handleMarkAllRead} size="small">
                Mark All Read
              </Button>
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleClearAll} size="small">
                Clear All
              </Button>
            </Box>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
          </Box>
        ) : filteredLogs.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }} variant="outlined">
            <NotificationsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold">No notifications found</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Your notification feed is completely clear. Good job!
            </Typography>
          </Paper>
        ) : (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <List sx={{ p: 0 }}>
              {filteredLogs.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <ListItem
                    sx={{
                      py: 2.5,
                      px: 3,
                      bgcolor: item.is_read ? 'transparent' : 'action.hover',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                    secondaryAction={
                      <Box display="flex" gap={1}>
                        {!item.is_read && (
                          <IconButton size="small" color="primary" onClick={() => handleMarkSingleRead(item.id)} title="Mark as Read">
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton size="small" color="error" onClick={() => handleDeleteNotification(item.id)} title="Delete">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {getCategoryIcon(item.category)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                          <Typography variant="body2" fontWeight={item.is_read ? 'medium' : 'bold'}>
                            {item.title}
                          </Typography>
                          <Chip label={item.priority} size="small" color={getPriorityColor(item.priority)} sx={{ height: 16, fontSize: '0.6rem', fontWeight: 'bold' }} />
                        </Box>
                      }
                      secondary={
                        <Box mt={0.5}>
                          <Typography variant="body2" color="text.primary" gutterBottom sx={{ fontSize: '0.9rem' }}>
                            {item.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < filteredLogs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Card>
        )}
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

export default NotificationsCenter;
