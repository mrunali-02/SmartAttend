import React, { useState, useEffect } from 'react';
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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  MenuItem,
  TextField,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudUpload';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SummarizeIcon from '@mui/icons-material/Summarize';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const Reports = () => {
  const [reportType, setReportType] = useState('semester');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard/');
      setAnalytics(res.data);
    } catch (err) {
      showNotification('Failed to load report analytics summary.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Direct browser download URL using axios or direct token download
      const response = await api.get(`/analytics/export/?type=${reportType}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Smartttend_Attendance_Report_${reportType}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      showNotification('CSV Report exported successfully.');
    } catch (err) {
      showNotification('Failed to export CSV report.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const getPercentageColor = (pct) => {
    if (pct >= 85) return 'success.main';
    if (pct >= 75) return 'info.main';
    return 'error.main';
  };

  return (
    <AppLayout>
      <Box display="flex" flexDirection="column" gap={3}>
        {/* Export Card */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={7}>
                <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                  <AssessmentIcon color="primary" sx={{ fontSize: 32 }} />
                  <Typography variant="h5" fontWeight="bold">Export Attendance Logs</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Generate comprehensive attendance logs, averages, late clock-in offsets, and student division details. Reports are exported in clean CSV format which is compatible with Excel and Google Sheets.
                </Typography>
              </Grid>

              <Grid item xs={12} md={5} display="flex" gap={2} alignItems="center" flexWrap="wrap" sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <TextField
                  select
                  size="small"
                  label="Report Type"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  sx={{ width: 160 }}
                >
                  <MenuItem value="weekly">Weekly Report</MenuItem>
                  <MenuItem value="monthly">Monthly Report</MenuItem>
                  <MenuItem value="semester">Semester Report</MenuItem>
                </TextField>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CloudDownloadIcon />}
                  onClick={handleExportCSV}
                  disabled={exporting}
                  sx={{ py: 1, fontWeight: 'bold' }}
                >
                  {exporting ? <CircularProgress size={20} color="inherit" /> : 'Export CSV'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Left side: Averages Summary */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <SummarizeIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">Report Summary</Typography>
                  </Box>

                  <Box display="flex" flexDirection="column" gap={2}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h3" fontWeight="bold" sx={{ color: getPercentageColor(analytics?.overall_attendance) }}>
                        {analytics?.overall_attendance}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mt={0.5}>
                        OVERALL ATTENDANCE
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h3" fontWeight="bold" color="primary.main">
                        {analytics?.score}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mt={0.5}>
                        ATTENDANCE SCORE ({analytics?.score_label})
                      </Typography>
                    </Paper>
                  </Box>

                  <Divider />

                  <Box display="flex" flexDirection="column" gap={1.5}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Total Scheduled Subjects</Typography>
                      <Typography variant="body2" fontWeight="bold">{analytics?.total_subjects}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Total Lectures Logged</Typography>
                      <Typography variant="body2" fontWeight="bold">{analytics?.total_lectures}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Presents Count</Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.main">{analytics?.present_count}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Absents Count</Typography>
                      <Typography variant="body2" fontWeight="bold" color="error.main">{analytics?.absent_count}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Late Check-Ins</Typography>
                      <Typography variant="body2" fontWeight="bold" color="warning.main">{analytics?.late_count}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Right side: Subjects Overview Table */}
            <Grid item xs={12} md={8}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" mb={2}>Subject-wise Breakdown</Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="center">Attended</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="center">Total</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="center">Percentage</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics?.subjects?.map((sub) => (
                          <TableRow key={sub.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">{sub.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{sub.code}</Typography>
                            </TableCell>
                            <TableCell align="center">{sub.present + sub.late}</TableCell>
                            <TableCell align="center">{sub.total}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', color: getPercentageColor(sub.percentage) }}>
                              {sub.percentage}%
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={sub.percentage >= 75 ? 'Safe' : 'Critical'}
                                size="small"
                                color={sub.percentage >= 75 ? 'success' : 'error'}
                                variant="outlined"
                                sx={{ height: 20, fontWeight: 'bold' }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
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

export default Reports;
