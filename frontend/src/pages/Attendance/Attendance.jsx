import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  MenuItem,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ScheduleIcon from '@mui/icons-material/Schedule';
import InfoIcon from '@mui/icons-material/Info';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CloseIcon from '@mui/icons-material/Close';

const Attendance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Consolidated Tabs: 0 = Today, 1 = Subjects, 2 = History, 3 = Analytics, 4 = Export
  const [activeTab, setActiveTab] = useState(0);

  const [loading, setLoading] = useState(true);
  const [todayLectures, setTodayLectures] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [overallAttendance, setOverallAttendance] = useState(0);
  
  // Direct tap marking states
  const [markingLectureId, setMarkingLectureId] = useState(null);

  // Subject details modal state
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectDetailsLoading, setSubjectDetailsLoading] = useState(false);
  const [subjectHistory, setSubjectHistory] = useState([]);

  // Toast state
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [exporting, setExporting] = useState(false);

  // Backfill States
  const [backfillDate, setBackfillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [backfillSlots, setBackfillSlots] = useState([]);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillIsHoliday, setBackfillIsHoliday] = useState(false);
  const [backfillSaving, setBackfillSaving] = useState(false);
  const [backfillMode, setBackfillMode] = useState('single'); // 'single' or 'weekly'
  const [backfillWeeklyData, setBackfillWeeklyData] = useState([]);

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const fetchTodayLectures = async () => {
    try {
      const res = await api.get('/timetable/slots/today/');
      setTodayLectures(res.data.lectures || []);
    } catch (err) {
      console.error('Failed to fetch today schedule:', err);
    }
  };

  const fetchAnalyticsAndSubjects = async () => {
    try {
      const res = await api.get('/analytics/dashboard/');
      setSubjectsList(res.data.subjects || []);
      setOverallAttendance(res.data.overall_attendance || 0);
    } catch (err) {
      console.error('Failed to fetch subjects list:', err);
    }
  };

  const fetchHistoryLogs = async () => {
    try {
      const res = await api.get('/attendance/records/');
      setHistoryLogs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch history logs:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTodayLectures(),
      fetchAnalyticsAndSubjects(),
      fetchHistoryLogs()
    ]);
    setLoading(false);
  };

  // Backfill slots fetching for single date
  const fetchBackfillDateSlots = async (dateVal) => {
    setBackfillLoading(true);
    try {
      const res = await api.get('/timetable/slots/today/', { params: { date: dateVal } });
      const lectures = res.data.lectures || res.data || [];
      setBackfillSlots(lectures);
      const allHoliday = lectures.length > 0 && lectures.every(slot => slot.attendance_status === 'Holiday');
      setBackfillIsHoliday(allHoliday);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch schedule for selected date.', 'error');
    } finally {
      setBackfillLoading(false);
    }
  };

  // Helper to resolve dates for the Monday-Friday week of refDateStr
  const getWeekDays = (refDateStr) => {
    const refDate = new Date(refDateStr);
    const day = refDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diff = refDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(refDate.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 5; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      days.push(current.toISOString().split('T')[0]);
    }
    return days;
  };

  // Weekly backfill fetching
  const fetchWeeklyBackfill = async (refDateVal) => {
    setBackfillLoading(true);
    try {
      const weekDates = getWeekDays(refDateVal);
      const results = await Promise.all(
        weekDates.map(date => api.get('/timetable/slots/today/', { params: { date } }).then(res => ({
          date,
          dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
          slots: res.data.lectures || res.data || []
        })))
      );
      setBackfillWeeklyData(results);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch weekly schedule.', 'error');
    } finally {
      setBackfillLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 1) {
      if (backfillMode === 'single') {
        fetchBackfillDateSlots(backfillDate);
      } else {
        fetchWeeklyBackfill(backfillDate);
      }
    }
  }, [backfillDate, backfillMode, activeTab]);

  const handleUpdateSlotStatus = (slotId, newStatus) => {
    setBackfillSlots(prev => prev.map(slot => 
      slot.id === slotId ? { ...slot, attendance_status: newStatus } : slot
    ));
  };

  const handleUpdateWeeklySlotStatus = (dateStr, slotId, newStatus) => {
    setBackfillWeeklyData(prev => prev.map(day => {
      if (day.date === dateStr) {
        return {
          ...day,
          slots: day.slots.map(s => s.id === slotId ? { ...s, attendance_status: newStatus } : s)
        };
      }
      return day;
    }));
  };

  const handleBulkMarkSlots = (statusVal) => {
    setBackfillSlots(prev => prev.map(s => ({ ...s, attendance_status: statusVal })));
  };

  const handleWeeklyBulkMark = (statusVal) => {
    setBackfillWeeklyData(prev => prev.map(day => ({
      ...day,
      slots: day.slots.map(s => ({ ...s, attendance_status: statusVal }))
    })));
  };

  const handleToggleHoliday = (checked) => {
    setBackfillIsHoliday(checked);
    if (checked) {
      setBackfillSlots(prev => prev.map(s => ({ ...s, attendance_status: 'Holiday' })));
    } else {
      setBackfillSlots(prev => prev.map(s => ({ ...s, attendance_status: null })));
    }
  };

  const handleSaveSingleDay = async () => {
    setBackfillSaving(true);
    try {
      const records = backfillSlots.map(s => ({
        lecture_slot_id: s.id,
        status: s.attendance_status
      })).filter(r => r.status !== null && r.status !== undefined);

      const payload = {
        date: backfillDate,
        is_holiday: backfillIsHoliday,
        records
      };

      await api.post('/attendance/records/backfill/', payload);
      showToast('Attendance saved successfully!', 'success');
      loadAllData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to save attendance.', 'error');
    } finally {
      setBackfillSaving(false);
    }
  };

  const handleSaveWeek = async () => {
    setBackfillSaving(true);
    try {
      const daysPayload = backfillWeeklyData.map(day => {
        const records = day.slots.map(s => ({
          lecture_slot_id: s.id,
          status: s.attendance_status
        })).filter(r => r.status !== null && r.status !== undefined);

        return {
          date: day.date,
          is_holiday: day.slots.length > 0 && day.slots.every(s => s.attendance_status === 'Holiday'),
          records
        };
      });

      await api.post('/attendance/records/backfill/', { days: daysPayload });
      showToast('Weekly attendance saved successfully!', 'success');
      loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to save weekly attendance.', 'error');
    } finally {
      setBackfillSaving(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Listen to global attendance check-in triggers
    const handleRefresh = () => {
      fetchTodayLectures();
      fetchAnalyticsAndSubjects();
      fetchHistoryLogs();
    };
    window.addEventListener('attendanceMarked', handleRefresh);
    return () => window.removeEventListener('attendanceMarked', handleRefresh);
  }, []);

  // One-tap attendance marking
  const handleOneTapMark = async (lecture, status) => {
    setMarkingLectureId(lecture.id);
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
      console.warn('GPS coordinates skipped for direct check-in:', err);
    }

    try {
      await api.post('/attendance/records/mark/', {
        lecture_slot_id: lecture.id,
        date: todayDateStr,
        status: status,
        device_time: deviceTimeStr,
        remarks: 'One-tap mark from Attendance page',
        latitude: lat,
        longitude: lon
      });
      showToast(`Marked ${lecture.subject_details?.name} as ${status}!`);
      
      // Fire global custom event to notify Dashboard and others
      window.dispatchEvent(new CustomEvent('attendanceMarked'));
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to mark attendance.';
      showToast(errorMsg, 'error');
    } finally {
      setMarkingLectureId(null);
    }
  };

  const handleOpenSubjectDetails = (subject) => {
    navigate(`/subjects/${subject.id}`);
  };

  // CSV Export handler
  const handleCSVExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/analytics/export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartttend_attendance_report.csv`);
      document.body.appendChild(link);
      link.click();
      showToast('Report CSV exported successfully!');
    } catch (err) {
      showToast('Failed to export CSV.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const calculateSmartBunks = (attended, total, targetPct) => {
    const target = targetPct / 100.0;
    if (total === 0) return { consecutive_needed: 0, safe_bunks: 0 };
    const currentPct = attended / total;
    if (currentPct >= target) {
      const safe_bunks = Math.floor((attended - target * total) / target);
      return { consecutive_needed: 0, safe_bunks: Math.max(0, safe_bunks) };
    } else {
      let consecutive_needed = 0;
      if (target === 1.0) {
        consecutive_needed = 999;
      } else {
        consecutive_needed = Math.ceil((target * total - attended) / (1.0 - target));
      }
      return { consecutive_needed: Math.max(0, consecutive_needed), safe_bunks: 0 };
    }
  };

  const getLectureWindowStatus = (slot) => {
    const today = new Date();
    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    const startDt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM, 0);
    const endDt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM, 0);
    
    const windowStart = new Date(startDt.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(endDt.getTime() + 10 * 60 * 1000);
    
    if (today < windowStart) {
      return { status: 'upcoming', label: 'Upcoming', canMark: false };
    } else if (today > windowEnd) {
      return { status: 'ended', label: 'Ended', canMark: true }; // allow marking anyway if they tap
    } else {
      return { status: 'active', label: 'Active Now', canMark: true };
    }
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
        <Box display="flex" justifyContent="center" py={12}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  const targetGoal = user?.goal || 75;

  return (
    <AppLayout>
      <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        
        {/* Navigation Tabs */}
        <Paper variant="outlined" sx={{ borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            indicatorColor="primary"
            textColor="primary"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Today" sx={{ fontWeight: 'bold' }} />
            <Tab label="Backfill" sx={{ fontWeight: 'bold' }} />
            <Tab label="Subjects" sx={{ fontWeight: 'bold' }} />
            <Tab label="History" sx={{ fontWeight: 'bold' }} />
            <Tab label="Analytics" sx={{ fontWeight: 'bold' }} />
            <Tab label="Export" sx={{ fontWeight: 'bold' }} />
          </Tabs>
        </Paper>

        {/* Tab 0: Today Schedule Timeline (One tap marking) */}
        {activeTab === 0 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight="bold">Today's Attendance Logging</Typography>
              <Chip label={`Target Goal: ${targetGoal}%`} variant="outlined" size="small" />
            </Box>

            {todayLectures.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
                <HourglassEmptyIcon sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No classes scheduled for today. enjoy your day off!
                </Typography>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <List disablePadding>
                  {todayLectures.map((lecture, index) => {
                    const isMarked = lecture.attendance_status !== null;
                    const wStatus = getLectureWindowStatus(lecture);
                    const isMarking = markingLectureId === lecture.id;

                    return (
                      <Box key={lecture.id}>
                        <ListItem sx={{ py: 3, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                          <Box display="flex" flexDirection="column" gap={0.5}>
                            <Typography variant="body1" fontWeight="bold">
                              {lecture.subject_details?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                              <AccessTimeIcon sx={{ fontSize: 13 }} />
                              {formatTime(lecture.start_time.substring(0, 5))} - {formatTime(lecture.end_time.substring(0, 5))}
                            </Typography>
                          </Box>

                          <Box display="flex" gap={1} alignItems="center">
                            {isMarked ? (
                              <Chip
                                label={`✔ ${lecture.attendance_status}`}
                                color={
                                  lecture.attendance_status === 'Present' ? 'success' :
                                  lecture.attendance_status === 'Absent' ? 'error' :
                                  lecture.attendance_status === 'Cancelled' ? 'warning' :
                                  lecture.attendance_status === 'Holiday' ? 'info' : 'default'
                                }
                                sx={{ fontWeight: 'bold', borderRadius: 2 }}
                              />
                            ) : wStatus.status === 'upcoming' ? (
                              <Chip label="Upcoming" variant="outlined" size="small" />
                            ) : (
                              <Box display="flex" gap={1}>
                                {isMarking ? (
                                  <CircularProgress size={20} sx={{ mx: 2 }} />
                                ) : (
                                  ['Present', 'Absent', 'Late'].map((status) => (
                                    <Chip
                                      key={status}
                                      label={status}
                                      onClick={() => handleOneTapMark(lecture, status)}
                                      variant="outlined"
                                      sx={{
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
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
        )}

        {/* Tab 1: Backfill Attendance */}
        {activeTab === 1 && (
          <Box display="flex" flexDirection="column" gap={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Typography variant="subtitle1" fontWeight="bold">Backfill Past Attendance</Typography>
              <ToggleButtonGroup
                value={backfillMode}
                exclusive
                onChange={(e, val) => val && setBackfillMode(val)}
                size="small"
                color="primary"
              >
                <ToggleButton value="single" sx={{ fontWeight: 'bold', textTransform: 'none' }}>Single Date</ToggleButton>
                <ToggleButton value="weekly" sx={{ fontWeight: 'bold', textTransform: 'none' }}>Full Week</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box display="flex" alignItems="center" gap={2.5} flexWrap="wrap">
                <TextField
                  label={backfillMode === 'single' ? "Select Date" : "Select Reference Date"}
                  type="date"
                  value={backfillDate}
                  onChange={(e) => setBackfillDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ width: 220 }}
                />

                {backfillMode === 'single' && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={backfillIsHoliday}
                        onChange={(e) => handleToggleHoliday(e.target.checked)}
                        color="info"
                      />
                    }
                    label="Mark entire day as Holiday"
                    sx={{ fontWeight: 'medium' }}
                  />
                )}
              </Box>

              {backfillMode === 'single' ? (
                !backfillIsHoliday && backfillSlots.length > 0 && (
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Button variant="outlined" size="small" onClick={() => handleBulkMarkSlots('Present')} color="success" sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}>
                      Mark All Present
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => handleBulkMarkSlots('Absent')} color="error" sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}>
                      Mark All Absent
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => handleBulkMarkSlots('Cancelled')} color="warning" sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}>
                      Mark All Cancelled
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => handleBulkMarkSlots(null)} color="inherit" sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}>
                      Reset
                    </Button>
                  </Box>
                )
              ) : (
                backfillWeeklyData.some(d => d.slots.length > 0) && (
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Button variant="outlined" size="small" onClick={() => handleWeeklyBulkMark('Present')} color="success" sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}>
                      Mark Week Present
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => handleWeeklyBulkMark('Absent')} color="error" sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}>
                      Mark Week Absent
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => handleWeeklyBulkMark('Cancelled')} color="warning" sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}>
                      Mark Week Cancelled
                    </Button>
                  </Box>
                )
              )}
            </Paper>

            {backfillLoading ? (
              <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
            ) : backfillMode === 'single' ? (
              <Box display="flex" flexDirection="column" gap={2}>
                {backfillSlots.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <Typography variant="body2" color="text.secondary">No scheduled lectures found for this weekday.</Typography>
                  </Paper>
                ) : (
                  <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <List disablePadding>
                      {backfillSlots.map((slot, index) => (
                        <Box key={slot.id}>
                          <ListItem sx={{ py: 2.5, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{slot.subject_details?.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatTime(slot.start_time.substring(0, 5))} - {formatTime(slot.end_time.substring(0, 5))} &bull; {slot.lecture_type}
                              </Typography>
                            </Box>

                            {!backfillIsHoliday && (
                              <Box display="flex" gap={1}>
                                {['Present', 'Absent', 'Cancelled'].map((status) => {
                                  const isActive = slot.attendance_status === status;
                                  return (
                                    <Chip
                                      key={status}
                                      label={status}
                                      color={isActive ? (status === 'Present' ? 'success' : status === 'Absent' ? 'error' : 'warning') : 'default'}
                                      variant={isActive ? 'filled' : 'outlined'}
                                      onClick={() => handleUpdateSlotStatus(slot.id, status)}
                                      sx={{ fontWeight: 'bold', cursor: 'pointer', borderRadius: 2 }}
                                    />
                                  );
                                })}
                              </Box>
                            )}
                          </ListItem>
                          {index < backfillSlots.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  </Paper>
                )}

                {backfillSlots.length > 0 && (
                  <Button
                    variant="contained"
                    onClick={handleSaveSingleDay}
                    disabled={backfillSaving}
                    size="large"
                    sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 3, boxShadow: '0 4px 12px rgba(37,99,235,0.1)' }}
                  >
                    {backfillSaving ? 'Saving Attendance...' : 'Save Day\'s Attendance'}
                  </Button>
                )}
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={3.5}>
                {backfillWeeklyData.map((dayItem) => {
                  const localDayLabel = new Date(dayItem.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
                  return (
                    <Card key={dayItem.date} variant="outlined" sx={{ borderRadius: 3 }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="primary.main" gutterBottom>
                          {localDayLabel}
                        </Typography>

                        {dayItem.slots.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                            No scheduled lectures for this day.
                          </Typography>
                        ) : (
                          <List disablePadding sx={{ mt: 1 }}>
                            {dayItem.slots.map((slot, index) => (
                              <Box key={slot.id}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" py={1.5} flexWrap="wrap" gap={1.5}>
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">{slot.subject_details?.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatTime(slot.start_time.substring(0, 5))} - {formatTime(slot.end_time.substring(0, 5))}
                                    </Typography>
                                  </Box>
                                  <Box display="flex" gap={1}>
                                    {['Present', 'Absent', 'Cancelled'].map((status) => {
                                      const isActive = slot.attendance_status === status;
                                      return (
                                        <Chip
                                          key={status}
                                          label={status}
                                          color={isActive ? (status === 'Present' ? 'success' : status === 'Absent' ? 'error' : 'warning') : 'default'}
                                          variant={isActive ? 'filled' : 'outlined'}
                                          onClick={() => handleUpdateWeeklySlotStatus(dayItem.date, slot.id, status)}
                                          size="small"
                                          sx={{ fontWeight: 'bold', cursor: 'pointer', borderRadius: 2 }}
                                        />
                                      );
                                    })}
                                  </Box>
                                </Box>
                                {index < dayItem.slots.length - 1 && <Divider />}
                              </Box>
                            ))}
                          </List>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {backfillWeeklyData.some(d => d.slots.length > 0) && (
                  <Button
                    variant="contained"
                    onClick={handleSaveWeek}
                    disabled={backfillSaving}
                    size="large"
                    sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 3, boxShadow: '0 4px 12px rgba(37,99,235,0.1)' }}
                  >
                    {backfillSaving ? 'Saving Week...' : 'Save Weekly Attendance'}
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: Subjects list */}
        {activeTab === 2 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="subtitle1" fontWeight="bold">Tracked Subjects</Typography>
            
            {subjectsList.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">No tracked subjects. Timetable not uploaded.</Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {subjectsList.map((sub) => {
                  const isSafe = sub.percentage >= targetGoal;
                  return (
                    <Grid item xs={12} sm={6} key={sub.id}>
                      <Card
                        variant="outlined"
                        onClick={() => handleOpenSubjectDetails(sub)}
                        sx={{
                          borderRadius: 3,
                          cursor: 'pointer',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
                          transition: 'all 0.2s',
                          borderLeft: `5px solid ${sub.color || '#3b82f6'}`
                        }}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: '75%' }}>
                              {sub.name}
                            </Typography>
                            <Chip
                              label={isSafe ? 'Safe' : 'Warning'}
                              color={isSafe ? 'success' : 'warning'}
                              size="small"
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold' }}
                            />
                          </Box>
                          
                          <Typography variant="h5" fontWeight="bold" color="text.primary">
                            {sub.percentage}%
                          </Typography>
                          
                          <LinearProgress
                            variant="determinate"
                            value={sub.percentage}
                            sx={{ height: 6, borderRadius: 3, my: 1.5, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: sub.color || '#3b82f6' } }}
                          />

                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Present: <strong>{sub.present}</strong> | Absent: <strong>{sub.absent}</strong> | Late: <strong>{sub.late}</strong> | Cancelled: <strong>{sub.cancelled_count || 0}</strong>
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}

        {/* Tab 3: Attendance History Logs */}
        {activeTab === 3 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="subtitle1" fontWeight="bold">Recent Logs</Typography>

            {historyLogs.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">No attendance logs found.</Typography>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <List disablePadding>
                  {historyLogs.slice(0, 15).map((log, index) => {
                    const localDate = new Date(log.date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    });
                    return (
                      <Box key={log.id}>
                        <ListItem sx={{ py: 2, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {log.subject_details?.name || log.subject_name || 'Subject'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {localDate} • Checked in at {log.device_time ? new Date(log.device_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </Typography>
                          </Box>
                          
                          <Chip
                            label={log.status}
                            color={
                              log.status === 'Present' ? 'success' :
                              log.status === 'Absent' ? 'error' :
                              log.status === 'Cancelled' ? 'warning' :
                              log.status === 'Holiday' ? 'info' : 'default'
                            }
                            size="small"
                            sx={{ fontWeight: 'bold', borderRadius: 1.5 }}
                          />
                        </ListItem>
                        {index < Math.min(historyLogs.length, 15) - 1 && <Divider />}
                      </Box>
                    );
                  })}
                </List>
              </Paper>
            )}
          </Box>
        )}

        {/* Tab 4: Attendance Analytics Calculations */}
        {activeTab === 4 && (
          <Box display="flex" flexDirection="column" gap={2.5}>
            <Typography variant="subtitle1" fontWeight="bold">Attendance Calculations</Typography>

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={4}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: 'center', height: '100%' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">OVERALL PERCENTAGE</Typography>
                  <Typography variant="h3" fontWeight="bold" color="primary.main" sx={{ mt: 1.5, mb: 1 }}>
                    {overallAttendance}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Goal is set to {targetGoal}%</Typography>
                </Paper>
              </Grid>

              {/* Loop and summarize bunks calculations */}
              <Grid item xs={12} sm={8}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">Smart Bunk Estimator</Typography>
                  
                  {subjectsList.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No analytics available.</Typography>
                  ) : (
                    <Box display="flex" flexDirection="column" gap={1.5}>
                      {subjectsList.slice(0, 4).map((sub) => {
                        const attended = sub.present + sub.late;
                        const calc = calculateSmartBunks(attended, sub.total, targetGoal);
                        const isAtRisk = sub.percentage < targetGoal;

                        return (
                          <Box key={sub.id} display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight="medium">{sub.name}</Typography>
                            {isAtRisk ? (
                              <Chip
                                label={`Attend next ${calc.consecutive_needed} classes`}
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                            ) : (
                              <Chip
                                label={`${calc.safe_bunks} Safe Bunks`}
                                color="success"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 5: Export Sheet */}
        {activeTab === 5 && (
          <Box display="flex" flexDirection="column" gap={3}>
            <Typography variant="subtitle1" fontWeight="bold">Export Attendance Data</Typography>

            <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <AssessmentIcon color="primary" sx={{ fontSize: 50, mb: 2, opacity: 0.8 }} />
              <Typography variant="h6" fontWeight="bold" mb={1}>Download CSV Spreadsheet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
                Generate and download your complete historical attendance record log as a `.csv` spreadsheet file, compatible with Google Sheets, Microsoft Excel, and Notion.
              </Typography>
              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={handleCSVExport}
                disabled={exporting}
                sx={{ px: 4, py: 1.2, fontWeight: 'bold', borderRadius: 2 }}
              >
                {exporting ? 'Generating CSV...' : 'Download Attendance Report'}
              </Button>
            </Paper>
          </Box>
        )}

      </Box>

      {/* Subject Logs Modal Detail */}
      <Dialog
        open={selectedSubject !== null}
        onClose={() => setSelectedSubject(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {selectedSubject?.name} Logs
          <IconButton onClick={() => setSelectedSubject(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 250, bgcolor: 'background.default' }}>
          {subjectDetailsLoading ? (
            <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
          ) : subjectHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" py={5}>
              No check-in history found for this subject.
            </Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {subjectHistory.map((rec, i) => (
                <ListItem key={rec.id} divider={i < subjectHistory.length - 1} sx={{ py: 1.5 }}>
                  <ListItemText
                    primary={new Date(rec.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    secondary={rec.device_time ? `Recorded at ${new Date(rec.device_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  />
                  <Chip
                    label={rec.status}
                    color={rec.status === 'Present' ? 'success' : rec.status === 'Absent' ? 'error' : 'warning'}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setSelectedSubject(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Local Toast Alert */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default Attendance;
