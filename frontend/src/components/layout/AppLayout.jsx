import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
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
  useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BarChartIcon from '@mui/icons-material/BarChart';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';

const DRAWER_WIDTH = 260;

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { toggleColorMode, mode } = useColorMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Attendance', icon: <CheckCircleIcon />, path: '/attendance' },
    { text: 'Timetable', icon: <CalendarTodayIcon />, path: '/timetable' },
    { text: 'History', icon: <BarChartIcon />, path: '/history' },
    { text: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
    { text: 'AI Assistant', icon: <AutoAwesomeIcon />, path: '/chat' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <AutoAwesomeIcon color="primary" sx={{ fontSize: 28 }} />
        <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: 0.5 }}>
          Smartttend
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                disabled={item.path === '#'}
                sx={{
                  borderRadius: 2,
                  bgcolor: isSelected ? 'primary.main' : 'transparent',
                  color: isSelected ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    bgcolor: isSelected ? 'primary.main' : 'action.hover',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isSelected ? 'primary.contrastText' : 'text.secondary',
                  },
                  '&.Mui-disabled': {
                    opacity: 0.6,
                    cursor: 'not-allowed',
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isSelected ? 600 : 500 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List sx={{ px: 1.5, py: 1.5 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => handleNavigation('/profile')}
            sx={{
              borderRadius: 2,
              bgcolor: location.pathname === '/profile' ? 'action.selected' : 'transparent',
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: 'error.main',
              '& .MuiListItemIcon-root': { color: 'error.main' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          boxShadow: 'none',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center">
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" fontWeight="bold">
              {location.pathname === '/dashboard' 
                ? 'Dashboard' 
                : location.pathname === '/attendance' 
                  ? 'Mark Attendance' 
                  : location.pathname === '/timetable' 
                    ? 'Timetable Management' 
                    : location.pathname === '/history' 
                      ? 'Attendance History' 
                      : location.pathname === '/reports'
                        ? 'Attendance Reports'
                        : location.pathname === '/chat'
                          ? 'AI Chat Assistant'
                          : location.pathname === '/settings'
                            ? 'Settings & Preferences'
                            : location.pathname === '/notifications'
                              ? 'Notification Center'
                              : location.pathname === '/profile' 
                                ? 'User Profile' 
                                : location.pathname.startsWith('/subjects/') 
                                  ? 'Subject Details' 
                                  : 'Smartttend'}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <IconButton onClick={toggleColorMode} color="inherit">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <Typography variant="body2" fontWeight="bold" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.full_name || 'Student'}
            </Typography>
            <Avatar
              alt={user?.full_name}
              src={user?.profile_photo || ''}
              sx={{ width: 36, height: 36, bgcolor: 'primary.main', cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
            />
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
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
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;
