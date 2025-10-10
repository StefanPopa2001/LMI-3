"use client";
import React, { useEffect, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { MantineProvider, createTheme as createMantineTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { colorPalette } from './palette';

// Consolidated dark base theme (dynamic page theme handled elsewhere)
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
  },
});

// Mantine dark theme matching the MUI theme
const mantineTheme = createMantineTheme({
  primaryColor: 'blue',
  primaryShade: 6,
  colors: {
    blue: [
      colorPalette.primary.light,
      colorPalette.primary.light,
      colorPalette.primary.main,
      colorPalette.primary.main,
      colorPalette.primary.main,
      colorPalette.primary.main,
      colorPalette.primary.dark,
      colorPalette.primary.dark,
      colorPalette.primary.dark,
      colorPalette.primary.dark,
    ],
    dark: [
      colorPalette.background.default,
      colorPalette.background.paper,
      colorPalette.background.alt,
      colorPalette.background.paper,
      colorPalette.background.paper,
      colorPalette.background.paper,
      colorPalette.background.paper,
      colorPalette.background.paper,
      colorPalette.background.paper,
      colorPalette.background.paper,
    ],
    green: [
      colorPalette.success.light,
      colorPalette.success.light,
      colorPalette.success.main,
      colorPalette.success.main,
      colorPalette.success.main,
      colorPalette.success.main,
      colorPalette.success.dark,
      colorPalette.success.dark,
      colorPalette.success.dark,
      colorPalette.success.dark,
    ],
    red: [
      colorPalette.error.light,
      colorPalette.error.light,
      colorPalette.error.main,
      colorPalette.error.main,
      colorPalette.error.main,
      colorPalette.error.main,
      colorPalette.error.dark,
      colorPalette.error.dark,
      colorPalette.error.dark,
      colorPalette.error.dark,
    ],
  },
  fontFamily: 'var(--font-inter), sans-serif',
  components: {
    Card: {
      styles: {
        root: {
          backgroundColor: colorPalette.background.paper,
          border: `1px solid ${colorPalette.border.light}`,
        },
      },
    },
  },
});

interface ThemeRegistryProps { children: React.ReactNode }

export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ visibility: 'hidden' }}>{children}</div>;
  return (
    <MantineProvider theme={mantineTheme}>
      <Notifications />
      <MuiThemeProvider theme={darkTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </MantineProvider>
  );
}
