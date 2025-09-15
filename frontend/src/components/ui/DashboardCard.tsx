'use client';
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { getCardTypeColor, getContrastText } from '../../utils/themeUtils';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  stats?: string;
  onClick: () => void;
}

export default function DashboardCard({
  title,
  description,
  icon,
  color,
  stats,
  onClick
}: DashboardCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get theme-aware colors
  const cardColor = getCardTypeColor(color) || color;
  const iconBgColor = `${cardColor}20`; // 20% opacity
  const textColor = getContrastText(cardColor);

  if (!mounted) {
    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: `2px solid ${iconBgColor}`,
          cursor: 'pointer',
          backgroundColor: 'background.paper',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 25px ${cardColor}30`,
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: iconBgColor,
              margin: '0 auto 16px auto',
              color: cardColor
            }}
          >
            {icon}
          </Box>
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: 'text.primary'
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mb: 2,
              minHeight: '3em',
              color: 'text.secondary'
            }}
          >
            {description}
          </Typography>
          {stats && (
            <Chip
              label={stats}
              size="small"
              sx={{
                backgroundColor: iconBgColor,
                color: cardColor,
                fontWeight: 'bold'
              }}
            />
          )}
        </CardContent>
        <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            size="small"
            variant="contained"
            sx={{
              backgroundColor: cardColor,
              color: textColor,
              '&:hover': {
                backgroundColor: `${cardColor}dd`,
              }
            }}
          >
            Open
          </Button>
        </CardActions>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: `2px solid ${iconBgColor}`,
        cursor: 'pointer',
        backgroundColor: 'background.paper',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 25px ${cardColor}30`,
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: iconBgColor,
            margin: '0 auto 16px auto',
            color: cardColor
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="h5"
          component="h2"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            color: 'text.primary'
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mb: 2,
            minHeight: '3em',
            color: 'text.secondary'
          }}
        >
          {description}
        </Typography>
        {stats && (
          <Chip
            label={stats}
            size="small"
            sx={{
              backgroundColor: iconBgColor,
              color: cardColor,
              fontWeight: 'bold'
            }}
          />
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button
          size="small"
          variant="contained"
          sx={{
            backgroundColor: cardColor,
            color: textColor,
            '&:hover': {
              backgroundColor: `${cardColor}dd`,
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Open
        </Button>
      </CardActions>
    </Card>
  );
}
