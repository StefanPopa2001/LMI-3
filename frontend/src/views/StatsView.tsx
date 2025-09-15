"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  CircularProgress,
} from '@mui/material';
import {
  Refresh,
  BarChart,
} from '@mui/icons-material';

import ThemeRegistry from '../components/layout/ThemeRegistry';
import NavBar from '../components/layout/NavBar';
import authService from '../services/authService';
import statsService, { LevelStats, TeacherStats } from '../services/statsService';

export default function StatsView() {
  const [levelStats, setLevelStats] = useState<LevelStats[]>([]);
  const [teacherStats, setTeacherStats] = useState<TeacherStats[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Sorting state
  const [levelOrderBy, setLevelOrderBy] = useState<string>('level');
  const [levelOrder, setLevelOrder] = useState<'asc' | 'desc'>('asc');
  const [teacherOrderBy, setTeacherOrderBy] = useState<string>('teacherName');
  const [teacherOrder, setTeacherOrder] = useState<'asc' | 'desc'>('asc');

  const router = useRouter();

  const handleApiError = (err: any) => {
    if (err.message && err.message.startsWith('AUTH_ERROR:')) {
      router.push('/login');
      return;
    }
    setError(err.message);
  };

  const isUserAuthenticated = useMemo(() => {
    if (!mounted) return false;
    return authService.isAuthenticated();
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isUserAuthenticated) {
      fetchStats();
    }
  }, [mounted, isUserAuthenticated]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const stats = await statsService.getStats();
      setLevelStats(stats.levelStats);
      setTeacherStats(stats.teacherStats);
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLevelSort = (property: string) => {
    const isAsc = levelOrderBy === property && levelOrder === 'asc';
    setLevelOrder(isAsc ? 'desc' : 'asc');
    setLevelOrderBy(property);
  };

  const handleTeacherSort = (property: string) => {
    const isAsc = teacherOrderBy === property && teacherOrder === 'asc';
    setTeacherOrder(isAsc ? 'desc' : 'asc');
    setTeacherOrderBy(property);
  };

  const sortedLevelStats = useMemo(() => {
    const arr = [...levelStats];
    arr.sort((a, b) => {
      const aValue = (a as any)[levelOrderBy];
      const bValue = (b as any)[levelOrderBy];
      if (aValue < bValue) return levelOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return levelOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [levelStats, levelOrderBy, levelOrder]);

  const sortedTeacherStats = useMemo(() => {
    const arr = [...teacherStats];
    arr.sort((a, b) => {
      const aValue = (a as any)[teacherOrderBy];
      const bValue = (b as any)[teacherOrderBy];
      if (aValue < bValue) return teacherOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return teacherOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [teacherStats, teacherOrderBy, teacherOrder]);

  if (!mounted) {
    return (
      <ThemeRegistry>
        <NavBar />
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, mt: 8, px: { xs: 2, sm: 3 } }}>
          <Typography>Loading...</Typography>
        </Container>
      </ThemeRegistry>
    );
  }

  if (!isUserAuthenticated) {
    return (
      <ThemeRegistry>
        <NavBar />
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, mt: 8, px: { xs: 2, sm: 3 } }}>
          <Alert severity="error">You need to be logged in to access statistics.</Alert>
        </Container>
      </ThemeRegistry>
    );
  }

  return (
    <ThemeRegistry>
      <NavBar />
      <Container
        maxWidth={false}
        sx={{
          py: { xs: 2, sm: 4 },
          mt: 8,
          px: { xs: 2, sm: 3 },
          height: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <Box display="flex" justifyContent="center" alignItems="center" mb={{ xs: 2, sm: 4 }}>
          <Typography variant="h1" component="h1" sx={{
            textAlign: 'center',
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
            fontWeight: 'bold'
          }}>
            Statistiques de présence
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Paper
          elevation={3}
          sx={{
            p: 3,
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ color: 'var(--color-text-primary)' }}>
              Présences par niveau et enseignant
            </Typography>
            <Button
              variant="outlined"
              onClick={fetchStats}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
            >
              Actualiser
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 4, flex: 1 }}>
            {/* Level Stats */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'var(--color-text-primary)' }}>
                Par niveau
              </Typography>
              <TableContainer component={Paper} sx={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border-light)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={levelOrderBy === 'level'}
                          direction={levelOrderBy === 'level' ? levelOrder : 'asc'}
                          onClick={() => handleLevelSort('level')}
                        >
                          Niveau
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={levelOrderBy === 'totalPresences'}
                          direction={levelOrderBy === 'totalPresences' ? levelOrder : 'asc'}
                          onClick={() => handleLevelSort('totalPresences')}
                        >
                          Total Présences
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={levelOrderBy === 'presentCount'}
                          direction={levelOrderBy === 'presentCount' ? levelOrder : 'asc'}
                          onClick={() => handleLevelSort('presentCount')}
                        >
                          Présents
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={levelOrderBy === 'presentPercentage'}
                          direction={levelOrderBy === 'presentPercentage' ? levelOrder : 'asc'}
                          onClick={() => handleLevelSort('presentPercentage')}
                        >
                          % Présence
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedLevelStats.map((stat) => (
                      <TableRow key={stat.level} hover>
                        <TableCell>{stat.level}</TableCell>
                        <TableCell align="right">{stat.totalPresences}</TableCell>
                        <TableCell align="right">{stat.presentCount}</TableCell>
                        <TableCell align="right">{stat.presentPercentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Teacher Stats */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'var(--color-text-primary)' }}>
                Par enseignant
              </Typography>
              <TableContainer component={Paper} sx={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border-light)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={teacherOrderBy === 'teacherName'}
                          direction={teacherOrderBy === 'teacherName' ? teacherOrder : 'asc'}
                          onClick={() => handleTeacherSort('teacherName')}
                        >
                          Enseignant
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={teacherOrderBy === 'totalPresences'}
                          direction={teacherOrderBy === 'totalPresences' ? teacherOrder : 'asc'}
                          onClick={() => handleTeacherSort('totalPresences')}
                        >
                          Total Présences
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={teacherOrderBy === 'presentCount'}
                          direction={teacherOrderBy === 'presentCount' ? teacherOrder : 'asc'}
                          onClick={() => handleTeacherSort('presentCount')}
                        >
                          Présents
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={teacherOrderBy === 'presentPercentage'}
                          direction={teacherOrderBy === 'presentPercentage' ? teacherOrder : 'asc'}
                          onClick={() => handleTeacherSort('presentPercentage')}
                        >
                          % Présence
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedTeacherStats.map((stat) => (
                      <TableRow key={stat.teacherId} hover>
                        <TableCell>{stat.teacherName}</TableCell>
                        <TableCell align="right">{stat.totalPresences}</TableCell>
                        <TableCell align="right">{stat.presentCount}</TableCell>
                        <TableCell align="right">{stat.presentPercentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        </Paper>
      </Container>
    </ThemeRegistry>
  );
}
