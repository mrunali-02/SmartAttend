import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Splash from '../pages/Splash/Splash';
import Login from '../pages/Login/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import Profile from '../pages/Profile/Profile';
import Timetable from '../pages/Timetable/Timetable';
import Attendance from '../pages/Attendance/Attendance';
import SubjectDetails from '../pages/SubjectDetails/SubjectDetails';
import Settings from '../pages/Settings/Settings';
import NotificationsCenter from '../pages/Notifications/Notifications';
import ProfileCompletion from '../pages/ProfileCompletion/ProfileCompletion';
import NotFound from '../pages/NotFound/NotFound';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PublicRoute from '../components/auth/PublicRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Splash Screen */}
      <Route path="/" element={<Splash />} />

      {/* Public Guest-Only Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Profile Completion Flow */}
      <Route
        path="/profile-completion"
        element={
          <ProtectedRoute allowIncomplete={true}>
            <ProfileCompletion />
          </ProtectedRoute>
        }
      />

      {/* Protected Student Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timetable"
        element={
          <ProtectedRoute>
            <Timetable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subjects/:id"
        element={
          <ProtectedRoute>
            <SubjectDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/ai"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsCenter />
          </ProtectedRoute>
        }
      />

      {/* Redirection for legacy routes that were consolidated */}
      <Route path="/history" element={<Navigate to="/attendance" replace />} />
      <Route path="/reports" element={<Navigate to="/attendance" replace />} />
      <Route path="/ai-assistant" element={<Navigate to="/dashboard" replace />} />

      {/* Custom 404 Page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
