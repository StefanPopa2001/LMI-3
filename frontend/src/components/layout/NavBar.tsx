'use client';
import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Menu as MenuIcon,
  School as SchoolIcon,
  Analytics as AnalyticsIcon,
  CalendarToday as CalendarTodayIcon,
  Assessment as AssessmentIcon,
  Cloud as CloudIcon,
  Badge as BadgeIcon,
  Groups2 as Groups2Icon,
  Settings as SettingsIcon,
  Replay as ReplayIcon,
  TrendingUp as TrendingUpIcon,
  Logout as LogoutIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import authService from '../../services/authService';

interface NavBarProps {
  title?: string;
}

export default function NavBar({ title = "Logiscool Mons Intranet III" }: NavBarProps) {
  const [burgerAnchorEl, setBurgerAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentUser = authService.getCurrentUser();

  const handleBurgerMenu = (event: React.MouseEvent<HTMLElement>) => {
    setBurgerAnchorEl(event.currentTarget);
  };

  const handleBurgerClose = () => {
    setBurgerAnchorEl(null);
  };

  const handleNavigateToDashboard = () => {
    handleBurgerClose();
    router.push('/dashboard');
  };

  const handleNavigateToUsers = () => {
    handleBurgerClose();
    router.push('/users');
  };

  const handleNavigateToEleves = () => {
    handleBurgerClose();
    router.push('/eleves');
  };

  const handleNavigateToClasses = () => {
    handleBurgerClose();
    router.push('/classes');
  };

  const handleNavigateToAnalytics = () => {
    handleBurgerClose();
    router.push('/analytics');
  };

  const handleNavigateToStats = () => {
    handleBurgerClose();
    router.push('/stats');
  };

  const handleNavigateToAttendance = () => {
    handleBurgerClose();
    router.push('/attendance');
  };

  const handleNavigateToDrive = () => {
    handleBurgerClose();
    router.push('/drive');
  };

  const handleLogout = () => {
    handleBurgerClose();
    authService.logout();
    router.push('/login');
  };

  if (!mounted) {
    return (
      <AppBar position="fixed" elevation={0} sx={{ backgroundColor: '#1a1a1a', zIndex: 1100 }}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={handleBurgerMenu}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Centered Title */}
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#2196f3', fontFamily: 'var(--font-montserrat)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer' }}>
              <Box sx={{ display: { xs: 'block', sm: 'none' } }}>LMI3</Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{title}</Box>
            </Typography>
          </Box>
          
          {/* Admin Shield on the right */}
          {currentUser?.admin && (
            <Box sx={{ ml: 2 }}>
              <ShieldIcon sx={{ color: '#666', fontSize: '1.5em' }} />
            </Box>
          )}
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar position="fixed" elevation={0} sx={{ backgroundColor: '#1a1a1a', zIndex: 1100 }}>
      <Toolbar>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
          onClick={handleBurgerMenu}
        >
          <MenuIcon />
        </IconButton>
        
        {/* Centered Title with Admin Shield */}
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 'bold',
              color: '#2196f3',
              fontFamily: 'var(--font-montserrat)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              '&:hover': {
                color: '#64b5f6'
              }
            }}
            onClick={() => router.push('/dashboard')}
          >
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>LMI3</Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{title}</Box>
          </Typography>
        </Box>
        
        {/* Admin Shield on the right */}
        {currentUser?.admin && (
          <Box sx={{ ml: 2 }}>
            <ShieldIcon sx={{ color: '#666', fontSize: '1.5em' }} />
          </Box>
        )}
        <Menu
          id="burger-menu-appbar"
          anchorEl={burgerAnchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          open={Boolean(burgerAnchorEl)}
          onClose={handleBurgerClose}
        >
          <MenuItem onClick={handleNavigateToDashboard}>
            <DashboardIcon sx={{ mr: 1 }} />
            Dashboard
          </MenuItem>
          <MenuItem onClick={handleNavigateToUsers}>
            <BadgeIcon sx={{ mr: 1 }} />
            Gestion des utilisateurs
          </MenuItem>
          {currentUser?.admin && (
            <MenuItem onClick={() => { handleBurgerClose(); router.push('/settings'); }}>
              <SettingsIcon sx={{ mr: 1 }} />
              Settings
            </MenuItem>
          )}
          <MenuItem onClick={handleNavigateToEleves}>
            <Groups2Icon sx={{ mr: 1 }} />
            Gestion des élèves
          </MenuItem>
          <MenuItem onClick={handleNavigateToClasses}>
            <SchoolIcon sx={{ mr: 1 }} />
            Classes
          </MenuItem>
          <MenuItem onClick={handleNavigateToAnalytics}>
            <ReplayIcon sx={{ mr: 1 }} />
            Rattrapages et Récupérations
          </MenuItem>
          <MenuItem onClick={handleNavigateToStats}>
            <TrendingUpIcon sx={{ mr: 1 }} />
            Statistiques
          </MenuItem>
          <MenuItem onClick={handleNavigateToAttendance}>
            <CalendarTodayIcon sx={{ mr: 1 }} />
            Carnet des présences
          </MenuItem>
          {currentUser?.admin && (
            <MenuItem onClick={handleNavigateToDrive}>
              <CloudIcon sx={{ mr: 1 }} />
              Drive
            </MenuItem>
          )}
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} />
            Déconnexion
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
