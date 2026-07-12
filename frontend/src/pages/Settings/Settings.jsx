import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';
import { useColorMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Avatar,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
  Radio,
  RadioGroup,
  FormControl
} from '@mui/material';
import {
  Save as SaveIcon,
  Trash2 as DeleteIcon,
  User as PersonIcon,
  Bell as NotificationsIcon,
  Palette as BrushIcon,
  Sparkles as AutoAwesomeIcon,
  LogOut as LogoutIcon,
  GraduationCap as SchoolIcon,
  Lock as LockIcon,
  Info as InfoIcon,
  Menu as MenuIcon,
  Upload as CloudUploadIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const Settings = () => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  const { mode, setExplicitMode } = useColorMode();
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  
  // Navigation sections: 
  // 0 = Profile, 1 = Academic, 2 = AI, 3 = Notifications, 4 = Appearance, 5 = Privacy, 6 = About
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);

  // --- Profile States ---
  const [fullName, setFullName] = useState(user?.full_name || user?.name || '');
  const [studentId, setStudentId] = useState(user?.student_id || '');
  const [prnNumber, setPrnNumber] = useState(user?.prn_number || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // --- Academic States ---
  const [department, setDepartment] = useState(user?.department || '');
  const [semester, setSemester] = useState(user?.semester || '');
  const [division, setDivision] = useState(user?.division || '');
  const [batch, setBatch] = useState(user?.batch || '');
  const [roll, setRoll] = useState(user?.roll_number || '');
  const [college, setCollege] = useState(user?.college_name || '');
  const [academicYear, setAcademicYear] = useState(user?.academic_year || '');

  // --- AI States ---
  const [goal, setGoal] = useState(75);
  const [responseStyle, setResponseStyle] = useState('Friendly');
  const [suggestions, setSuggestions] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);

  // --- Initial loaded states for change validation ---
  const [initialGoal, setInitialGoal] = useState(75);
  const [initialResponseStyle, setInitialResponseStyle] = useState('Friendly');
  const [initialSuggestions, setInitialSuggestions] = useState(true);
  const [initialDailySummary, setInitialDailySummary] = useState(true);

  // --- Notification States ---
  const [lectureReminder, setLectureReminder] = useState(true);
  const [attendanceWarning, setAttendanceWarning] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [monthlySummary, setMonthlySummary] = useState(true);
  const [reminderTime, setReminderTime] = useState('5 minutes');

  // --- Appearance States ---
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themePreference') || 'system');

  const showToast = (message, severity = 'success') => {
    if (severity === 'success') toast.success(message);
    else if (severity === 'error') toast.error(message);
    else if (severity === 'warning') toast.warning(message);
    else toast(message);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const prefRes = await api.get('/ai/memory/');
      const userGoal = prefRes.data.preferred_goal || 75;
      const userSuggestions = prefRes.data.enable_suggestions !== false;
      const userDailySummary = prefRes.data.enable_daily_summary !== false;
      
      setGoal(userGoal);
      setSuggestions(userSuggestions);
      setDailySummary(userDailySummary);

      setInitialGoal(userGoal);
      setInitialSuggestions(userSuggestions);
      setInitialDailySummary(userDailySummary);
      
      // Load notification preferences from local storage
      setLectureReminder(localStorage.getItem('pref_lecture_reminder') !== 'false');
      setAttendanceWarning(localStorage.getItem('pref_attendance_warning') !== 'false');
      setReminderTime(localStorage.getItem('pref_reminder_time') || '10 minutes');
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update states if user context changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || user.name || '');
      setStudentId(user.student_id || '');
      setPrnNumber(user.prn_number || '');
      setDepartment(user.department || '');
      setSemester(user.semester || '');
      setDivision(user.division || '');
      setBatch(user.batch || '');
      setRoll(user.roll_number || '');
      setCollege(user.college_name || '');
      setAcademicYear(user.academic_year || '');
    }
  }, [user]);

  // --- Save / Cancel Handlers ---

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    setImagePreview(null);
    setSelectedFile(null);
    setSaving(true);
    try {
      const res = await updateProfile({ profile_photo: null });
      if (res.success) {
        showToast('Profile photo removed.');
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      showToast(err.message || 'Failed to remove photo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName) {
      showToast('Full name is required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: fullName,
        name: fullName,
        student_id: studentId,
        prn_number: prnNumber
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, val]) => {
        formData.append(key, val);
      });
      if (selectedFile) {
        formData.append('profile_photo', selectedFile);
      }

      const res = await updateProfile(formData);
      if (res.success) {
        showToast('Profile updated successfully.');
        setSelectedFile(null);
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelProfile = () => {
    setFullName(user?.full_name || user?.name || '');
    setStudentId(user?.student_id || '');
    setPrnNumber(user?.prn_number || '');
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleSaveAcademic = async () => {
    setSaving(true);
    try {
      const payload = {
        department,
        semester,
        division,
        batch,
        roll_number: roll,
        college_name: college,
        academic_year: academicYear
      };

      const res = await updateProfile(payload);
      if (res.success) {
        await api.put('/ai/memory/', {
          preferred_goal: goal
        });
        setInitialGoal(goal);
        showToast('Academic details saved successfully.');
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update academic details.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAcademic = () => {
    setDepartment(user?.department || '');
    setSemester(user?.semester || '');
    setDivision(user?.division || '');
    setBatch(user?.batch || '');
    setRoll(user?.roll_number || '');
    setCollege(user?.college_name || '');
    setAcademicYear(user?.academic_year || '');
  };

  const handleSaveAI = async () => {
    setSaving(true);
    try {
      await api.put('/ai/memory/', {
        enable_suggestions: suggestions,
        enable_daily_summary: dailySummary
      });
      localStorage.setItem('pref_lecture_reminder', String(lectureReminder));
      setInitialSuggestions(suggestions);
      setInitialDailySummary(dailySummary);
      showToast('AI preferences updated.');
    } catch (err) {
      showToast('Failed to save AI preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAI = () => {
    setSuggestions(initialSuggestions);
    setDailySummary(initialDailySummary);
    setLectureReminder(localStorage.getItem('pref_lecture_reminder') !== 'false');
  };



  const handleThemeChange = (newMode) => {
    setThemeMode(newMode);
    localStorage.setItem('themePreference', newMode);
    
    if (newMode === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setExplicitMode(systemDark ? 'dark' : 'light');
    } else {
      setExplicitMode(newMode);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/analytics/reports/export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Attendance report downloaded successfully.');
    } catch (err) {
      showToast('Failed to export attendance report.', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete your Smartttend account? This action is irreversible and all your attendance data will be lost.')) {
      return;
    }
    
    setSaving(true);
    try {
      await api.delete('/users/profile/');
      showToast('Account deleted successfully.');
      logout();
      navigate('/login');
    } catch (err) {
      showToast('Failed to delete account.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutClick = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
      navigate('/login');
    }
  };

  // --- Change Validation Selectors ---
  const isProfileChanged =
    fullName !== (user?.full_name || user?.name || '') ||
    studentId !== (user?.student_id || '') ||
    prnNumber !== (user?.prn_number || '') ||
    selectedFile !== null;

  const isAcademicChanged =
    department !== (user?.department || '') ||
    semester !== (user?.semester || '') ||
    division !== (user?.division || '') ||
    batch !== (user?.batch || '') ||
    roll !== (user?.roll_number || '') ||
    college !== (user?.college_name || '') ||
    academicYear !== (user?.academic_year || '') ||
    goal !== initialGoal;

  const isAIChanged =
    suggestions !== initialSuggestions ||
    dailySummary !== initialDailySummary ||
    lectureReminder !== (localStorage.getItem('pref_lecture_reminder') !== 'false');

  // --- Navigation Definition ---
  const menuItems = [
    { text: 'Profile', icon: <PersonIcon />, tab: 0 },
    { text: 'Academic', icon: <SchoolIcon />, tab: 1 },
    { text: 'AI Assistant', icon: <AutoAwesomeIcon />, tab: 2 },
    { text: 'Notifications', icon: <NotificationsIcon />, tab: 3 },
    { text: 'Appearance', icon: <BrushIcon />, tab: 4 },
    { text: 'Privacy & Data', icon: <LockIcon />, tab: 5 },
    { text: 'About', icon: <InfoIcon />, tab: 6 }
  ];

  if (loading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" py={12}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  const renderNavigationList = () => (
    <List sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {menuItems.map((item) => {
        const isSelected = activeTab === item.tab;
        return (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={isSelected}
              onClick={() => {
                setActiveTab(item.tab);
                setDrawerOpen(false);
              }}
              sx={{
                py: 1.5,
                borderRadius: 2.5,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  color: 'primary.main',
                  fontWeight: 'bold',
                  '& .MuiListItemIcon-root': { color: 'primary.main' }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontWeight: isSelected ? 'bold' : 'medium' }}>
                    {item.text}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        );
      })}
      
      <Divider sx={{ my: 1.5 }} />

      <ListItem disablePadding>
        <ListItemButton
          onClick={handleLogoutClick}
          sx={{ py: 1.5, borderRadius: 2.5, color: 'error.main' }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                Logout
              </Typography>
            }
          />
        </ListItemButton>
      </ListItem>
    </List>
  );

  return (
    <AppLayout>
      <Box sx={{ maxWidth: 1000, mx: 'auto', mt: { xs: 1, md: 3 }, px: { xs: 1, md: 3 } }}>
        <Grid container spacing={3} wrap="nowrap">
          {/* Left Navigation (Always beside content) */}
          <Grid item sx={{ width: 260, flexShrink: 0 }}>
            <Paper variant="outlined" sx={{ borderRadius: 4, bgcolor: 'background.paper', position: 'sticky', top: 24 }}>
              {renderNavigationList()}
            </Paper>
          </Grid>

          {/* Right Content Panel */}
          <Grid item xs sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box display="flex" flexDirection="column" gap={3}>
              
              {/* Active Tab Panel Switcher */}
              <AnimatePresence mode="wait">
                <Box
                  key={activeTab}
                  component={motion.div}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  
                  {/* --- Tab 0: Profile --- */}
                  {activeTab === 0 && (
                    <Box display="flex" flexDirection="column" gap={3}>
                      <Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          👤 Student Profile
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Manage your academic information. These details are used throughout the application.
                        </Typography>
                      </Box>

                      {/* Premium Profile Card */}
                      <Card variant="outlined" sx={{ p: 3, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
                          <Avatar
                            src={imagePreview || user?.profile_photo || user?.profile_photo_url || ''}
                            sx={{ width: 88, height: 88, bgcolor: 'primary.main', fontSize: '2.2rem', fontWeight: 'bold' }}
                          >
                            {fullName?.charAt(0) || user?.full_name?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              {fullName || user?.full_name || 'Student Name'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {department || 'Department Not Specified'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.2 }}>
                              Semester {semester || 'N/A'} &bull; {college || 'College Not Specified'}
                            </Typography>
                            
                            <Box display="flex" gap={1.5} mt={2}>
                              <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                              />
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<CloudUploadIcon />}
                                onClick={() => fileInputRef.current.click()}
                                sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
                              >
                                Upload Photo
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={handleRemovePhoto}
                                sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
                              >
                                Remove Photo
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      </Card>

                      {/* Personal Information Group */}
                      <Card variant="outlined" sx={{ p: 3.5, borderRadius: 4 }}>
                        <Typography variant="subtitle1" fontWeight="bold" mb={2.5}>
                          Personal Information
                        </Typography>
                        
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Full Name"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Email Address"
                              value={user?.email || ''}
                              disabled
                              helperText="Email is managed via identity provider and is read-only."
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Student ID"
                              value={studentId}
                              onChange={(e) => setStudentId(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="PRN Number"
                              value={prnNumber}
                              onChange={(e) => setPrnNumber(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                        </Grid>

                        <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
                          <Button
                            variant="outlined"
                            onClick={handleCancelProfile}
                            disabled={!isProfileChanged || saving}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            onClick={handleSaveProfile}
                            disabled={!isProfileChanged || saving}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </Box>
                      </Card>
                    </Box>
                  )}

                  {/* --- Tab 1: Academic --- */}
                  {activeTab === 1 && (
                    <Box display="flex" flexDirection="column" gap={3}>
                      <Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          🎓 Academic Profile
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Configure academic details, division codes, semester counts, and division batches.
                        </Typography>
                      </Box>

                      <Card variant="outlined" sx={{ p: 3.5, borderRadius: 4 }}>
                        <Typography variant="subtitle1" fontWeight="bold" mb={2.5}>
                          Academic Settings
                        </Typography>

                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Department / Course"
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Semester"
                              value={semester}
                              onChange={(e) => setSemester(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Division"
                              value={division}
                              onChange={(e) => setDivision(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Batch ID"
                              value={batch}
                              onChange={(e) => setBatch(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Roll Number"
                              value={roll}
                              onChange={(e) => setRoll(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Academic Year"
                              value={academicYear}
                              onChange={(e) => setAcademicYear(e.target.value)}
                              placeholder="e.g. 2026"
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="College Name"
                              value={college}
                              onChange={(e) => setCollege(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              select
                              fullWidth
                              label="Attendance Goal"
                              value={goal}
                              onChange={(e) => setGoal(Number(e.target.value))}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            >
                              {[75, 80, 85, 90].map((g) => (
                                <MenuItem key={g} value={g}>{g}%</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                        </Grid>

                        <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
                          <Button
                            variant="outlined"
                            onClick={handleCancelAcademic}
                            disabled={!isAcademicChanged || saving}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            onClick={handleSaveAcademic}
                            disabled={!isAcademicChanged || saving}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </Box>
                      </Card>
                    </Box>
                  )}

                  {/* --- Tab 2: AI Settings --- */}
                  {activeTab === 2 && (
                    <Box display="flex" flexDirection="column" gap={3}>
                      <Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          🤖 AI Assistant
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Configure how the AI assistant works in the background.
                        </Typography>
                      </Box>

                      <Card variant="outlined" sx={{ p: 3.5, borderRadius: 4 }}>
                        <Typography variant="subtitle1" fontWeight="bold" mb={2.5}>
                          AI Assistant Settings
                        </Typography>

                        <Box display="flex" flexDirection="column" gap={3}>
                          <FormControlLabel
                            control={<Switch checked={suggestions} onChange={(e) => setSuggestions(e.target.checked)} />}
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight="bold">Enable AI Assistant</Typography>
                                <Typography variant="caption" color="text.secondary">Activate the AI attendance assistant for standing prediction queries.</Typography>
                              </Box>
                            }
                          />

                          <Divider />

                          <FormControlLabel
                            control={<Switch checked={dailySummary} onChange={(e) => setDailySummary(e.target.checked)} />}
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight="bold">Daily Summary</Typography>
                                <Typography variant="caption" color="text.secondary">Compile daily brief summaries based on recent attendance changes.</Typography>
                              </Box>
                            }
                          />

                          <Divider />

                          <FormControlLabel
                            control={<Switch checked={lectureReminder} onChange={(e) => setLectureReminder(e.target.checked)} />}
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight="bold">Lecture Reminders</Typography>
                                <Typography variant="caption" color="text.secondary">Alert me before my scheduled class starts.</Typography>
                              </Box>
                            }
                          />
                        </Box>

                        <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
                          <Button
                            variant="outlined"
                            onClick={handleCancelAI}
                            disabled={!isAIChanged || saving}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            onClick={handleSaveAI}
                            disabled={!isAIChanged || saving}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </Box>
                      </Card>
                    </Box>
                  )}

                  {/* --- Tab 3: Notifications --- */}
                  {activeTab === 3 && (
                    <Box display="flex" flexDirection="column" gap={3}>
                      <Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          🔔 Notifications
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Stay informed about your lectures and attendance.
                        </Typography>
                      </Box>

                      <Box display="flex" flexDirection="column" gap={3}>
                        
                        {/* Card 1: Lecture Reminder */}
                        <Card variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                🔔 Lecture Reminder
                              </Typography>
                              <Typography variant="body2" color="text.secondary" mt={0.5}>
                                Remind me before every class.
                              </Typography>
                            </Box>
                            <Switch
                              checked={lectureReminder}
                              size="large"
                              onChange={(e) => {
                                const val = e.target.checked;
                                setLectureReminder(val);
                                localStorage.setItem('pref_lecture_reminder', String(val));
                                showToast('Preferences saved.');
                              }}
                            />
                          </Box>

                          {lectureReminder && (
                            <Box mt={3}>
                              <Typography variant="body2" fontWeight="bold" mb={1.5}>
                                Reminder Time
                              </Typography>
                              <FormControl component="fieldset">
                                <RadioGroup
                                  row
                                  value={reminderTime}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setReminderTime(val);
                                    localStorage.setItem('pref_reminder_time', val);
                                    showToast('Preferences saved.');
                                  }}
                                >
                                  {['5 minutes', '10 minutes', '15 minutes', '30 minutes'].map((t) => (
                                    <FormControlLabel
                                      key={t}
                                      value={t}
                                      control={<Radio color="primary" />}
                                      label={t}
                                      sx={{ mr: 3 }}
                                    />
                                  ))}
                                </RadioGroup>
                              </FormControl>
                            </Box>
                          )}
                        </Card>

                        {/* Card 2: Attendance Warning */}
                        <Card variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                📊 Attendance Warning
                              </Typography>
                              <Typography variant="body2" color="text.secondary" mt={0.5}>
                                Notify me when any subject falls below my attendance goal.
                              </Typography>
                            </Box>
                            <Switch
                              checked={attendanceWarning}
                              size="large"
                              onChange={(e) => {
                                const val = e.target.checked;
                                setAttendanceWarning(val);
                                localStorage.setItem('pref_attendance_warning', String(val));
                                showToast('Preferences saved.');
                              }}
                            />
                          </Box>
                        </Card>

                        {/* Card 3: Morning Summary */}
                        <Card variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                🌅 Morning Summary
                              </Typography>
                              <Typography variant="body2" color="text.secondary" mt={0.5}>
                                Receive today's lecture schedule every morning.
                              </Typography>
                            </Box>
                            <Switch
                              checked={dailySummary}
                              size="large"
                              onChange={(e) => {
                                const val = e.target.checked;
                                setDailySummary(val);
                                localStorage.setItem('pref_daily_summary', String(val));
                                showToast('Preferences saved.');
                              }}
                            />
                          </Box>
                        </Card>

                      </Box>
                    </Box>
                  )}

                  {/* --- Tab 4: Appearance --- */}
                  {activeTab === 4 && (
                    <Box display="flex" flexDirection="column" gap={3}>
                      <Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          Appearance
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Choose how Smartttend appears.
                        </Typography>
                      </Box>

                      <Card variant="outlined" sx={{ p: 3.5, borderRadius: 4 }}>
                        <Typography variant="subtitle1" fontWeight="bold" mb={2.5}>
                          Choose how Smartttend looks.
                        </Typography>

                        <FormControl component="fieldset">
                          <RadioGroup
                            value={themeMode}
                            onChange={(e) => handleThemeChange(e.target.value)}
                          >
                            <FormControlLabel
                              value="system"
                              control={<Radio color="primary" />}
                              label={
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">System Default (Recommended)</Typography>
                                  <Typography variant="caption" color="text.secondary">Follow the operating system's light/dark mode preference.</Typography>
                                </Box>
                              }
                              sx={{ mb: 2 }}
                            />
                            <FormControlLabel
                              value="light"
                              control={<Radio color="primary" />}
                              label={
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">Light Mode</Typography>
                                  <Typography variant="caption" color="text.secondary">Always use the light theme.</Typography>
                                </Box>
                              }
                              sx={{ mb: 2 }}
                            />
                            <FormControlLabel
                              value="dark"
                              control={<Radio color="primary" />}
                              label={
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">Dark Mode</Typography>
                                  <Typography variant="caption" color="text.secondary">Always use the dark theme.</Typography>
                                </Box>
                              }
                            />
                          </RadioGroup>
                        </FormControl>
                      </Card>
                    </Box>
                  )}

                  {/* --- Tab 5: Privacy & Data --- */}
                  {activeTab === 5 && (
                    <Box display="flex" flexDirection="column" gap={3}>
                      <Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          Privacy & Data
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Manage your account and attendance records.
                        </Typography>
                      </Box>

                      <Card variant="outlined" sx={{ p: 3.5, borderRadius: 4 }}>
                        <Box display="flex" flexDirection="column" gap={3.5}>
                          {/* Export Attendance Section */}
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                              Attendance Data
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Download your attendance history.
                            </Typography>
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={handleExportCSV}
                              sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2.5 }}
                            >
                              Download CSV
                            </Button>
                          </Box>

                          <Divider />

                          {/* Danger Zone Section */}
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold" color="error.main" gutterBottom>
                              Danger Zone
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Delete your Smartttend account permanently.
                            </Typography>
                            <Button
                              variant="contained"
                              color="error"
                              onClick={handleDeleteAccount}
                              sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2.5 }}
                            >
                              Delete Account
                            </Button>
                          </Box>
                        </Box>
                      </Card>
                    </Box>
                  )}

                  {/* --- Tab 6: About --- */}
                  {activeTab === 6 && (
                    <Box display="flex" flexDirection="column" gap={3}>
                      <Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          About Smartttend
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Smart AI Attendance Tracker for Students
                        </Typography>
                      </Box>

                      <Grid container spacing={3}>
                        {/* Left Side: Version Info & Tech Stack */}
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase', display: 'block', mb: 1 }}>
                              Current Version
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" gutterBottom>
                              v1.0.0
                            </Typography>
                            <Typography variant="body2" color="success.main" sx={{ display: 'block', mb: 3, fontWeight: 'bold' }}>
                              ✓ You're using the latest version.
                            </Typography>

                            <Divider sx={{ my: 2.5 }} />

                            <Typography variant="body2" fontWeight="bold" gutterBottom>
                              Developed By
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
                              Mrunali Sonje
                            </Typography>

                            <Typography variant="body2" fontWeight="bold" gutterBottom>
                              Built With
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={0.8} sx={{ pl: 1 }}>
                              {['React', 'Django REST Framework', 'PostgreSQL', 'Clerk Authentication', 'Gemini AI'].map((tech) => (
                                <Typography key={tech} variant="body2" color="text.secondary">
                                  &bull; {tech}
                                </Typography>
                              ))}
                            </Box>
                          </Card>
                        </Grid>

                        {/* Right Side: Contact, Feedback & Release Notes */}
                        <Grid item xs={12} md={6}>
                          <Box display="flex" flexDirection="column" gap={3}>
                            {/* Feedback & Contact Card */}
                            <Card variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Feedback
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Found a bug? Have an idea?
                              </Typography>
                              <Button
                                variant="contained"
                                size="small"
                                href="mailto:support@smartttend.com?subject=Smartttend%20Feedback"
                                sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2, mb: 3 }}
                              >
                                Send Feedback
                              </Button>

                              <Divider sx={{ my: 1.5 }} />

                              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Contact Developer
                              </Typography>
                              <Box display="flex" flexDirection="column" gap={1.2} mt={1}>
                                <Box display="flex" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Developer</Typography>
                                  <Typography variant="body2" fontWeight="bold">Mrunali Sonje</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Email</Typography>
                                  <Typography variant="body2" fontWeight="bold" component="a" href="mailto:support@smartttend.com" sx={{ textDecoration: 'none', color: 'primary.main' }}>
                                    support@smartttend.com
                                  </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">GitHub</Typography>
                                  <Typography variant="body2" fontWeight="bold" component="a" href="https://github.com/mrunali-02" target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none', color: 'primary.main' }}>
                                    github.com/mrunali-02
                                  </Typography>
                                </Box>
                              </Box>
                            </Card>

                            {/* Release Notes Card */}
                            <Card variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Release Notes (Version 1.0)
                              </Typography>
                              <Box display="flex" flexDirection="column" gap={0.5} mt={1.5}>
                                {[
                                  'OCR Timetable Upload',
                                  'AI Attendance Assistant',
                                  'Smart Bunk Calculator',
                                  'Attendance Analytics'
                                ].map((note) => (
                                  <Typography key={note} variant="body2" color="text.secondary">
                                    &bull; {note}
                                  </Typography>
                                ))}
                              </Box>
                            </Card>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                </Box>
              </AnimatePresence>

            </Box>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
};

export default Settings;
