"use client";
import React from 'react';
import { Box } from '@mui/material';

export interface PageContainerProps {
  children: React.ReactNode;
  background?: 'default' | 'paper' | 'alt' | 'transparent';
  fullHeight?: boolean;
  padding?: number | string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  background = 'default',
  fullHeight = true,
  padding = 0,
}) => {
  const bgMap: Record<string, string> = {
    default: 'background.default',
    paper: 'background.paper',
    alt: 'var(--color-bg-tertiary)',
    transparent: 'transparent',
  };
  return (
    <Box sx={{
      minHeight: fullHeight ? '100vh' : undefined,
      width: '100%',
      backgroundColor: bgMap[background] || 'background.default',
      p: padding,
    }}>
      {children}
    </Box>
  );
};

export default PageContainer;
