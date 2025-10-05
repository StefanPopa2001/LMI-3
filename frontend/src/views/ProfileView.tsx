"use client";
import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Avatar,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  AdminPanelSettings as AdminIcon,
  CalendarToday as CalendarIcon,
  Euro as EuroIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

import ThemeRegistry from '../theme/ThemeRegistry';
import NavBar from '../components/layout/NavBar';
import BackButton from '../components/ui/BackButton';
import authService, { User } from '../services/authService';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  // Helper function to handle API errors
  const handleApiError = (err: any) => {
    if (err.message && err.message.startsWith('AUTH_ERROR:')) {
      // Token is invalid/expired, redirect to login
      router.push('/login');
      return;
    }
    setError(err.message);
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!authService.isAuthenticated()) {
          router.push('/login');
          return;
        }

        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // If no user in localStorage, fetch from API
          const profileData = await authService.getProfile();
          setUser(profileData);
        }
      } catch (err: any) {
        handleApiError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  if (loading) {
    return (
      <ThemeRegistry>
        <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#121212' }}>
          <NavBar />
          <Container maxWidth="md" sx={{ mt: 10, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
              <Typography variant="h6" color="text.secondary">Loading profile...</Typography>
            </Box>
          </Container>
        </Box>
      </ThemeRegistry>
    );
  }

  if (error || !user) {
    return (
      <ThemeRegistry>
        <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#121212' }}>
          <NavBar />
          <Container maxWidth="md" sx={{ mt: 10, mb: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || 'User not found'}
            </Alert>
            <BackButton />
          </Container>
        </Box>
      </ThemeRegistry>
    );
  }

  const userInitial = user.prenom ? user.prenom.charAt(0).toUpperCase() : '?';

  return (
    <ThemeRegistry>
      <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#121212' }}>
        <NavBar />

        <Container maxWidth="md" sx={{ mt: 10, mb: 4 }}>
          <BackButton />

          {/* Profile Header */}
          <Paper
            elevation={3}
            sx={{
              p: 4,
              mb: 4,
              backgroundColor: '#1e1e1e',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <Avatar
              sx={{
                width: 120,
                height: 120,
                bgcolor: 'primary.main',
                fontSize: '3rem',
                mx: 'auto',
                mb: 2
              }}
            >
              {userInitial}
            </Avatar>

            <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
              {user.prenom} {user.nom}
            </Typography>

            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              {user.titre && `${user.titre} • `}{user.fonction}
            </Typography>

            {user.admin && (
              <Chip
                icon={<AdminIcon />}
                label="Administrator"
                color="error"
                variant="filled"
                size="medium"
              />
            )}
          </Paper>

          {/* Profile Details */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Contact Information */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Card sx={{ backgroundColor: '#1e1e1e', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom sx={{ color: 'white', display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1 }} />
                      Contact Information
                    </Typography>
                    <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <EmailIcon sx={{ mr: 1, fontSize: '1rem' }} />
                        Email
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'white' }}>
                        {user.email}
                      </Typography>
                    </Box>

                    {user.GSM && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <PhoneIcon sx={{ mr: 1, fontSize: '1rem' }} />
                          Phone
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {user.GSM}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>

              {/* Professional Information */}
              <Box sx={{ flex: 1 }}>
                <Card sx={{ backgroundColor: '#1e1e1e', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom sx={{ color: 'white', display: 'flex', alignItems: 'center' }}>
                      <BusinessIcon sx={{ mr: 1 }} />
                      Professional Information
                    </Typography>
                    <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

                    {user.fonction && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Function
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {user.fonction}
                        </Typography>
                      </Box>
                    )}

                    {user.niveau !== undefined && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Level
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {(() => {
                            const levelMap: { [key: number]: string } = {
                              0: 'Junior',
                              1: 'Medior',
                              2: 'Senior'
                            };
                            return levelMap[user.niveau || 0] || 'Junior';
                          })()}
                        </Typography>
                      </Box>
                    )}

                    {user.entreeFonction && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CalendarIcon sx={{ mr: 1, fontSize: '1rem' }} />
                          Entry Date
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {new Date(user.entreeFonction).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {/* Financial Information */}
            {(user.revenuQ1 !== undefined || user.revenuQ2 !== undefined) && (
              <Card sx={{ backgroundColor: '#1e1e1e', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom sx={{ color: 'white', display: 'flex', alignItems: 'center' }}>
                    <EuroIcon sx={{ mr: 1 }} />
                    Financial Information
                  </Typography>
                  <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    {user.revenuQ1 !== undefined && (
                      <Box sx={{ flex: 1, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Q1 Revenue
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          €{user.revenuQ1.toLocaleString()}
                        </Typography>
                      </Box>
                    )}

                    {user.revenuQ2 !== undefined && (
                      <Box sx={{ flex: 1, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Q2 Revenue
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          €{user.revenuQ2.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Container>
      </Box>
    </ThemeRegistry>
  );
}
