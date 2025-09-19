"use client";
import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Fade, Paper, Typography } from '@mui/material';

interface GlobalLoadingToastProps {
  active: boolean;
  label?: string;
  delayMs?: number; // only show if still loading after delay to avoid flicker
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const positionStyles: Record<string, any> = {
  'bottom-right': { bottom: 16, right: 16 },
  'bottom-left': { bottom: 16, left: 16 },
  'top-right': { top: 16, right: 16 },
  'top-left': { top: 16, left: 16 },
};

export const GlobalLoadingToast: React.FC<GlobalLoadingToastProps> = ({
  active,
  label = 'Chargement…',
  delayMs = 180,
  position = 'bottom-right'
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let t: any;
    if (active) {
      t = setTimeout(() => setVisible(true), delayMs);
    } else {
      setVisible(false);
    }
    return () => clearTimeout(t);
  }, [active, delayMs]);

  return (
    <Fade in={visible} unmountOnExit>
      <Paper elevation={6}
        sx={{
          position: 'fixed',
          zIndex: 1400,
          display: 'flex',
            alignItems: 'center',
          gap: 1.5,
          px: 2.2,
          py: 1.2,
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
          color: 'var(--color-text-primary)',
          borderRadius: 2,
          boxShadow: '0 4px 18px -2px rgba(0,0,0,0.45)',
          ...positionStyles[position]
        }}
      >
        <CircularProgress size={20} thickness={5} sx={{ color: 'var(--color-primary-500)' }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
      </Paper>
    </Fade>
  );
};

export default GlobalLoadingToast;
