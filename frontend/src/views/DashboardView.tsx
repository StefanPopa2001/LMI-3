"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { useRouter } from 'next/navigation';
import {
  People as PeopleIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  School as SchoolIcon,
  CalendarToday as CalendarTodayIcon,
  Assessment as AssessmentIcon,
  Recycling as RecyclingIcon,
  AttachMoney as AttachMoneyIcon,
  BusinessCenter as BusinessCenterIcon,
} from '@mui/icons-material';

import NavBar from '../components/layout/NavBar';
import { DashboardPageLayout } from '../components/layout/PageLayout';
import { ThemedCard, ThemedButton, ThemedGrid } from '../components/ui/ThemedComponents';
import authService from '../services/authService';
import { usePageTheme } from '../components/layout/PageThemeProvider';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  tempPasswordUsers: number;
}

export default function DashboardView() {
  const router = useRouter();
  const { currentTheme } = usePageTheme();
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    tempPasswordUsers: 0
  });

  // Helper function to handle API errors
  const handleApiError = (err: any) => {
    if (err.message && err.message.startsWith('AUTH_ERROR:')) {
      router.push('/login');
      return;
    }
    console.error('API Error:', err.message);
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      if (authService.isAuthenticated()) {
        const stats = await authService.getUserStats();
        setUserStats(stats);
      }
    } catch (error: any) {
      handleApiError(error);
    }
  };

  const dashboardCards = [
    {
      title: 'Utilisateurs',
      description: 'Gérer les utilisateurs du système',
      icon: <PeopleIcon sx={{ fontSize: '8rem' }} />,
      route: '/users',
      stats: `${userStats.totalUsers} utilisateurs`,
    },
    {
      title: 'Étudiants',
      description: 'Gestion des élèves et inscriptions',
      icon: <PersonIcon sx={{ fontSize: '8rem' }} />,
      route: '/users/crud',
      stats: 'Gestion scolaire',
    },
    {
      title: 'Classes',
      description: 'Organiser et gérer les classes',
      icon: <SchoolIcon sx={{ fontSize: '8rem' }} />,
      route: '/classes',
      stats: 'Gestion des cours',
    },
    {
      title: 'Présences',
      description: 'Suivre les présences aux cours',
      icon: <CalendarTodayIcon sx={{ fontSize: '8rem' }} />,
      route: '/attendance',
      stats: 'Suivi en temps réel',
    },
    {
      title: 'Analyses',
      description: 'Statistiques et rapports détaillés',
      icon: <AnalyticsIcon sx={{ fontSize: '8rem' }} />,
      route: '/stats',
      stats: 'Données complètes',
    },
    {
      title: 'Paramètres',
      description: 'Configuration du système',
      icon: <SettingsIcon sx={{ fontSize: '8rem' }} />,
      route: '/settings',
      stats: 'Personnalisation',
    },
    {
      title: 'RR',
      description: 'Replacements et rattrapages',
      icon: <RecyclingIcon sx={{ fontSize: '8rem' }} />,
      route: '/rr',
      stats: 'Tous les RR',
    },
    {
      title: 'Logipay',
      description: 'Gestion des paiements et facturation',
      icon: <AttachMoneyIcon sx={{ fontSize: '8rem' }} />,
      route: '/logipay',
      stats: 'Paiements en ligne',
    },
    {
      title: 'Permanence',
      description: 'Gestion des permanences et surveillance',
      icon: <BusinessCenterIcon sx={{ fontSize: '8rem' }} />,
      route: '/permanence',
      stats: 'Surveillance active',
    },
  ];

  const cardColors = useMemo(() => [
    currentTheme?.palette?.primary?.main || '#1976d2',     // Utilisateurs - Primary theme color
    currentTheme?.palette?.secondary?.main || '#dc004e',   // Étudiants - Secondary theme color
    '#2196f3', // Classes - Blue (Material Design blue)
    '#9c27b0', // Présences - Purple (Material Design purple)
    '#f44336', // Analyses - Red (Material Design red)
    '#4caf50', // Paramètres - Green (Material Design green)
    '#ff9800', // Rapports - Orange (Material Design orange)
    '#ffd700', // Logipay - Gold (Material Design amber/gold)
    '#009688', // Permanence - Teal (Material Design teal) - Business Center icon
  ], [currentTheme]);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      width: '100%',
      backgroundColor: 'background.default',
      padding: 0,
      margin: 0
    }}>
      <NavBar />

      {/* Main Dashboard Cards - Full Screen Layout */}
      <Box sx={{ 
        padding: 3,
        mt: 8,
        minHeight: 'calc(100vh - 64px)', // Subtract navbar height
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <ThemedGrid 
          columns={3} 
          spacing={1} 
          sx={{ 
            width: '100%', 
            maxWidth: '1400px',
            '& > *': {
              cursor: 'pointer',
            }
          }}
        >
          {dashboardCards.map((card, index) => {
            const cardColor = cardColors[index % cardColors.length];
            return (
              <Box
                key={index}
                onClick={() => router.push(card.route)}
                sx={{
                  height: '200px',
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}ee 100%)`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 3,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: `0 20px 40px ${cardColor}50`,
                    border: '2px solid rgba(255, 255, 255, 0.6)',
                    '&::before': {
                      transform: 'scale(1.1)',
                    }
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(135deg, ${cardColor}30 0%, ${cardColor}50 100%)`,
                    borderRadius: 3,
                    transition: 'transform 0.3s ease',
                  }
                }}
              >
                <Box sx={{ 
                  color: 'white', 
                  mb: 1,
                  zIndex: 1,
                  opacity: 1,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                }}>
                  {card.icon}
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
                    letterSpacing: '0.5px'
                  }}
                >
                  {card.title}
                </Typography>
              </Box>
            );
          })}
        </ThemedGrid>
      </Box>
    </Box>
  );
}
