import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Paper,
  Snackbar,
  Alert,
  Chip,
  Divider,
  List,
  ListItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const LECTURE_TYPES = ['Theory', 'Practical', 'Lab', 'Tutorial'];

const Timetable = () => {
  const { user } = useAuth();
  
  // Two tabs: 0 = Calendar View, 1 = Upload & Subjects list
  const [activeView, setActiveView] = useState(0);
  
  // Selected weekday for the timeline (default to Monday or current day if weekday)
  const getCurrentDay = () => {
    const dayIndex = new Date().getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentName = dayNames[dayIndex];
    return DAYS.includes(currentName) ? currentName : 'Monday';
  };
  const [selectedDay, setSelectedDay] = useState(getCurrentDay());

  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
  });
  const [loading, setLoading] = useState(true);

  // Modals state
  const [subjectModal, setSubjectModal] = useState({ open: false });
  const [lectureModal, setLectureModal] = useState({ open: false, data: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: null });

  // OCR upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [draftSlots, setDraftSlots] = useState([]);
  const [lowConfidence, setLowConfidence] = useState(false);

  // Forms state
  const [subjectForm, setSubjectForm] = useState({
    subject_name: '',
    subject_code: '',
    faculty_name: '',
    building: '',
    classroom: '',
    day: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    lecture_type: 'Theory',
    credits: 3,
    color: '#3b82f6'
  });

  const [lectureForm, setLectureForm] = useState({
    subject: '',
    day: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    lecture_type: 'Theory',
    building: '',
    classroom: ''
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const subRes = await api.get('/timetable/subjects/');
      setSubjects(subRes.data || []);

      const ttRes = await api.get('/timetable/slots/weekly/');
      setTimetable(ttRes.data || {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
      });
    } catch (err) {
      showToast('Failed to load timetable.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenSubjectModal = () => {
    setSubjectForm({
      subject_name: '',
      subject_code: '',
      faculty_name: '',
      building: '',
      classroom: '',
      day: selectedDay,
      start_time: '09:00',
      end_time: '10:00',
      lecture_type: 'Theory',
      credits: 3,
      color: '#3b82f6'
    });
    setSubjectModal({ open: true });
  };

  const handleSaveSubject = async () => {
    const { subject_name, faculty_name, day, start_time, end_time } = subjectForm;
    if (!subject_name || !faculty_name || !day || !start_time || !end_time) {
      showToast('Fill in all required fields.', 'warning');
      return;
    }
    if (start_time >= end_time) {
      showToast('End time must be after start time.', 'error');
      return;
    }
    try {
      await api.post('/timetable/timetable', subjectForm);
      showToast('Subject timing added to schedule.');
      setSubjectModal({ open: false });
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to schedule. Check for timing overlaps.';
      showToast(errorMsg, 'error');
    }
  };

  const handleOpenLectureModal = (lecture) => {
    setLectureForm({
      subject: lecture.subject,
      day: lecture.day,
      start_time: lecture.start_time.substring(0, 5),
      end_time: lecture.end_time.substring(0, 5),
      lecture_type: lecture.lecture_type,
      building: lecture.building || '',
      classroom: lecture.classroom || ''
    });
    setLectureModal({ open: true, data: lecture });
  };

  const handleSaveLecture = async () => {
    if (lectureForm.start_time >= lectureForm.end_time) {
      showToast('End time must be after start time.', 'error');
      return;
    }
    try {
      const payload = {
        ...lectureForm,
        start_time: `${lectureForm.start_time}:00`,
        end_time: `${lectureForm.end_time}:00`
      };
      await api.put(`/timetable/slots/${lectureModal.data.id}/`, payload);
      showToast('Slot updated.');
      setLectureModal({ open: false, data: null });
      fetchData();
    } catch (err) {
      showToast('Overlapping or invalid slot.', 'error');
    }
  };

  const handleDelete = async () => {
    const { type, id } = deleteConfirm;
    try {
      if (type === 'subject') {
        await api.delete(`/timetable/subjects/${id}/`);
        showToast('Subject deleted.');
      } else {
        await api.delete(`/timetable/slots/${id}/`);
        showToast('Slot deleted.');
      }
      setDeleteConfirm({ open: false, type: '', id: null });
      fetchData();
    } catch (err) {
      showToast('Failed to delete.', 'error');
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUploadFile = async () => {
    if (!selectedFile) {
      showToast('Please select a file.', 'warning');
      return;
    }
    setUploading(true);
    setLowConfidence(false);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const res = await api.post('/timetable/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDraftSlots(res.data.slots || []);
      setLowConfidence(res.data.low_confidence || false);
      showToast('OCR extraction completed. Review draft slots below.');
    } catch (err) {
      showToast('OCR Timetable reading failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveImportedTimetable = async () => {
    if (draftSlots.length === 0) return;
    setLoading(true);
    try {
      await api.post('/timetable/save', { slots: draftSlots });
      showToast('Timetable imported successfully!');
      setDraftSlots([]);
      setSelectedFile(null);
      setActiveView(0);
      fetchData();
    } catch (err) {
      showToast('Failed to save imported timetable.', 'error');
    } finally {
      setLoading(false);
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

  const selectedLectures = timetable[selectedDay] || [];

  return (
    <AppLayout>
      <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Top View Selector */}
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0.5 }}>
          <Tabs value={activeView} onChange={(e, val) => setActiveView(val)} textColor="primary" indicatorColor="primary">
            <Tab label="Timeline View" icon={<CalendarTodayIcon />} iconPosition="start" sx={{ fontWeight: 'bold' }} />
            <Tab label="Manage & Import" icon={<CloudUploadIcon />} iconPosition="start" sx={{ fontWeight: 'bold' }} />
          </Tabs>

          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenSubjectModal} sx={{ mr: 1, fontWeight: 'bold', borderRadius: 2 }}>
            Add Class
          </Button>
        </Paper>

        {/* View 0: Google Calendar-Style Day timeline */}
        {activeView === 0 && (
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Horizontal Day selection row */}
            <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: 1.5, overflowX: 'auto', pb: 1 }}>
              {DAYS.map((day) => {
                const count = timetable[day]?.length || 0;
                const isSelected = selectedDay === day;
                return (
                  <Button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    variant={isSelected ? 'contained' : 'outlined'}
                    color={isSelected ? 'primary' : 'inherit'}
                    sx={{
                      flex: 1,
                      minWidth: 90,
                      borderRadius: 3,
                      py: 1.5,
                      textTransform: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      boxShadow: 'none'
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {day.substring(0, 3)}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      {count} {count === 1 ? 'class' : 'classes'}
                    </Typography>
                  </Button>
                );
              })}
            </Box>

            {/* Daily Schedule Vertical Timeline */}
            <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
              Schedule for {selectedDay}
            </Typography>

            {selectedLectures.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No classes scheduled. Enjoy your day!
                </Typography>
              </Paper>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {[...selectedLectures].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((lecture) => (
                  <Card
                    key={lecture.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      borderLeft: `6px solid ${lecture.subject_details?.color || '#3b82f6'}`
                    }}
                  >
                    <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      <Box display="flex" gap={2.5}>
                        <Box sx={{ minWidth: 70, pt: 0.5 }}>
                          <Typography variant="body2" fontWeight="bold" color="primary.main">
                            {formatTime(lecture.start_time.substring(0, 5))}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            to {formatTime(lecture.end_time.substring(0, 5))}
                          </Typography>
                        </Box>
                        
                        <Divider orientation="vertical" flexItem />

                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {lecture.subject_details?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {lecture.subject_details?.faculty_name} &bull; Room {lecture.classroom || 'TBD'} Block {lecture.building || 'TBD'}
                          </Typography>
                          <Chip
                            label={lecture.lecture_type}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1, height: 18, fontSize: '0.65rem', fontWeight: 'bold' }}
                          />
                        </Box>
                      </Box>

                      <Box display="flex" gap={0.5}>
                        <IconButton size="small" onClick={() => handleOpenLectureModal(lecture)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ open: true, type: 'lecture', id: lecture.id })}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* View 1: Manage subjects & upload OCR */}
        {activeView === 1 && (
          <Box display="flex" flexDirection="column" gap={4}>
            
            {/* Upload OCR Segment */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>OCR Timetable Upload</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Upload a photo or PDF of your class timetable sheet, and our OCR pipeline will scan, parse, and schedule classes automatically.
              </Typography>
              
              <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} id="ocr-file" style={{ display: 'none' }} />
                <label htmlFor="ocr-file">
                  <Button variant="outlined" component="span">Choose File</Button>
                </label>
                {selectedFile && <Typography variant="caption">{selectedFile.name}</Typography>}
                
                <Button variant="contained" onClick={handleUploadFile} disabled={uploading || !selectedFile} startIcon={uploading ? <CircularProgress size={16} /> : null}>
                  {uploading ? 'Analyzing...' : 'Scan & Extract'}
                </Button>
              </Box>

              {draftSlots.length > 0 && (
                <Box mt={3} display="flex" flexDirection="column" gap={2}>
                  <Divider />
                  <Typography variant="subtitle2" fontWeight="bold">Extracted Draft Slots</Typography>
                  {draftSlots.map((slot, idx) => (
                    <Box key={idx} display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
                      <TextField size="small" placeholder="Subject Name" value={slot.subject_name} onChange={(e) => {
                        const updated = [...draftSlots];
                        updated[idx].subject_name = e.target.value;
                        setDraftSlots(updated);
                      }} />
                      <TextField size="small" placeholder="Room" style={{ width: 90 }} value={slot.classroom} onChange={(e) => {
                        const updated = [...draftSlots];
                        updated[idx].classroom = e.target.value;
                        setDraftSlots(updated);
                      }} />
                      <IconButton color="error" onClick={() => setDraftSlots(draftSlots.filter((_, i) => i !== idx))}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button variant="contained" color="success" onClick={handleSaveImportedTimetable} sx={{ mt: 1, alignSelf: 'flex-start' }}>Save Imported Schedule</Button>
                </Box>
              )}
            </Paper>

            {/* Tracked Subjects CRUD list */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>List of Subjects</Typography>
              {subjects.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No subjects found.</Typography>
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <List disablePadding>
                    {subjects.map((sub, index) => (
                      <Box key={sub.id}>
                        <ListItem sx={{ py: 2, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">{sub.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Code: {sub.code} &bull; Faculty: {sub.faculty_name} &bull; Credits: {sub.credits}
                            </Typography>
                          </Box>
                          <IconButton color="error" onClick={() => setDeleteConfirm({ open: true, type: 'subject', id: sub.id })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItem>
                        {index < subjects.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>

          </Box>
        )}

      </Box>

      {/* Save Timetable Slot Timing Modal */}
      <Dialog open={subjectModal.open} onClose={() => setSubjectModal({ open: false })} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add Class timing</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField label="Subject Name" size="small" fullWidth value={subjectForm.subject_name} onChange={(e) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })} />
          <TextField label="Subject Code" size="small" fullWidth value={subjectForm.subject_code} onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value })} />
          <TextField label="Faculty Name" size="small" fullWidth value={subjectForm.faculty_name} onChange={(e) => setSubjectForm({ ...subjectForm, faculty_name: e.target.value })} />
          <Box display="flex" gap={2}>
            <TextField label="Block" size="small" fullWidth value={subjectForm.building} onChange={(e) => setSubjectForm({ ...subjectForm, building: e.target.value })} />
            <TextField label="Room" size="small" fullWidth value={subjectForm.classroom} onChange={(e) => setSubjectForm({ ...subjectForm, classroom: e.target.value })} />
          </Box>
          <Box display="flex" gap={2}>
            <TextField select label="Day" size="small" fullWidth value={subjectForm.day} onChange={(e) => setSubjectForm({ ...subjectForm, day: e.target.value })}>
              {DAYS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <TextField select label="Type" size="small" fullWidth value={subjectForm.lecture_type} onChange={(e) => setSubjectForm({ ...subjectForm, lecture_type: e.target.value })}>
              {LECTURE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Box>
          <Box display="flex" gap={2}>
            <TextField label="Start Time (HH:MM)" size="small" fullWidth type="time" slotProps={{ htmlInput: { step: 300 } }} value={subjectForm.start_time} onChange={(e) => setSubjectForm({ ...subjectForm, start_time: e.target.value })} />
            <TextField label="End Time (HH:MM)" size="small" fullWidth type="time" slotProps={{ htmlInput: { step: 300 } }} value={subjectForm.end_time} onChange={(e) => setSubjectForm({ ...subjectForm, end_time: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSubjectModal({ open: false })}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSubject}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Slot timing modal */}
      <Dialog open={lectureModal.open} onClose={() => setLectureModal({ open: false, data: null })} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Lecture timing</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField label="Start Time" size="small" type="time" fullWidth value={lectureForm.start_time} onChange={(e) => setLectureForm({ ...lectureForm, start_time: e.target.value })} />
          <TextField label="End Time" size="small" type="time" fullWidth value={lectureForm.end_time} onChange={(e) => setLectureForm({ ...lectureForm, end_time: e.target.value })} />
          <Box display="flex" gap={2}>
            <TextField label="Block" size="small" fullWidth value={lectureForm.building} onChange={(e) => setLectureForm({ ...lectureForm, building: e.target.value })} />
            <TextField label="Room" size="small" fullWidth value={lectureForm.classroom} onChange={(e) => setLectureForm({ ...lectureForm, classroom: e.target.value })} />
          </Box>
          <Box display="flex" gap={2}>
            <TextField select label="Day" size="small" fullWidth value={lectureForm.day} onChange={(e) => setLectureForm({ ...lectureForm, day: e.target.value })}>
              {DAYS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <TextField select label="Lecture Type" size="small" fullWidth value={lectureForm.lecture_type} onChange={(e) => setLectureForm({ ...lectureForm, lecture_type: e.target.value })}>
              {LECTURE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLectureModal({ open: false, data: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveLecture}>Save changes</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm deletion modal dialog */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, type: '', id: null })} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Delete Confirmation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete this {deleteConfirm.type === 'subject' ? 'subject (all associated timings will be deleted)' : 'lecture slot'}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirm({ open: false, type: '', id: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default Timetable;
