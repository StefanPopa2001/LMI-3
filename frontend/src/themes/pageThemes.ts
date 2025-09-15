import { ThemeOptions } from '@mui/material/styles';

// Page-specific theme configurations
export const pageThemes: Record<string, ThemeOptions> = {
  dashboard: {
    palette: {
      primary: {
        main: '#2196f3', // Blue
        light: '#64b5f6',
        dark: '#1976d2',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#03dac6', // Teal
        light: '#66fff9',
        dark: '#00bfa5',
        contrastText: '#000000',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      text: {
        primary: '#212121',
        secondary: '#757575',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(33, 150, 243, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(33, 150, 243, 0.15)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '12px 24px',
          },
          contained: {
            boxShadow: '0 4px 15px rgba(33, 150, 243, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(33, 150, 243, 0.3)',
            },
          },
        },
      },
    },
  },

  users: {
    palette: {
      primary: {
        main: '#4caf50', // Green
        light: '#81c784',
        dark: '#388e3c',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#ff9800', // Orange
        light: '#ffb74d',
        dark: '#f57c00',
        contrastText: '#000000',
      },
      background: {
        default: '#f8f9fa',
        paper: '#ffffff',
      },
      text: {
        primary: '#2e3440',
        secondary: '#5e6778',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(76, 175, 80, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(76, 175, 80, 0.15)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '12px 24px',
          },
          contained: {
            boxShadow: '0 4px 15px rgba(76, 175, 80, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(76, 175, 80, 0.3)',
            },
          },
        },
      },
    },
  },

  classes: {
    palette: {
      primary: {
        main: '#9c27b0', // Purple
        light: '#ba68c8',
        dark: '#7b1fa2',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#00bcd4', // Cyan
        light: '#4dd0e1',
        dark: '#0097a7',
        contrastText: '#000000',
      },
      background: {
        default: '#faf7fd',
        paper: '#ffffff',
      },
      text: {
        primary: '#2d1b69',
        secondary: '#6b5b95',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(156, 39, 176, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(156, 39, 176, 0.15)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '12px 24px',
          },
          contained: {
            boxShadow: '0 4px 15px rgba(156, 39, 176, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(156, 39, 176, 0.3)',
            },
          },
        },
      },
    },
  },

  attendance: {
    palette: {
      primary: {
        main: '#ff9800', // Orange
        light: '#ffb74d',
        dark: '#f57c00',
        contrastText: '#000000',
      },
      secondary: {
        main: '#f44336', // Red
        light: '#ef5350',
        dark: '#d32f2f',
        contrastText: '#ffffff',
      },
      background: {
        default: '#fff8f0',
        paper: '#ffffff',
      },
      text: {
        primary: '#e65100',
        secondary: '#bf360c',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(255, 152, 0, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(255, 152, 0, 0.15)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '12px 24px',
          },
          contained: {
            boxShadow: '0 4px 15px rgba(255, 152, 0, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(255, 152, 0, 0.3)',
            },
          },
        },
      },
    },
  },

  analytics: {
    palette: {
      primary: {
        main: '#3f51b5', // Indigo
        light: '#7986cb',
        dark: '#303f9f',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#e91e63', // Pink
        light: '#f48fb1',
        dark: '#c2185b',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f3f4f6',
        paper: '#ffffff',
      },
      text: {
        primary: '#1a237e',
        secondary: '#3949ab',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(63, 81, 181, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(63, 81, 181, 0.15)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '12px 24px',
          },
          contained: {
            boxShadow: '0 4px 15px rgba(63, 81, 181, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(63, 81, 181, 0.3)',
            },
          },
        },
      },
    },
  },

  settings: {
    palette: {
      primary: {
        main: '#607d8b', // Blue Grey
        light: '#90a4ae',
        dark: '#455a64',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#795548', // Brown
        light: '#a1887f',
        dark: '#5d4037',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      text: {
        primary: '#37474f',
        secondary: '#546e7a',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(96, 125, 139, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(96, 125, 139, 0.15)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '12px 24px',
          },
          contained: {
            boxShadow: '0 4px 15px rgba(96, 125, 139, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(96, 125, 139, 0.3)',
            },
          },
        },
      },
    },
  },

  profile: {
    palette: {
      primary: {
        main: '#673ab7', // Deep Purple
        light: '#9575cd',
        dark: '#512da8',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#009688', // Teal
        light: '#4db6ac',
        dark: '#00695c',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f9f7ff',
        paper: '#ffffff',
      },
      text: {
        primary: '#311b92',
        secondary: '#4527a0',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(103, 58, 183, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 30px rgba(103, 58, 183, 0.15)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '12px 24px',
          },
          contained: {
            boxShadow: '0 4px 15px rgba(103, 58, 183, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(103, 58, 183, 0.3)',
            },
          },
        },
      },
    },
  },

  login: {
    palette: {
      primary: {
        main: '#1976d2', // Blue
        light: '#42a5f5',
        dark: '#1565c0',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#dc004e', // Pink
        light: '#ff5983',
        dark: '#9a0036',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f5f7fa',
        paper: '#ffffff',
      },
      text: {
        primary: '#0d47a1',
        secondary: '#1976d2',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '14px 28px',
            fontSize: '1rem',
          },
          contained: {
            boxShadow: '0 4px 15px rgba(25, 118, 210, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              '& fieldset': {
                borderColor: 'rgba(25, 118, 210, 0.2)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(25, 118, 210, 0.4)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2',
                borderWidth: 2,
              },
            },
          },
        },
      },
    },
  },
};

// Default theme for pages not specifically configured
export const defaultTheme: ThemeOptions = {
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f7',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
        },
        contained: {
          boxShadow: '0 4px 15px rgba(25, 118, 210, 0.2)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
          },
        },
      },
    },
  },
};

// Utility function to get theme for a specific page
export const getPageTheme = (pageName: string): ThemeOptions => {
  return pageThemes[pageName] || defaultTheme;
};

// Page route to theme mapping
export const pageRouteMapping: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/users': 'users',
  '/classes': 'classes',
  '/attendance': 'attendance',
  '/analytics': 'analytics',
  '/settings': 'settings',
  '/profile': 'profile',
  '/login': 'login',
};
