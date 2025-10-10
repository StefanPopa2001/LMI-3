'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Autorenew,
  AddCircleOutline,
  Home
} from '@mui/icons-material';
import { StatusChip } from '@/ui/molecules/StatusChip';
import {
  attendanceService,
  type SeanceWithAttendance,
  type AttendanceUpdate
} from '@/services/attendanceService';
import { authService } from '@/services/authService';
import { settingsService } from '@/services/settingsService';
import eleveService, { Eleve } from '@/services/eleveService';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import RRModal from '@/components/ui/RRModal';
import EleveDetailsModal from '@/components/ui/EleveDetailsModal';
import LoadingOverlay from '@/ui/feedback/LoadingOverlay';
import GlobalLoadingToast from '@/ui/feedback/GlobalLoadingToast';

interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
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
  // Cache of weeks already fetched to avoid re-fetch / flicker
  const weekCache = useRef<Record<string, SeanceWithAttendance[]>>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedSeance, setSelectedSeance] = useState<SeanceWithAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleApiError = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err || 'Erreur inconnue');
    setError(message);
    // Handle auth problems centrally
    if (message === 'Unauthorized' || message.startsWith('AUTH_ERROR:')) {
      // Clear auth and redirect to login
      authService.logout();
      toast.error('Session expirée. Veuillez vous reconnecter.');
      router.push('/login');
      return;
    }
    toast.error(message);
  };
  const [updatingPresenceIds, setUpdatingPresenceIds] = useState<Set<number>>(new Set());
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isRRModalOpen, setIsRRModalOpen] = useState(false);
  const [rrDefaults, setRrDefaults] = useState<{ originSeanceId?: number; eleveId?: number } >({});
  const [rrReadonlyInfo, setRrReadonlyInfo] = useState<{ id: number; type: 'origin' | 'destination'; destStatut?: string } | null>(null);
  const [eleveDetailsId, setEleveDetailsId] = useState<number | null>(null);
  const [isEleveDetailsOpen, setIsEleveDetailsOpen] = useState(false);

  // Filter states
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [levelSettings, setLevelSettings] = useState<Setting[]>([]);
  const [typeCoursSettings, setTypeCoursSettings] = useState<Setting[]>([]);
  const [locationSettings, setLocationSettings] = useState<Setting[]>([]);
  const [salleSettings, setSalleSettings] = useState<Setting[]>([]);
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [availableWeekNumbers, setAvailableWeekNumbers] = useState<number[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [filterTeacher, setFilterTeacher] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterSalle, setFilterSalle] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterTypeCours, setFilterTypeCours] = useState<string>('');
  const [filterStudent, setFilterStudent] = useState<string>('');
  const [filterJourSemaine, setFilterJourSemaine] = useState<string>('');
  const [filterHeureDebut, setFilterHeureDebut] = useState<string>('');
  const [filterWeekNumber, setFilterWeekNumber] = useState<string>('');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart, viewMode]);

  const loadWeeklySeances = async () => {
    const startDateString = currentWeekStart.toISOString().split('T')[0];
    // Serve from cache instantly if available
    if (weekCache.current[startDateString]) {
      setSeances(weekCache.current[startDateString]);
      setIsInitialLoad(false);
      return;
    }
    setLoading(true);
    try {
      const weeklySeances = await attendanceService.getWeeklySeances(startDateString);
      // Store raw weekly seances (no enrichment) in cache
      weekCache.current[startDateString] = weeklySeances;
      setSeances(weeklySeances);
      extractAvailableHours(weeklySeances);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des séances';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const loadAllSeances = async () => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear + 1, 11, 31);
      const promises: Promise<SeanceWithAttendance[]>[] = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const startDateString = currentDate.toISOString().split('T')[0];
        promises.push(attendanceService.getWeeklySeances(startDateString));
        currentDate.setDate(currentDate.getDate() + 7);
      }
      const allWeeksSeances = await Promise.all(promises);
      const flatSeances = allWeeksSeances.flat();
      setAllSeances(flatSeances);
      extractAvailableHours(flatSeances);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des séances';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const extractAvailableHours = (seancesList: SeanceWithAttendance[]) => {
    const hours = new Set<string>();
    const weekNums = new Set<number>();
    seancesList.forEach(seance => {
      const time = attendanceService.formatTime(seance.dateHeure);
      hours.add(time);
      weekNums.add(seance.weekNumber ?? getWeekNumber(new Date(seance.dateHeure)));
    });
    setAvailableHours(Array.from(hours).sort());
    setAvailableWeekNumbers(Array.from(weekNums).sort((a,b)=>a-b));
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
      handleApiError(err);
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
      handleApiError(err);
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

  // Refresh helpers after RR changes
  const refreshAfterRRChange = async () => {
    // Decide which loader based on view mode
    if (viewMode === 'grid') {
      await loadAllSeances();
    } else {
      await loadWeeklySeances();
    }
    // If a seance dialog is open, refresh its details
    if (selectedSeance) {
      try {
        const fresh = await attendanceService.getSeanceAttendance(selectedSeance.id);
        setSelectedSeance(fresh as any);
      } catch { /* ignore */ }
    }
  };

  const handleRRCreated = async () => {
    await refreshAfterRRChange();
  };

  const handleRRDeleted = async (_info: { id: number }) => {
    await refreshAfterRRChange();
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

  const updateAttendance = async (presenceId: number, statut: 'present' | 'absent' | 'no_status' | 'awaiting', notes?: string) => {
    // Optimistic update: patch local state first
    setUpdatingPresenceIds(prev => new Set(prev).add(presenceId));
    const revertPayload: { seanceBackup?: SeanceWithAttendance; selectedBackup?: SeanceWithAttendance | null } = {};
    try {
      // Update selectedSeance optimistically
      if (selectedSeance) {
        revertPayload.selectedBackup = selectedSeance;
  const patchedPresences = selectedSeance.presences.map(p => p.id === presenceId ? { ...p, statut: statut as typeof p.statut, notes: notes ?? p.notes } : p);
        setSelectedSeance({ ...selectedSeance, presences: patchedPresences });
      }
      // Update seances & allSeances optimistically
      const patchSeanceArray = (arr: SeanceWithAttendance[], setFn: React.Dispatch<React.SetStateAction<SeanceWithAttendance[]>>) => {
        setFn(prev => prev.map(s => {
          const foundPresence = s.presences?.some(p => p.id === presenceId);
            if (!foundPresence) return s;
            const backup = revertPayload.seanceBackup ?? s; // capture first time
            if (!revertPayload.seanceBackup) revertPayload.seanceBackup = backup;
            return { ...s, presences: s.presences.map(p => p.id === presenceId ? { ...p, statut: statut as typeof p.statut, notes: notes ?? p.notes } : p) };
        }));
      };
      patchSeanceArray(seances, setSeances);
      patchSeanceArray(allSeances, setAllSeances);

      await attendanceService.updateAttendance(presenceId, statut, notes);
      setSuccess('Présence mise à jour');

      // Optionally refresh just the affected seance in background to sync rrMap / stats
      const affectedSeanceId = selectedSeance?.id || seances.find(s => s.presences.some(p => p.id === presenceId))?.id;
      if (affectedSeanceId) {
        attendanceService.getSeanceAttendance(affectedSeanceId).then(fresh => {
          setSeances(prev => prev.map(s => s.id === fresh.id ? fresh : s));
          setAllSeances(prev => prev.map(s => s.id === fresh.id ? fresh : s));
          if (selectedSeance?.id === fresh.id) setSelectedSeance(fresh);
        }).catch(() => {/* silent */});
      }
    } catch (err) {
      // Revert optimistic changes if failure
      if (revertPayload.seanceBackup) {
        setSeances(prev => prev.map(s => s.id === revertPayload.seanceBackup!.id ? revertPayload.seanceBackup! : s));
        setAllSeances(prev => prev.map(s => s.id === revertPayload.seanceBackup!.id ? revertPayload.seanceBackup! : s));
      }
      if (revertPayload.selectedBackup) {
        setSelectedSeance(revertPayload.selectedBackup);
      }
      handleApiError(err);
    } finally {
      setUpdatingPresenceIds(prev => { const n = new Set(prev); n.delete(presenceId); return n; });
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
    setFilterWeekNumber('');
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
    const matchesWeekNumber = filterWeekNumber === '' ||
      (seance.weekNumber ?? getWeekNumber(new Date(seance.dateHeure))).toString() === filterWeekNumber;
    
    return matchesSearch && matchesTeacher && matchesStudent && matchesJourSemaine && 
           matchesHeureDebut && matchesWeekNumber;
  });

  // Instead of early return, we use an overlay for better perceived speed

  return (
    <div style={{ position: 'relative' }}>
      <Container maxWidth="xl" sx={{ position: 'relative', py: { xs: 2, sm: 4 }, mt: 8, px: { xs: 2, sm: 3 } }}>
  {/* Full overlay only on the very first load so layout stays; after that use toast */}
  <LoadingOverlay active={loading && isInitialLoad} />
  <GlobalLoadingToast active={loading && !isInitialLoad} label={viewMode === 'grid' ? 'Chargement des séances...' : 'Mise à jour de la semaine...'} />
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
                      {student.prenom || ''} {student.nom}
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
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--color-text-secondary)' }}>Semaine</InputLabel>
                <Select
                  value={filterWeekNumber}
                  onChange={(e) => setFilterWeekNumber(e.target.value)}
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
                  {availableWeekNumbers.map(wn => (
                    <MenuItem key={wn} value={wn.toString()}>
                      Semaine {wn}
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
                                <Box>
                                  <Typography variant="body2" sx={{ 
                                    color: 'var(--color-text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
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
                                    color: 'var(--color-primary-400)',
                                    fontWeight: 600,
                                    mt: 0.25
                                  }}>
                                    Semaine {seance.weekNumber ?? getWeekNumber(new Date(seance.dateHeure))}
                                  </Typography>
                                </Box>
                                
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
                                {(() => {
                                  const destRRExtraIds = (seance.rrMap?.destination || [])
                                    .map(r => r.eleveId)
                                    .filter(id => !seance.classe.eleves.some(e => e.eleve.id === id));
                                  const extraPresences = seance.presences.filter(p => destRRExtraIds.includes(p.eleveId));
                                  const extraAsEleves = extraPresences.map(p => ({ eleve: p.eleve }));
                                  const combined = [...seance.classe.eleves, ...extraAsEleves];
                                  return (
                                    <Typography variant="caption" sx={{ 
                                      color: 'var(--color-text-secondary)',
                                      fontWeight: 'bold',
                                      mb: 1,
                                      display: 'block'
                                    }}>
                                      Élèves ({combined.length})
                                    </Typography>
                                  );
                                })()}
                                
                                <Box sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                                  {(() => {
                                    const destRRExtraIds = (seance.rrMap?.destination || [])
                                      .map(r => r.eleveId)
                                      .filter(id => !seance.classe.eleves.some(e => e.eleve.id === id));
                                    const extraPresences = seance.presences.filter(p => destRRExtraIds.includes(p.eleveId));
                                    const extraAsEleves = extraPresences.map(p => ({ eleve: p.eleve }));
                                    const combined = [...seance.classe.eleves, ...extraAsEleves]
                                      .sort((a,b) => `${a.eleve.nom} ${a.eleve.prenom || ''}`.localeCompare(`${b.eleve.nom} ${b.eleve.prenom || ''}`));
                                    return combined.map(eleveInClasse => {
                                    const presence = seance.presences?.find(p => p.eleveId === eleveInClasse.eleve.id);
                                    const status = presence?.statut || 'no_status';
                                    const originRR = seance.rrMap?.origin?.find(r => r.eleveId === eleveInClasse.eleve.id);
                                    const destRR = seance.rrMap?.destination?.find(r => r.eleveId === eleveInClasse.eleve.id);
                                    const rrType = originRR ? 'origin' : destRR ? 'destination' : null;
                                    const rowBg = rrType === 'origin'
                                      ? 'rgba(245, 124, 0, 0.12)'
                                      : rrType === 'destination'
                                        ? 'rgba(25, 118, 210, 0.12)'
                                        : 'var(--color-bg-primary)';
                                    const rowBorder = rrType === 'origin'
                                      ? '1px solid rgba(245,124,0,0.4)'
                                      : rrType === 'destination'
                                        ? '1px solid rgba(25,118,210,0.4)'
                                        : '1px solid var(--color-border-light)';
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
                                          bgcolor: rowBg,
                                          borderRadius: 1,
                                          border: rowBorder,
                                          transition: 'background-color 0.2s ease'
                                        }}
                                      >
                                        <Typography variant="caption" sx={{
                                          color: destRR ? '#1976d2' : originRR ? '#f57c00' : 'var(--color-text-primary)',
                                          fontSize: '0.75rem',
                                          flex: 1,
                                          textOverflow: 'ellipsis',
                                          overflow: 'hidden',
                                          whiteSpace: 'nowrap',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 0.5
                                        }}>
                                          <IconButton
                                            size="small"
                                            onClick={(e)=>{ e.stopPropagation(); setEleveDetailsId(eleveInClasse.eleve.id); setIsEleveDetailsOpen(true); }}
                                            sx={{ p: 0.3, color: 'var(--color-text-secondary)' }}
                                          >
                                            <Search sx={{ fontSize: '0.9rem' }} />
                                          </IconButton>
                                          {eleveInClasse.eleve.prenom || ''} {eleveInClasse.eleve.nom}
                                          {originRR && <StatusChip size="small" label="RR o" variant="originRR" />}
                                          {destRR && <StatusChip size="small" label="RR d" variant="destRR" />}
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
                                            disabled={!!presence && updatingPresenceIds.has(presence.id)}
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
                                            disabled={!!presence && updatingPresenceIds.has(presence.id)}
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
                                            disabled={!!presence && updatingPresenceIds.has(presence.id)}
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
                                            disabled={!!presence && updatingPresenceIds.has(presence.id)}
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
                                  });
                                  })()}
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
                          mb: 0.25
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
                          color: 'var(--color-primary-400)',
                          fontWeight: 600,
                          mb: 0.5
                        }}>
                          Semaine {seance.weekNumber ?? getWeekNumber(new Date(seance.dateHeure))}
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
                        {(() => {
                          const destRRExtraIds = (seance.rrMap?.destination || [])
                            .map(r => r.eleveId)
                            .filter(id => !seance.classe.eleves.some(e => e.eleve.id === id));
                          const extraPresences = seance.presences.filter(p => destRRExtraIds.includes(p.eleveId));
                          const extraAsEleves = extraPresences.map(p => ({ eleve: p.eleve }));
                          const combined = [...seance.classe.eleves, ...extraAsEleves]
                            .sort((a,b) => `${a.eleve.nom} ${a.eleve.prenom}`.localeCompare(`${b.eleve.nom} ${b.eleve.prenom}`));
                          return (
                            <Typography variant="caption" sx={{ 
                              color: 'var(--color-text-secondary)',
                              fontWeight: 'bold',
                              mb: 1,
                              display: 'block'
                            }}>
                              Élèves ({combined.length})
                            </Typography>
                          );
                        })()}
                        
                        <Box sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {(() => {
                            const destRRExtraIds = (seance.rrMap?.destination || [])
                              .map(r => r.eleveId)
                              .filter(id => !seance.classe.eleves.some(e => e.eleve.id === id));
                            const extraPresences = seance.presences.filter(p => destRRExtraIds.includes(p.eleveId));
                            const extraAsEleves = extraPresences.map(p => ({ eleve: p.eleve }));
                            const combined = [...seance.classe.eleves, ...extraAsEleves]
                              .sort((a,b) => `${a.eleve.nom} ${a.eleve.prenom || ''}`.localeCompare(`${b.eleve.nom} ${b.eleve.prenom || ''}`));
                            return combined.map(eleveInClasse => {
                            const presence = seance.presences?.find(p => p.eleveId === eleveInClasse.eleve.id);
                            const status = presence?.statut || 'no_status';
                            const originRR = seance.rrMap?.origin?.find(r => r.eleveId === eleveInClasse.eleve.id);
                            const destRR = seance.rrMap?.destination?.find(r => r.eleveId === eleveInClasse.eleve.id);
                            const rrType = originRR ? 'origin' : destRR ? 'destination' : null;
                            const rowBg = rrType === 'origin'
                              ? 'rgba(245, 124, 0, 0.12)'
                              : rrType === 'destination'
                                ? 'rgba(25, 118, 210, 0.12)'
                                : 'var(--color-bg-primary)';
                            const rowBorder = rrType === 'origin'
                              ? '1px solid rgba(245,124,0,0.4)'
                              : rrType === 'destination'
                                ? '1px solid rgba(25,118,210,0.4)'
                                : '1px solid var(--color-border-light)';
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
                                  bgcolor: rowBg,
                                  borderRadius: 1,
                                  border: rowBorder,
                                  transition: 'background-color 0.2s ease'
                                }}
                              >
                                <Typography variant="caption" sx={{
                                  color: destRR ? '#1976d2' : originRR ? '#f57c00' : 'var(--color-text-primary)',
                                  fontSize: '0.75rem',
                                  flex: 1,
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5
                                }}>
                                  {eleveInClasse.eleve.prenom || ''} {eleveInClasse.eleve.nom}
                                  {originRR && <StatusChip size="small" label="RR o" variant="originRR" />}
                                  {destRR && <StatusChip size="small" label="RR d" variant="destRR" />}
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
                                    disabled={!!presence && updatingPresenceIds.has(presence.id)}
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
                                    disabled={!!presence && updatingPresenceIds.has(presence.id)}
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
                                    disabled={!!presence && updatingPresenceIds.has(presence.id)}
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
                                    disabled={!!presence && updatingPresenceIds.has(presence.id)}
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
                          });
                          })()}
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
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedSeance.classe.nom}
                  </Typography>
                  <Box sx={{
                    px: 1.4,
                    py: 0.4,
                    borderRadius: 1,
                    background: 'linear-gradient(90deg, var(--color-primary-600), var(--color-primary-400))',
                    color: 'var(--color-text-on-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    boxShadow: 2
                  }}>
                    Semaine {selectedSeance.weekNumber ?? getWeekNumber(new Date(selectedSeance.dateHeure))}
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
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
                {(() => {
                  // Build combined list so synthetic RR destination students (already in presences with negative id) are included & sorted
                  const list = [...selectedSeance.presences]
                    .sort((a, b) => `${a.eleve.nom} ${a.eleve.prenom || ''}`.localeCompare(`${b.eleve.nom} ${b.eleve.prenom || ''}`));
                  return list.map(presence => {
                    const originRR = selectedSeance.rrMap?.origin?.find(r => r.eleveId === presence.eleveId);
                    const destRR = selectedSeance.rrMap?.destination?.find(r => r.eleveId === presence.eleveId);
                    const rrType = originRR ? 'origin' : destRR ? 'destination' : null;
                    const rowBg = rrType === 'origin' 
                      ? 'rgba(245, 124, 0, 0.12)' /* amber highlight */
                      : rrType === 'destination' 
                        ? 'rgba(25, 118, 210, 0.12)' /* blue highlight */
                        : 'transparent';
                    const rowBorderColor = rrType === 'origin' 
                      ? 'rgba(245, 124, 0, 0.4)' 
                      : rrType === 'destination' 
                        ? 'rgba(25, 118, 210, 0.4)' 
                        : 'var(--color-border-light)';
                    return (
                      <TableRow 
                        key={presence.id}
                        sx={{
                          backgroundColor: rowBg,
                          '&:hover': { backgroundColor: rowBg || 'var(--color-bg-tertiary)' },
                          borderLeft: rrType ? `4px solid ${rowBorderColor}` : undefined,
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                    <TableCell sx={{ color: 'var(--color-text-primary)' }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton
                          size="small"
                          onClick={(e)=>{ e.stopPropagation(); setEleveDetailsId(presence.eleveId); setIsEleveDetailsOpen(true); }}
                          sx={{ p: 0.4, color: 'var(--color-text-secondary)' }}
                        >
                          <Search sx={{ fontSize: '1rem' }} />
                        </IconButton>
                        <Typography variant="body2" sx={{ color: destRR ? '#1976d2' : originRR ? '#f57c00' : 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 1 }}>
                          {presence.eleve.prenom || ''} {presence.eleve.nom}
                          {originRR && <StatusChip size="small" label="RR origine" variant="originRR" />}
                          {destRR && <StatusChip size="small" label="RR destin." variant="destRR" />}
                        </Typography>
                      </Box>
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
                            disabled={updatingPresenceIds.has(presence.id)}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Absent">
                          <IconButton
                            size="small"
                            color={presence.statut === 'absent' ? 'error' : 'default'}
                            onClick={() => updateAttendance(presence.id, 'absent')}
                            disabled={updatingPresenceIds.has(presence.id)}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="En attente">
                          <IconButton
                            size="small"
                            color={presence.statut === 'awaiting' ? 'warning' : 'default'}
                            onClick={() => updateAttendance(presence.id, 'awaiting')}
                            disabled={updatingPresenceIds.has(presence.id)}
                          >
                            <Schedule />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Non défini">
                          <IconButton
                            size="small"
                            color={presence.statut === 'no_status' ? 'default' : 'default'}
                            onClick={() => updateAttendance(presence.id, 'no_status')}
                            disabled={updatingPresenceIds.has(presence.id)}
                          >
                            <HelpOutline />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={originRR || destRR ? 'Voir / Supprimer RR' : 'Créer RR'}>
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
                            {(() => {
                              const originRR = selectedSeance.rrMap?.origin?.find(r => r.eleveId === presence.eleveId);
                              const destRR = selectedSeance.rrMap?.destination?.find(r => r.eleveId === presence.eleveId);
                              if (originRR || destRR) return <Autorenew color="primary" />;
                              return <AddCircleOutline />;
                            })()}
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
                    );
                  });
                })()}
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
        onCreated={handleRRCreated}
        onDeleted={handleRRDeleted}
      />
      <EleveDetailsModal
        open={isEleveDetailsOpen}
        eleveId={eleveDetailsId}
        onClose={() => { setIsEleveDetailsOpen(false); setEleveDetailsId(null); }}
      />
    </Container>
    </div>
  );
};

export default AttendanceView;
