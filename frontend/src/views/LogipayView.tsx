"use client";
import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { AttachMoney } from '@mui/icons-material';

import ThemeRegistry from '../components/layout/ThemeRegistry';
import NavBar from '../components/layout/NavBar';
import BackButton from '../components/ui/BackButton';

export default function LogipayView() {
  return (
    <ThemeRegistry>
      <NavBar />
      <Container maxWidth="lg" sx={{ mt: 10 }}>
        <BackButton />

        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <AttachMoney sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom>
            Logipay
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Gestion des paiements et facturation
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Cette page est en cours de développement. Veuillez revenir plus tard.
          </Typography>
        </Box>
      </Container>
    </ThemeRegistry>
  );
}
