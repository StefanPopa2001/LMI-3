"use client";
import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ArrowBack, Settings } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export default function SettingsPage() {
  const router = useRouter();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/dashboard')}
          sx={{ mb: 3 }}
        >
          Back to Dashboard
        </Button>
        
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Settings sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom>
            Settings
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            System configuration and application settings will be available here.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page is under construction. Please check back later.
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
