'use client';
import React, { useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Centralized color palette
export const colorPalette = {
  // Primary colors
  primary: {
    main: '#90caf9',
    light: '#e3f2fd',
    dark: '#42a5f5',
    contrastText: '#000000',
  },
  // Secondary colors
  secondary: {
    main: '#f48fb1',
    light: '#fce4ec',
    dark: '#ec407a',
    contrastText: '#000000',
  },
  // Background colors
  background: {
    default: '#121212',
    paper: '#1e1e1e',
    alt: '#2a2a2a',
  },
  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#b0b0b0',
    disabled: '#666666',
  },
  // Status colors
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
  },
  error: {
    main: '#f44336',
    light: '#ef5350',
    dark: '#d32f2f',
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
  },
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
  },
  // Card colors for different sections
  cards: {
    users: '#2196f3',
    classes: '#4caf50',
    attendance: '#ff9800',
    analytics: '#9c27b0',
    settings: '#607d8b',
    profile: '#795548',
  },
  // Border colors
  border: {
    light: '#333333',
    medium: '#444444',
    dark: '#555555',
  },
  // Accentuation colors for enhanced visual variety
  accentuation: {
    green: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    red: {
      main: '#f44336',
      light: '#ef5350',
      dark: '#d32f2f',
    },
    yellow: {
      main: '#ffeb3b',
      light: '#fff176',
      dark: '#fbc02d',
    },
    orange: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    blue: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    purple: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    pink: {
      main: '#e91e63',
      light: '#f48fb1',
      dark: '#c2185b',
    },
    teal: {
      main: '#009688',
      light: '#4db6ac',
      dark: '#00695c',
    },
    cyan: {
      main: '#00bcd4',
      light: '#4dd0e1',
      dark: '#0097a7',
    },
    indigo: {
      main: '#3f51b5',
      light: '#7986cb',
      dark: '#303f9f',
    },
    brown: {
      main: '#795548',
      light: '#a1887f',
      dark: '#5d4037',
    },
    grey: {
      main: '#9e9e9e',
      light: '#e0e0e0',
      dark: '#616161',
    },
  },
};

// Tailwind-compatible color classes
export const tailwindColors = {
  // Background colors
  bg: {
    primary: 'bg-gray-900',
    secondary: 'bg-gray-800',
    tertiary: 'bg-gray-700',
    accent: 'bg-blue-900',
    hover: 'hover:bg-gray-700',
  },
  // Text colors
  text: {
    primary: 'text-white',
    secondary: 'text-gray-300',
    tertiary: 'text-gray-400',
    accent: 'text-blue-400',
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
  },
  // Border colors
  border: {
    primary: 'border-gray-600',
    secondary: 'border-gray-500',
    accent: 'border-blue-500',
  },
  // Button colors
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  },
  // Card colors
  card: {
    background: 'bg-gray-800 border border-gray-700',
    hover: 'hover:bg-gray-700 hover:border-gray-600',
  },
  // Form colors
  form: {
    input: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
    focus: 'focus:border-blue-500 focus:ring-blue-500',
  },
};

// Enhanced Material-UI theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: colorPalette.primary,
    secondary: colorPalette.secondary,
    background: colorPalette.background,
    text: colorPalette.text,
    success: colorPalette.success,
    error: colorPalette.error,
    warning: colorPalette.warning,
    info: colorPalette.info,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: colorPalette.background.paper,
          border: `1px solid ${colorPalette.border.light}`,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: colorPalette.primary.main,
            boxShadow: `0 4px 20px ${colorPalette.primary.main}30`,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
        },
        containedPrimary: {
          backgroundColor: colorPalette.primary.main,
          '&:hover': {
            backgroundColor: colorPalette.primary.dark,
          },
        },
        containedSecondary: {
          backgroundColor: colorPalette.secondary.main,
          '&:hover': {
            backgroundColor: colorPalette.secondary.dark,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: colorPalette.background.alt,
            '& fieldset': {
              borderColor: colorPalette.border.medium,
            },
            '&:hover fieldset': {
              borderColor: colorPalette.primary.main,
            },
            '&.Mui-focused fieldset': {
              borderColor: colorPalette.primary.main,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colorPalette.background.paper,
          borderBottom: `1px solid ${colorPalette.border.light}`,
        },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      color: colorPalette.text.primary,
    },
    h2: {
      color: colorPalette.text.primary,
    },
    h3: {
      color: colorPalette.text.primary,
    },
    h4: {
      color: colorPalette.text.primary,
    },
    h5: {
      color: colorPalette.text.primary,
    },
    h6: {
      color: colorPalette.text.primary,
    },
    body1: {
      color: colorPalette.text.primary,
    },
    body2: {
      color: colorPalette.text.secondary,
    },
  },
});

// Utility functions for consistent color usage
export const getCardColor = (type: keyof typeof colorPalette.cards): string => {
  return colorPalette.cards[type];
};

export const getAccentuationColor = (color: keyof typeof colorPalette.accentuation, shade: 'main' | 'light' | 'dark' = 'main'): string => {
  return colorPalette.accentuation[color][shade];
};

export const getTailwindClasses = (component: keyof typeof tailwindColors, variant?: string): string => {
  const componentClasses = tailwindColors[component];
  if (typeof componentClasses === 'string') {
    return componentClasses;
  }
  if (variant && variant in componentClasses) {
    return componentClasses[variant as keyof typeof componentClasses];
  }
  return '';
};

interface ThemeRegistryProps {
  children: React.ReactNode;
}

export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    );
  }

  return (
    <MuiThemeProvider theme={darkTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

// Export types for TypeScript
export type ColorPalette = typeof colorPalette;
export type TailwindColors = typeof tailwindColors;
