"use client";
import React, { useEffect, useState } from 'react';
import { rrService, type RRItem } from '@/services/rrService';
import { Container, Typography, Box, Paper, Chip, Stack } from '@mui/material';

export default function RRPage() {
  const [items, setItems] = useState<RRItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await rrService.listRR();
        setItems(data);
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement');
      }
    })();
  }, []);

  return (
    <Container sx={{ mt: 2 }}>
        <Typography variant="h4" gutterBottom>Replacements (RR)</Typography>
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
        <Stack spacing={2}>
          {items.map(rr => (
            <Paper key={rr.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1">RR #{rr.id} — Élève {rr.eleveId}</Typography>
                <Typography variant="body2">
                  Origine séance {rr.originSeanceId} → Destination séance {rr.destinationSeanceId}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Chip label={rr.status} color={rr.status === 'completed' ? 'success' : rr.status === 'open' ? 'warning' : 'default'} />
                <Chip label={`Destination: ${rr.destStatut}`} />
              </Stack>
            </Paper>
          ))}
          {items.length === 0 && !error && (
            <Typography>Aucun RR pour le moment.</Typography>
          )}
        </Stack>
      </Container>
  );
}
