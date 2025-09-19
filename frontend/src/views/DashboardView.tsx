"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
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
  Cloud as CloudIcon,
} from '@mui/icons-material';

import NavBar from '../components/layout/NavBar';
import { ThemedGrid } from '../components/ui/ThemedComponents';
import DashboardFeatureCard from '@/ui/organisms/DashboardFeatureCard';
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
    {
      title: 'Drive',
      description: 'Fichiers partagés / stockage',
      icon: <CloudIcon sx={{ fontSize: '8rem' }} />,
      route: '/drive',
      stats: 'Stockage',
    },
  ];

  // Order feed for accentuation cycle
  const cardColors = useMemo(() => Array(dashboardCards.length).fill(null), [dashboardCards.length]);

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
          {dashboardCards.map((card, index) => (
            <DashboardFeatureCard
              key={card.title}
              title={card.title}
              route={card.route}
              icon={card.icon}
              index={index}
            />
          ))}
        </ThemedGrid>
      </Box>
    </Box>
  );
}
