'use client';
import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import { usePageTheme } from './PageThemeProvider';

interface PageLayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disablePadding?: boolean;
  fullWidth?: boolean;
  backgroundColor?: 'default' | 'paper' | 'transparent';
}

export default function PageLayout({
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  disablePadding = false,
  fullWidth = false,
  backgroundColor = 'default',
}: PageLayoutProps) {
  const { currentTheme } = usePageTheme();

  const getBackgroundColor = () => {
    switch (backgroundColor) {
      case 'paper':
        return currentTheme.palette.background.paper;
      case 'transparent':
        return 'transparent';
      default:
        return currentTheme.palette.background.default;
    }
  };

  const content = (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: getBackgroundColor(),
        py: disablePadding ? 0 : 4,
        px: disablePadding ? 0 : 2,
      }}
    >
      {(title || subtitle) && (
        <Container maxWidth={maxWidth} sx={{ mb: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {title && (
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 700,
                  color: currentTheme.palette.text.primary,
                  mb: subtitle ? 2 : 0,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="h6"
                sx={{
                  color: currentTheme.palette.text.secondary,
                  fontWeight: 400,
                  maxWidth: 600,
                  mx: 'auto',
                  fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Container>
      )}

      <Container maxWidth={maxWidth} disableGutters={fullWidth}>
        {children}
      </Container>
    </Box>
  );

  return content;
}

// Specialized layout for content pages
interface ContentPageLayoutProps extends Omit<PageLayoutProps, 'backgroundColor'> {
  showHeader?: boolean;
}

export function ContentPageLayout({
  title,
  subtitle,
  children,
  showHeader = true,
  ...props
}: ContentPageLayoutProps) {
  return (
    <PageLayout
      title={showHeader ? title : undefined}
      subtitle={showHeader ? subtitle : undefined}
      backgroundColor="default"
      {...props}
    >
      {children}
    </PageLayout>
  );
}

// Specialized layout for form pages
interface FormPageLayoutProps extends Omit<PageLayoutProps, 'maxWidth' | 'backgroundColor'> {
  centered?: boolean;
}

export function FormPageLayout({
  title,
  subtitle,
  children,
  centered = true,
  ...props
}: FormPageLayoutProps) {
  const { currentTheme } = usePageTheme();

  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      maxWidth="sm"
      backgroundColor="default"
      {...props}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: centered ? 'center' : 'flex-start',
          alignItems: centered ? 'center' : 'flex-start',
          minHeight: centered ? '60vh' : 'auto',
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 480,
            borderRadius: 3,
            backgroundColor: currentTheme.palette.background.paper,
            border: `1px solid ${currentTheme.palette.divider}`,
          }}
        >
          {children}
        </Paper>
      </Box>
    </PageLayout>
  );
}

// Specialized layout for dashboard pages
interface DashboardPageLayoutProps extends Omit<PageLayoutProps, 'backgroundColor'> {
  showStats?: boolean;
}

export function DashboardPageLayout({
  title,
  subtitle,
  children,
  showStats = false,
  ...props
}: DashboardPageLayoutProps) {
  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      backgroundColor="default"
      maxWidth="xl"
      {...props}
    >
      {showStats && (
        <Box sx={{ mb: 4 }}>
          {/* Stats cards would go here */}
        </Box>
      )}
      {children}
    </PageLayout>
  );
}
