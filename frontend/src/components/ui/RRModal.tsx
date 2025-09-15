"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Select, FormControl, InputLabel, Box, Typography } from '@mui/material';
import attendanceService, { type SeanceWithAttendance } from '@/services/attendanceService';
import eleveService from '@/services/eleveService';
import { rrService } from '@/services/rrService';

interface RRModalProps {
  open: boolean;
  onClose: () => void;
  defaultOriginSeanceId?: number;
  defaultEleveId?: number;
  readOnly?: boolean;
  existingInfo?: { id: number; type: 'origin' | 'destination'; destStatut?: string } | null;
}

export default function RRModal({ open, onClose, defaultOriginSeanceId, defaultEleveId, readOnly = false, existingInfo = null }: RRModalProps) {
  const [originSeanceId, setOriginSeanceId] = useState<number | ''>(defaultOriginSeanceId || '');
  const [eleveId, setEleveId] = useState<number | ''>(defaultEleveId || '');
  const [destinationSeanceId, setDestinationSeanceId] = useState<number | ''>('');
  const [note, setNote] = useState('');

  const [allSeances, setAllSeances] = useState<SeanceWithAttendance[]>([]);
  const [students, setStudents] = useState<Array<{ id: number; nom: string; prenom: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Load many weeks to have options
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear + 1, 11, 31);
        const promises = [] as Promise<SeanceWithAttendance[]>[];
        const current = new Date(startDate);
        while (current <= endDate) {
          promises.push(attendanceService.getWeeklySeances(current.toISOString().split('T')[0]));
          current.setDate(current.getDate() + 7);
        }
        const weeks = await Promise.all(promises);
        setAllSeances(weeks.flat());
        const studs = await eleveService.getAllEleves();
        setStudents(studs);
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement');
      }
    })();
  }, []);

  useEffect(() => {
    setOriginSeanceId(defaultOriginSeanceId || '');
    setEleveId(defaultEleveId || '');
  }, [defaultOriginSeanceId, defaultEleveId]);

  const destinationOptions = useMemo(() => {
    if (!originSeanceId) return allSeances;
    const origin = allSeances.find(s => s.id === originSeanceId);
    if (!origin) return allSeances;
    const sameLevel = origin.classe.level;
    // RRs allowed: same level or destination seance with no level defined
    return allSeances.filter(s => s.id !== originSeanceId && (s.classe.level === sameLevel || !s.classe.level));
  }, [originSeanceId, allSeances]);

  const submit = async () => {
    if (!originSeanceId || !eleveId || !destinationSeanceId) {
      setError('Veuillez sélectionner la séance d\'origine, l\'élève et la séance de destination');
      return;
    }
    setLoading(true);
    try {
      await rrService.createRR({ eleveId: Number(eleveId), originSeanceId: Number(originSeanceId), destinationSeanceId: Number(destinationSeanceId), notes: note });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Échec de création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{readOnly ? 'Détails du RR' : 'Créer un RR'}</DialogTitle>
      <DialogContent>
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
        {readOnly && existingInfo && (
          <Box sx={{ mb: 2, p: 1, borderRadius: 1, bgcolor: 'var(--color-bg-tertiary)' }}>
            <Typography variant="body2">RR #{existingInfo.id} — {existingInfo.type === 'origin' ? 'Origine: élève en attente (↑)' : 'Destination: élève extra (↓)'}</Typography>
            {existingInfo.destStatut && <Typography variant="body2">Statut destination: {existingInfo.destStatut}</Typography>}
          </Box>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Élève</InputLabel>
            <Select label="Élève" value={eleveId} onChange={e => setEleveId(Number(e.target.value))} disabled={readOnly}>
              {students.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.prenom} {s.nom}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Séance d'origine</InputLabel>
            <Select label="Séance d'origine" value={originSeanceId} onChange={e => setOriginSeanceId(Number(e.target.value))} disabled={readOnly}>
              {allSeances.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.classe.nom} — {new Date(s.dateHeure).toLocaleString('fr-FR')}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Séance de destination</InputLabel>
            <Select label="Séance de destination" value={destinationSeanceId} onChange={e => setDestinationSeanceId(Number(e.target.value))} disabled={readOnly}>
              {destinationOptions.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.classe.nom} — {new Date(s.dateHeure).toLocaleString('fr-FR')}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField label="Note (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth disabled={readOnly} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Annuler</Button>
        {!readOnly && <Button onClick={submit} variant="contained" disabled={loading}>Confirmer</Button>}
      </DialogActions>
    </Dialog>
  );
}
