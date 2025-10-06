"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '../components/layout/NavBar';
import { toast } from 'react-toastify';
import { settingsService, Setting, GroupedSettings, CreateSettingData } from '../services/settingsService';
import ThemeRegistry from '../theme/ThemeRegistry';
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Close, Delete, Edit } from '@mui/icons-material';
import authService from '../services/authService';

const categoryLabels: Record<string, string> = {
  level: 'Niveaux de cours',
  typeCours: 'Types de cours',
  location: 'Emplacements',
  salle: 'Salles',
};

const categoryDescriptions: Record<string, string> = {
  level: "Gérez les différents niveaux des cours (modules)",
  typeCours: 'Définissez les types de cours disponibles',
  location: 'Configurez les différents emplacements des cours',
  salle: 'Gérez les salles disponibles pour les cours',
};

export default function SettingsView() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<GroupedSettings>({});
  const [activeCategory, setActiveCategory] = useState<keyof typeof categoryLabels>('level');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [formData, setFormData] = useState<CreateSettingData>({ category: 'level', value: '', label: '', description: '', order: 0 });

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (!authService.isAdmin()) {
      router.push('/dashboard');
      return;
    }
    loadSettings();
  }, [mounted]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getAllSettings();
      setSettings(data);
    } catch (err: any) {
      if (err.message?.startsWith('AUTH_ERROR:')) {
        router.push('/login');
        return;
      }
      toast.error(err.message || 'Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const currentSettings = useMemo(() => settings[activeCategory] || [], [settings, activeCategory]);

  const openCreate = () => {
    setEditingSetting(null);
    setFormData({ category: activeCategory, value: '', label: '', description: '', order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (s: Setting) => {
    setEditingSetting(s);
    setFormData({ category: s.category, value: s.value, label: s.label || '', description: s.description || '', order: s.order || 0 });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSetting(null);
  };

  const onSubmit = async () => {
    try {
      if (editingSetting) {
        await settingsService.updateSetting(editingSetting.id, {
          value: formData.value,
          label: formData.label,
          description: formData.description,
          order: formData.order,
        });
        toast.success('Paramètre mis à jour');
      } else {
        await settingsService.createSetting(formData);
        toast.success('Paramètre créé');
      }
      closeDialog();
      await loadSettings();
    } catch (err: any) {
      toast.error(err.message || 'Opération impossible');
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm('Supprimer ce paramètre ?')) return;
    try {
      await settingsService.deleteSetting(id);
      toast.success('Paramètre supprimé');
      await loadSettings();
    } catch (err: any) {
      toast.error(err.message || 'Suppression impossible');
    }
  };

  if (!mounted) {
    return (
      <ThemeRegistry>
        <NavBar />
        <Container sx={{ py: 6, mt: 10 }}>
          <Typography>Chargement…</Typography>
        </Container>
      </ThemeRegistry>
    );
  }

  if (!authService.isAuthenticated() || !authService.isAdmin()) return null;

  return (
    <ThemeRegistry>
      <NavBar />
      <Container maxWidth="lg" sx={{ py: 6, mt: 10 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>Paramètres des cours</Typography>
            <Typography variant="body2" color="text.secondary">Gérez les options disponibles pour les classes et les cours.</Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Ajouter</Button>
        </Stack>

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '300px 1fr' } }}>
          {/* Sidebar categories */}
          <Box>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Catégories</Typography>
              <Stack spacing={1}>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={activeCategory === key ? 'contained' : 'text'}
                    color={activeCategory === key ? 'primary' : 'inherit'}
                    onClick={() => setActiveCategory(key as any)}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{label}</span>
                      <Chip size="small" label={(settings[key] || []).length} />
                    </Stack>
                  </Button>
                ))}
              </Stack>
            </Paper>
          </Box>

          {/* Content */}
          <Box>
            <Paper variant="outlined">
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>{categoryLabels[activeCategory]}</Typography>
                <Typography variant="body2" color="text.secondary">{categoryDescriptions[activeCategory]}</Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {currentSettings.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    Aucun paramètre configuré pour cette catégorie.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {currentSettings.map((s) => (
                      <Paper key={s.id} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography fontWeight={600}>{s.label || s.value}</Typography>
                            <Chip size="small" label={s.value} />
                            {s.order != null && <Chip size="small" color="primary" label={`Ordre: ${s.order}`} />}
                          </Stack>
                          {s.description && (
                            <Typography variant="body2" color="text.secondary">{s.description}</Typography>
                          )}
                        </Box>
                        <Box>
                          <IconButton onClick={() => openEdit(s)} aria-label="edit"><Edit /></IconButton>
                          <IconButton onClick={() => onDelete(s.id)} aria-label="delete" color="error"><Delete /></IconButton>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Create/Edit dialog */}
        <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editingSetting ? 'Modifier le paramètre' : 'Ajouter un paramètre'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth disabled={!!editingSetting}>
                <InputLabel id="category-label">Catégorie</InputLabel>
                <Select
                  labelId="category-label"
                  label="Catégorie"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label="Valeur" required value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} />
              <TextField label="Libellé" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} />
              <TextField label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline minRows={2} />
              <TextField label="Ordre d'affichage" type="number" value={formData.order ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value || '0', 10) })} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} startIcon={<Close />}>Annuler</Button>
            <Button onClick={onSubmit} variant="contained">{editingSetting ? 'Enregistrer' : 'Ajouter'}</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeRegistry>
  );
}
