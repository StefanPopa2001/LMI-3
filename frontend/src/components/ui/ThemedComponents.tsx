'use client';
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Typography,
  Button,
  Box,
  Chip,
  Avatar,
  IconButton,
  TextField,
  Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Themed Card Component
interface ThemedCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  elevation?: number;
  hover?: boolean;
  icon?: React.ReactNode;
  sx?: any;
}

export function ThemedCard({
  title,
  subtitle,
  children,
  actions,
  elevation = 1,
  hover = true,
  icon,
  sx = {},
}: ThemedCardProps) {
  const theme = useTheme();

  return (
    <Card
      elevation={elevation}
      sx={{
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(hover && {
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 30px ${theme.palette.primary.main}15`,
          },
        }),
        ...sx,
      }}
    >
      {(title || subtitle || icon) && (
        <CardHeader
          avatar={icon ? <Avatar sx={{ bgcolor: theme.palette.primary.main }}>{icon}</Avatar> : undefined}
          title={title && (
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {title}
            </Typography>
          )}
          subheader={subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        />
      )}
      <CardContent>
        {children}
      </CardContent>
      {actions && (
        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
          {actions}
        </CardActions>
      )}
    </Card>
  );
}

// Themed Button Component
interface ThemedButtonProps {
  children: React.ReactNode;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick?: () => void;
}

export function ThemedButton({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  startIcon,
  endIcon,
  onClick,
}: ThemedButtonProps) {
  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      startIcon={startIcon}
      endIcon={endIcon}
      onClick={onClick}
      sx={{
        borderRadius: 2,
        textTransform: 'none',
        fontWeight: 600,
        px: 3,
        py: 1.5,
      }}
    >
      {children}
    </Button>
  );
}

// Themed Chip Component
interface ThemedChipProps {
  label: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'default';
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium';
  icon?: React.ReactElement;
}

export function ThemedChip({
  label,
  color = 'primary',
  variant = 'filled',
  size = 'small',
  icon,
}: ThemedChipProps) {
  return (
    <Chip
      label={label}
      color={color}
      variant={variant}
      size={size}
      icon={icon}
      sx={{
        borderRadius: 2,
        fontWeight: 500,
      }}
    />
  );
}

// Themed TextField Component
interface ThemedTextFieldProps {
  label?: string;
  placeholder?: string;
  value?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  fullWidth?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ThemedTextField({
  label,
  placeholder,
  value,
  type = 'text',
  multiline = false,
  rows = 1,
  fullWidth = true,
  disabled = false,
  error = false,
  helperText,
  required = false,
  onChange,
}: ThemedTextFieldProps) {
  const theme = useTheme();

  return (
    <TextField
      label={label}
      placeholder={placeholder}
      value={value}
      type={type}
      multiline={multiline}
      rows={rows}
      fullWidth={fullWidth}
      disabled={disabled}
      error={error}
      helperText={helperText}
      required={required}
      onChange={onChange}
      variant="outlined"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            borderWidth: 2,
          },
        },
      }}
    />
  );
}

// Themed Paper Component
interface ThemedPaperProps {
  children: React.ReactNode;
  elevation?: number;
  square?: boolean;
  sx?: object;
}

export function ThemedPaper({
  children,
  elevation = 1,
  square = false,
  sx = {},
}: ThemedPaperProps) {
  const theme = useTheme();

  return (
    <Paper
      elevation={elevation}
      square={square}
      sx={{
        borderRadius: square ? 0 : 3,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

// Themed Section Component
interface ThemedSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function ThemedSection({
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}: ThemedSectionProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: 6,
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: maxWidth === 'xs' ? 444 : maxWidth === 'sm' ? 600 : maxWidth === 'md' ? 900 : maxWidth === 'lg' ? 1200 : 1536, mx: 'auto' }}>
        {(title || subtitle) && (
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            {title && (
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  mb: subtitle ? 2 : 0,
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="h6"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 400,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
        {children}
      </Box>
    </Box>
  );
}

// Themed Grid Component
interface ThemedGridProps {
  children: React.ReactNode;
  columns?: number;
  spacing?: number;
  responsive?: boolean;
  sx?: any;
}

export function ThemedGrid({
  children,
  columns = 3,
  spacing = 3,
  responsive = true,
  sx = {},
}: ThemedGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: responsive
          ? {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: `repeat(${Math.min(columns, 3)}, 1fr)`,
              lg: `repeat(${Math.min(columns, 4)}, 1fr)`,
              xl: `repeat(${columns}, 1fr)`,
            }
          : `repeat(${columns}, 1fr)`,
        gap: spacing * 8, // Convert to px (MUI spacing unit * 8)
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
