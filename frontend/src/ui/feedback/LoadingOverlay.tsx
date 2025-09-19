"use client";
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export interface LoadingOverlayProps {
  message?: string;
  active: boolean;
}

/**
 * Standardized full-surface loading overlay with dimmed background.
 * Place it as the last child inside a relatively positioned container.
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Chargement...', active }) => {
  if (!active) return null;
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(2px)',
        background: 'rgba(0,0,0,0.4)',
        zIndex: 50,
        gap: 2
      }}
    >
      <CircularProgress size={48} thickness={4} sx={{ color: 'var(--color-primary-500)' }} />
      <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingOverlay;
