'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Alert,
  Container,
  Paper,
  Tooltip,
  Badge,
  Collapse
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  ArrowBack,
  People,
  CheckCircle,
  Cancel,
  HelpOutline,
  Schedule,
  CalendarToday,
  Search,
  ExpandLess,
  ExpandMore,
  ViewWeek,
  ViewDay,
  ViewModule,
  Home
} from '@mui/icons-material';
import {
  attendanceService,
  type SeanceWithAttendance,
  type AttendanceUpdate
} from '@/services/attendanceService';
import { authService } from '@/services/authService';
import { settingsService } from '@/services/settingsService';
import eleveService from '@/services/eleveService';
import NavBar from '../components/layout/NavBar';
import RRModal from '@/components/ui/RRModal';

interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

interface Eleve {
  id: number;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  niveau?: string;
  contactParent?: string;
  notes?: string;
}

interface Setting {
  id: number;
  category: string;
  value: string;
}

const AttendanceView: React.FC = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    attendanceService.getWeekStartDate(new Date())
  );
  const [seances, setSeances] = useState<SeanceWithAttendance[]>([]);
  const [allSeances, setAllSeances] = useState<SeanceWithAttendance[]>([]);
  const [selectedSeance, setSelectedSeance] = useState<SeanceWithAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isRRModalOpen, setIsRRModalOpen] = useState(false);
  const [rrDefaults, setRrDefaults] = useState<{ originSeanceId?: number; eleveId?: number } >({});
  const [rrReadonlyInfo, setRrReadonlyInfo] = useState<{ id: number; type: 'origin' | 'destination'; destStatut?: string } | null>(null);

  // Filter states
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [levelSettings, setLevelSettings] = useState<Setting[]>([]);
  const [typeCoursSettings, setTypeCoursSettings] = useState<Setting[]>([]);
  const [locationSettings, setLocationSettings] = useState<Setting[]>([]);
  const [salleSettings, setSalleSettings] = useState<Setting[]>([]);
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [filterTeacher, setFilterTeacher] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterSalle, setFilterSalle] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterTypeCours, setFilterTypeCours] = useState<string>('');
  const [filterStudent, setFilterStudent] = useState<string>('');
  const [filterJourSemaine, setFilterJourSemaine] = useState<string>('');
  const [filterHeureDebut, setFilterHeureDebut] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // View states
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'grid'>('week');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);

  const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Helper function to group seances by time
  const groupSeancesByTime = (seances: SeanceWithAttendance[]) => {
    const grouped = seances.reduce((acc, seance) => {
      const time = attendanceService.formatTime(seance.dateHeure);
      if (!acc[time]) {
        acc[time] = [];
      }
      acc[time].push(seance);
      return acc;
    }, {} as Record<string, SeanceWithAttendance[]>);

    // Sort by time
    const sortedTimes = Object.keys(grouped).sort();
    return sortedTimes.map(time => ({
      time,
      seances: grouped[time]
    }));
  };

  useEffect(() => {
    if (viewMode === 'grid') {
      loadAllSeances();
    } else {
      loadWeeklySeances();
    }
  }, [currentWeekStart, viewMode]);

  const loadWeeklySeances = async () => {
    setLoading(true);
    try {
      const startDateString = currentWeekStart.toISOString().split('T')[0];
      const weeklySeances = await attendanceService.getWeeklySeances(startDateString);
      setSeances(weeklySeances);
      extractAvailableHours(weeklySeances);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des séances');
    } finally {
      setLoading(false);
    }
  };

  const loadAllSeances = async () => {
    setLoading(true);
    try {
      // For grid view, load all seances from beginning of current year to end of next year
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1); // January 1st of current year
      const endDate = new Date(currentYear + 1, 11, 31); // December 31st of next year
      
      const promises = [];
      const currentDate = new Date(startDate);
      
      // Load seances week by week from start to end date
      while (currentDate <= endDate) {
        const startDateString = currentDate.toISOString().split('T')[0];
        promises.push(attendanceService.getWeeklySeances(startDateString));
        currentDate.setDate(currentDate.getDate() + 7); // Move to next week
      }
      
      const allWeeksSeances = await Promise.all(promises);
      const flatSeances = allWeeksSeances.flat();
      setAllSeances(flatSeances);
      extractAvailableHours(flatSeances);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des séances');
    } finally {
      setLoading(false);
    }
  };

  const extractAvailableHours = (seancesList: SeanceWithAttendance[]) => {
    const hours = new Set<string>();
    seancesList.forEach(seance => {
      const time = attendanceService.formatTime(seance.dateHeure);
      hours.add(time);
    });
    setAvailableHours(Array.from(hours).sort());
  };

  const loadData = async () => {
    try {
      const [teachersData, studentsData, levelData, typeCoursData, locationData, salleData] = await Promise.all([
        authService.getAllUsers(),
        eleveService.getAllEleves(),
        settingsService.getSettingsByCategory('level'),
        settingsService.getSettingsByCategory('typeCours'),
        settingsService.getSettingsByCategory('location'),
        settingsService.getSettingsByCategory('salle')
      ]);
      setTeachers(teachersData);
      setStudents(studentsData);
      setLevelSettings(levelData);
      setTypeCoursSettings(typeCoursData);
      setLocationSettings(locationData);
      setSalleSettings(salleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAttendanceDialog = async (seance: SeanceWithAttendance) => {
    try {
      const seanceWithAttendance = await attendanceService.getSeanceAttendance(seance.id);
      setSelectedSeance(seanceWithAttendance);
      setIsAttendanceDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des présences');
    }
  };

  const openRRModalPrefilled = (originSeanceId: number, eleveId: number) => {
    setRrDefaults({ originSeanceId, eleveId });
    setRrReadonlyInfo(null);
    setIsRRModalOpen(true);
  };

  const openRRModalForExisting = (rrId: number, type: 'origin' | 'destination', destStatut?: string) => {
    setRrDefaults({});
    setRrReadonlyInfo({ id: rrId, type, destStatut });
    setIsRRModalOpen(true);
  };

  // Open RR from day/grid cards: fetch rrMap for the seance, open existing RR in read-only if found, else open prefilled
  const openRRFromCard = async (seanceId: number, eleveId: number) => {
    try {
      const detailed = await attendanceService.getSeanceAttendance(seanceId);
      const originRR = detailed.rrMap?.origin?.find(r => r.eleveId === eleveId);
      const destRR = detailed.rrMap?.destination?.find(r => r.eleveId === eleveId);
      if (originRR) return openRRModalForExisting(originRR.id, 'origin', originRR.destStatut);
      if (destRR) return openRRModalForExisting(destRR.id, 'destination', destRR.destStatut);
      return openRRModalPrefilled(seanceId, eleveId);
    } catch (e) {
      // Fallback to simple prefilled modal if detailed fetch fails
      return openRRModalPrefilled(seanceId, eleveId);
    }
  };

  const updateAttendance = async (presenceId: number, statut: string, notes?: string) => {
    try {
      await attendanceService.updateAttendance(presenceId, statut, notes);
      setSuccess('Présence mise à jour');
      
      // Reload the seance data
      if (selectedSeance) {
        const updatedSeance = await attendanceService.getSeanceAttendance(selectedSeance.id);
        setSelectedSeance(updatedSeance);
        
        // Update the seances list
        setSeances(prev => prev.map(s => 
          s.id === updatedSeance.id ? updatedSeance : s
        ));
      }
      
      // Refresh all seances for grid view
      if (viewMode === 'grid') {
        loadAllSeances();
      } else {
        // Refresh current week seances
        loadWeeklySeances();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleDayClick = (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setViewMode('day');
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const getSeancesForDay = (dayIndex: number, seancesList = filteredSeances): SeanceWithAttendance[] => {
    return seancesList.filter(seance => {
      const seanceDay = attendanceService.getDayOfWeek(seance.dateHeure);
      return seanceDay === (dayIndex === 6 ? 0 : dayIndex + 1); // Adjust for Sunday
    }).sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime());
  };

  const getDateForDay = (dayIndex: number): Date => {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + dayIndex);
    return date;
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const resetFilters = () => {
    setFilterTeacher('');
    setFilterLocation('');
    setFilterSalle('');
    setFilterLevel('');
    setFilterTypeCours('');
    setFilterStudent('');
    setFilterJourSemaine('');
    setFilterHeureDebut('');
    setSearchTerm('');
  };

  const filteredSeances = (viewMode === 'grid' ? allSeances : seances).filter(seance => {
    const matchesSearch = searchTerm === '' || 
      seance.classe.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seance.classe.teacher.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seance.classe.teacher.nom.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeacher = filterTeacher === '' || seance.classe.teacher.id.toString() === filterTeacher;
    
    const matchesStudent = filterStudent === '' || 
      seance.classe.eleves.some(e => e.eleve.id.toString() === filterStudent);
    
    const matchesJourSemaine = filterJourSemaine === '' || 
      attendanceService.getDayOfWeek(seance.dateHeure).toString() === filterJourSemaine;
    
    const matchesHeureDebut = filterHeureDebut === '' || 
      attendanceService.formatTime(seance.dateHeure) === filterHeureDebut;
    
    return matchesSearch && matchesTeacher && matchesStudent && matchesJourSemaine && 
           matchesHeureDebut;
  });

  if (loading) {
    return (
      <div>
        <NavBar />
        <Container sx={{ mt: 8 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <Typography variant="h6">Chargement...</Typography>
          </Box>
        </Container>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 }, mt: 8, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="center" alignItems="center" mb={{ xs: 2, sm: 4 }}>
        <Typography variant="h1" component="h1" sx={{ 
          textAlign: 'center', 
          fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' }, 
          fontWeight: 'bold' 
        }}>
          Carnet de Présence
        </Typography>
      </Box>

      {/* View Toggle Buttons */}
      <Box display="flex" justifyContent="center" mb={3}>
        <Box 
          sx={{ 
            display: 'flex',
            bgcolor: 'var(--color-bg-secondary)',
            borderRadius: 2,
            border: '1px solid var(--color-border-light)',
            overflow: 'hidden'
          }}
        >
          <Button
            onClick={() => setViewMode('week')}
            startIcon={<ViewWeek />}
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: 0,
              bgcolor: viewMode === 'week' ? 'var(--color-primary-500)' : 'transparent',
              color: viewMode === 'week' ? 'white' : 'var(--color-text-primary)',
              borderRight: '1px solid var(--color-border-light)',
              '&:hover': {
                bgcolor: viewMode === 'week' ? 'var(--color-primary-600)' : 'var(--color-bg-tertiary)'
              },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            Semaine
          </Button>
          
          <Button
            onClick={() => setViewMode('day')}
            startIcon={<ViewDay />}
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: 0,
              bgcolor: viewMode === 'day' ? 'var(--color-primary-500)' : 'transparent',
              color: viewMode === 'day' ? 'white' : 'var(--color-text-primary)',
              borderRight: '1px solid var(--color-border-light)',
              '&:hover': {
                bgcolor: viewMode === 'day' ? 'var(--color-primary-600)' : 'var(--color-bg-tertiary)'
              },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            Jour
          </Button>
          
          <Button
            onClick={() => setViewMode('grid')}
            startIcon={<ViewModule />}
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: 0,
              bgcolor: viewMode === 'grid' ? 'var(--color-primary-500)' : 'transparent',
              color: viewMode === 'grid' ? 'white' : 'var(--color-text-primary)',
              '&:hover': {
                bgcolor: viewMode === 'grid' ? 'var(--color-primary-600)' : 'var(--color-bg-tertiary)'
              },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            Grille
          </Button>
        </Box>
      </Box>

      {/* Expandable Filter Banner */}
      <Paper sx={{
        mb: 3,
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-light)',
        color: 'var(--color-text-primary)'
      }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            cursor: 'pointer',
            p: 2,
            '&:hover': {
              backgroundColor: 'var(--color-bg-tertiary)'
            }
          }}
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Search sx={{ color: 'var(--color-primary-500)' }} />
          </Box>
          <IconButton
            size="small"
            sx={{
              color: 'var(--color-text-secondary)',
              '&:hover': {
                color: 'var(--color-text-primary)'
              }
            }}
          >
            {isFilterExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        <Collapse in={isFilterExpanded}>
          <Box sx={{
            p: 2,
            pt: 0,
            backgroundColor: 'var(--color-bg-tertiary)',
            borderTop: '1px solid var(--color-border-light)'
          }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
              <TextField
                label="Rechercher"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                size="small"
                sx={{
                  mr: { sm: 2 },
                  width: { xs: '100%', sm: 'auto' },
                  flex: { sm: 1 },
                  '& .MuiInputBase-root': { bgcolor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' },
                  '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'var(--color-border-light)' },
                    '&:hover fieldset': { borderColor: 'var(--color-primary-500)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--color-primary-500)' }
                  }
                }}
              />
              <Button variant="outlined" onClick={resetFilters} size="small" sx={{ minWidth: { xs: '100%', sm: 'auto' } }}>
                Réinitialiser
              </Button>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { 
                  xs: '1fr', 
                  sm: 'repeat(2, 1fr)', 
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)' 
                },
                gap: 2
              }}
            >
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Professeur</InputLabel>
                <Select
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                  sx={{
                    bgcolor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-light)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' }
                  }}
                >
                  <MenuItem value="">
                    <em>Tous</em>
                  </MenuItem>
                  {teachers.map(teacher => (
                    <MenuItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.prenom} {teacher.nom}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Lieu</InputLabel>
                <Select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  sx={{
                    bgcolor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-light)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' }
                  }}
                >
                  <MenuItem value="">
                    <em>Tous</em>
                  </MenuItem>
                  {locationSettings.map(setting => (
                    <MenuItem key={setting.id} value={setting.value}>
                      {setting.value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Salle</InputLabel>
                <Select
                  value={filterSalle}
                  onChange={(e) => setFilterSalle(e.target.value)}
                  sx={{
                    bgcolor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-light)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' }
                  }}
                >
                  <MenuItem value="">
                    <em>Tous</em>
                  </MenuItem>
                  {salleSettings.map(setting => (
                    <MenuItem key={setting.id} value={setting.value}>
                      {setting.value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Niveau</InputLabel>
                <Select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  sx={{
                    bgcolor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-light)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' }
                  }}
                >
                  <MenuItem value="">
                    <em>Tous</em>
                  </MenuItem>
                  {levelSettings.map(setting => (
                    <MenuItem key={setting.id} value={setting.value}>
                      {setting.value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Type de cours</InputLabel>
                <Select
                  value={filterTypeCours}
                  onChange={(e) => setFilterTypeCours(e.target.value)}
                  sx={{
                    bgcolor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-light)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' }
                  }}
                >
                  <MenuItem value="">
                    <em>Tous</em>
                  </MenuItem>
                  {typeCoursSettings.map(setting => (
                    <MenuItem key={setting.id} value={setting.value}>
                      {setting.value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Élève</InputLabel>
                <Select
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                  sx={{
                    bgcolor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-light)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' }
                  }}
                >
                  <MenuItem value="">
                    <em>Tous</em>
                  </MenuItem>
                  {students.map(student => (
                    <MenuItem key={student.id} value={student.id.toString()}>
                      {student.prenom} {student.nom}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Jour de semaine</InputLabel>
                <Select
                  value={filterJourSemaine}
                  onChange={(e) => setFilterJourSemaine(e.target.value)}
                  sx={{
                    bgcolor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-light)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' }
                  }}
                >
                  <MenuItem value="">
                    <em>Tous</em>
                  </MenuItem>
                  {[1,2,3,4,5,6,7].map(day => (
                    <MenuItem key={day} value={day.toString()}>
                      {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][day-1]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Heure de début</InputLabel>
                <Select
                  value={filterHeureDebut}
                  onChange={(e) => setFilterHeureDebut(e.target.value)}
                  sx={{
                    bgcolor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-light)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary-500)' }
                  }}
                >
                  <MenuItem value="">
                    <em>Toutes</em>
                  </MenuItem>
                  {availableHours.map(time => (
                    <MenuItem key={time} value={time}>
                      {time}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Collapse>
      </Paper>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearMessages}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={clearMessages}>
          {success}
        </Alert>
      )}

      {/* Week Navigation - Only for week view */}
      {viewMode === 'week' && (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          mb={4} 
          gap={2} 
          sx={{ 
            flexWrap: 'wrap',
            flexDirection: { xs: 'column', sm: 'row' },
            '& .MuiButton-root': {
              minWidth: 'auto'
            }
          }}
        >
          <IconButton 
            onClick={() => navigateWeek('prev')} 
            sx={{ 
              bgcolor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              '&:hover': { bgcolor: 'var(--color-bg-tertiary)' }
            }}
          >
            <ChevronLeft />
          </IconButton>
          
          <Box sx={{ textAlign: 'center', mx: 2 }}>
            <Typography variant="h6" sx={{ 
              fontSize: { xs: '1rem', sm: '1.25rem' },
              color: 'var(--color-text-primary)',
              fontWeight: 'bold'
            }}>
              Semaine {getWeekNumber(currentWeekStart)} - {currentWeekStart.getFullYear()}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'var(--color-text-secondary)',
              fontSize: { xs: '0.8rem', sm: '0.9rem' }
            }}>
              {currentWeekStart.toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })} - {' '}
              {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </Typography>
          </Box>
          
          <IconButton 
            onClick={() => navigateWeek('next')} 
            sx={{ 
              bgcolor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              '&:hover': { bgcolor: 'var(--color-bg-tertiary)' }
            }}
          >
            <ChevronRight />
          </IconButton>
          
          <IconButton 
            onClick={() => setCurrentWeekStart(attendanceService.getWeekStartDate(new Date()))}
            sx={{ 
              bgcolor: 'var(--color-primary-500)',
              color: 'white',
              ml: 2,
              '&:hover': { bgcolor: 'var(--color-primary-600)' }
            }}
          >
            <Home />
          </IconButton>
        </Box>
      )}

      {/* Day Navigation */}
      {viewMode === 'day' && (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          mb={4} 
          gap={2}
          sx={{
            flexWrap: 'wrap',
            flexDirection: { xs: 'column', sm: 'row' },
            '& .MuiButton-root': {
              minWidth: 'auto'
            }
          }}
        >
          <IconButton 
            onClick={() => { if (selectedDayIndex > 0) setSelectedDayIndex(selectedDayIndex - 1); else { navigateWeek('prev'); setSelectedDayIndex(6); } }}
            sx={{ 
              bgcolor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              '&:hover': { bgcolor: 'var(--color-bg-tertiary)' }
            }}
          >
            <ChevronLeft />
          </IconButton>
          
          <Box sx={{ textAlign: 'center', mx: 2 }}>
            <Typography variant="h6" sx={{ 
              fontSize: { xs: '1rem', sm: '1.25rem' },
              color: 'var(--color-text-primary)',
              fontWeight: 'bold'
            }}>
              {weekDays[selectedDayIndex]}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'var(--color-text-secondary)',
              fontSize: { xs: '0.8rem', sm: '0.9rem' }
            }}>
              {getDateForDay(selectedDayIndex).toLocaleDateString('fr-FR', { 
                weekday: 'long',
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </Typography>
          </Box>
          
          <IconButton 
            onClick={() => { if (selectedDayIndex < 6) setSelectedDayIndex(selectedDayIndex + 1); else { navigateWeek('next'); setSelectedDayIndex(0); } }}
            sx={{ 
              bgcolor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              '&:hover': { bgcolor: 'var(--color-bg-tertiary)' }
            }}
          >
            <ChevronRight />
          </IconButton>
          
          <IconButton 
            onClick={() => { const today = new Date(); const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; setSelectedDayIndex(todayIndex); setCurrentWeekStart(attendanceService.getWeekStartDate(today)); }}
            sx={{ 
              bgcolor: 'var(--color-primary-500)',
              color: 'white',
              ml: 2,
              '&:hover': { bgcolor: 'var(--color-primary-600)' }
            }}
          >
            <Home />
          </IconButton>
        </Box>
      )}

      {/* Weekly Calendar */}
      {viewMode === 'week' && (
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
            xl: 'repeat(7, 1fr)'
          },
          gap: 2
        }}
      >
        {weekDays.map((dayName, dayIndex) => {
          const daySeances = getSeancesForDay(dayIndex);
          const dayDate = getDateForDay(dayIndex);
          const isToday = dayDate.toDateString() === new Date().toDateString();

          return (
            <Paper 
              key={dayName}
              sx={{ 
                height: { xs: '400px', sm: '450px', md: '500px' }, 
                display: 'flex', 
                flexDirection: 'column',
                border: isToday ? '2px solid' : '1px solid',
                borderColor: isToday ? 'var(--color-primary-500)' : 'var(--color-border-light)',
                minWidth: '160px'
              }}
            >
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: isToday ? 'var(--color-primary-500)' : 'var(--color-bg-secondary)',
                    color: isToday ? 'var(--color-text-on-primary)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    '&:hover': { 
                      opacity: 0.8
                    }
                  }}
                  onClick={() => handleDayClick(dayIndex)}
                >
                  <Typography variant="h6" textAlign="center">
                    {dayName}
                  </Typography>
                  <Typography variant="body2" textAlign="center">
                    {dayDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </Typography>
                </Box>
                
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
                  {daySeances.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
                      Pas de séances
                    </Typography>
                  ) : (
                    daySeances.map(seance => {
                      const stats = attendanceService.calculateAttendanceStats(seance);
                      return (
                        <Card 
                          key={seance.id} 
                          sx={{ 
                            mb: 1, 
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'var(--color-bg-tertiary)' }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openAttendanceDialog(seance);
                          }}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="subtitle2" noWrap>
                              {seance.classe.nom}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                              {attendanceService.formatTime(seance.dateHeure)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                              {seance.classe.teacher.prenom} {seance.classe.teacher.nom}
                            </Typography>
                            
                            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                              <Badge 
                                badgeContent={stats.present} 
                                color="success"
                                max={99}
                              >
                                <People fontSize="small" />
                              </Badge>
                              <Typography variant="caption">
                                {Math.round(stats.attendanceRate)}%
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </Box>
              </Paper>
          );
        })}
      </Box>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
          {(() => {
            const daySeances = getSeancesForDay(selectedDayIndex);
            
            if (daySeances.length === 0) {
              return (
                <Paper 
                  sx={{ 
                    p: 4,
                    textAlign: 'center',
                    bgcolor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-light)'
                  }}
                >
                  <Typography variant="h6" sx={{ color: 'var(--color-text-primary)', mb: 2 }}>
                    Aucune séance prévue
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                    Il n'y a pas de séances programmées pour {weekDays[selectedDayIndex].toLowerCase()} {getDateForDay(selectedDayIndex).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}.
                  </Typography>
                </Paper>
              );
            }

            const groupedSeances = groupSeancesByTime(daySeances);

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {groupedSeances.map(({ time, seances }) => (
                  <Paper 
                    key={time}
                    sx={{ 
                      p: 3,
                      bgcolor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-light)'
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 2,
                        color: 'var(--color-text-primary)',
                        fontWeight: 'bold',
                        borderBottom: '2px solid var(--color-primary-500)',
                        pb: 1
                      }}
                    >
                      {time}
                    </Typography>
                    
                    <Box 
                      sx={{ 
                        display: 'grid',
                        gridTemplateColumns: { 
                          xs: '1fr',
                          sm: 'repeat(2, 1fr)',
                          md: 'repeat(3, 1fr)',
                          lg: 'repeat(4, 1fr)'
                        },
                        gap: 2
                      }}
                    >
                      {seances.map(seance => {
                        const stats = attendanceService.calculateAttendanceStats(seance);
                        const seanceDate = new Date(seance.dateHeure);
                        const isToday = seanceDate.toDateString() === new Date().toDateString();
                        const isPast = seanceDate < new Date();
                        
                        return (
                          <Card 
                            key={seance.id} 
                            sx={{ 
                              cursor: 'pointer',
                              border: isToday ? '2px solid var(--color-primary-500)' : '1px solid var(--color-border-light)',
                              opacity: isPast ? 0.8 : 1,
                              '&:hover': { 
                                bgcolor: 'var(--color-bg-tertiary)',
                                transform: 'translateY(-2px)',
                                boxShadow: 3
                              },
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onClick={() => openAttendanceDialog(seance)}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Box display="flex" justifyContent="between" alignItems="flex-start" mb={1}>
                                <Typography variant="h6" sx={{ 
                                  fontSize: '1rem', 
                                  fontWeight: 'bold',
                                  color: 'var(--color-text-primary)',
                                  lineHeight: 1.2
                                }}>
                                  {seance.classe.nom}
                                </Typography>
                                {isToday && (
                                  <Chip 
                                    label="Aujourd'hui" 
                                    size="small" 
                                    sx={{ 
                                      bgcolor: 'var(--color-primary-500)', 
                                      color: 'var(--color-text-on-primary)',
                                      fontSize: '0.7rem'
                                    }} 
                                  />
                                )}
                              </Box>
                              
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" sx={{ 
                                  color: 'var(--color-text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  mb: 0.5
                                }}>
                                  <CalendarToday sx={{ fontSize: '1rem' }} />
                                  {seanceDate.toLocaleDateString('fr-FR', { 
                                    weekday: 'short',
                                    day: 'numeric', 
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </Typography>
                                
                                <Typography variant="body2" sx={{ 
                                  color: 'var(--color-text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  mb: 0.5
                                }}>
                                  <Schedule sx={{ fontSize: '1rem' }} />
                                  {attendanceService.formatTime(seance.dateHeure)}
                                </Typography>
                                
                                <Typography variant="body2" sx={{ 
                                  color: 'var(--color-text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1
                                }}>
                                  <People sx={{ fontSize: '1rem' }} />
                                  {seance.classe.teacher.prenom} {seance.classe.teacher.nom}
                                </Typography>
                              </Box>
                              
                              {/* Students List with Status Buttons */}
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" sx={{ 
                                  color: 'var(--color-text-secondary)',
                                  fontWeight: 'bold',
                                  mb: 1,
                                  display: 'block'
                                }}>
                                  Élèves ({seance.classe.eleves.length})
                                </Typography>
                                
                                <Box sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                                  {seance.classe.eleves.map(eleveInClasse => {
                                    // Find the presence record for this student
                                    const presence = seance.presences?.find(p => p.eleveId === eleveInClasse.eleve.id);
                                    const status = presence?.statut || 'no_status';
                                    
                                    return (
                                      <Box 
                                        key={eleveInClasse.eleve.id}
                                        sx={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center',
                                          py: 0.5,
                                          px: 1,
                                          mb: 0.5,
                                          bgcolor: 'var(--color-bg-primary)',
                                          borderRadius: 1,
                                          border: '1px solid var(--color-border-light)'
                                        }}
                                      >
                                        <Typography variant="caption" sx={{ 
                                          color: 'var(--color-text-primary)',
                                          fontSize: '0.75rem',
                                          flex: 1,
                                          textOverflow: 'ellipsis',
                                          overflow: 'hidden',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {eleveInClasse.eleve.prenom} {eleveInClasse.eleve.nom}
                                        </Typography>
                                        
                                        <Box display="flex" gap={0.5}>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (presence) {
                                                updateAttendance(presence.id, 'present');
                                              }
                                            }}
                                            sx={{
                                              p: 0.3,
                                              color: status === 'present' ? 'var(--color-success-500)' : 'var(--color-text-secondary)',
                                              bgcolor: status === 'present' ? 'var(--color-success-100)' : 'transparent',
                                              '&:hover': {
                                                bgcolor: 'var(--color-success-100)',
                                                color: 'var(--color-success-500)'
                                              }
                                            }}
                                          >
                                            <CheckCircle sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                          
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (presence) {
                                                updateAttendance(presence.id, 'absent');
                                              }
                                            }}
                                            sx={{
                                              p: 0.3,
                                              color: status === 'absent' ? 'var(--color-error-500)' : 'var(--color-text-secondary)',
                                              bgcolor: status === 'absent' ? 'var(--color-error-100)' : 'transparent',
                                              '&:hover': {
                                                bgcolor: 'var(--color-error-100)',
                                                color: 'var(--color-error-500)'
                                              }
                                            }}
                                          >
                                            <Cancel sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                          
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (presence) {
                                                updateAttendance(presence.id, 'awaiting');
                                              }
                                            }}
                                            sx={{
                                              p: 0.3,
                                              color: status === 'awaiting' ? 'var(--color-warning-500)' : 'var(--color-text-secondary)',
                                              bgcolor: status === 'awaiting' ? 'var(--color-warning-100)' : 'transparent',
                                              '&:hover': {
                                                bgcolor: 'var(--color-warning-100)',
                                                color: 'var(--color-warning-500)'
                                              }
                                            }}
                                          >
                                            <Schedule sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                          
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (presence) {
                                                updateAttendance(presence.id, 'no_status');
                                              }
                                            }}
                                            sx={{
                                              p: 0.3,
                                              color: status === 'no_status' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                              bgcolor: status === 'no_status' ? 'var(--color-bg-tertiary)' : 'transparent',
                                              '&:hover': {
                                                bgcolor: 'var(--color-bg-tertiary)',
                                                color: 'var(--color-text-primary)'
                                              }
                                            }}
                                          >
                                            <HelpOutline sx={{ fontSize: '1rem' }} />
                                          </IconButton>

                                          {/* RR button */}
                                          <Tooltip title="RR">
                                            <IconButton
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openRRFromCard(seance.id, eleveInClasse.eleve.id);
                                              }}
                                              sx={{ p: 0.3 }}
                                            >
                                              <ViewModule sx={{ fontSize: '1rem' }} />
                                            </IconButton>
                                          </Tooltip>
                                        </Box>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  </Paper>
                ))}
              </Box>
            );
          })()}
        </Box>
      )}

      {/* Grid View - All Seances */}
      {viewMode === 'grid' && (
        <Box>
          <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', color: 'var(--color-text-primary)' }}>
            Toutes les séances - {filteredSeances.length} séance(s)
          </Typography>
          
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: { 
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
                xl: 'repeat(5, 1fr)'
              },
              gap: 2
            }}
          >
            {filteredSeances
              .sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime())
              .map(seance => {
                const stats = attendanceService.calculateAttendanceStats(seance);
                const seanceDate = new Date(seance.dateHeure);
                const isToday = seanceDate.toDateString() === new Date().toDateString();
                const isPast = seanceDate < new Date();
                
                return (
                  <Card 
                    key={seance.id} 
                    sx={{ 
                      cursor: 'pointer',
                      border: isToday ? '2px solid var(--color-primary-500)' : '1px solid var(--color-border-light)',
                      opacity: isPast ? 0.8 : 1,
                      '&:hover': { 
                        bgcolor: 'var(--color-bg-tertiary)',
                        transform: 'translateY(-2px)',
                        boxShadow: 3
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => openAttendanceDialog(seance)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" justifyContent="between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" sx={{ 
                          fontSize: '1rem', 
                          fontWeight: 'bold',
                          color: 'var(--color-text-primary)',
                          lineHeight: 1.2
                        }}>
                          {seance.classe.nom}
                        </Typography>
                        {isToday && (
                          <Chip 
                            label="Aujourd'hui" 
                            size="small" 
                            sx={{ 
                              bgcolor: 'var(--color-primary-500)', 
                              color: 'var(--color-text-on-primary)',
                              fontSize: '0.7rem'
                            }} 
                          />
                        )}
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ 
                          color: 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5
                        }}>
                          <CalendarToday sx={{ fontSize: '1rem' }} />
                          {seanceDate.toLocaleDateString('fr-FR', { 
                            weekday: 'short',
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Typography>
                        
                        <Typography variant="body2" sx={{ 
                          color: 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5
                        }}>
                          <Schedule sx={{ fontSize: '1rem' }} />
                          {attendanceService.formatTime(seance.dateHeure)}
                        </Typography>
                        
                        <Typography variant="body2" sx={{ 
                          color: 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          <People sx={{ fontSize: '1rem' }} />
                          {seance.classe.teacher.prenom} {seance.classe.teacher.nom}
                        </Typography>
                      </Box>
                      
                      {/* Students List with Status Buttons */}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" sx={{ 
                          color: 'var(--color-text-secondary)',
                          fontWeight: 'bold',
                          mb: 1,
                          display: 'block'
                        }}>
                          Élèves ({seance.classe.eleves.length})
                        </Typography>
                        
                        <Box sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {seance.classe.eleves.map(eleveInClasse => {
                            // Find the presence record for this student
                            const presence = seance.presences?.find(p => p.eleveId === eleveInClasse.eleve.id);
                            const status = presence?.statut || 'no_status';
                            
                            return (
                              <Box 
                                key={eleveInClasse.eleve.id}
                                sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  py: 0.5,
                                  px: 1,
                                  mb: 0.5,
                                  bgcolor: 'var(--color-bg-primary)',
                                  borderRadius: 1,
                                  border: '1px solid var(--color-border-light)'
                                }}
                              >
                                <Typography variant="caption" sx={{ 
                                  color: 'var(--color-text-primary)',
                                  fontSize: '0.75rem',
                                  flex: 1,
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {eleveInClasse.eleve.prenom} {eleveInClasse.eleve.nom}
                                </Typography>
                                
                                <Box display="flex" gap={0.5}>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (presence) {
                                        updateAttendance(presence.id, 'present');
                                      }
                                    }}
                                    sx={{
                                      p: 0.3,
                                      color: status === 'present' ? 'var(--color-success-500)' : 'var(--color-text-secondary)',
                                      bgcolor: status === 'present' ? 'var(--color-success-100)' : 'transparent',
                                      '&:hover': {
                                        bgcolor: 'var(--color-success-100)',
                                        color: 'var(--color-success-500)'
                                      }
                                    }}
                                  >
                                    <CheckCircle sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                  
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (presence) {
                                        updateAttendance(presence.id, 'absent');
                                      }
                                    }}
                                    sx={{
                                      p: 0.3,
                                      color: status === 'absent' ? 'var(--color-error-500)' : 'var(--color-text-secondary)',
                                      bgcolor: status === 'absent' ? 'var(--color-error-100)' : 'transparent',
                                      '&:hover': {
                                        bgcolor: 'var(--color-error-100)',
                                        color: 'var(--color-error-500)'
                                      }
                                    }}
                                  >
                                    <Cancel sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                  
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (presence) {
                                        updateAttendance(presence.id, 'awaiting');
                                      }
                                    }}
                                    sx={{
                                      p: 0.3,
                                      color: status === 'awaiting' ? 'var(--color-warning-500)' : 'var(--color-text-secondary)',
                                      bgcolor: status === 'awaiting' ? 'var(--color-warning-100)' : 'transparent',
                                      '&:hover': {
                                        bgcolor: 'var(--color-warning-100)',
                                        color: 'var(--color-warning-500)'
                                      }
                                    }}
                                  >
                                    <Schedule sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                  
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (presence) {
                                        updateAttendance(presence.id, 'no_status');
                                      }
                                    }}
                                    sx={{
                                      p: 0.3,
                                      color: status === 'no_status' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                      bgcolor: status === 'no_status' ? 'var(--color-bg-tertiary)' : 'transparent',
                                      '&:hover': {
                                        bgcolor: 'var(--color-bg-tertiary)',
                                        color: 'var(--color-text-primary)'
                                      }
                                    }}
                                  >
                                    <HelpOutline sx={{ fontSize: '1rem' }} />
                                  </IconButton>

                                  {/* RR button */}
                                  <Tooltip title="RR">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openRRFromCard(seance.id, eleveInClasse.eleve.id);
                                      }}
                                      sx={{ p: 0.3 }}
                                    >
                                      <ViewModule sx={{ fontSize: '1rem' }} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
          </Box>
          
          {filteredSeances.length === 0 && (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 8,
                color: 'var(--color-text-secondary)'
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>
                Aucune séance trouvée
              </Typography>
              <Typography variant="body2">
                Essayez de modifier vos filtres ou de charger une autre semaine
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Attendance Dialog */}
      {selectedSeance && (
        <Dialog
          open={isAttendanceDialogOpen}
          onClose={() => setIsAttendanceDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              maxWidth: { xs: '95vw', sm: '90vw', md: '800px' },
              maxHeight: { xs: '90vh', sm: '85vh' }
            }
          }}
        >
          <DialogTitle sx={{ bgcolor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-light)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">{selectedSeance.classe.nom}</Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  {attendanceService.formatDateTime(selectedSeance.dateHeure)}
                </Typography>
              </Box>
              <Box display="flex" gap={1}>
                {(() => {
                  const stats = attendanceService.calculateAttendanceStats(selectedSeance);
                  return (
                    <>
                      <Chip 
                        icon={<CheckCircle />}
                        label={`${stats.present} présents`}
                        color="success"
                        size="small"
                      />
                      <Chip 
                        icon={<Cancel />}
                        label={`${stats.absent} absents`}
                        color="error"
                        size="small"
                      />
                    </>
                  );
                })()}
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ bgcolor: 'var(--color-bg-primary)', p: { xs: 1, sm: 3 } }}>
            <Table sx={{ 
              '& .MuiTableCell-root': { 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                padding: { xs: '8px', sm: '16px' }
              }
            }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'var(--color-text-primary)' }}>Élève</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-primary)' }}>Statut</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-primary)', display: { xs: 'none', sm: 'table-cell' } }}>Actions</TableCell>
                  <TableCell sx={{ color: 'var(--color-text-primary)', display: { xs: 'none', md: 'table-cell' } }}>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedSeance.presences
                  .sort((a, b) => `${a.eleve.nom} ${a.eleve.prenom}`.localeCompare(`${b.eleve.nom} ${b.eleve.prenom}`))
                  .map(presence => (
                  <TableRow key={presence.id}>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>
                      {(() => {
                        const originRR = selectedSeance.rrMap?.origin?.find(r => r.eleveId === presence.eleveId);
                        const destRR = selectedSeance.rrMap?.destination?.find(r => r.eleveId === presence.eleveId);
                        return (
                          <Typography variant="body2" sx={{ color: destRR ? '#1976d2' : originRR ? '#f57c00' : 'var(--color-text-primary)' }}>
                            {presence.eleve.prenom} {presence.eleve.nom}
                            {originRR && <span title="En attente RR" style={{ marginLeft: 8 }}>↑ en attente</span>}
                            {destRR && <span title="RR destination" style={{ marginLeft: 8 }}>↓ pas de status</span>}
                          </Typography>
                        );
                      })()}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>
                      <Chip
                        label={attendanceService.getStatusLabel(presence.statut)}
                        color={attendanceService.getStatusColor(presence.statut)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)', display: { xs: 'none', sm: 'table-cell' } }}>
                      <Box display="flex" gap={0.5} sx={{ flexWrap: 'wrap' }}>
                        <Tooltip title="Présent">
                          <IconButton
                            size="small"
                            color={presence.statut === 'present' ? 'success' : 'default'}
                            onClick={() => updateAttendance(presence.id, 'present')}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Absent">
                          <IconButton
                            size="small"
                            color={presence.statut === 'absent' ? 'error' : 'default'}
                            onClick={() => updateAttendance(presence.id, 'absent')}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="En attente">
                          <IconButton
                            size="small"
                            color={presence.statut === 'awaiting' ? 'warning' : 'default'}
                            onClick={() => updateAttendance(presence.id, 'awaiting')}
                          >
                            <Schedule />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Non défini">
                          <IconButton
                            size="small"
                            color={presence.statut === 'no_status' ? 'default' : 'default'}
                            onClick={() => updateAttendance(presence.id, 'no_status')}
                          >
                            <HelpOutline />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="RR">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const originRR = selectedSeance.rrMap?.origin?.find(r => r.eleveId === presence.eleveId);
                              const destRR = selectedSeance.rrMap?.destination?.find(r => r.eleveId === presence.eleveId);
                              if (originRR) return openRRModalForExisting(originRR.id, 'origin', originRR.destStatut);
                              if (destRR) return openRRModalForExisting(destRR.id, 'destination', destRR.destStatut);
                              return openRRModalPrefilled(selectedSeance.id, presence.eleveId);
                            }}
                          >
                            <ViewModule />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'var(--color-text-primary)', display: { xs: 'none', md: 'table-cell' } }}>
                      <TextField
                        size="small"
                        placeholder="Notes..."
                        defaultValue={presence.notes || ''}
                        onBlur={(e) => {
                          if (e.target.value !== presence.notes) {
                            updateAttendance(presence.id, presence.statut, e.target.value);
                          }
                        }}
                        sx={{ 
                          width: '150px',
                          '& .MuiInputBase-root': { bgcolor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' },
                          '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: 'var(--color-border-light)' },
                            '&:hover fieldset': { borderColor: 'var(--color-primary-500)' },
                            '&.Mui-focused fieldset': { borderColor: 'var(--color-primary-500)' }
                          }
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      )}
      {/* RR Modal */}
      <RRModal 
        open={isRRModalOpen} 
        onClose={() => setIsRRModalOpen(false)} 
        defaultOriginSeanceId={rrDefaults.originSeanceId} 
        defaultEleveId={rrDefaults.eleveId}
        readOnly={!!rrReadonlyInfo}
        existingInfo={rrReadonlyInfo}
      />
    </Container>
    </div>
  );
};

export default AttendanceView;
