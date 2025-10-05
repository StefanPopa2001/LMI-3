"use client";
import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { Analytics } from '@mui/icons-material';

import ThemeRegistry from '../theme/ThemeRegistry';
import NavBar from '../components/layout/NavBar';
import BackButton from '../components/ui/BackButton';

export default function AnalyticsView() {
  return (
    <ThemeRegistry>
      <NavBar />
      <Container maxWidth="lg" sx={{ mt: 10 }}>
        <BackButton />
        
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Analytics sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom>
            Analytics
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            System analytics and performance metrics will be displayed here.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page is under construction. Please check back later.
          </Typography>
        </Box>
      </Container>
    </ThemeRegistry>
  );
}
