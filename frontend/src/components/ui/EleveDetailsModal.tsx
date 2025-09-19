"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Chip, CircularProgress, Divider, useMediaQuery, List, ListItem, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import eleveService, { Eleve } from '@/services/eleveService';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

interface EleveDetailsModalProps {
  open: boolean;
  eleveId?: number | null;
  onClose: () => void;
}

interface EleveSeanceInfo {
  id: number;
  dateHeure: string;
  duree: number;
  statut: string;
  weekNumber?: number | null;
  classe: { id: number; nom: string; level?: string | null; teacher?: { id: number; nom: string; prenom: string } };
  attendance: { presenceId: number; statut: string; notes?: string | null } | null;
  rr: { type: 'origin' | 'destination'; id: number; destStatut?: string | null } | null;
}

export default function EleveDetailsModal({ open, eleveId, onClose }: EleveDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eleve, setEleve] = useState<Eleve | null>(null);
  const [seances, setSeances] = useState<EleveSeanceInfo[]>([]);
  const smallScreen = useMediaQuery('(max-width:700px)');

  useEffect(() => {
    if (!open || !eleveId) return;
    setLoading(true);
    setError(null);
    eleveService.getEleveDetails(eleveId)
      .then(data => {
        setEleve(data.eleve);
        setSeances(data.seances);
      })
      .catch(e => setError(e.message || 'Erreur chargement élève'))
      .finally(() => setLoading(false));
  }, [open, eleveId]);

  const age = useMemo(() => {
    if (!eleve?.dateNaissance) return null;
    const birth = dayjs(eleve.dateNaissance);
    return dayjs().diff(birth, 'year');
  }, [eleve]);

  const getWeekNumber = (date: Date): number => {
    // ISO week number calculation (same logic as in AttendanceView)
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const groupedByWeek = useMemo(() => {
    const map = new Map<number, EleveSeanceInfo[]>();
    seances.forEach(s => {
      const w = (s.weekNumber != null) ? s.weekNumber : getWeekNumber(new Date(s.dateHeure));
      if (!map.has(w)) map.set(w, []);
      map.get(w)!.push(s);
    });
    return Array.from(map.entries()).sort((a,b)=>a[0]-b[0]);
  }, [seances]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={smallScreen ? 'md' : 'sm'}
      PaperProps={{ sx: { bgcolor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', maxHeight: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="h6" fontWeight={600}>Détails élève</Typography>
          {eleve && <Chip label={`${eleve.prenom} ${eleve.nom}`} color="primary"/>}
          {eleve?.rrRestantes != null && <Chip size="small" label={`RR restantes: ${eleve.rrRestantes}`} color={(eleve.rrRestantes || 0) > 0 ? 'success' : 'default'} />}
          {age != null && <Chip size="small" label={`Âge: ${age}`} />}
          {eleve?.retourSeul && <Chip size="small" label="Retour seul" color="warning" />}
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--color-text-secondary)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1, pb: 2 }}>
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh"><CircularProgress /></Box>
        )}
        {!loading && eleve && (
          <Box display="flex" flexDirection="column" gap={2} sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Informations</Typography>
              <Box display="grid" gap={0.5} sx={{ gridTemplateColumns: '1fr 1fr' }}>
                <InfoRow label="Nom" value={`${eleve.prenom} ${eleve.nom}`} />
                <InfoRow label="Âge" value={age != null ? String(age) : ''} />
                <InfoRow label="RR restantes" value={eleve.rrRestantes != null ? String(eleve.rrRestantes) : ''} />
                <InfoRow label="Retour seul" value={eleve.retourSeul ? 'Oui' : ''} />
                <InfoRow label="Récupéré par" value={eleve.recuperePar || ''} />
                <InfoRow label="Période" value={eleve.periodeInscription || ''} />
              </Box>
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" gutterBottom>Responsables</Typography>
              <Box display="grid" gap={0.5} sx={{ gridTemplateColumns: '1fr 1fr' }}>
                <InfoRow label="Resp.1" value={eleve.nomCompletResponsable1 || ''} />
                <InfoRow label="Relation 1" value={eleve.relationResponsable1 || ''} />
                <InfoRow label="GSM 1" value={eleve.gsmResponsable1 || ''} />
                <InfoRow label="Mail 1" value={eleve.mailResponsable1 || ''} />
                <InfoRow label="Resp.2" value={eleve.nomCompletResponsable2 || ''} />
                <InfoRow label="Relation 2" value={eleve.relationResponsable2 || ''} />
                <InfoRow label="GSM 2" value={eleve.gsmResponsable2 || ''} />
                <InfoRow label="Mail 2" value={eleve.mailResponsable2 || ''} />
                <InfoRow label="Resp.3" value={eleve.nomCompletResponsable3 || ''} />
                <InfoRow label="Relation 3" value={eleve.relationResponsable3 || ''} />
                <InfoRow label="GSM 3" value={eleve.gsmResponsable3 || ''} />
                <InfoRow label="Mail 3" value={eleve.mailResponsable3 || ''} />
              </Box>
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" gutterBottom>Présences</Typography>
              {groupedByWeek.length === 0 && <Typography variant="body2" color="text.secondary">Aucune séance.</Typography>}
              {groupedByWeek.map(([week, list]) => (
                <Box key={week} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>Semaine {week}</Typography>
                  <List dense sx={{ p:0, bgcolor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-light)', borderRadius: 1 }}>
                    {list.map(s => {
                      const date = dayjs(s.dateHeure);
                      const statut = s.attendance?.statut || 'no_status';
                      const rrMark = s.rr ? (s.rr.type === 'origin' ? ' (RR o)' : ' (RR d)') : '';
                      const primary = `${date.format('DD/MM HH:mm')} · ${s.classe.nom}`;
                      const secondary = `${statut}${rrMark}`;
                      return (
                        <ListItem key={s.id} sx={{ py:0.25 }}>
                          <ListItemText primaryTypographyProps={{ variant:'caption' }} secondaryTypographyProps={{ variant:'caption', color:'text.secondary' }} primary={primary} secondary={secondary} />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box display="flex" gap={0.5}>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>{label}:</Typography>
      <Typography variant="caption" sx={{ color: value ? 'inherit' : 'var(--color-text-secondary)' }}>{value || ''}</Typography>
    </Box>
  );
}
