import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
import api from '../../services/api';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Tooltip
} from '@mui/material';
import { 
  LayoutDashboard as DashboardIcon, 
  Calendar as CalendarTodayIcon, 
  CheckSquare as CheckCircleIcon, 
  Sparkles as AutoAwesomeIcon, 
  Settings as SettingsIcon, 
  User as PersonIcon, 
  Moon as Brightness4Icon, 
  Sun as Brightness7Icon, 
  X as CloseIcon, 
  Send as SendIcon, 
  Check as CheckIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

const DRAWER_WIDTH = 240;

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { toggleColorMode, mode } = useColorMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const isSettingsPage = location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile');

  // Navigation Profile Menu states
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const openProfileMenu = Boolean(profileAnchorEl);

  // Global AI Drawer states
  const [aiOpen, setAiOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiSending, setAiSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleOpenAi = () => setAiOpen(true);
    const handleOpenQuick = () => setQuickMarkOpen(true);
    window.addEventListener('openAiDrawer', handleOpenAi);
    window.addEventListener('openQuickMark', handleOpenQuick);
    return () => {
      window.removeEventListener('openAiDrawer', handleOpenAi);
      window.removeEventListener('openQuickMark', handleOpenQuick);
    };
  }, []);

  // Global Quick Attendance states
  const [quickMarkOpen, setQuickMarkOpen] = useState(false);
  const [todaySlots, setTodaySlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [quickStatus, setQuickStatus] = useState('Present');
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const showToast = (message, severity = 'success') => {
    if (severity === 'success') toast.success(message);
    else if (severity === 'error') toast.error(message);
    else if (severity === 'warning') toast.warning(message);
    else toast(message);
  };

  // Fetch today's slots for quick-marking
  const fetchTodaySlots = async () => {
    try {
      const res = await api.get('/timetable/slots/today/');
      const slots = res.data.lectures || [];
      setTodaySlots(slots);
      
      // Auto-detect current active lecture
      const now = new Date();
      const active = slots.find(slot => {
        const [startH, startM] = slot.start_time.split(':').map(Number);
        const [endH, endM] = slot.end_time.split(':').map(Number);
        const startDt = new Date();
        startDt.setHours(startH, startM, 0, 0);
        const endDt = new Date();
        endDt.setHours(endH, endM, 0, 0);
        return now >= startDt && now <= endDt;
      });

      if (active) {
        setSelectedSlot(active);
      } else if (slots.length > 0) {
        // Fallback to first unmarked slot of today
        const unmarked = slots.find(s => s.attendance_status === null);
        setSelectedSlot(unmarked || slots[0]);
      }
    } catch (err) {
      console.error('Failed to fetch today slots for quick marking:', err);
    }
  };

  useEffect(() => {
    if (quickMarkOpen) {
      fetchTodaySlots();
    }
  }, [quickMarkOpen]);

  // AI Assistant loader
  const loadAIConversations = async () => {
    setAiLoading(true);
    try {
      const res = await api.get('/ai/conversations/');
      setConversations(res.data);
      if (res.data.length > 0) {
        setActiveConvId(res.data[0].id);
        const detailRes = await api.get(`/ai/conversations/${res.data[0].id}/`);
        setMessages(detailRes.data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load AI conversations:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (aiOpen) {
      loadAIConversations();
    }
  }, [aiOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, aiSending]);

  const handleSendAiMessage = async () => {
    if (!aiInput.trim()) return;
    const text = aiInput;
    setAiInput('');
    setMessages(prev => [...prev, { role: 'user', message: text }]);
    setAiSending(true);

    try {
      const res = await api.post('/ai/chat/', {
        message: text,
        conversation_id: activeConvId
      });
      setMessages(prev => [...prev, { role: 'model', message: res.data.response }]);
      if (!activeConvId) {
        setActiveConvId(res.data.id);
        loadAIConversations();
      }
    } catch (err) {
      showToast('AI reply failed. Check connection.', 'error');
    } finally {
      setAiSending(false);
    }
  };

  const handleQuickMarkSubmit = async () => {
    if (!selectedSlot) {
      showToast('Please select a lecture to mark.', 'warning');
      return;
    }

    setQuickSubmitting(true);
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
      console.warn('GPS coordinates skipped for quick check-in:', err);
    }

    try {
      await api.post('/attendance/records/mark/', {
        lecture_slot_id: selectedSlot.id,
        date: todayDateStr,
        status: quickStatus,
        device_time: deviceTimeStr,
        remarks: 'Quick marked via global button',
        latitude: lat,
        longitude: lon
      });
      showToast(`Marked ${selectedSlot.subject_details?.name} as ${quickStatus}!`);
      setQuickMarkOpen(false);

      // Trigger custom global event so pages can auto-refresh without reload
      window.dispatchEvent(new CustomEvent('attendanceMarked'));
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to check-in.';
      showToast(errorMsg, 'error');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const menuItems = [
    { text: 'Home', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Timetable', icon: <CalendarTodayIcon />, path: '/timetable' },
    { text: 'Attendance', icon: <CheckCircleIcon />, path: '/attendance' },
    { text: 'AI', icon: <AutoAwesomeIcon />, path: 'ai-drawer' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2, px: 2.5 }}>
        <CheckCircleIcon color="primary" sx={{ fontSize: 30 }} />
        <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ letterSpacing: 0.5 }}>
          Smartttend
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 2, py: 2, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isAI = item.path === 'ai-drawer';
          const isSelected = !isAI && location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => {
                  if (isAI) {
                    setAiOpen(true);
                  } else {
                    navigate(item.path);
                  }
                }}
                sx={{
                  borderRadius: 2.5,
                  py: 1.2,
                  bgcolor: isSelected ? 'primary.main' : 'transparent',
                  color: isSelected ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    bgcolor: isSelected ? 'primary.main' : 'action.hover',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isSelected ? 'primary.contrastText' : 'text.secondary',
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 500 }}>{item.text}</Typography>} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Desktop Sidebar Drawer */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: 1, borderColor: 'divider' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Right Content Area (Main Content) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: '100vh' }}>
        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2.5, md: 4 },
            pb: { xs: 12, md: 10 } // Extra bottom padding for mobile bottom navigation / global FAB
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Global Quick Attendance Button */}
      {user && !isSettingsPage && (
        <Fab
          variant="extended"
          color="primary"
          onClick={() => setQuickMarkOpen(true)}
          sx={{
            position: 'fixed',
            bottom: { xs: 76, md: 24 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1050,
            px: 3,
            boxShadow: '0 8px 24px rgba(30, 58, 138, 0.25)',
            '&:hover': { transform: 'translateX(-50%) scale(1.05)', bgcolor: 'primary.dark' },
            transition: 'all 0.2s',
            fontWeight: 'bold',
            borderRadius: 5
          }}
        >
          <CheckIcon sx={{ mr: 1, fontWeight: 'bold' }} />
          Mark Attendance
        </Fab>
      )}

      {/* Floating AI Button (Desktop only on bottom right, since AI is also in bottom nav for mobile) */}
      {!isMobile && user && !isSettingsPage && (
        <IconButton 
          onClick={() => setAiOpen(true)}
          sx={{ 
            position: 'fixed', 
            bottom: 24, 
            right: 24, 
            bgcolor: 'secondary.main', 
            color: 'secondary.contrastText',
            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
            width: 56,
            height: 56,
            zIndex: 1000,
            '&:hover': { bgcolor: 'secondary.dark', transform: 'scale(1.1)' },
            transition: 'all 0.2s'
          }}
        >
          <AutoAwesomeIcon />
        </IconButton>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && user && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, borderTop: '1px solid', borderColor: 'divider' }} elevation={4}>
          <BottomNavigation
            value={
              location.pathname === '/dashboard' ? 0 :
              location.pathname === '/timetable' ? 1 :
              location.pathname === '/attendance' ? 2 :
              location.pathname === '/profile' ? 4 : -1
            }
            onChange={(event, newValue) => {
              if (newValue === 0) navigate('/dashboard');
              else if (newValue === 1) navigate('/timetable');
              else if (newValue === 2) navigate('/attendance');
              else if (newValue === 3) setAiOpen(true);
              else if (newValue === 4) navigate('/profile');
            }}
            showLabels
          >
            <BottomNavigationAction label="Home" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Timetable" icon={<CalendarTodayIcon />} />
            <BottomNavigationAction label="Attendance" icon={<CheckCircleIcon />} />
            <BottomNavigationAction label="AI" icon={<AutoAwesomeIcon />} />
            <BottomNavigationAction label="Profile" icon={<PersonIcon />} />
          </BottomNavigation>
        </Paper>
      )}

      {/* Global Quick Attendance Dialog */}
      <Dialog 
        open={quickMarkOpen} 
        onClose={() => setQuickMarkOpen(false)} 
        fullWidth 
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4, px: 1, py: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Quick Mark Attendance
          <IconButton onClick={() => setQuickMarkOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          {todaySlots.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" py={3}>
              No lectures scheduled for today.
            </Typography>
          ) : (
            <Box display="flex" flexDirection="column" gap={3} pt={1}>
              <FormControl fullWidth size="small">
                <InputLabel>Lecture Slot</InputLabel>
                <Select
                  value={selectedSlot ? selectedSlot.id : ''}
                  label="Lecture Slot"
                  onChange={(e) => setSelectedSlot(todaySlots.find(s => s.id === e.target.value))}
                >
                  {todaySlots.map(slot => (
                    <MenuItem key={slot.id} value={slot.id}>
                      {slot.start_time.substring(0, 5)} - {slot.subject_details?.name} ({slot.attendance_status || 'Unmarked'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedSlot && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">CURRENT SELECTION</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedSlot.subject_details?.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedSlot.start_time.substring(0, 5)} to {selectedSlot.end_time.substring(0, 5)} • Block {selectedSlot.building || 'TBD'} Room {selectedSlot.classroom || 'TBD'}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>SELECT STATUS</Typography>
                <Box display="flex" gap={1.5} justifyContent="center">
                  {['Present', 'Absent', 'Late'].map((status) => {
                    const isSelected = quickStatus === status;
                    return (
                      <Chip
                        key={status}
                        label={status}
                        onClick={() => setQuickStatus(status)}
                        color={isSelected ? (status === 'Present' ? 'success' : status === 'Absent' ? 'error' : 'warning') : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={{ px: 2, py: 2.2, fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                      />
                    );
                  })}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={() => setQuickMarkOpen(false)} disabled={quickSubmitting}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleQuickMarkSubmit}
            disabled={quickSubmitting || todaySlots.length === 0}
            sx={{ fontWeight: 'bold', borderRadius: 2 }}
          >
            {quickSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global AI Chat Drawer (Right slide out) */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : 400,
            height: isMobile ? '80vh' : '100vh',
            borderTopLeftRadius: isMobile ? 24 : 0,
            borderBottomLeftRadius: isMobile ? 0 : 0,
            boxShadow: -4,
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        {/* Drawer Header */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesomeIcon color="secondary" />
            <Typography variant="subtitle1" fontWeight="bold">Smartttend AI Assistant</Typography>
          </Box>
          <IconButton onClick={() => setAiOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Drawer Messages list */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {aiLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress size={24} /></Box>
          ) : messages.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6} px={3} textAlign="center" gap={2} sx={{ color: 'text.secondary' }}>
              <AutoAwesomeIcon sx={{ fontSize: 40, opacity: 0.6 }} />
              <Typography variant="subtitle2" fontWeight="bold">Ask anything about your standing</Typography>
              <Typography variant="caption" color="text.secondary">
                "Can I bunk class today?", "What is my attendance target progress?"
              </Typography>
            </Box>
          ) : (
            messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <Box key={idx} sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      borderTopRightRadius: isUser ? 0 : 12,
                      borderTopLeftRadius: isUser ? 12 : 0,
                      maxWidth: '85%',
                      bgcolor: isUser ? 'primary.main' : 'background.paper',
                      color: isUser ? 'primary.contrastText' : 'text.primary',
                      borderColor: isUser ? 'primary.main' : 'divider'
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                      {m.message}
                    </Typography>
                  </Paper>
                </Box>
              );
            })
          )}
          {aiSending && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderTopLeftRadius: 0, bgcolor: 'action.hover' }}>
                <Box display="flex" gap={1} alignItems="center">
                  <CircularProgress size={12} />
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>Thinking...</Typography>
                </Box>
              </Paper>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Drawer Chat Input */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center', bgcolor: 'background.paper' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask AI..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendAiMessage();
            }}
            disabled={aiSending}
          />
          <IconButton color="primary" onClick={handleSendAiMessage} disabled={aiSending || !aiInput.trim()}>
            <SendIcon />
          </IconButton>
        </Box>
      </Drawer>

      {/* Global Toast Alert */}
      <Toaster richColors position="top-right" />
    </Box>
  );
};

export default AppLayout;
