'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Container,
  Paper,
  IconButton,
  Autocomplete,
  Collapse
} from '@mui/material';
import { 
  Add as Plus, 
  Edit, 
  Delete as Trash2, 
  Event as Calendar, 
  People as Users, 
  Schedule as Clock, 
  School as BookOpen,
  Search,
  ArrowBack,
  ExpandMore,
  ExpandLess,
  Grade as LevelIcon,
  Category as TypeIcon,
  LocationOn as LocationIcon,
  MeetingRoom as RoomIcon,
  Person as TeacherIcon
} from '@mui/icons-material';
import { 
  classService, 
  type Classe, 
  type CreateClasseData, 
  type UpdateClasseData,
  type CreateSeanceData,
  type UpdateSeanceData,
  type GenerateSeancesData,
  type Teacher,
  type Seance
} from '@/services/classService';
import { settingsService, type Setting } from '@/services/settingsService';
import eleveService, { type Eleve } from '@/services/eleveService';
import authService from '@/services/authService';
import attendanceService from '@/services/attendanceService';
import { toast } from 'react-toastify';

interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ClassesView: React.FC = () => {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [selectedClass, setSelectedClass] = useState<Classe | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSeanceDialogOpen, setIsSeanceDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedSeance, setSelectedSeance] = useState<Seance | null>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [tabValue, setTabValue] = useState(1);
  const [isStudentsListExpanded, setIsStudentsListExpanded] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  // Filter states
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
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form states
  const [classForm, setClassForm] = useState<CreateClasseData>({
    nom: '',
    description: '',
    level: '',
    typeCours: '',
    location: '',
    salle: '',
    teacherId: 0,
    dureeSeance: 60,
    semainesSeances: [],
    jourSemaine: 1, // Default to Monday
  heureDebut: '09:00', // Default to 9:00
  rrPossibles: false,
    isRecuperation: false,
    eleveIds: []
  });

  const [seanceForm, setSeanceForm] = useState<CreateSeanceData>({
    dateHeure: '',
    duree: 60,
    notes: '',
    weekNumber: undefined,
    presentTeacherId: undefined,
    rrPossibles: undefined
  });

  const [generateForm, setGenerateForm] = useState<GenerateSeancesData>({
    annee: new Date().getFullYear(),
    jourSemaine: 1,
    heureDebut: '09:00',
    dureeSeance: 60,
    nombreSemaines: 10
  });

  const [editingSeance, setEditingSeance] = useState<Seance | null>(null);
  const [weekNumbers, setWeekNumbers] = useState<string>('');
  const [nextYearWeekNumbers, setNextYearWeekNumbers] = useState<string>('');

  // Settings state
  const [levelSettings, setLevelSettings] = useState<Setting[]>([]);
  const [typeCoursSettings, setTypeCoursSettings] = useState<Setting[]>([]);
  const [locationSettings, setLocationSettings] = useState<Setting[]>([]);
  const [salleSettings, setSalleSettings] = useState<Setting[]>([]);
  const [uniqueStartTimes, setUniqueStartTimes] = useState<string[]>([]);

  // Helper to validate 24h time strings HH:MM
  const isValid24Hour = (t?: string): boolean => typeof t === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);

  useEffect(() => {
    loadData();
  }, []);

  // Update unique start times when classes change
  useEffect(() => {
    const startTimes = [...new Set(classes
      .map(classe => classe.heureDebut)
      .filter((time): time is string => time !== undefined && time.trim() !== '')
      .sort()
    )];
    setUniqueStartTimes(startTimes);
  }, [classes]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [classesData, teachersData, studentsData, levelData, typeCoursData, locationData, salleData] = await Promise.all([
        classService.getAllClasses(),
        authService.getAllUsers(),
        eleveService.getAllEleves(),
        settingsService.getSettingsByCategory('level'),
        settingsService.getSettingsByCategory('typeCours'),
        settingsService.getSettingsByCategory('location'),
        settingsService.getSettingsByCategory('salle')
      ]);
      setClasses(classesData);
      setTeachers(teachersData);
      setStudents(studentsData);
      setLevelSettings(levelData);
      setTypeCoursSettings(typeCoursData);
      setLocationSettings(locationData);
      setSalleSettings(salleData);
      
      // Extract unique start times from classes
      const startTimes = [...new Set(classesData
        .map(classe => classe.heureDebut)
        .filter((time): time is string => time !== undefined && time.trim() !== '')
        .sort()
      )];
      setUniqueStartTimes(startTimes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    // validate heureDebut
    if (!isValid24Hour(classForm.heureDebut)) {
      toast.error('Heure de début invalide. Format attendu HH:MM (24h)');
      return;
    }

    try {
      const currentYearWeeks = weekNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 52);
      const nextYearWeeks = nextYearWeekNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 52);
      
      // Validate that we have valid weeks
      if (currentYearWeeks.length === 0 && nextYearWeeks.length === 0) {
        toast.error('Veuillez saisir au moins un numéro de semaine valide');
        return;
      }
      
      // Check for duplicates
      const allWeeks = [...currentYearWeeks, ...nextYearWeeks.map(week => week + 52)];
      const uniqueWeeks = [...new Set(allWeeks)];
      if (uniqueWeeks.length !== allWeeks.length) {
        toast.error('Des numéros de semaine sont dupliqués');
        return;
      }
      
      // Convert next year weeks to absolute week numbers (add 52)
      const nextYearAbsoluteWeeks = nextYearWeeks.map(week => week + 52);
      const finalWeeks = [...currentYearWeeks, ...nextYearAbsoluteWeeks];
      
      const classData = { ...classForm, semainesSeances: finalWeeks };
      
      const created = await classService.createClass(classData);
      // Persist defaults after successful creation
      persistClassDefaults({
        jourSemaine: classForm.jourSemaine,
        heureDebut: classForm.heureDebut,
        dureeSeance: classForm.dureeSeance as number,
        weekNumbers,
        nextYearWeekNumbers
      });
      // Auto-generate seances based on provided weeks
      try {
        await classService.generateSeances(created.class.id, {
          annee: new Date().getFullYear(),
          jourSemaine: classForm.jourSemaine || 1,
          heureDebut: classForm.heureDebut || '09:00',
          dureeSeance: classForm.dureeSeance as number,
          nombreSemaines: 10
        });
        toast.success('Classe créée et séances générées avec succès');
      } catch (genErr) {
        console.warn('Auto-generation failed:', genErr);
        toast.success('Classe créée avec succès (génération des séances à faire)');
      }
      setIsCreateDialogOpen(false);
      resetClassForm();
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de la classe');
    }
  };

  const handleUpdateClass = async () => {
    if (!selectedClass) return;
    // validate heureDebut
    if (!isValid24Hour(classForm.heureDebut)) {
      toast.error('Heure de début invalide. Format attendu HH:MM (24h)');
      return;
    }

    try {
      const currentYearWeeks = weekNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 52);
      const nextYearWeeks = nextYearWeekNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 52);
      
      // Validate that we have valid weeks
      if (currentYearWeeks.length === 0 && nextYearWeeks.length === 0) {
        toast.error('Veuillez saisir au moins un numéro de semaine valide');
        return;
      }
      
      // Check for duplicates
      const allWeeks = [...currentYearWeeks, ...nextYearWeeks.map(week => week + 52)];
      const uniqueWeeks = [...new Set(allWeeks)];
      if (uniqueWeeks.length !== allWeeks.length) {
        toast.error('Des numéros de semaine sont dupliqués');
        return;
      }
      
      // Convert next year weeks to absolute week numbers (add 52)
      const nextYearAbsoluteWeeks = nextYearWeeks.map(week => week + 52);
      const finalWeeks = [...currentYearWeeks, ...nextYearAbsoluteWeeks];
      
      const updateData = { ...classForm, semainesSeances: finalWeeks };
      
  await classService.updateClass(selectedClass.id, updateData);
  toast.success('Classe mise à jour avec succès');
      setIsEditDialogOpen(false);
      resetClassForm();
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la classe');
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) return;
    
    try {
      await classService.deleteClass(id);
      toast.success('Classe supprimée avec succès');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression de la classe');
    }
  };

  const handleCreateSeance = async () => {
    if (!selectedClass) return;
    
    try {
      await classService.createSeance(selectedClass.id, seanceForm);
      toast.success('Séance créée avec succès');
      setIsSeanceDialogOpen(false);
      resetSeanceForm();
      loadClassDetails(selectedClass.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de la séance');
    }
  };

  const handleUpdateSeance = async () => {
    if (!editingSeance) return;
    
    try {
      const updateData: UpdateSeanceData = {
        dateHeure: seanceForm.dateHeure,
        duree: seanceForm.duree,
  notes: seanceForm.notes,
  weekNumber: seanceForm.weekNumber,
  presentTeacherId: seanceForm.presentTeacherId,
  rrPossibles: seanceForm.rrPossibles
      };
      
      await classService.updateSeance(editingSeance.id, updateData);
      toast.success('Séance mise à jour avec succès');
      setIsSeanceDialogOpen(false);
      setEditingSeance(null);
      resetSeanceForm();
      if (selectedClass) {
        loadClassDetails(selectedClass.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la séance');
    }
  };

  const handleDeleteSeance = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) return;
    
    try {
      await classService.deleteSeance(id);
      toast.success('Séance supprimée avec succès');
      if (selectedClass) {
        loadClassDetails(selectedClass.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression de la séance');
    }
  };

  const handleUpdatePresence = async (seanceId: number, eleveId: number, statut: string) => {
    try {
      // First get the seance attendance to find the presence record
      const seanceAttendance = await attendanceService.getSeanceAttendance(seanceId);
      const presence = seanceAttendance.presences.find((p: any) => p.eleveId === eleveId);
      
      if (presence) {
        // Update existing presence
        await attendanceService.updateAttendance(
          presence.id, 
          statut
        );
      } else {
        // Create new presence record using bulk update
        await attendanceService.bulkUpdateAttendance(seanceId, [{
          eleveId,
          statut: statut as 'present' | 'absent' | 'awaiting' | 'no_status'
        }]);
      }
      
      // Refresh attendance data
      if (selectedSeance) {
        const updatedAttendance = await attendanceService.getSeanceAttendance(seanceId);
        setAttendanceData(updatedAttendance);
      }
      
      toast.success('Présence mise à jour avec succès');
      if (selectedClass) {
        loadClassDetails(selectedClass.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la présence');
    }
  };

  const handleGenerateSeances = async () => {
    if (!selectedClass) return;
    // validate heureDebut for generate form
    if (!isValid24Hour(generateForm.heureDebut)) {
      toast.error('Heure de début invalide. Format attendu HH:MM (24h)');
      return;
    }

    try {
      const result = await classService.generateSeances(selectedClass.id, generateForm);
      toast.success(`${result.count} séances générées avec succès`);
      setIsGenerateDialogOpen(false);
      loadClassDetails(selectedClass.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la génération des séances');
    }
  };

  const loadClassDetails = async (classId: number) => {
    try {
      const classData = await classService.getClass(classId);
      setSelectedClass(classData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement des détails de la classe');
    }
  };

  const openEditDialog = (classe: Classe) => {
    setSelectedClass(classe);
    const allWeeks = classService.parseWeekNumbers(classe.semainesSeances);
    
    // Separate weeks by year: weeks 1-52 = current year, weeks 53+ = next year (convert back to 1-52)
    const currentYearWeeks = allWeeks.filter(week => week >= 1 && week <= 52);
    const nextYearAbsoluteWeeks = allWeeks.filter(week => week > 52);
    const nextYearRelativeWeeks = nextYearAbsoluteWeeks.map(week => week - 52);
    
    setClassForm({
      nom: classe.nom,
      description: classe.description || '',
      level: classe.level || '',
      typeCours: classe.typeCours || '',
      location: classe.location || '',
      salle: classe.salle || '',
      teacherId: classe.teacherId,
      dureeSeance: classe.dureeSeance,
      semainesSeances: allWeeks,
      jourSemaine: classe.jourSemaine || 1,
      heureDebut: classe.heureDebut || '09:00',
      rrPossibles: !!classe.rrPossibles,
      isRecuperation: !!classe.isRecuperation,
      eleveIds: classe.eleves.map(e => e.eleve.id)
    });
    
    setWeekNumbers(currentYearWeeks.join(', '));
    setNextYearWeekNumbers(nextYearRelativeWeeks.join(', '));
    setIsEditDialogOpen(true);
  };

  const openSeanceDialog = (classe: Classe, seance?: Seance) => {
    setSelectedClass(classe);
  if (seance) {
      setEditingSeance(seance);
      setSeanceForm({
        dateHeure: new Date(seance.dateHeure).toISOString().slice(0, 16),
        duree: seance.duree,
    notes: seance.notes || '',
    weekNumber: seance.weekNumber,
    presentTeacherId: seance.presentTeacherId ?? undefined,
    rrPossibles: seance.rrPossibles
      });
    } else {
      setEditingSeance(null);
      setSeanceForm({
        dateHeure: '',
    duree: classe.dureeSeance,
    notes: '',
    weekNumber: undefined,
    presentTeacherId: classe.teacherId,
    rrPossibles: classe.rrPossibles
      });
    }
    setIsSeanceDialogOpen(true);
  };

  const openGenerateSeancesDialog = (classe: Classe) => {
    setSelectedClass(classe);
    setGenerateForm({
      annee: new Date().getFullYear(),
      jourSemaine: classe.jourSemaine || 1,
      heureDebut: classe.heureDebut || '09:00',
      dureeSeance: classe.dureeSeance || 60,
      nombreSemaines: 10
    });
    setIsGenerateDialogOpen(true);
  };

  const openAttendanceModal = async (seance: Seance) => {
    setSelectedSeance(seance);
    try {
      const attendance = await attendanceService.getSeanceAttendance(seance.id);
      setAttendanceData(attendance);
    } catch (err) {
      toast.error('Erreur lors du chargement des données de présence');
      setAttendanceData(null);
    }
    setIsAttendanceModalOpen(true);
  };

  const resetClassForm = () => {
    setClassForm({
      nom: '',
      description: '',
      level: '',
      typeCours: '',
      location: '',
      salle: '',
      teacherId: 0,
      dureeSeance: 60,
      semainesSeances: [],
      jourSemaine: 1,
      heureDebut: '09:00',
  rrPossibles: false,
      isRecuperation: false,
      eleveIds: []
    });
    setWeekNumbers('');
    setNextYearWeekNumbers('');
    setSelectedClass(null);
  };

  const resetSeanceForm = () => {
    setSeanceForm({
      dateHeure: '',
  duree: 60,
  notes: '',
  weekNumber: undefined,
  presentTeacherId: undefined,
  rrPossibles: undefined
    });
    setEditingSeance(null);
  };

  const toggleStudentSelection = (studentId: number) => {
    setClassForm(prev => ({
      ...prev,
      eleveIds: prev.eleveIds?.includes(studentId)
        ? prev.eleveIds.filter(id => id !== studentId)
        : [...(prev.eleveIds || []), studentId]
    }));
  };

  const toggleCardExpansion = (classId: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const CLASS_FORM_STORAGE_KEY = 'classFormDefaultsV1';

  // Load defaults on mount or when opening create dialog
  useEffect(() => {
    if (isCreateDialogOpen) {
      try {
        const raw = localStorage.getItem(CLASS_FORM_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setClassForm(prev => ({
            ...prev,
            jourSemaine: saved.jourSemaine ?? prev.jourSemaine,
            heureDebut: saved.heureDebut ?? prev.heureDebut,
            dureeSeance: saved.dureeSeance ?? prev.dureeSeance,
            // weeks are entered via weekNumbers / nextYearWeekNumbers text fields
          }));
          if (saved.weekNumbers !== undefined) setWeekNumbers(saved.weekNumbers);
          if (saved.nextYearWeekNumbers !== undefined) setNextYearWeekNumbers(saved.nextYearWeekNumbers);
        }
      } catch {}
    }
  }, [isCreateDialogOpen]);

  // Persist after successful create
  const persistClassDefaults = (data: { jourSemaine?: number; heureDebut?: string; dureeSeance?: number; weekNumbers?: string; nextYearWeekNumbers?: string; }) => {
    const toStore = {
      jourSemaine: data.jourSemaine ?? classForm.jourSemaine,
      heureDebut: data.heureDebut ?? classForm.heureDebut,
      dureeSeance: data.dureeSeance ?? classForm.dureeSeance,
      weekNumbers: data.weekNumbers ?? weekNumbers,
      nextYearWeekNumbers: data.nextYearWeekNumbers ?? nextYearWeekNumbers
    };
    try { localStorage.setItem(CLASS_FORM_STORAGE_KEY, JSON.stringify(toStore)); } catch {}
  };

  if (loading) {
    return (
      <Container sx={{ mt: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography variant="h6">Chargement...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, mt: 8 }}>
      {/* Header */}
      <Box display="flex" justifyContent="center" alignItems="center" mb={4}>
        <Typography variant="h1" component="h1" sx={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
          Gestion des classes
        </Typography>
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
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: 'var(--color-text-primary)'
              }}
            >
              Filtres de recherche
            </Typography>
            {(searchTerm || filterTeacher || filterLocation || filterSalle || filterLevel || filterTypeCours || filterStudent || filterJourSemaine || filterHeureDebut || statusFilter !== 'all') && (
              <Chip
                label={`${[
                  searchTerm && 'Nom',
                  filterTeacher && 'Enseignant',
                  filterLocation && 'Lieu',
                  filterSalle && 'Salle',
                  filterLevel && 'Niveau',
                  filterTypeCours && 'Type',
                  filterStudent && 'Élève',
                  filterJourSemaine && 'Jour',
                  filterHeureDebut && 'Heure',
                  statusFilter !== 'all' && 'Statut'
                ].filter(Boolean).length} filtre(s) actif(s)`}
                size="small"
                sx={{
                  backgroundColor: 'var(--color-primary-500)',
                  color: 'var(--color-text-primary)',
                  '& .MuiChip-label': {
                    color: 'var(--color-text-primary)'
                  }
                }}
              />
            )}
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ minWidth: '250px', flex: '1 1 auto' }}>
                <TextField
                  fullWidth
                  placeholder="Rechercher par nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ color: 'var(--color-text-secondary)', mr: 1 }} />
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      '& fieldset': {
                        borderColor: 'var(--color-border-light)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--color-primary-400)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: 'var(--color-text-secondary)',
                      '&.Mui-focused': {
                        color: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiInputBase-input': {
                      color: 'var(--color-text-primary)'
                    }
                  }}
                />
              </Box>

              <Box sx={{ minWidth: '200px', flex: '1 1 auto' }}>
                <FormControl
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'var(--color-text-secondary)',
                      '&.Mui-focused': {
                        color: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      '& fieldset': {
                        borderColor: 'var(--color-border-light)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--color-primary-400)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiSelect-select': {
                      color: 'var(--color-text-primary)'
                    },
                    '& .MuiMenuItem-root': {
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                      '&:hover': {
                        backgroundColor: 'var(--color-bg-tertiary)'
                      }
                    }
                  }}
                >
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Statut"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">Toutes les classes</MenuItem>
                    <MenuItem value="active">Classes actives</MenuItem>
                    <MenuItem value="upcoming">Classes à venir</MenuItem>
                    <MenuItem value="completed">Classes terminées</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: '200px', flex: '1 1 auto' }}>
                <FormControl
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'var(--color-text-secondary)',
                      '&.Mui-focused': {
                        color: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      '& fieldset': {
                        borderColor: 'var(--color-border-light)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--color-primary-400)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiSelect-select': {
                      color: 'var(--color-text-primary)'
                    }
                  }}
                >
                  <InputLabel>Enseignant</InputLabel>
                  <Select
                    value={filterTeacher}
                    label="Enseignant"
                    onChange={(e) => setFilterTeacher(e.target.value)}
                  >
                    <MenuItem
                      value=""
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Tous les enseignants
                    </MenuItem>
                    {teachers.map(teacher => (
                      <MenuItem
                        key={teacher.id}
                        value={teacher.id.toString()}
                        sx={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                          '&:hover': {
                            backgroundColor: 'var(--color-bg-tertiary)'
                          }
                        }}
                      >
                        {teacher.prenom} {teacher.nom}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: '200px', flex: '1 1 auto' }}>
                <FormControl
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'var(--color-text-secondary)',
                      '&.Mui-focused': {
                        color: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      '& fieldset': {
                        borderColor: 'var(--color-border-light)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--color-primary-400)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiSelect-select': {
                      color: 'var(--color-text-primary)'
                    }
                  }}
                >
                  <InputLabel>Lieu</InputLabel>
                  <Select
                    value={filterLocation}
                    label="Lieu"
                    onChange={(e) => setFilterLocation(e.target.value)}
                  >
                    <MenuItem
                      value=""
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Tous les lieux
                    </MenuItem>
                    {locationSettings.filter(setting => setting.active).map(setting => (
                      <MenuItem
                        key={setting.id}
                        value={setting.value}
                        sx={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                          '&:hover': {
                            backgroundColor: 'var(--color-bg-tertiary)'
                          }
                        }}
                      >
                        {setting.label || setting.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: '200px', flex: '1 1 auto' }}>
                <FormControl
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'var(--color-text-secondary)',
                      '&.Mui-focused': {
                        color: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      '& fieldset': {
                        borderColor: 'var(--color-border-light)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--color-primary-400)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiSelect-select': {
                      color: 'var(--color-text-primary)'
                    }
                  }}
                >
                  <InputLabel>Salle</InputLabel>
                  <Select
                    value={filterSalle}
                    label="Salle"
                    onChange={(e) => setFilterSalle(e.target.value)}
                  >
                    <MenuItem
                      value=""
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Toutes les salles
                    </MenuItem>
                    {salleSettings.filter(setting => setting.active).map(setting => (
                      <MenuItem
                        key={setting.id}
                        value={setting.value}
                        sx={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                          '&:hover': {
                            backgroundColor: 'var(--color-bg-tertiary)'
                          }
                        }}
                      >
                        {setting.label || setting.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: '200px', flex: '1 1 auto' }}>
                <FormControl
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'var(--color-text-secondary)',
                      '&.Mui-focused': {
                        color: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      '& fieldset': {
                        borderColor: 'var(--color-border-light)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--color-primary-400)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiSelect-select': {
                      color: 'var(--color-text-primary)'
                    }
                  }}
                >
                  <InputLabel>Niveau</InputLabel>
                  <Select
                    value={filterLevel}
                    label="Niveau"
                    onChange={(e) => setFilterLevel(e.target.value)}
                  >
                    <MenuItem
                      value=""
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Tous les niveaux
                    </MenuItem>
                    {levelSettings.filter(setting => setting.active).map(setting => (
                      <MenuItem
                        key={setting.id}
                        value={setting.value}
                        sx={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                          '&:hover': {
                            backgroundColor: 'var(--color-bg-tertiary)'
                          }
                        }}
                      >
                        {setting.label || setting.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: '200px', flex: '1 1 auto' }}>
                <FormControl 
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'var(--color-text-secondary)',
                      '&.Mui-focused': {
                        color: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'var(--color-bg-secondary)',
                      '& fieldset': {
                        borderColor: 'var(--color-border-light)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--color-primary-400)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiSelect-select': {
                      color: 'var(--color-text-primary)'
                    }
                  }}
                >
                  <InputLabel>Type de cours</InputLabel>
                  <Select
                    value={filterTypeCours}
                    label="Type de cours"
                    onChange={(e) => setFilterTypeCours(e.target.value)}
                  >
                    <MenuItem
                      value=""
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Tous les types
                    </MenuItem>
                    {typeCoursSettings.filter(setting => setting.active).map(setting => (
                      <MenuItem
                        key={setting.id}
                        value={setting.value}
                        sx={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                          '&:hover': {
                            backgroundColor: 'var(--color-bg-tertiary)'
                          }
                        }}
                      >
                        {setting.label || setting.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: '250px', flex: '1 1 auto' }}>
                <Autocomplete
                  fullWidth
                  options={students}
                  getOptionLabel={(option) => `${option.prenom} ${option.nom}`}
                  getOptionKey={(option) => option.id}
                  value={students.find(s => s.id.toString() === filterStudent) || null}
                  onChange={(event, newValue) => {
                    setFilterStudent(newValue ? newValue.id.toString() : '');
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Élève spécifique" 
                      placeholder="Rechercher un élève..."
                      sx={{
                        '& .MuiInputLabel-root': {
                          color: 'var(--color-text-secondary)',
                          '&.Mui-focused': {
                            color: 'var(--color-primary-500)'
                          }
                        },
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'var(--color-bg-secondary)',
                          '& fieldset': {
                            borderColor: 'var(--color-border-light)'
                          },
                          '&:hover fieldset': {
                            borderColor: 'var(--color-primary-400)'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'var(--color-primary-500)'
                          }
                        },
                        '& .MuiInputBase-input': {
                          color: 'var(--color-text-primary)'
                        }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-popupIndicator': {
                      color: 'var(--color-text-secondary)'
                    },
                    '& .MuiAutocomplete-clearIndicator': {
                      color: 'var(--color-text-secondary)'
                    },
                    '& .MuiAutocomplete-listbox': {
                      backgroundColor: 'var(--color-bg-secondary)',
                      '& .MuiAutocomplete-option': {
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        },
                        '&[aria-selected="true"]': {
                          backgroundColor: 'var(--color-primary-100)',
                          color: 'var(--color-primary-700)'
                        }
                      }
                    }
                  }}
                />
              </Box>

              <Box sx={{ minWidth: '200px', flex: '1 1 auto' }}>
                <FormControl
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'var(--color-text-secondary)',
                      '&.Mui-focused': {
                        color: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      '& fieldset': {
                        borderColor: 'var(--color-border-light)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--color-primary-400)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiSelect-select': {
                      color: 'var(--color-text-primary)'
                    }
                  }}
                >
                  <InputLabel>Jour de semaine</InputLabel>
                  <Select
                    value={filterJourSemaine}
                    label="Jour de semaine"
                    onChange={(e) => setFilterJourSemaine(e.target.value)}
                  >
                    <MenuItem
                      value=""
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Tous les jours
                    </MenuItem>
                    <MenuItem
                      value="1"
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Lundi
                    </MenuItem>
                    <MenuItem
                      value="2"
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Mardi
                    </MenuItem>
                    <MenuItem
                      value="3"
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Mercredi
                    </MenuItem>
                    <MenuItem
                      value="4"
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Jeudi
                    </MenuItem>
                    <MenuItem
                      value="5"
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Vendredi
                    </MenuItem>
                    <MenuItem
                      value="6"
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Samedi
                    </MenuItem>
                    <MenuItem
                      value="0"
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Dimanche
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: '200px', flex: '1 1 auto' }}>
                <FormControl
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'var(--color-text-secondary)',
                      '&.Mui-focused': {
                        color: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      '& fieldset': {
                        borderColor: 'var(--color-border-light)'
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--color-primary-400)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--color-primary-500)'
                      }
                    },
                    '& .MuiSelect-select': {
                      color: 'var(--color-text-primary)'
                    }
                  }}
                >
                  <InputLabel>Heure de début</InputLabel>
                  <Select
                    value={filterHeureDebut}
                    label="Heure de début"
                    onChange={(e) => setFilterHeureDebut(e.target.value)}
                  >
                    <MenuItem
                      value=""
                      sx={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--color-bg-tertiary)'
                        }
                      }}
                    >
                      Toutes les heures
                    </MenuItem>
                    {uniqueStartTimes.map(time => (
                      <MenuItem
                        key={time}
                        value={time}
                        sx={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                          '&:hover': {
                            backgroundColor: 'var(--color-bg-tertiary)'
                          }
                        }}
                      >
                        {time}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setFilterTeacher('');
                    setFilterLocation('');
                    setFilterSalle('');
                    setFilterLevel('');
                    setFilterTypeCours('');
                    setFilterStudent('');
                    setFilterJourSemaine('');
                    setFilterHeureDebut('');
                  }}
                  sx={{
                    color: 'var(--color-text-primary)',
                    borderColor: 'var(--color-border-light)',
                    '&:hover': {
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-primary-400)'
                    }
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Paper>

      {/* Action Button */}
      <Box display="flex" justifyContent="flex-end" mb={3}>
        <Button
          variant="contained"
          startIcon={<Plus />}
          onClick={() => {
            resetClassForm();
            setIsCreateDialogOpen(true);
          }}
          size="large"
          sx={{
            backgroundColor: 'var(--color-primary-500)',
            color: 'var(--color-text-on-primary)',
            '&:hover': {
              backgroundColor: 'var(--color-primary-600)'
            }
          }}
        >
          Nouvelle Classe
        </Button>
      </Box>

      {/* Classes Grid */}
      <Box 
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
            xl: 'repeat(4, 1fr)'
          },
          gap: 2,
          alignItems: 'start'
        }}
      >
        {classes
          .filter(classe => {
            // Search filter
            const matchesSearch = searchTerm === '' || 
              classe.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
              classe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              classe.teacher.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
              classe.teacher.nom.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Teacher filter
            const matchesTeacher = filterTeacher === '' || classe.teacherId.toString() === filterTeacher;
            
            // Location filter
            const matchesLocation = filterLocation === '' || classe.location === filterLocation;
            
            // Salle filter
            const matchesSalle = filterSalle === '' || classe.salle === filterSalle;
            
            // Level filter
            const matchesLevel = filterLevel === '' || classe.level === filterLevel;
            
            // Type de cours filter
            const matchesTypeCours = filterTypeCours === '' || classe.typeCours === filterTypeCours;
            
            // Student filter
            const matchesStudent = filterStudent === '' || 
              classe.eleves.some(e => e.eleve.id.toString() === filterStudent);
            
            // Jour de semaine filter
            const matchesJourSemaine = filterJourSemaine === '' || 
              classe.jourSemaine?.toString() === filterJourSemaine;
            
            // Heure de début filter
            const matchesHeureDebut = filterHeureDebut === '' || 
              classe.heureDebut === filterHeureDebut;
            
            // Status filter
            let matchesStatus = true;
            if (statusFilter !== 'all') {
              const now = new Date();
              const weekNumbers = classService.parseWeekNumbers(classe.semainesSeances);
              const hasUpcomingSeances = classe.seances.some(s => 
                s.statut === 'programmee' && new Date(s.dateHeure) > now
              );
              const hasCompletedSeances = classe.seances.some(s => s.statut === 'terminee');
              
              switch (statusFilter) {
                case 'active':
                  matchesStatus = hasUpcomingSeances;
                  break;
                case 'upcoming':
                  matchesStatus = weekNumbers.length > 0 && !hasCompletedSeances;
                  break;
                case 'completed':
                  matchesStatus = hasCompletedSeances && !hasUpcomingSeances;
                  break;
              }
            }
            
            return matchesSearch && matchesTeacher && matchesLocation && matchesSalle && 
                   matchesLevel && matchesTypeCours && matchesStudent && matchesJourSemaine && 
                   matchesHeureDebut && matchesStatus;
          })
          .map(classe => {
            return (
              <Card 
                key={classe.id} 
                onClick={() => {
                  loadClassDetails(classe.id);
                  setIsClassModalOpen(true);
                  setTabValue(0);
                }}
                sx={{ 
                  cursor: 'pointer',
                  bgcolor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-light)',
                  '&:hover': { 
                    bgcolor: 'var(--color-bg-tertiary)',
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  },
                  height: '500px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Fixed Header */}
                <Box sx={{ 
                  bgcolor: 'var(--color-primary-500)', 
                  p: 2, 
                  borderBottom: '2px solid var(--color-primary-600)',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  <Typography 
                    variant="h6" 
                    component="h3" 
                    sx={{ 
                      color: 'var(--color-text-on-primary)', 
                      fontWeight: 'bold',
                      textAlign: 'center',
                      fontSize: '1.1rem'
                    }}
                  >
                    {classe.nom}
                  </Typography>
                  <Box display="flex" gap={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(classe);
                      }}
                      sx={{ 
                        color: 'var(--color-text-on-primary)', 
                        bgcolor: 'rgba(255,255,255,0.1)', 
                        '&:hover': { 
                          bgcolor: 'rgba(255,255,255,0.2)' 
                        } 
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(classe.id);
                      }}
                      sx={{ 
                        color: 'var(--color-text-on-primary)', 
                        bgcolor: 'rgba(255,255,255,0.1)', 
                        '&:hover': { 
                          bgcolor: 'rgba(255,255,255,0.2)' 
                        } 
                      }}
                    >
                      <Trash2 fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Scrollable Content */}
                <CardContent sx={{ 
                  p: 0, 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'var(--color-bg-primary)',
                    borderRadius: '3px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'var(--color-border-light)',
                    borderRadius: '3px',
                    '&:hover': {
                      background: 'var(--color-border-medium)',
                    }
                  }
                }}>
                  {/* Day and Time Section - First */}
                  {(classe.jourSemaine !== undefined || classe.heureDebut) && (
                    <Box sx={{ 
                      bgcolor: 'var(--color-bg-secondary)', 
                      p: 1.5, 
                      borderBottom: '1px solid var(--color-border-light)'
                    }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Calendar fontSize="small" sx={{ color: 'var(--color-accentuation-cyan)' }} />
                        <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 'medium' }}>
                          {classe.jourSemaine !== undefined ? classService.formatDayOfWeek(classe.jourSemaine) : ''}
                          {classe.jourSemaine !== undefined && classe.heureDebut ? ' à ' : ''}
                          {classe.heureDebut || ''}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Level Section - Second */}
                  {classe.level && (
                    <Box sx={{ 
                      bgcolor: 'var(--color-bg-tertiary)', 
                      p: 1.5, 
                      borderBottom: '1px solid var(--color-border-light)'
                    }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LevelIcon fontSize="small" sx={{ color: 'var(--color-accentuation-green)' }} />
                        <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 'medium' }}>
                          Niveau: {classe.level}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Type, Location and Room Section - Third */}
                  {(classe.typeCours || classe.location || classe.salle) && (
                    <Box sx={{ 
                      bgcolor: 'var(--color-bg-secondary)', 
                      p: 1.5, 
                      borderBottom: '1px solid var(--color-border-light)'
                    }}>
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        {classe.typeCours && (
                          <Box display="flex" alignItems="center" gap={1}>
                            <TypeIcon fontSize="small" sx={{ color: 'var(--color-accentuation-blue)' }} />
                            <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 'medium' }}>
                              {classe.typeCours}
                            </Typography>
                          </Box>
                        )}
                        {classe.location && (
                          <Box display="flex" alignItems="center" gap={1}>
                            <LocationIcon fontSize="small" sx={{ color: 'var(--color-accentuation-teal)' }} />
                            <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 'medium' }}>
                              {classe.location}
                            </Typography>
                          </Box>
                        )}
                        {classe.salle && (
                          <Box display="flex" alignItems="center" gap={1}>
                            <RoomIcon fontSize="small" sx={{ color: 'var(--color-accentuation-purple)' }} />
                            <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 'medium' }}>
                              {classe.salle}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Teacher Section - Fourth */}
                  <Box sx={{ 
                    bgcolor: 'var(--color-bg-tertiary)', 
                    p: 1.5, 
                    borderBottom: '1px solid var(--color-border-light)'
                  }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <TeacherIcon fontSize="small" sx={{ color: 'var(--color-accentuation-cyan)' }} />
                      <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 'medium' }}>
                        {classe.teacher.prenom} {classe.teacher.nom}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Students Section - Last */}
                  <Box sx={{ 
                    bgcolor: 'var(--color-bg-secondary)', 
                    p: 1.5, 
                    flex: 1,
                    borderBottom: '1px solid var(--color-border-light)'
                  }}>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="space-between"
                      sx={{ cursor: 'pointer', mb: expandedCards.has(classe.id) ? 1 : 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCardExpansion(classe.id);
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Users fontSize="small" sx={{ color: 'var(--color-accentuation-indigo)' }} />
                        <Typography variant="body2" sx={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 'medium' }}>
                          {classe.eleves.length} élève{classe.eleves.length !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        sx={{ color: 'var(--color-accentuation-indigo)', p: 0.5 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardExpansion(classe.id);
                        }}
                      >
                        {expandedCards.has(classe.id) ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </IconButton>
                    </Box>
                    
                    <Collapse in={expandedCards.has(classe.id)}>
                      <Box sx={{ 
                        maxHeight: '120px', 
                        overflow: 'auto',
                        mt: 1,
                        '&::-webkit-scrollbar': {
                          width: '4px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'var(--color-bg-primary)',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: 'var(--color-border-light)',
                          borderRadius: '2px',
                        }
                      }}>
                        {classe.eleves.length > 0 ? (
                          <Box sx={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                            gap: 0.5,
                            mt: 0.5
                          }}>
                            {classe.eleves.map(e => (
                              <Chip
                                key={e.eleve.id}
                                label={`${e.eleve.prenom} ${e.eleve.nom}`}
                                size="small"
                                sx={{ 
                                  fontSize: '0.7rem',
                                  height: '24px',
                                  bgcolor: 'var(--color-accentuation-blue)',
                                  color: 'var(--color-text-primary)',
                                  '& .MuiChip-label': {
                                    px: 1
                                  }
                                }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            Aucun élève inscrit
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </Box>

                  {/* Description Section */}
                  {classe.description && (
                    <Box sx={{ 
                      bgcolor: 'var(--color-bg-secondary)', 
                      p: 1.5
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'var(--color-text-secondary)', 
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {classe.description}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </Box>

      {/* Class Details Modal */}
      <Dialog 
        open={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            minHeight: '800px',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-light)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>
              {selectedClass?.nom}
            </Typography>
            <IconButton onClick={() => setIsClassModalOpen(false)} sx={{ color: 'var(--color-text-primary)' }}>
              <ArrowBack />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <Box sx={{ borderBottom: '1px solid var(--color-border-medium)', bgcolor: 'var(--color-bg-secondary)' }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': { color: 'var(--color-text-secondary)' },
              '& .Mui-selected': { color: 'var(--color-text-primary)' },
              '& .MuiTabs-indicator': { backgroundColor: 'var(--color-primary-500)' }
            }}
          >
            <Tab label="Séances" />
            <Tab label="Élèves" />
            <Tab label="Informations" />
          </Tabs>
        </Box>

        <DialogContent sx={{ bgcolor: '#1e1e1e', p: 0 }}>
          {/* Séances Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ color: 'white' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Liste des séances</Typography>
                <Box display="flex" gap={1}>
                  <Button 
                    variant="contained" 
                    startIcon={<Plus />}
                    onClick={() => {
                      if (selectedClass) {
                        openSeanceDialog(selectedClass);
                        setIsClassModalOpen(false);
                      }
                    }}
                    sx={{ bgcolor: '#1976d2' }}
                  >
                    Ajouter séance
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => selectedClass && openGenerateSeancesDialog(selectedClass)}
                    sx={{ color: '#90caf9', borderColor: '#90caf9' }}
                  >
                    Générer séances
                  </Button>
                </Box>
              </Box>
              
              <Table sx={{ '& .MuiTableCell-root': { color: 'white', borderColor: '#444' } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#2d2d2d' }}>
                    <TableCell>Semaine</TableCell>
                    <TableCell>Date & Heure</TableCell>
                    <TableCell>Présences</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedClass?.seances
                    .sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime())
                    .map(seance => {
                      const now = new Date();
                      const seanceDate = new Date(seance.dateHeure);
                      const isPast = seanceDate < now;
                      const isFuture = seanceDate > now;
                      
                      // Calculate attendance stats from seance.presences if available
                      const totalStudents = selectedClass.eleves.length;
                      const pres = seance.presences || [];
                      const presentCount = pres.filter(p => p.statut === 'present').length;
                      const absentCount = pres.filter(p => p.statut === 'absent').length;
                      const awaitingCount = pres.filter(p => p.statut === 'awaiting').length;
                      const accounted = presentCount + absentCount + awaitingCount;
                      const noStatusCount = Math.max(totalStudents - accounted, 0);
                      
                      return (
                        <TableRow 
                          key={seance.id} 
                          sx={{ 
                            '&:hover': { bgcolor: '#2d2d2d', cursor: 'pointer' },
                            opacity: isPast ? 0.7 : 1
                          }}
                          onClick={() => openAttendanceModal(seance)}
                        >
                          <TableCell>
                            <Typography variant="body2">{seance.weekNumber ?? '-'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {new Date(seance.dateHeure).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                color: isPast ? '#f44336' : isFuture ? '#4caf50' : '#ff9800',
                                fontSize: '0.7rem'
                              }}>
                                {isPast ? 'Passée' : isFuture ? 'À venir' : 'En cours'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" flexDirection="column" gap={0.5}>
                              <Typography variant="caption" sx={{ color: '#4caf50', fontSize: '0.75rem' }}>
                                ✓ {presentCount} présents
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#f44336', fontSize: '0.75rem' }}>
                                ✗ {absentCount} absents
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#ff9800', fontSize: '0.75rem' }}>
                                ⏳ {awaitingCount} en attente
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#9e9e9e', fontSize: '0.75rem' }}>
                                ? {noStatusCount} sans statut
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Box display="flex" gap={1}>
                              <IconButton 
                                size="small" 
                                sx={{ color: '#90caf9' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectedClass) {
                                    openSeanceDialog(selectedClass, seance);
                                    setIsClassModalOpen(false);
                                  }
                                }}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                sx={{ color: '#f48fb1' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSeance(seance.id);
                                }}
                              >
                                <Trash2 />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </Box>
          </TabPanel>

          {/* Élèves Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ color: 'white' }}>
              <Typography variant="h6" mb={2}>
                Élèves inscrits ({selectedClass?.eleves.length})
              </Typography>
              
              <Table sx={{ '& .MuiTableCell-root': { color: 'white', borderColor: '#444' } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#2d2d2d' }}>
                    <TableCell>Nom</TableCell>
                    <TableCell>Prénom</TableCell>
                    <TableCell>Contact Principal</TableCell>
                    <TableCell>Téléphone</TableCell>
                    <TableCell>Email</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedClass?.eleves.map(classeEleve => {
                    const eleve = classeEleve.eleve as Eleve;
                    const primaryContact = eleve.nomCompletResponsable1 || eleve.nomCompletParent || 'N/A';
                    const primaryPhone = eleve.gsmResponsable1 || 'N/A';
                    const primaryEmail = eleve.mailResponsable1 || 'N/A';
                    
                    return (
                      <TableRow key={classeEleve.id} sx={{ '&:hover': { bgcolor: '#2d2d2d' } }}>
                        <TableCell>{eleve.nom}</TableCell>
                        <TableCell>{eleve.prenom}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#bdbdbd' }}>
                            {primaryContact}
                          </Typography>
                          {eleve.relationResponsable1 && (
                            <Typography variant="caption" sx={{ color: '#81c784' }}>
                              ({eleve.relationResponsable1})
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {primaryPhone !== 'N/A' ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2">{primaryPhone}</Typography>
                              <IconButton 
                                size="small" 
                                sx={{ color: '#4caf50' }}
                                onClick={() => window.open(`tel:${primaryPhone}`)}
                              >
                                📞
                              </IconButton>
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: '#666' }}>N/A</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {primaryEmail !== 'N/A' ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2">{primaryEmail}</Typography>
                              <IconButton 
                                size="small" 
                                sx={{ color: '#2196f3' }}
                                onClick={() => window.open(`mailto:${primaryEmail}`)}
                              >
                                ✉️
                              </IconButton>
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: '#666' }}>N/A</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </TabPanel>

          {/* Informations Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ color: 'white' }}>
              <Typography variant="h6" mb={3}>Informations de la classe</Typography>
              
              <Box 
                sx={{ 
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 3
                }}
              >
                <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: 'white' }}>
                  <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                    Détails généraux
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Box>
                      <Typography variant="body2" color="#bdbdbd">Nom:</Typography>
                      <Typography>{selectedClass?.nom}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="#bdbdbd">Description:</Typography>
                      <Typography>{selectedClass?.description || 'Aucune description'}</Typography>
                    </Box>
                    {selectedClass?.level && (
                      <Box>
                        <Typography variant="body2" color="#bdbdbd">Niveau:</Typography>
                        <Typography>{selectedClass.level}</Typography>
                      </Box>
                    )}
                    {selectedClass?.typeCours && (
                      <Box>
                        <Typography variant="body2" color="#bdbdbd">Type de cours:</Typography>
                        <Typography>{selectedClass.typeCours}</Typography>
                      </Box>
                    )}
                    {selectedClass?.location && (
                      <Box>
                        <Typography variant="body2" color="#bdbdbd">Emplacement:</Typography>
                        <Typography>{selectedClass.location}</Typography>
                      </Box>
                    )}
                    {selectedClass?.salle && (
                      <Box>
                                                                                             <Typography variant="body2" color="#bdbdbd">Salle:</Typography>
                        <Typography>{selectedClass.salle}</Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="body2" color="#bdbdbd">Durée par séance:</Typography>
                      <Typography>{selectedClass && classService.formatDuration(selectedClass.dureeSeance)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="#bdbdbd">Créé le:</Typography>
                      <Typography>
                        {selectedClass && new Date(selectedClass.createdAt).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
                
                <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: 'white' }}>
                  <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                    Enseignant
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <BookOpen sx={{ color: '#81c784', fontSize: 40 }} />
                    <Box>
                      <Typography variant="h6">
                        {selectedClass?.teacher.prenom} {selectedClass?.teacher.nom}
                      </Typography>
                      <Typography variant="body2" color="#bdbdbd">
                        {selectedClass?.teacher.email}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
              
              <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: 'white', mt: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                  Semaines programmées
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {selectedClass && (() => {
                    const weekNumbers = classService.parseWeekNumbers(selectedClass.semainesSeances);
                    
                    // Convert week numbers to dates and sort chronologically
                    const weekDates = weekNumbers.map(week => {
                      // Calculate the date for Monday of the given week
                      const year = new Date().getFullYear();
                      const firstDayOfYear = new Date(year, 0, 1);
                      const daysToAdd = (week - 1) * 7;
                      const mondayOfWeek = new Date(firstDayOfYear);
                      mondayOfWeek.setDate(firstDayOfYear.getDate() + daysToAdd);
                      
                      // Adjust to the correct day of the week (selectedClass.jourSemaine)
                      const targetDayOfWeek = selectedClass.jourSemaine || 1; // Default to Monday
                      const currentDayOfWeek = mondayOfWeek.getDay();
                      const daysToTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7;
                      const targetDate = new Date(mondayOfWeek);
                      targetDate.setDate(mondayOfWeek.getDate() + daysToTarget);
                      
                      // Add the start time
                      if (selectedClass.heureDebut) {
                        const [hours, minutes] = selectedClass.heureDebut.split(':').map(Number);
                        targetDate.setHours(hours, minutes, 0, 0);
                      }
                      
                      return {
                        week,
                        date: targetDate,
                        formatted: targetDate.toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      };
                    }).sort((a, b) => a.date.getTime() - b.date.getTime());
                    
                    return weekDates.map(({ week, formatted }) => (
                      <Chip 
                        key={week} 
                        label={`Semaine ${week} - ${formatted}`} 
                        sx={{ 
                          bgcolor: '#1976d2', 
                          color: 'white' 
                        }} 
                      />
                    ));
                  })()}
                </Box>
              </Paper>
            </Box>
          </TabPanel>
        </DialogContent>
      </Dialog>

      {/* Create Class Dialog */}
      <Dialog 
        open={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: 'white'
          }
        }}
      >
  <DialogTitle sx={{ bgcolor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-light)' }}>
          Créer une nouvelle classe
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'var(--color-bg-primary)' }}>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleCreateClass(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nom de la classe"
              value={classForm.nom}
              onChange={(e) => setClassForm(prev => ({ ...prev, nom: e.target.value }))}
              placeholder="Ex: Programmation Python Débutant"
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' },
                '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--color-border-light)' },
                  '&:hover fieldset': { borderColor: 'var(--color-border-medium)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--color-primary-500)' }
                }
              }}
            />
            
            <TextField
              label="Description"
              value={classForm.description}
              onChange={(e) => setClassForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description de la classe..."
              multiline
              rows={3}
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            />
            
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <InputLabel sx={{ color: '#bdbdbd' }}>Niveau</InputLabel>
              <Select
                value={classForm.level}
                label="Niveau"
                onChange={(e) => setClassForm(prev => ({ ...prev, level: e.target.value }))}
                sx={{ color: 'white' }}
              >
                <MenuItem value="" sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                  <em>Aucun</em>
                </MenuItem>
                {levelSettings.filter(setting => setting.active).map(setting => (
                  <MenuItem key={setting.id} value={setting.value} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                    {setting.label || setting.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <InputLabel sx={{ color: '#bdbdbd' }}>Type de cours</InputLabel>
              <Select
                value={classForm.typeCours}
                label="Type de cours"
                onChange={(e) => setClassForm(prev => ({ ...prev, typeCours: e.target.value }))}
                sx={{ color: 'white' }}
              >
                <MenuItem value="" sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                  <em>Aucun</em>
                </MenuItem>
                {typeCoursSettings.filter(setting => setting.active).map(setting => (
                  <MenuItem key={setting.id} value={setting.value} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                    {setting.label || setting.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <InputLabel sx={{ color: '#bdbdbd' }}>Emplacement</InputLabel>
              <Select
                value={classForm.location}
                label="Emplacement"
                onChange={(e) => setClassForm(prev => ({ ...prev, location: e.target.value }))}
                sx={{ color: 'white' }}
              >
                <MenuItem value="" sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                  <em>Aucun</em>
                </MenuItem>
                {locationSettings.filter(setting => setting.active).map(setting => (
                  <MenuItem key={setting.id} value={setting.value} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                    {setting.label || setting.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <InputLabel sx={{ color: '#bdbdbd' }}>Salle</InputLabel>
              <Select
                value={classForm.salle}
                label="Salle"
                onChange={(e) => setClassForm(prev => ({ ...prev, salle: e.target.value }))}
                sx={{ color: 'white' }}
              >
                <MenuItem value="" sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                  <em>Aucun</em>
                </MenuItem>
                {salleSettings.filter(setting => setting.active).map(setting => (
                  <MenuItem key={setting.id} value={setting.value} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                    {setting.label || setting.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <InputLabel sx={{ color: '#bdbdbd' }}>Enseignant</InputLabel>
              <Select
                value={classForm.teacherId}
                label="Enseignant"
                onChange={(e) => setClassForm(prev => ({ ...prev, teacherId: Number(e.target.value) }))}
                sx={{ color: 'white' }}
              >
                {teachers.map(teacher => (
                  <MenuItem key={teacher.id} value={teacher.id} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                    {teacher.prenom} {teacher.nom}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Durée des séances (minutes)"
              type="number"
              value={classForm.dureeSeance}
              onChange={(e) => setClassForm(prev => ({ ...prev, dureeSeance: parseInt(e.target.value) }))}
              inputProps={{ min: 1 }}
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={!!classForm.rrPossibles}
                  onChange={(e) => setClassForm(prev => ({ ...prev, rrPossibles: e.target.checked }))}
                  sx={{ color: '#bdbdbd' }}
                />
              }
              label="RR possibles"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={!!classForm.isRecuperation}
                  onChange={(e) => setClassForm(prev => ({ ...prev, isRecuperation: e.target.checked }))}
                  sx={{ color: '#bdbdbd' }}
                />
              }
              label="Classe de récupération (cours du soir)"
            />
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <FormControl 
                sx={{
                  minWidth: 180,
                  flex: '1 1 180px',
                  '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                  '& .MuiInputLabel-root': { color: '#bdbdbd' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  }
                }}
              >
                <InputLabel sx={{ color: '#bdbdbd' }}>Jour</InputLabel>
                <Select
                  value={classForm.jourSemaine}
                  label="Jour"
                  onChange={(e) => setClassForm(prev => ({ ...prev, jourSemaine: Number(e.target.value) }))}
                  sx={{ color: 'white' }}
                >
                  {[1,2,3,4,5,6,0].map(d => (
                    <MenuItem key={d} value={d} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                      {['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][d === 0 ? 0 : d] /* index mapping */}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Heure début (HH:MM)"
                value={classForm.heureDebut}
                onChange={(e) => setClassForm(prev => ({ ...prev, heureDebut: e.target.value }))}
                placeholder="09:00"
                sx={{
                  minWidth: 160,
                  flex: '1 1 140px',
                  '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                  '& .MuiInputLabel-root': { color: '#bdbdbd' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  }
                }}
              />

              <TextField
                label="Semaines (année courante)"
                placeholder="1,2,3,5,12"
                helperText="Liste séparée par des virgules (1-52)"
                value={weekNumbers}
                onChange={(e) => setWeekNumbers(e.target.value)}
                sx={{
                  flex: '2 1 300px',
                  '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                  '& .MuiInputLabel-root': { color: '#bdbdbd' },
                  '& .MuiFormHelperText-root': { color: '#bdbdbd' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  }
                }}
              />

              <TextField
                label="Semaines (année suivante)"
                placeholder="1,2,3"
                helperText="Optionnel - semaines de l'année prochaine"
                value={nextYearWeekNumbers}
                onChange={(e) => setNextYearWeekNumbers(e.target.value)}
                sx={{
                  flex: '2 1 300px',
                  '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                  '& .MuiInputLabel-root': { color: '#bdbdbd' },
                  '& .MuiFormHelperText-root': { color: '#bdbdbd' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  }
                }}
              />

              <Autocomplete
                multiple
                options={students}
                value={students.filter(s => (classForm.eleveIds || []).includes(s.id))}
                onChange={(_, newValue) => {
                  setClassForm(prev => ({ ...prev, eleveIds: newValue.map(v => v.id) }));
                }}
                disableCloseOnSelect
                getOptionLabel={(o) => `${o.prenom} ${o.nom}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Élèves"
                    placeholder="Sélectionner des élèves"
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                      '& .MuiInputLabel-root': { color: '#bdbdbd' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#444' },
                        '&:hover fieldset': { borderColor: '#666' },
                        '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                      }
                    }}
                  />
                )}
                sx={{
                  flex: '1 1 400px',
                  '& .MuiChip-root': { bgcolor: '#1976d2', color: 'white' }
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button
                onClick={() => setIsCreateDialogOpen(false)}
                variant="outlined"
                sx={{ borderColor: '#444', color: 'white', '&:hover': { borderColor: '#666', bgcolor: '#2a2a2a' } }}
              >Annuler</Button>
              <Button
                type="submit"
                variant="contained"
                sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
              >Créer</Button>
            </Box>
          </Box>{/* end create class form */}
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-light)' }}>
          Modifier la classe
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'var(--color-bg-primary)' }}>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleUpdateClass(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nom de la classe"
              value={classForm.nom}
              onChange={(e) => setClassForm(prev => ({ ...prev, nom: e.target.value }))}
              placeholder="Ex: Programmation Python Débutant"
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' },
                '& .MuiInputLabel-root': { color: 'var(--color-text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--color-border-light)' },
                  '&:hover fieldset': { borderColor: 'var(--color-border-medium)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--color-primary-500)' }
                }
              }}
            />
            
            <TextField
              label="Description"
              value={classForm.description}
              onChange={(e) => setClassForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description de la classe..."
              multiline
              rows={3}
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            />
            
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <InputLabel sx={{ color: '#bdbdbd' }}>Niveau</InputLabel>
              <Select
                value={classForm.level}
                label="Niveau"
                onChange={(e) => setClassForm(prev => ({ ...prev, level: e.target.value }))}
                sx={{ color: 'white' }}
              >
                <MenuItem value="" sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                  <em>Aucun</em>
                </MenuItem>
                {levelSettings.filter(setting => setting.active).map(setting => (
                  <MenuItem key={setting.id} value={setting.value} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                    {setting.label || setting.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <InputLabel sx={{ color: '#bdbdbd' }}>Type de cours</InputLabel>
              <Select
                value={classForm.typeCours}
                label="Type de cours"
                onChange={(e) => setClassForm(prev => ({ ...prev, typeCours: e.target.value }))}
                sx={{ color: 'white' }}
              >
                <MenuItem value="" sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                  <em>Aucun</em>
                </MenuItem>
                {typeCoursSettings.filter(setting => setting.active).map(setting => (
                  <MenuItem key={setting.id} value={setting.value} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                    {setting.label || setting.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <InputLabel sx={{ color: '#bdbdbd' }}>Emplacement</InputLabel>
              <Select
                value={classForm.location}
                label="Emplacement"
                onChange={(e) => setClassForm(prev => ({ ...prev, location: e.target.value }))}
                sx={{ color: 'white' }}
              >
                <MenuItem value="" sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                  <em>Aucun</em>
                </MenuItem>
                {locationSettings.filter(setting => setting.active).map(setting => (
                  <MenuItem key={setting.id} value={setting.value} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                    {setting.label || setting.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <InputLabel sx={{ color: '#bdbdbd' }}>Salle</InputLabel>
              <Select
                value={classForm.salle}
                label="Salle"
                onChange={(e) => setClassForm(prev => ({ ...prev, salle: e.target.value }))}
                sx={{ color: 'white' }}
              >
                <MenuItem value="" sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                  <em>Aucun</em>
                </MenuItem>
                {salleSettings.filter(setting => setting.active).map(setting => (
                  <MenuItem key={setting.id} value={setting.value} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                    {setting.label || setting.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            >
              <InputLabel sx={{ color: '#bdbdbd' }}>Enseignant</InputLabel>
              <Select
                value={classForm.teacherId}
                label="Enseignant"
                onChange={(e) => setClassForm(prev => ({ ...prev, teacherId: Number(e.target.value) }))}
                sx={{ color: 'white' }}
              >
                {teachers.map(teacher => (
                  <MenuItem key={teacher.id} value={teacher.id} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                    {teacher.prenom} {teacher.nom}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Durée des séances (minutes)"
              type="number"
              value={classForm.dureeSeance}
              onChange={(e) => setClassForm(prev => ({ ...prev, dureeSeance: parseInt(e.target.value) }))}
              inputProps={{ min: 1 }}
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                '& .MuiInputLabel-root': { color: '#bdbdbd' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={!!classForm.rrPossibles}
                  onChange={(e) => setClassForm(prev => ({ ...prev, rrPossibles: e.target.checked }))}
                  sx={{ color: '#bdbdbd' }}
                />
              }
              label="RR possibles"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={!!classForm.isRecuperation}
                  onChange={(e) => setClassForm(prev => ({ ...prev, isRecuperation: e.target.checked }))}
                  sx={{ color: '#bdbdbd' }}
                />
              }
              label="Classe de récupération (cours du soir)"
            />
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <FormControl 
                sx={{
                  minWidth: 180,
                  flex: '1 1 180px',
                  '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                  '& .MuiInputLabel-root': { color: '#bdbdbd' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  }
                }}
              >
                <InputLabel sx={{ color: '#bdbdbd' }}>Jour</InputLabel>
                <Select
                  value={classForm.jourSemaine}
                  label="Jour"
                  onChange={(e) => setClassForm(prev => ({ ...prev, jourSemaine: Number(e.target.value) }))}
                  sx={{ color: 'white' }}
                >
                  {[1,2,3,4,5,6,0].map(d => (
                    <MenuItem key={d} value={d} sx={{ bgcolor: '#2d2d2d', color: 'white', '&:hover': { bgcolor: '#3d3d3d' } }}>
                      {['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][d === 0 ? 0 : d] /* index mapping */}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Heure début (HH:MM)"
                value={classForm.heureDebut}
                onChange={(e) => setClassForm(prev => ({ ...prev, heureDebut: e.target.value }))}
                placeholder="09:00"
                sx={{
                  minWidth: 160,
                  flex: '1 1 140px',
                  '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                  '& .MuiInputLabel-root': { color: '#bdbdbd' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  }
                }}
              />

              <TextField
                label="Semaines (année courante)"
                placeholder="1,2,3,5,12"
                helperText="Liste séparée par des virgules (1-52)"
                value={weekNumbers}
                onChange={(e) => setWeekNumbers(e.target.value)}
                sx={{
                  flex: '2 1 300px',
                  '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                  '& .MuiInputLabel-root': { color: '#bdbdbd' },
                  '& .MuiFormHelperText-root': { color: '#bdbdbd' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  }
                }}
              />

              <TextField
                label="Semaines (année suivante)"
                placeholder="1,2,3"
                helperText="Optionnel - semaines de l'année prochaine"
                value={nextYearWeekNumbers}
                onChange={(e) => setNextYearWeekNumbers(e.target.value)}
                sx={{
                  flex: '2 1 300px',
                  '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                  '& .MuiInputLabel-root': { color: '#bdbdbd' },
                  '& .MuiFormHelperText-root': { color: '#bdbdbd' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  }
                }}
              />

              <Autocomplete
                multiple
                options={students}
                value={students.filter(s => (classForm.eleveIds || []).includes(s.id))}
                onChange={(_, newValue) => {
                  setClassForm(prev => ({ ...prev, eleveIds: newValue.map(v => v.id) }));
                }}
                disableCloseOnSelect
                getOptionLabel={(o) => `${o.prenom} ${o.nom}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Élèves"
                    placeholder="Sélectionner des élèves"
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: '#2d2d2d', color: 'white' },
                      '& .MuiInputLabel-root': { color: '#bdbdbd' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#444' },
                        '&:hover fieldset': { borderColor: '#666' },
                        '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                      }
                    }}
                  />
                )}
                sx={{
                  flex: '1 1 400px',
                  '& .MuiChip-root': { bgcolor: '#1976d2', color: 'white' }
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button
                onClick={() => setIsEditDialogOpen(false)}
                variant="outlined"
                sx={{ borderColor: '#444', color: 'white', '&:hover': { borderColor: '#666', bgcolor: '#2a2a2a' } }}
              >Annuler</Button>
              <Button
                type="submit"
                variant="contained"
                sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
              >Modifier</Button>
            </Box>
          </Box>{/* end edit class form */}
        </DialogContent>
      </Dialog>
    </Container>
  );

};

export default ClassesView;