import { createTheme } from '@mui/material/styles';

export const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary: {
            main: '#2563EB', // Premium Blue
            light: '#60a5fa',
            dark: '#1d4ed8',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#f59e0b', // Amber/Warning
            light: '#fbbf24',
            dark: '#b45309',
            contrastText: '#ffffff',
          },
          success: {
            main: '#22C55E',
            contrastText: '#ffffff',
          },
          warning: {
            main: '#F59E0B',
            contrastText: '#ffffff',
          },
          error: {
            main: '#EF4444',
            contrastText: '#ffffff',
          },
          background: {
            default: '#F8FAFC', // Sleek slate background
            paper: '#ffffff',
          },
          text: {
            primary: '#0f172a',
            secondary: '#64748b',
          },
        }
      : {
          primary: {
            main: '#3b82f6', // Bright blue in dark mode
            light: '#60a5fa',
            dark: '#1d4ed8',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#14b8a6', // Teal
            light: '#2dd4bf',
            dark: '#0f766e',
            contrastText: '#ffffff',
          },
          success: {
            main: '#22C55E',
            contrastText: '#ffffff',
          },
          warning: {
            main: '#F59E0B',
            contrastText: '#ffffff',
          },
          error: {
            main: '#EF4444',
            contrastText: '#ffffff',
          },
          background: {
            default: '#0f172a', // Dark Navy Slate
            paper: '#1e293b',  // Dark Slate Card
          },
          text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
          },
        }),
  },
  typography: {
    fontFamily: '"Poppins", "Inter", sans-serif',
    h1: {
      fontSize: '32px',
      fontWeight: 700,
      fontFamily: '"Poppins", sans-serif',
    },
    h2: {
      fontSize: '24px',
      fontWeight: 700,
      fontFamily: '"Poppins", sans-serif',
    },
    h3: {
      fontSize: '20px',
      fontWeight: 600,
      fontFamily: '"Poppins", sans-serif',
    },
    body1: {
      fontSize: '15px',
      fontFamily: '"Inter", sans-serif',
    },
    body2: {
      fontSize: '14px',
      fontFamily: '"Inter", sans-serif',
    },
    caption: {
      fontSize: '13px',
      fontFamily: '"Inter", sans-serif',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '14px',
      fontFamily: '"Poppins", sans-serif',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12, // 12px corners as requested
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16, // 16px corners as requested
          border: mode === 'light' 
            ? '1px solid rgba(15, 23, 42, 0.08)' 
            : '1px solid rgba(248, 250, 252, 0.08)',
          boxShadow: mode === 'light' 
            ? '0px 2px 8px rgba(15, 23, 42, 0.03)' 
            : '0px 4px 20px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12, // rounded inputs
          },
        },
      },
    },
  },
});
