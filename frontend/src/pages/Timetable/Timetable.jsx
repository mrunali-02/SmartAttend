import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CardActionArea,
  Divider
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ViewListIcon from '@mui/icons-material/ViewList';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LECTURE_TYPES = ['Theory', 'Practical', 'Lab'];

const Timetable = () => {
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
  });
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState(0); // 0 = Calendar/List, 1 = Table, 2 = Import

  // Snackbar Notification State
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Dialog Modals State
  const [subjectModal, setSubjectModal] = useState({ open: false, mode: 'create', data: null });
  const [lectureModal, setLectureModal] = useState({ open: false, mode: 'create', data: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: null });

  // OCR Timetable Import wizard state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [draftSlots, setDraftSlots] = useState([]);

  // Input Forms State
  const [subjectForm, setSubjectForm] = useState({
    name: '', code: '', faculty_name: '', credits: 3, semester: '', division: '', batch: '', color: '#3b82f6'
  });
  const [lectureForm, setLectureForm] = useState({
    subject: '', day: 'Monday', start_time: '09:00', end_time: '10:00', lecture_type: 'Theory'
  });

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const subRes = await api.get('/timetable/subjects/');
      setSubjects(subRes.data);

      const ttRes = await api.get('/timetable/slots/weekly/');
      setTimetable(ttRes.data);
    } catch (err) {
      showNotification('Failed to fetch timetable data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Subject Handlers
  const handleOpenSubjectModal = (mode, data = null) => {
    if (mode === 'edit' && data) {
      setSubjectForm({
        name: data.name,
        code: data.code,
        faculty_name: data.faculty_name,
        credits: data.credits,
        semester: data.semester,
        division: data.division,
        batch: data.batch || '',
        color: data.color
      });
      setSubjectModal({ open: true, mode: 'edit', data });
    } else {
      setSubjectForm({
        name: '', code: '', faculty_name: '', credits: 3, semester: '1', division: 'A', batch: '', color: '#3b82f6'
      });
      setSubjectModal({ open: true, mode: 'create', data: null });
    }
  };

  const handleSaveSubject = async () => {
    if (!subjectForm.name || !subjectForm.code || !subjectForm.faculty_name) {
      showNotification('Please fill in all required subject fields.', 'warning');
      return;
    }
    try {
      if (subjectModal.mode === 'create') {
        await api.post('/timetable/subjects/', subjectForm);
        showNotification('Subject created successfully.');
      } else {
        await api.put(`/timetable/subjects/${subjectModal.data.id}/`, subjectForm);
        showNotification('Subject updated successfully.');
      }
      setSubjectModal({ open: false, mode: 'create', data: null });
      fetchData();
    } catch (err) {
      const detail = err.response?.data?.code || 'Failed to save subject.';
      showNotification(detail, 'error');
    }
  };

  // Lecture Handlers
  const handleOpenLectureModal = (mode, data = null) => {
    if (mode === 'edit' && data) {
      setLectureForm({
        subject: data.subject,
        day: data.day,
        start_time: data.start_time.substring(0, 5),
        end_time: data.end_time.substring(0, 5),
        lecture_type: data.lecture_type
      });
      setLectureModal({ open: true, mode: 'edit', data });
    } else {
      setLectureForm({
        subject: subjects[0]?.id || '',
        day: 'Monday',
        start_time: '09:00',
        end_time: '10:00',
        lecture_type: 'Theory'
      });
      setLectureModal({ open: true, mode: 'create', data: null });
    }
  };

  const handleSaveLecture = async () => {
    if (!lectureForm.subject) {
      showNotification('Please select a subject.', 'warning');
      return;
    }
    try {
      const payload = {
        ...lectureForm,
        start_time: `${lectureForm.start_time}:00`,
        end_time: `${lectureForm.end_time}:00`
      };
      if (lectureModal.mode === 'create') {
        await api.post('/timetable/slots/', payload);
        showNotification('Lecture slot scheduled successfully.');
      } else {
        await api.put(`/timetable/slots/${lectureModal.data.id}/`, payload);
        showNotification('Lecture slot updated successfully.');
      }
      setLectureModal({ open: false, mode: 'create', data: null });
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.non_field_errors?.[0] || 'Overlapping or invalid lecture times.';
      showNotification(errorMsg, 'error');
    }
  };

  // Delete handlers
  const handleConfirmDelete = (type, id) => {
    setDeleteConfirm({ open: true, type, id });
  };

  const handleDelete = async () => {
    const { type, id } = deleteConfirm;
    try {
      if (type === 'subject') {
        await api.delete(`/timetable/subjects/${id}/`);
        showNotification('Subject deleted successfully.');
      } else {
        await api.delete(`/timetable/slots/${id}/`);
        showNotification('Lecture slot removed successfully.');
      }
      setDeleteConfirm({ open: false, type: '', id: null });
      fetchData();
    } catch (err) {
      showNotification(`Failed to delete ${type}.`, 'error');
    }
  };

  // Timetable OCR Import Handlers
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUploadFile = async () => {
    if (!selectedFile) {
      showNotification('Please select a PDF or image file first.', 'warning');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/timetable/slots/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDraftSlots(res.data.slots);
      showNotification('OCR parsing complete. Please review the extracted slots below.');
    } catch (err) {
      showNotification('Failed to parse timetable file.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDraftFieldChange = (index, field, value) => {
    const updated = [...draftSlots];
    updated[index][field] = value;
    setDraftSlots(updated);
  };

  const handleRemoveDraftSlot = (index) => {
    const updated = draftSlots.filter((_, i) => i !== index);
    setDraftSlots(updated);
  };

  const handleSaveImportedTimetable = async () => {
    if (draftSlots.length === 0) {
      showNotification('No lecture slots to import.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await api.post('/timetable/slots/confirm-import/', { slots: draftSlots });
      showNotification('Timetable imported and scheduled successfully!');
      setDraftSlots([]);
      setSelectedFile(null);
      setViewTab(0);
      fetchData();
    } catch (err) {
      showNotification('Failed to save imported timetable slots.', 'error');
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

  return (
    <AppLayout>
      <Box display="flex" flexDirection="column" gap={3}>
        {/* Header Options */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Tabs value={viewTab} onChange={(e, val) => setViewTab(val)} textColor="primary" indicatorColor="primary">
            <Tab label="List View" icon={<CalendarTodayIcon />} iconPosition="start" />
            <Tab label="Grid View" icon={<ViewListIcon />} iconPosition="start" />
            <Tab label="Import File" icon={<CloudUploadIcon />} iconPosition="start" />
          </Tabs>

          <Box display="flex" gap={1.5}>
            <Button variant="outlined" color="primary" startIcon={<MenuBookIcon />} onClick={() => handleOpenSubjectModal('create')}>
              New Subject
            </Button>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenLectureModal('create')}>
              New Lecture
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* View Tab 0: Expandable List view per Day (Mobile-First friendly) */}
            {viewTab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  {DAYS.map((day) => {
                    const dayLectures = timetable[day] || [];
                    return (
                      <Accordion key={day} defaultExpanded={day === new Date().toLocaleDateString('en-US', { weekday: 'long' })} sx={{ mb: 1.5, borderRadius: 2, '&::before': { display: 'none' } }}>
                        <AccordionSummary expandMoreIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="h6" fontWeight="bold">{day}</Typography>
                            <Chip label={`${dayLectures.length} Lectures`} size="small" variant="outlined" />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {dayLectures.length === 0 ? (
                            <Typography color="text.secondary" variant="body2" sx={{ py: 2, textAlign: 'center' }}>
                              No lectures scheduled for {day}.
                            </Typography>
                          ) : (
                            <Grid container spacing={2}>
                              {dayLectures.map((lecture) => (
                                <Grid item xs={12} sm={6} md={4} key={lecture.id}>
                                  <Card variant="outlined" sx={{ borderLeft: `6px solid ${lecture.subject_details?.color || '#3b82f6'}`, height: '100%' }}>
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box>
                                          <Typography variant="body1" fontWeight="bold">
                                            {lecture.subject_details?.name}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            {lecture.subject_details?.code} • {lecture.subject_details?.faculty_name}
                                          </Typography>
                                          <Typography variant="body2" color="primary" fontWeight="medium" mt={1}>
                                            {formatTime(lecture.start_time)} - {formatTime(lecture.end_time)}
                                          </Typography>
                                          <Chip label={lecture.lecture_type} size="small" sx={{ mt: 1, height: 20 }} color={lecture.lecture_type === 'Theory' ? 'primary' : 'secondary'} />
                                        </Box>
                                        <Box display="flex">
                                          <IconButton size="small" onClick={() => handleOpenLectureModal('edit', lecture)}>
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                          <IconButton size="small" color="error" onClick={() => handleConfirmDelete('lecture', lecture.id)}>
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))}
                            </Grid>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Grid>
              </Grid>
            )}

            {/* View Tab 1: Tabular Matrix view */}
            {viewTab === 1 && (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Day</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Schedule Details (Start - End)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {DAYS.map((day) => {
                      const dayLectures = timetable[day] || [];
                      return (
                        <TableRow key={day} hover>
                          <TableCell sx={{ fontWeight: 'bold', width: 120 }}>{day}</TableCell>
                          <TableCell>
                            {dayLectures.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">Free Day</Typography>
                            ) : (
                              <Box display="flex" gap={1.5} flexWrap="wrap">
                                {dayLectures.map((lecture) => (
                                  <Paper
                                    key={lecture.id}
                                    variant="outlined"
                                    sx={{
                                      p: 1.5,
                                      minWidth: 180,
                                      borderLeft: `4px solid ${lecture.subject_details?.color || '#3b82f6'}`,
                                      bgcolor: 'background.paper',
                                      position: 'relative'
                                    }}
                                  >
                                    <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 160 }}>
                                      {lecture.subject_details?.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {formatTime(lecture.start_time)} - {formatTime(lecture.end_time)}
                                    </Typography>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                                      <Chip label={lecture.lecture_type} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      <Box>
                                        <IconButton size="small" onClick={() => handleOpenLectureModal('edit', lecture)}>
                                          <EditIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleConfirmDelete('lecture', lecture.id)}>
                                          <DeleteIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Box>
                                    </Box>
                                  </Paper>
                                ))}
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* View Tab 2: OCR Timetable upload */}
            {viewTab === 2 && (
              <Box display="flex" flexDirection="column" gap={3}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <Typography variant="h6" fontWeight="bold">Upload timetable image or PDF to extract slots</Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 500 }}>
                      The AI Assistant will extract subject codes, names, faculty details, and time slots. You can review and edit them in the draft checklist before saving.
                    </Typography>

                    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                      <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                        Select Timetable File
                        <input type="file" hidden accept="image/*,application/pdf" onChange={handleFileChange} />
                      </Button>
                      {selectedFile && (
                        <Typography variant="body2" fontWeight="medium">
                          {selectedFile.name}
                        </Typography>
                      )}
                    </Box>

                    <Button variant="contained" color="primary" disabled={!selectedFile || uploading} onClick={handleUploadFile} sx={{ px: 4 }}>
                      {uploading ? <CircularProgress size={24} color="inherit" /> : 'Run OCR Importer'}
                    </Button>
                  </CardContent>
                </Card>

                {draftSlots.length > 0 && (
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight="bold">Extracted Timetable Preview</Typography>
                        <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={handleSaveImportedTimetable}>
                          Save Draft Timetable
                        </Button>
                      </Box>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Faculty</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Day</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Start Time</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>End Time</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', width: 60 }}></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {draftSlots.map((slot, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <TextField size="small" fullWidth value={slot.subject_name} onChange={(e) => handleDraftFieldChange(index, 'subject_name', e.target.value)} />
                                </TableCell>
                                <TableCell>
                                  <TextField size="small" sx={{ width: 80 }} value={slot.subject_code} onChange={(e) => handleDraftFieldChange(index, 'subject_code', e.target.value)} />
                                </TableCell>
                                <TableCell>
                                  <TextField size="small" fullWidth value={slot.faculty_name} onChange={(e) => handleDraftFieldChange(index, 'faculty_name', e.target.value)} />
                                </TableCell>
                                <TableCell>
                                  <TextField size="small" select sx={{ width: 110 }} value={slot.day} onChange={(e) => handleDraftFieldChange(index, 'day', e.target.value)}>
                                    {DAYS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                                  </TextField>
                                </TableCell>
                                <TableCell>
                                  <TextField size="small" type="time" sx={{ width: 100 }} value={slot.start_time.substring(0, 5)} onChange={(e) => handleDraftFieldChange(index, 'start_time', e.target.value)} />
                                </TableCell>
                                <TableCell>
                                  <TextField size="small" type="time" sx={{ width: 100 }} value={slot.end_time.substring(0, 5)} onChange={(e) => handleDraftFieldChange(index, 'end_time', e.target.value)} />
                                </TableCell>
                                <TableCell>
                                  <TextField size="small" select sx={{ width: 110 }} value={slot.lecture_type} onChange={(e) => handleDraftFieldChange(index, 'lecture_type', e.target.value)}>
                                    {LECTURE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                  </TextField>
                                </TableCell>
                                <TableCell>
                                  <IconButton color="error" size="small" onClick={() => handleRemoveDraftSlot(index)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
          </>
        )}

        {/* Subjects list display */}
        {!loading && subjects.length > 0 && viewTab !== 2 && (
          <Box mt={3}>
            <Typography variant="h6" fontWeight="bold" mb={2}>My Subjects</Typography>
            <Grid container spacing={2}>
              {subjects.map((sub) => (
                <Grid item xs={12} sm={6} md={3} key={sub.id}>
                  <Card variant="outlined" sx={{ borderTop: `4px solid ${sub.color}`, height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" justify="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ maxWidth: 160 }}>
                            {sub.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {sub.code} • {sub.faculty_name}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }} fontWeight="medium">
                            Credits: {sub.credits}
                          </Typography>
                        </Box>
                        <Box>
                          <IconButton size="small" onClick={() => handleOpenSubjectModal('edit', sub)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleConfirmDelete('subject', sub.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Box>

      {/* Subject Modal Dialog */}
      <Dialog open={subjectModal.open} onClose={() => setSubjectModal({ open: false, mode: 'create', data: null })} fullWidth maxWidth="sm">
        <DialogTitle>{subjectModal.mode === 'create' ? 'Add Subject' : 'Edit Subject'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Subject Name" fullWidth size="small" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Subject Code" fullWidth size="small" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Credits" type="number" fullWidth size="small" value={subjectForm.credits} onChange={(e) => setSubjectForm({ ...subjectForm, credits: parseInt(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Faculty Name" fullWidth size="small" value={subjectForm.faculty_name} onChange={(e) => setSubjectForm({ ...subjectForm, faculty_name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Semester" fullWidth size="small" value={subjectForm.semester} onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Division" fullWidth size="small" value={subjectForm.division} onChange={(e) => setSubjectForm({ ...subjectForm, division: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Batch" placeholder="e.g. Batch 1 (Optional)" fullWidth size="small" value={subjectForm.batch} onChange={(e) => setSubjectForm({ ...subjectForm, batch: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Color (HEX)" placeholder="#3b82f6" fullWidth size="small" value={subjectForm.color} onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubjectModal({ open: false, mode: 'create', data: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSubject}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Lecture Modal Dialog */}
      <Dialog open={lectureModal.open} onClose={() => setLectureModal({ open: false, mode: 'create', data: null })} fullWidth maxWidth="sm">
        <DialogTitle>{lectureModal.mode === 'create' ? 'Schedule Lecture' : 'Edit Lecture'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Subject" select fullWidth size="small" value={lectureForm.subject} onChange={(e) => setLectureForm({ ...lectureForm, subject: e.target.value })}>
                {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name} ({s.code})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Day of Week" select fullWidth size="small" value={lectureForm.day} onChange={(e) => setLectureForm({ ...lectureForm, day: e.target.value })}>
                {DAYS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Lecture Type" select fullWidth size="small" value={lectureForm.lecture_type} onChange={(e) => setLectureForm({ ...lectureForm, lecture_type: e.target.value })}>
                {LECTURE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Start Time" type="time" fullWidth size="small" value={lectureForm.start_time} onChange={(e) => setLectureForm({ ...lectureForm, start_time: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="End Time" type="time" fullWidth size="small" value={lectureForm.end_time} onChange={(e) => setLectureForm({ ...lectureForm, end_time: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLectureModal({ open: false, mode: 'create', data: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveLecture}>Schedule</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, type: '', id: null })}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone and will delete all associated logs.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, type: '', id: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar alerts */}
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default Timetable;
