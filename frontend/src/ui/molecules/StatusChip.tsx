"use client";
import React from 'react';
import { Chip } from '@mui/material';
import { getAccentuationColor } from '@/theme';

export interface StatusChipProps {
  label: string;
  variant?: 'originRR' | 'destRR' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium';
}

const variantMap: Record<string, { base: string; alpha: string }> = {
  originRR: { base: getAccentuationColor('orange'), alpha: 'rgba(245,124,0,0.25)' },
  destRR: { base: getAccentuationColor('blue'), alpha: 'rgba(25,118,210,0.25)' },
  success: { base: getAccentuationColor('green'), alpha: 'rgba(76,175,80,0.25)' },
  warning: { base: getAccentuationColor('yellow'), alpha: 'rgba(255,235,59,0.25)' },
  error: { base: getAccentuationColor('red'), alpha: 'rgba(244,67,54,0.25)' },
  info: { base: getAccentuationColor('blue'), alpha: 'rgba(33,150,243,0.25)' },
};

export const StatusChip: React.FC<StatusChipProps> = ({ label, variant = 'info', size = 'small' }) => {
  const v = variantMap[variant] || variantMap.info;
  return (
    <Chip
      size={size}
      label={label}
      sx={{
        bgcolor: v.alpha,
        color: v.base,
        fontWeight: 500,
        borderRadius: 1,
      }}
    />
  );
};

export default StatusChip;
