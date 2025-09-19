"use client";
import React, { useEffect, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';
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

interface ThemeRegistryProps { children: React.ReactNode }

export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ visibility: 'hidden' }}>{children}</div>;
  return (
    <MuiThemeProvider theme={darkTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
