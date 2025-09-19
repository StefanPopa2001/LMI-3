"use client";
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { getAccentuationColor } from '@/theme';

export interface DashboardFeatureCardProps {
  title: string;
  route: string;
  icon: React.ReactNode;
  color?: { accent: keyof ReturnType<typeof accentKeys> }; // optional future extension
  gradientBase?: string; // fallback hex or css var
  index?: number; // for color cycling
}

const paletteCycle = ['blue', 'purple', 'orange', 'red', 'green', 'teal', 'indigo', 'pink'] as const;
type CycleName = typeof paletteCycle[number];

const accentKeys = () => ({ blue: true, purple: true, orange: true, red: true, green: true, teal: true, indigo: true, pink: true });

export const DashboardFeatureCard: React.FC<DashboardFeatureCardProps> = ({
  title,
  route,
  icon,
  gradientBase,
  index = 0,
}) => {
  const router = useRouter();
  const accent = paletteCycle[index % paletteCycle.length] as CycleName;
  const base = getAccentuationColor(accent as any, 'main');
  const dark = getAccentuationColor(accent as any, 'dark');
  const start = gradientBase || base;
  const end = dark + 'ee';

  return (
    <Box
      role="button"
      aria-label={title}
      tabIndex={0}
      onClick={() => router.push(route)}
      onKeyDown={(e) => (e.key === 'Enter' ? router.push(route) : undefined)}
      sx={{
        height: 200,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.25)',
        transition: 'all .3s cubic-bezier(.4,0,.2,1)',
        '&:hover': {
          transform: 'translateY(-8px) scale(1.02)',
          boxShadow: `0 20px 40px ${base}55`,
          border: '2px solid rgba(255,255,255,0.55)',
          '&::before': { transform: 'scale(1.1)' },
        },
        '&::before': {
          content: '""',
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${base}30 0%, ${base}50 100%)`,
            borderRadius: 3,
            transition: 'transform .3s ease',
        },
      }}
    >
      <Box sx={{ color: 'white', mb: 1, zIndex: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
        {icon}
      </Box>
      <Typography
        variant="h5"
        sx={{
          color: 'white',
          fontWeight: 700,
          textAlign: 'center',
          zIndex: 1,
          fontSize: '1.4rem',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          letterSpacing: '.5px',
        }}
      >
        {title}
      </Typography>
    </Box>
  );
};

export default DashboardFeatureCard;
