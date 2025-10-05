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
  Chip,
  Avatar
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountCircle,
  Menu as MenuIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Analytics as AnalyticsIcon,
  CalendarToday as CalendarTodayIcon,
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  Cloud as CloudIcon,
  Badge as BadgeIcon,
  Groups2 as Groups2Icon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import authService from '../../services/authService';
// fixed dark theme; no theme toggle

interface NavBarProps {
  title?: string;
}

export default function NavBar({ title = "Logiscool Mons Intranet III" }: NavBarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [burgerAnchorEl, setBurgerAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  // no theme toggling

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleBurgerMenu = (event: React.MouseEvent<HTMLElement>) => {
    setBurgerAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleBurgerClose = () => {
    setBurgerAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    router.push('/profile');
  };

  const handleLogout = () => {
    handleClose();
    authService.logout();
    router.push('/login');
  };

  const handleSettings = () => {
    handleClose();
    router.push('/settings');
  };

  const handleNavigateToUsers = () => {
    handleBurgerClose();
    router.push('/users');
  };

  const handleNavigateToEleves = () => {
    handleBurgerClose();
    router.push('/users/crud');
  };

  const handleNavigateToClasses = () => {
    handleBurgerClose();
    router.push('/classes');
  };

  const handleNavigateToAnalytics = () => {
    handleBurgerClose();
    router.push('/stats');
  };

  const handleNavigateToStats = () => {
    handleBurgerClose();
    router.push('/stats');
  };


  const handleNavigateToAttendance = () => {
    handleBurgerClose();
    router.push('/attendance');
  };

  const handleNavigateToDashboard = () => {
    handleBurgerClose();
    router.push('/dashboard');
  };

  const handleNavigateToDrive = () => {
    handleBurgerClose();
    router.push('/drive');
  };

  const currentUser = mounted ? authService.getCurrentUser() : null;
  const userInitial = currentUser?.prenom ? currentUser.prenom.charAt(0).toUpperCase() : '?';

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
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', color: '#2196f3', fontFamily: 'var(--font-montserrat)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer' }}>
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>LMI3</Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{title}</Box>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
          </Box>
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
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            {currentUser ? (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {userInitial}
              </Avatar>
            ) : (
              <AccountCircle />
            )}
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleSettings}>Settings</MenuItem>
            <MenuItem onClick={handleProfile}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
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
              <AnalyticsIcon sx={{ mr: 1 }} />
              Rattrapages et Récupérations
            </MenuItem>
            <MenuItem onClick={handleNavigateToStats}>
              <AssessmentIcon sx={{ mr: 1 }} />
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
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
