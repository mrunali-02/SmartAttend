import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Chip,
  CircularProgress,
  IconButton,
  TablePagination,
  Snackbar,
  Alert,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FilterListIcon from '@mui/icons-material/FilterList';

const MONTHS = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const AttendanceHistory = () => {
  const [records, setRecords] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtering states
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('-date');

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Snackbar Notification State
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/timetable/subjects/');
      setSubjects(res.data);
    } catch (err) {
      showNotification('Failed to fetch subjects for filters.', 'error');
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {
        subject: filterSubject,
        status: filterStatus,
        month: filterMonth,
        date: filterDate,
        search: searchQuery,
        sort: sortBy
      };
      
      const res = await api.get('/attendance/records/', { params });
      setRecords(res.data);
    } catch (err) {
      showNotification('Failed to fetch attendance logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchHistory();
    setPage(0); // Reset page on filter change
  }, [filterSubject, filterStatus, filterMonth, filterDate, searchQuery, sortBy]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'success';
      case 'Absent': return 'error';
      case 'Late': return 'warning';
      default: return 'default';
    }
  };

  const formatClockTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'N/A';
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDifference = (diff) => {
    if (diff === null || diff === undefined) return '';
    if (diff === 0) return 'On time';
    if (diff > 0) return `Late by +${diff} mins`;
    return `Early by ${diff} mins`;
  };

  // Slice records for client-side pagination
  const paginatedRecords = records.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <AppLayout>
      <Box display="flex" flexDirection="column" gap={3}>
        {/* Filters Card */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <FilterListIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">Filters & Sorting</Typography>
            </Box>
            <Grid container spacing={2}>
              {/* Search Subject/Faculty */}
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Subject or Faculty"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Filter by Subject */}
              <Grid item xs={12} sm={4} md={2.25}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Subject"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                >
                  <MenuItem value="">All Subjects</MenuItem>
                  {subjects.map(sub => (
                    <MenuItem key={sub.id} value={sub.id}>{sub.code} - {sub.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Filter by Status */}
              <Grid item xs={12} sm={4} md={1.75}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="Present">Present</MenuItem>
                  <MenuItem value="Late">Late</MenuItem>
                  <MenuItem value="Absent">Absent</MenuItem>
                </TextField>
              </Grid>

              {/* Filter by Month */}
              <Grid item xs={12} sm={4} md={1.75}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                >
                  {MONTHS.map(m => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Filter by Date */}
              <Grid item xs={12} sm={4} md={1.75}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Date"
                  InputLabelProps={{ shrink: true }}
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </Grid>

              {/* Sorting */}
              <Grid item xs={12} sm={4} md={1.5}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Sort By"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="-date">Newest Date</MenuItem>
                  <MenuItem value="date">Oldest Date</MenuItem>
                  <MenuItem value="-timestamp">Marked Time (Desc)</MenuItem>
                  <MenuItem value="timestamp">Marked Time (Asc)</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading ? (
          <Box display="flex" justify="center" py={8}>
            <CircularProgress />
          </Box>
        ) : records.length === 0 ? (
          <Paper sx={{ p: 6, textAlignment: 'center', borderRadius: 3 }} variant="outlined">
            <CalendarTodayIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold">No check-in records found</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Try adjusting your search queries or filter selections.
            </Typography>
          </Paper>
        ) : (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Check-In Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Time Offset</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {record.subject_details?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.subject_details?.code} • {record.subject_details?.faculty_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        {formatClockTime(record.device_time || record.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          size="small"
                          color={getStatusColor(record.status)}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={record.time_difference > 0 ? 'warning.main' : 'success.main'}>
                          {formatDifference(record.time_difference)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                        {record.remarks || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={records.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Card>
        )}
      </Box>

      {/* Snackbar Alerts */}
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default AttendanceHistory;
