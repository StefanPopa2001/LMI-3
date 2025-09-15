"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Container, Card, CardContent, Avatar, IconButton, Select, MenuItem, FormControl, InputLabel, Tooltip, Alert, Divider } from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Person as PersonIcon, ChevronLeft, ChevronRight, RestartAlt } from '@mui/icons-material';

import NavBar from '../components/layout/NavBar';
import { permanenceService, type PermanenceSlot } from '@/services/permanenceService';
import { authService, type User } from '@/services/authService';
import { attendanceCalendarService, type AttendanceDayDTO } from '@/services/attendanceCalendarService';

const days = [
  { label: 'Lundi', value: 1 },
  { label: 'Mardi', value: 2 },
  { label: 'Mercredi', value: 3 },
  { label: 'Jeudi', value: 4 },
  { label: 'Vendredi', value: 5 },
  { label: 'Samedi', value: 6 },
  { label: 'Dimanche', value: 0 },
];

const periods: Array<'AM' | 'PM'> = ['AM', 'PM'];

export default function PermanenceView() {
  const [slots, setSlots] = useState<PermanenceSlot[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, number | ''>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set()); // YYYY-MM-DD

  const isAdmin = authService.isAdmin();

  const keyFor = (day: number, period: 'AM' | 'PM') => `${day}-${period}`;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await permanenceService.getWeeklyPermanence();
      setSlots(data);
      if (isAdmin) {
        try {
          const userList = await authService.getAllUsers();
          setUsers(userList);
        } catch (e) {
          // ignore if cannot fetch users
        }
      }
      // seed selected state
      const sel: Record<string, number | ''> = {};
      data.forEach(s => { sel[keyFor(s.dayOfWeek, s.period)] = s.userId ?? ''; });
      setSelected(sel);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    loadCalendar(year);
  }, [year]);

  const loadCalendar = async (y: number) => {
    try {
      const days = await attendanceCalendarService.getYear(y);
      setSelectedDates(new Set(days.map(d => d.date)));
    } catch (e: any) {
      // calendar is admin-only; ignore for non-admins
    }
  };

  const slotMap = useMemo(() => {
    const map: Record<string, PermanenceSlot | undefined> = {};
    for (const s of slots) {
      map[keyFor(s.dayOfWeek, s.period)] = s;
    }
    return map;
  }, [slots]);

  const handleEdit = (day: number, period: 'AM' | 'PM') => {
    setEditing(prev => ({ ...prev, [keyFor(day, period)]: true }));
  };

  const handleSave = async (day: number, period: 'AM' | 'PM') => {
    const k = keyFor(day, period);
    const userId = selected[k] === '' ? null : Number(selected[k]);
    try {
      const updated = await permanenceService.updateSlot(day, period, userId, null);
      setSlots(prev => prev.map(s => (s.dayOfWeek === day && s.period === period ? updated : s)));
      setEditing(prev => ({ ...prev, [k]: false }));
      setSuccess('Permanence mise à jour');
      setTimeout(() => setSuccess(null), 2000);
    } catch (e: any) {
      setError(e.message || 'Échec de la mise à jour');
    }
  };

  const handleSelectChange = (day: number, period: 'AM' | 'PM', value: number | '') => {
    setSelected(prev => ({ ...prev, [keyFor(day, period)]: value }));
  };

  const renderCard = (day: number, period: 'AM' | 'PM') => {
    const k = keyFor(day, period);
    const slot = slotMap[k];
    const assignedUser = slot?.user;
    const isEditing = !!editing[k];
    return (
      <Card variant="outlined" sx={{
        height: '100%',
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-light)'
      }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'var(--color-text-primary)' }}>{period === 'AM' ? 'Matin' : 'Après-midi'}</Typography>
            {isAdmin && !isEditing && (
              <Tooltip title="Modifier">
                <IconButton size="small" onClick={() => handleEdit(day, period)} sx={{ color: 'var(--color-text-primary)' }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {isAdmin && isEditing && (
              <Tooltip title="Enregistrer">
                <IconButton size="small" onClick={() => handleSave(day, period)} sx={{ color: 'var(--color-accentuation-blue)' }}>
                  <SaveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {!isEditing && (
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{
                bgcolor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-light)'
              }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={600} sx={{ color: 'var(--color-text-primary)' }}>
                  {assignedUser ? `${assignedUser.prenom} ${assignedUser.nom}` : 'Non assigné'}
                </Typography>
                {slot?.notes && (
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>{slot.notes}</Typography>
                )}
              </Box>
            </Box>
          )}

          {isAdmin && isEditing && (
            <Box display="flex" alignItems="center" gap={2}>
              <FormControl size="small" fullWidth>
                <InputLabel id={`sel-${k}`} sx={{ color: 'var(--color-text-secondary)' }}>Membre</InputLabel>
                <Select
                  labelId={`sel-${k}`}
                  label="Membre"
                  value={selected[k] ?? ''}
                  onChange={(e) => handleSelectChange(day, period, e.target.value as number | '')}
                  sx={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-light)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-medium)' },
                    '& .MuiSvgIcon-root': { color: 'var(--color-text-secondary)' }
                  }}
                >
                  <MenuItem value="" sx={{ color: 'var(--color-text-primary)' }}>
                    <em>Non assigné</em>
                  </MenuItem>
                  {users.map(u => (
                    <MenuItem key={u.id} value={u.id} sx={{ color: 'var(--color-text-primary)' }}>{u.prenom} {u.nom}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  const daysInMonth = (y: number, m: number) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  const toggleDay = async (dateStr: string) => {
    if (!authService.isAdmin()) return; // restrict to admin
    const active = !selectedDates.has(dateStr);
    try {
      await attendanceCalendarService.toggle(dateStr, active);
      setSelectedDates(prev => {
        const next = new Set(prev);
        if (active) next.add(dateStr); else next.delete(dateStr);
        return next;
      });
    } catch (e: any) {
      setError(e.message || 'Échec mise à jour calendrier');
    }
  };

  const resetYear = async () => {
    if (!authService.isAdmin()) return;
    if (!confirm('Confirmer la réinitialisation de toutes les dates sélectionnées pour cette année ?')) return;
    try {
      await attendanceCalendarService.reset(year);
      setSelectedDates(new Set());
      setSuccess('Calendrier réinitialisé');
      setTimeout(() => setSuccess(null), 2000);
    } catch (e: any) {
      setError(e.message || 'Échec de la réinitialisation');
    }
  };

  const renderMonth = (m: number) => {
    const firstDay = new Date(Date.UTC(year, m, 1)).getUTCDay(); // 0=Sun .. 6=Sat
    const total = daysInMonth(year, m);
    const cells: Array<{ label?: string; date?: string; }> = [];
    const leading = (firstDay + 6) % 7; // convert to Monday=0..Sunday=6
    for (let i = 0; i < leading; i++) cells.push({});
    for (let d = 1; d <= total; d++) {
      const dateStr = `${year}-${pad(m+1)}-${pad(d)}`;
      cells.push({ label: String(d), date: dateStr });
    }
    // pad trailing to full weeks
    while (cells.length % 7 !== 0) cells.push({});

    return (
      <Card variant="outlined" sx={{ p: 1, backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-light)' }} key={m}>
        <Typography variant="subtitle1" align="center" sx={{ mb: 1, fontWeight: 600, color: 'var(--color-text-primary)' }}>{months[m]}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {['L','M','M','J','V','S','D'].map((d, i) => (
            <Box key={i} sx={{ fontSize: 12, textAlign: 'center', color: 'var(--color-text-secondary)', py: 0.5 }}>{d}</Box>
          ))}
          {cells.map((c, idx) => {
            const active = !!(c.date && selectedDates.has(c.date));
            return (
              <Box key={idx}
                   onClick={() => c.date && toggleDay(c.date)}
                   sx={{
                     height: 28,
                     borderRadius: 1,
                     textAlign: 'center',
                     lineHeight: '28px',
                     cursor: c.date && isAdmin ? 'pointer' : 'default',
                     userSelect: 'none',
                     bgcolor: active ? 'var(--color-primary-main, var(--color-accentuation-blue))' : 'transparent',
                     color: active ? 'var(--color-text-on-primary, #fff)' : 'var(--color-text-primary)',
                     border: '1px solid',
                     borderColor: active ? 'var(--color-primary-main, var(--color-accentuation-blue))' : 'var(--color-border-light)',
                     '&:hover': c.date && isAdmin ? { bgcolor: active ? 'var(--color-primary-dark, var(--color-accentuation-blue-dark))' : 'var(--color-bg-tertiary)' } : undefined,
                   }}>
                {c.label || ''}
              </Box>
            );
          })}
        </Box>
      </Card>
    );
  };

  return (
    <>
      <NavBar />
      <Container maxWidth="xl" sx={{ mt: 10, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" mb={{ xs: 2, sm: 4 }}>
          <Typography variant="h1" component="h1" sx={{ 
            textAlign: 'center', 
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' }, 
            fontWeight: 'bold',
            color: 'var(--color-text-primary)'
          }}>
            Permanence
          </Typography>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              backgroundColor: 'var(--color-accentuation-red)',
              color: 'var(--color-text-on-danger, #fff)'
            }}
          >
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            sx={{
              mb: 2,
              backgroundColor: 'var(--color-accentuation-green)',
              color: 'var(--color-text-on-success, #fff)'
            }}
          >
            {success}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' } }}>
          {/* Left: Permanence weekly grid */}
          <Box>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1fr 1fr',
                  lg: '1fr 1fr',
                },
              }}
            >
              {days.map((d) => (
                <Box key={d.value}>
                  <Card sx={{
                    mb: 2,
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-light)'
                  }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ color: 'var(--color-text-primary)' }}>{d.label}</Typography>
                      <Box sx={{ display: 'grid', gap: 2 }}>
                        {periods.map((p) => (
                          <Box key={p}>{renderCard(d.value, p)}</Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Right: Attendance calendar */}
          <Box>
            <Card sx={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)'
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h6" sx={{ color: 'var(--color-text-primary)' }}>Jours de présence ({year})</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Tooltip title="Année précédente">
                      <span>
                        <IconButton onClick={() => setYear(y => y - 1)} sx={{ color: 'var(--color-text-primary)' }}><ChevronLeft /></IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Année suivante">
                      <span>
                        <IconButton onClick={() => setYear(y => y + 1)} sx={{ color: 'var(--color-text-primary)' }}><ChevronRight /></IconButton>
                      </span>
                    </Tooltip>
                    {isAdmin && (
                      <Tooltip title="Réinitialiser l'année">
                        <span>
                          <IconButton sx={{ color: 'var(--color-accentuation-red)' }} onClick={resetYear}><RestartAlt /></IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
                <Divider sx={{ mb: 2, borderColor: 'var(--color-border-light)' }} />
                <Box sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '1fr 1fr',
                    md: '1fr 1fr',
                  }
                }}>
                  {Array.from({ length: 12 }).map((_, m) => renderMonth(m))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </>
  );
}
