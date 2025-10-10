"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Select, FormControl, InputLabel, Box, Typography, Card,
  CardActionArea, CardContent, Chip, Divider, IconButton, CircularProgress,
  useMediaQuery, Tabs, Tab, Checkbox, FormControlLabel
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import attendanceService, { type SeanceWithAttendance } from '@/services/attendanceService';
import eleveService, { Eleve } from '@/services/eleveService';
import { rrService } from '@/services/rrService';

interface RRModalProps {
  open: boolean;
  onClose: () => void;
  defaultOriginSeanceId?: number; // when provided we lock origin to this seance
  defaultEleveId?: number; // when provided we lock student to this eleve
  readOnly?: boolean;
  existingInfo?: { id: number; type: 'origin' | 'destination'; destStatut?: string } | null;
  onCreated?: () => void; // callback after successful creation
  onDeleted?: (info: { id: number }) => void; // callback after successful deletion
}

export default function RRModal({ open, onClose, defaultOriginSeanceId, defaultEleveId, readOnly = false, existingInfo = null, onCreated, onDeleted }: RRModalProps) {
  const [originSeanceId, setOriginSeanceId] = useState<number | ''>(defaultOriginSeanceId || '');
  const [eleveId, setEleveId] = useState<number | ''>(defaultEleveId || '');
  const [destinationSeanceId, setDestinationSeanceId] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [rrType, setRrType] = useState<'same_week' | 'evening_recuperation'>('same_week');
  const [penalizeRR, setPenalizeRR] = useState<boolean>(true);

  const [allSeances, setAllSeances] = useState<SeanceWithAttendance[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const isSmall = useMediaQuery('(max-width:900px)');

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const selectedStudent = students.find(s => s.id === eleveId);
  const rrRestantes = selectedStudent?.rrRestantes ?? null;

  useEffect(() => {
    (async () => {
      try {
        // Load many weeks to have options (restrict to this & next year for performance)
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear + 1, 11, 31);
        const promises: Promise<SeanceWithAttendance[]>[] = [];
        const cursor = new Date(startDate);
        while (cursor <= endDate) {
          promises.push(attendanceService.getWeeklySeances(cursor.toISOString().split('T')[0]));
          cursor.setDate(cursor.getDate() + 7);
        }
        const weeks = await Promise.all(promises);
        const flat = weeks.flat();
        setAllSeances(flat);
        const studs = await eleveService.getAllEleves();
        setStudents(studs);
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement');
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setOriginSeanceId(defaultOriginSeanceId || '');
    setEleveId(defaultEleveId || '');
  }, [defaultOriginSeanceId, defaultEleveId]);

  const originOptions = useMemo(() => {
    // If origin is locked (defaultOriginSeanceId) return only that seance for display
    if (defaultOriginSeanceId) {
      const s = allSeances.find(se => se.id === defaultOriginSeanceId);
      return s ? [s] : [];
    }
    return allSeances.sort((a,b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime());
  }, [allSeances, defaultOriginSeanceId]);

  const destinationOptions = useMemo(() => {
    if (!originSeanceId) return [] as SeanceWithAttendance[];
    const origin = allSeances.find(s => s.id === originSeanceId);
    if (!origin) return [];
    const originWeek = getWeekNumber(new Date(origin.dateHeure));
    const now = new Date();
    return allSeances.filter(s => {
      if (s.id === originSeanceId) return false;
      const sameLevel = origin.classe.level && s.classe.level === origin.classe.level;
      const destLevelEmpty = !s.classe.level;
      const date = new Date(s.dateHeure);
      if (date < now) return false; // never allow past
      if (rrType === 'same_week') {
        const week = getWeekNumber(date);
        if (week !== originWeek) return false;
        if (!(sameLevel || destLevelEmpty)) return false;
        return true;
      } else { // evening_recuperation
        if (!s.classe.isRecuperation) return false;
        if (!(sameLevel || destLevelEmpty)) return false;
        return true;
      }
    }).sort((a,b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime());
  }, [originSeanceId, allSeances, rrType]);

  // Adjust penalize default when rrType changes
  useEffect(() => {
    if (rrType === 'same_week') {
      setPenalizeRR(false);
    } else {
      setPenalizeRR(true); // default for evening recuperation
    }
  }, [rrType]);

  const submit = async () => {
    if (!originSeanceId || !eleveId || !destinationSeanceId) {
      setError('Veuillez sélectionner la séance d\'origine, l\'élève et la séance de destination');
      return;
    }
    setLoading(true);
    try {
      await rrService.createRR({ eleveId: Number(eleveId), originSeanceId: Number(originSeanceId), destinationSeanceId: Number(destinationSeanceId), notes: note, rrType, penalizeRR });
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Échec de création');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingInfo) return;
    if (!confirm('Confirmer la suppression de ce RR ?')) return;
    setLoading(true);
    try {
      await rrService.deleteRR(existingInfo.id);
      onDeleted?.({ id: existingInfo.id });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Échec de suppression');
    } finally {
      setLoading(false);
    }
  };

  // Utility to build verbose date range (start -> end) based on duree
  const formatVerbose = (s: SeanceWithAttendance) => {
    const start = new Date(s.dateHeure);
    const end = new Date(start.getTime() + s.duree * 60000);
    const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const datePart = start.toLocaleDateString('fr-FR', opts);
    const timePart = `${start.toLocaleTimeString('fr-FR', timeOpts)} - ${end.toLocaleTimeString('fr-FR', timeOpts)}`;
    return { datePart, timePart };
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={true} fullWidth maxWidth="xl"
      PaperProps={{ sx: { bgcolor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Box display="flex" flexDirection={isSmall ? 'column' : 'row'} gap={2} alignItems={isSmall ? 'flex-start' : 'center'}>
          <Typography variant={isSmall ? 'h6' : 'h5'} fontWeight={600}>{readOnly ? 'Détails du RR' : 'Créer un RR'}</Typography>
          {selectedStudent && (
            <Chip label={`RR restantes: ${rrRestantes ?? '-'}`} color={(rrRestantes ?? 0) > 0 ? 'success' : 'default'} size="small" />
          )}
          {originSeanceId && (
            <Chip size="small" label={`Origine S${getWeekNumber(new Date(allSeances.find(s=>s.id===originSeanceId)!.dateHeure))}`} />
          )}
          {destinationSeanceId && (
            <Chip size="small" color="primary" label={`Dest S${getWeekNumber(new Date(allSeances.find(s=>s.id===destinationSeanceId)!.dateHeure))}`} />
          )}
          <Chip size="small" label={rrType === 'same_week' ? 'Rattrapage même semaine' : 'Récupération cours du soir'} color={rrType === 'same_week' ? 'default' : 'primary'} />
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--color-text-secondary)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
        {readOnly && existingInfo && (
          <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-light)' }}>
            <Typography variant="subtitle2" gutterBottom>RR #{existingInfo.id}</Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {existingInfo.type === 'origin' ? 'Origine (élève transféré depuis cette séance)' : 'Destination (élève ajouté à cette séance)'}
            </Typography>
            {existingInfo.destStatut && <Chip size="small" label={`Statut destination: ${existingInfo.destStatut}`} />}
          </Box>
        )}

        {initialLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
            <CircularProgress />
          </Box>
        )}

        {!initialLoading && (
          <Box display="flex" flexDirection="column" gap={4}>
            {/* RR Type Tabs */}
            <Box>
              <Tabs value={rrType} onChange={(_, v) => setRrType(v)} variant="fullWidth" sx={{ mb: 2 }}>
                <Tab value="same_week" label="Rattrapage même semaine" />
                <Tab value="evening_recuperation" label="Récupération cours du soir" />
              </Tabs>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {rrType === 'same_week' ? 'Sélectionnez une séance future de la même semaine (même niveau ou niveau vide). Aucun retrait des RR restantes.' : 'Sélectionnez un cours de récupération (soir). Peut retirer 1 RR restante selon la case ci-dessous.'}
              </Typography>
            </Box>

            {/* Student summary (locked) or selection */}
            {defaultEleveId ? (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Élève</Typography>
                {selectedStudent ? (
                  <Chip color="secondary" label={`${selectedStudent.prenom || ''} ${selectedStudent.nom} (RR restantes: ${rrRestantes ?? '-'})`} />
                ) : (
                  <Typography variant="body2" color="text.secondary">Chargement de l'élève...</Typography>
                )}
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>1. Sélectionner l'élève</Typography>
                <FormControl size="small" fullWidth disabled={readOnly}>
                  <InputLabel>Élève</InputLabel>
                  <Select label="Élève" value={eleveId} onChange={e => setEleveId(Number(e.target.value))}>
                    {students.map(s => (
                      <MenuItem key={s.id} value={s.id}>{s.prenom || ''} {s.nom} {s.rrRestantes != null && <Chip sx={{ ml: 1 }} size="small" label={`RR:${s.rrRestantes}`} />}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Origin seance selection (locked display if default provided) */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Séance d'origine</Typography>
              <Box display="grid" gap={2} sx={{ gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' } }}>
                {originOptions.map(s => {
                  const date = new Date(s.dateHeure);
                  const week = getWeekNumber(date);
                  const selected = originSeanceId === s.id;
                  const { datePart, timePart } = formatVerbose(s);
                  return (
                    <Card key={s.id} variant="outlined" sx={{ borderColor: selected ? 'var(--color-primary-500)' : 'var(--color-border-light)', position: 'relative' }}>
                      <CardActionArea disabled={readOnly || !!defaultOriginSeanceId} onClick={() => setOriginSeanceId(s.id)} sx={{ p: 1.5, alignItems: 'flex-start' }}>
                        <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Typography variant="subtitle2" fontWeight={600} sx={{ pr: 1 }}>{s.classe.nom}</Typography>
                            <Chip label={`Semaine ${week}`} size="small" />
                          </Box>
                          <Typography variant="caption" color="text.secondary">{datePart}</Typography>
                          <Typography variant="caption" color="text.secondary">{timePart}</Typography>
                          <Typography variant="caption" color="text.secondary">Professeur: {s.classe.teacher.prenom} {s.classe.teacher.nom}</Typography>
                          <Typography variant="caption" color="text.secondary">Nombre d'élèves: {s.classe.eleves.length}</Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Box>
            </Box>

            {/* Destination selection */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>3. Séance de destination {originSeanceId ? '' : '(choisir origine d\'abord)'}</Typography>
              {originSeanceId && destinationOptions.length === 0 && (
                <Typography variant="body2" color="text.secondary">Aucune séance compatible trouvée.</Typography>
              )}
              {originSeanceId && (
                <Box display="grid" gap={2} sx={{ gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' } }}>
                  {destinationOptions.map(s => {
                    const date = new Date(s.dateHeure);
                    const week = getWeekNumber(date);
                    const selected = destinationSeanceId === s.id;
                    const capacity = s.classe.eleves.length;
                    const { datePart, timePart } = formatVerbose(s);
                    return (
                      <Card key={s.id} variant="outlined" sx={{ borderColor: selected ? 'var(--color-primary-500)' : 'var(--color-border-light)', position: 'relative' }}>
                        <CardActionArea disabled={readOnly} onClick={() => setDestinationSeanceId(s.id)} sx={{ p: 1.5 }}>
                          <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                              <Typography variant="subtitle2" fontWeight={600} sx={{ pr: 1 }}>{s.classe.nom}</Typography>
                              <Chip label={`Semaine ${week}`} size="small" color="primary" />
                            </Box>
                            <Typography variant="caption" color="text.secondary">{datePart}</Typography>
                            <Typography variant="caption" color="text.secondary">{timePart}</Typography>
                            <Typography variant="caption" color="text.secondary">Professeur: {s.classe.teacher.prenom} {s.classe.teacher.nom}</Typography>
                            <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                              <Chip size="small" label={`Élèves: ${capacity}`} />
                              {s.classe.isRecuperation && <Chip size="small" color="secondary" label="Récupération" />}
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Penalize toggle (evening recuperation) */}
            {rrType === 'evening_recuperation' && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>4. Pénalisation</Typography>
                <FormControlLabel control={<Checkbox checked={penalizeRR} onChange={e => setPenalizeRR(e.target.checked)} />} label="Déduire 1 RR restante" />
              </Box>
            )}

            {/* Notes */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>{rrType === 'evening_recuperation' ? '5.' : '4.'} Notes</Typography>
              <TextField multiline minRows={2} label="Note (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth disabled={readOnly} />
            </Box>
          </Box>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>Fermer</Button>
        {readOnly && existingInfo && (
          <Button color="error" onClick={handleDelete} disabled={loading} variant="contained">{loading ? '...' : 'Supprimer RR'}</Button>
        )}
        {!readOnly && <Button onClick={submit} variant="contained" disabled={loading || !originSeanceId || !eleveId || !destinationSeanceId}>{loading ? '...' : 'Confirmer'}</Button>}
      </DialogActions>
    </Dialog>
  );
}
