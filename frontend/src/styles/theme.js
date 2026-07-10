import { createTheme } from '@mui/material/styles';

export const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary: {
            main: '#1e3a8a', // Deep Blue
            light: '#3b82f6',
            dark: '#172554',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#f59e0b', // Amber
            light: '#fbbf24',
            dark: '#b45309',
            contrastText: '#000000',
          },
          background: {
            default: '#f8fafc', // Very light slate
            paper: '#ffffff',
          },
          text: {
            primary: '#0f172a',
            secondary: '#475569',
          },
        }
      : {
          primary: {
            main: '#6366f1', // Indigo
            light: '#818cf8',
            dark: '#3730a3',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#14b8a6', // Teal
            light: '#2dd4bf',
            dark: '#0f766e',
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
    fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'light' 
            ? '0px 4px 20px rgba(0, 0, 0, 0.05)' 
            : '0px 4px 20px rgba(0, 0, 0, 0.25)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});
