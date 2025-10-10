/**
 * Common loading and error components
 */
import React from 'react';
import { Box, CircularProgress, Typography, Alert, AlertTitle } from '@mui/material';

interface LoadingProps {
  message?: string;
  size?: number;
}

/**
 * Loading spinner component
 */
export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...', size = 40 }) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="200px"
      gap={2}
    >
      <CircularProgress size={size} />
      {message && <Typography color="text.secondary">{message}</Typography>}
    </Box>
  );
};

interface ErrorDisplayProps {
  error: string | Error;
  title?: string;
  onRetry?: () => void;
}

/**
 * Error display component
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  title = 'Error',
  onRetry 
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <Box sx={{ my: 2 }}>
      <Alert severity="error">
        <AlertTitle>{title}</AlertTitle>
        {errorMessage}
        {onRetry && (
          <Box sx={{ mt: 1 }}>
            <button onClick={onRetry} style={{ cursor: 'pointer' }}>
              Retry
            </button>
          </Box>
        )}
      </Alert>
    </Box>
  );
};

/**
 * Empty state component
 */
interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  message = 'No data available',
  icon 
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="200px"
      gap={2}
      sx={{ color: 'text.secondary' }}
    >
      {icon}
      <Typography variant="body1">{message}</Typography>
    </Box>
  );
};
