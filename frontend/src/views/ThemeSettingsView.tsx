'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Switch, FormControlLabel, Divider, Card, CardContent } from '@mui/material';
import { Brightness4, Brightness7, Palette, Save, Refresh } from '@mui/icons-material';
import { usePageTheme } from '../components/layout/PageThemeProvider';

interface CustomTheme {
  isDarkMode: boolean;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  textPrimary: string;
  textSecondary: string;
  cardBackground: string;
  borderColor: string;
}

const defaultLightTheme: CustomTheme = {
  isDarkMode: false,
  backgroundColor: '#ffffff',
  primaryColor: '#1976d2',
  secondaryColor: '#dc004e',
  textPrimary: '#000000',
  textSecondary: '#666666',
  cardBackground: '#f5f5f5',
  borderColor: '#e0e0e0',
};

const defaultDarkTheme: CustomTheme = {
  isDarkMode: true,
  backgroundColor: '#121212',
  primaryColor: '#90caf9',
  secondaryColor: '#f48fb1',
  textPrimary: '#ffffff',
  textSecondary: '#b0b0b0',
  cardBackground: '#1e1e1e',
  borderColor: '#333333',
};

export default function ThemeSettingsView() {
  const { isDarkMode, toggleTheme } = usePageTheme();
  const [customTheme, setCustomTheme] = useState<CustomTheme>(defaultDarkTheme);
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('dark');

  // Load saved theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('customTheme');
    const savedMode = localStorage.getItem('theme');

    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        setCustomTheme(parsedTheme);
        setPreviewMode(parsedTheme.isDarkMode ? 'dark' : 'light');
      } catch (error) {
        console.error('Error loading saved theme:', error);
        // Fallback to default theme based on mode
        const defaultTheme = savedMode === 'dark' ? defaultDarkTheme : defaultLightTheme;
        setCustomTheme(defaultTheme);
        setPreviewMode(savedMode === 'dark' ? 'dark' : 'light');
      }
    } else {
      // No custom theme saved, use default based on current mode
      const currentMode = savedMode === 'dark';
      const defaultTheme = currentMode ? defaultDarkTheme : defaultLightTheme;
      setCustomTheme(defaultTheme);
      setPreviewMode(currentMode ? 'dark' : 'light');
    }
  }, []);

  // Update preview when theme changes
  useEffect(() => {
    setPreviewMode(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleColorChange = (field: keyof CustomTheme, value: string) => {
    setCustomTheme(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleModeToggle = (isDark: boolean) => {
    const newTheme = isDark ? defaultDarkTheme : defaultLightTheme;
    setCustomTheme({
      ...newTheme,
      isDarkMode: isDark
    });
    setPreviewMode(isDark ? 'dark' : 'light');
  };

  const saveTheme = () => {
    localStorage.setItem('customTheme', JSON.stringify(customTheme));
    localStorage.setItem('theme', customTheme.isDarkMode ? 'dark' : 'light');

    // Apply theme immediately
    applyTheme();

    // Show success feedback (you could add a snackbar here)
    alert('Thème sauvegardé avec succès!');

    // Force page reload to ensure all components use the new theme
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const resetToDefault = () => {
    const defaultTheme = isDarkMode ? defaultDarkTheme : defaultLightTheme;
    setCustomTheme(defaultTheme);
    localStorage.removeItem('customTheme');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

    // Reset CSS variables to defaults
    const root = document.documentElement;
    root.style.setProperty('--color-bg-primary', defaultTheme.backgroundColor);
    root.style.setProperty('--color-bg-secondary', defaultTheme.cardBackground);
    root.style.setProperty('--color-primary-500', defaultTheme.primaryColor);
    root.style.setProperty('--color-secondary-500', defaultTheme.secondaryColor);
    root.style.setProperty('--color-text-primary', defaultTheme.textPrimary);
    root.style.setProperty('--color-text-secondary', defaultTheme.textSecondary);
    root.style.setProperty('--color-border-light', defaultTheme.borderColor);

    // Force page reload to apply default theme
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const applyTheme = () => {
    // Apply theme to CSS variables
    const root = document.documentElement;
    root.style.setProperty('--color-bg-primary', customTheme.backgroundColor);
    root.style.setProperty('--color-bg-secondary', customTheme.cardBackground);
    root.style.setProperty('--color-primary-500', customTheme.primaryColor);
    root.style.setProperty('--color-secondary-500', customTheme.secondaryColor);
    root.style.setProperty('--color-text-primary', customTheme.textPrimary);
    root.style.setProperty('--color-text-secondary', customTheme.textSecondary);
    root.style.setProperty('--color-border-light', customTheme.borderColor);
  };

  // Apply theme on changes for live preview
  useEffect(() => {
    applyTheme();
  }, [customTheme]);

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: customTheme.backgroundColor,
      color: customTheme.textPrimary,
      transition: 'all 0.3s ease'
    }}>

      <Box sx={{ p: 4, maxWidth: '1200px', mx: 'auto' }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Palette sx={{ fontSize: '2rem', color: customTheme.primaryColor }} />
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Paramètres du thème
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {/* Theme Mode Toggle */}
          <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
            <Card sx={{
              backgroundColor: customTheme.cardBackground,
              border: `1px solid ${customTheme.borderColor}`,
              borderRadius: 2
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  {previewMode === 'dark' ? <Brightness4 /> : <Brightness7 />}
                  Mode du thème
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Typography>Clair</Typography>
                  <Switch
                    checked={customTheme.isDarkMode}
                    onChange={(e) => handleModeToggle(e.target.checked)}
                    color="primary"
                  />
                  <Typography>Sombre</Typography>
                </Box>

                <Typography variant="body2" sx={{ color: customTheme.textSecondary }}>
                  Basculez entre le mode clair et sombre pour voir les changements en temps réel.
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Quick Actions */}
          <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
            <Card sx={{
              backgroundColor: customTheme.cardBackground,
              border: `1px solid ${customTheme.borderColor}`,
              borderRadius: 2
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Actions rapides
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveTheme}
                    sx={{
                      backgroundColor: customTheme.primaryColor,
                      '&:hover': { backgroundColor: customTheme.primaryColor + 'dd' }
                    }}
                  >
                    Sauvegarder le thème
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={resetToDefault}
                    sx={{
                      borderColor: customTheme.borderColor,
                      color: customTheme.textPrimary,
                      '&:hover': { backgroundColor: customTheme.cardBackground + '80' }
                    }}
                  >
                    Réinitialiser par défaut
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Color Customization */}
        <Box sx={{ width: '100%' }}>
          <Card sx={{
            backgroundColor: customTheme.cardBackground,
            border: `1px solid ${customTheme.borderColor}`,
            borderRadius: 2
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Personnalisation des couleurs
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 30%', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Couleur de fond"
                    type="color"
                    value={customTheme.backgroundColor}
                    onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                    sx={{
                      '& .MuiInputLabel-root': { color: customTheme.textSecondary },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: customTheme.borderColor },
                        '&:hover fieldset': { borderColor: customTheme.primaryColor },
                        '&.Mui-focused fieldset': { borderColor: customTheme.primaryColor },
                      },
                      '& .MuiInputBase-input': { color: customTheme.textPrimary }
                    }}
                  />
                </Box>

                <Box sx={{ flex: '1 1 30%', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Couleur principale"
                    type="color"
                    value={customTheme.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    sx={{
                      '& .MuiInputLabel-root': { color: customTheme.textSecondary },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: customTheme.borderColor },
                        '&:hover fieldset': { borderColor: customTheme.primaryColor },
                        '&.Mui-focused fieldset': { borderColor: customTheme.primaryColor },
                      },
                      '& .MuiInputBase-input': { color: customTheme.textPrimary }
                    }}
                  />
                </Box>

                <Box sx={{ flex: '1 1 30%', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Couleur secondaire"
                    type="color"
                    value={customTheme.secondaryColor}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    sx={{
                      '& .MuiInputLabel-root': { color: customTheme.textSecondary },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: customTheme.borderColor },
                        '&:hover fieldset': { borderColor: customTheme.primaryColor },
                        '&.Mui-focused fieldset': { borderColor: customTheme.primaryColor },
                      },
                      '& .MuiInputBase-input': { color: customTheme.textPrimary }
                    }}
                  />
                </Box>

                <Box sx={{ flex: '1 1 30%', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Texte principal"
                    type="color"
                    value={customTheme.textPrimary}
                    onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                    sx={{
                      '& .MuiInputLabel-root': { color: customTheme.textSecondary },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: customTheme.borderColor },
                        '&:hover fieldset': { borderColor: customTheme.primaryColor },
                        '&.Mui-focused fieldset': { borderColor: customTheme.primaryColor },
                      },
                      '& .MuiInputBase-input': { color: customTheme.textPrimary }
                    }}
                  />
                </Box>

                <Box sx={{ flex: '1 1 30%', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Texte secondaire"
                    type="color"
                    value={customTheme.textSecondary}
                    onChange={(e) => handleColorChange('textSecondary', e.target.value)}
                    sx={{
                      '& .MuiInputLabel-root': { color: customTheme.textSecondary },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: customTheme.borderColor },
                        '&:hover fieldset': { borderColor: customTheme.primaryColor },
                        '&.Mui-focused fieldset': { borderColor: customTheme.primaryColor },
                      },
                      '& .MuiInputBase-input': { color: customTheme.textPrimary }
                    }}
                  />
                </Box>

                <Box sx={{ flex: '1 1 30%', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Fond des cartes"
                    type="color"
                    value={customTheme.cardBackground}
                    onChange={(e) => handleColorChange('cardBackground', e.target.value)}
                    sx={{
                      '& .MuiInputLabel-root': { color: customTheme.textSecondary },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: customTheme.borderColor },
                        '&:hover fieldset': { borderColor: customTheme.primaryColor },
                        '&.Mui-focused fieldset': { borderColor: customTheme.primaryColor },
                      },
                      '& .MuiInputBase-input': { color: customTheme.textPrimary }
                    }}
                  />
                </Box>

                <Box sx={{ flex: '1 1 30%', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Couleur des bordures"
                    type="color"
                    value={customTheme.borderColor}
                    onChange={(e) => handleColorChange('borderColor', e.target.value)}
                    sx={{
                      '& .MuiInputLabel-root': { color: customTheme.textSecondary },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: customTheme.borderColor },
                        '&:hover fieldset': { borderColor: customTheme.primaryColor },
                        '&.Mui-focused fieldset': { borderColor: customTheme.primaryColor },
                      },
                      '& .MuiInputBase-input': { color: customTheme.textPrimary }
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Preview Section */}
        <Box sx={{ width: '100%' }}>
          <Card sx={{
            backgroundColor: customTheme.cardBackground,
            border: `1px solid ${customTheme.borderColor}`,
            borderRadius: 2
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Aperçu du thème
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{
                  p: 2,
                  backgroundColor: customTheme.backgroundColor,
                  border: `1px solid ${customTheme.borderColor}`,
                  borderRadius: 1
                }}>
                  <Typography sx={{ color: customTheme.textPrimary }}>
                    Fond principal - Texte principal
                  </Typography>
                  <Typography sx={{ color: customTheme.textSecondary }}>
                    Fond principal - Texte secondaire
                  </Typography>
                </Box>

                <Box sx={{
                  p: 2,
                  backgroundColor: customTheme.cardBackground,
                  border: `1px solid ${customTheme.borderColor}`,
                  borderRadius: 1
                }}>
                  <Typography sx={{ color: customTheme.textPrimary }}>
                    Fond des cartes - Texte principal
                  </Typography>
                  <Typography sx={{ color: customTheme.textSecondary }}>
                    Fond des cartes - Texte secondaire
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    sx={{ backgroundColor: customTheme.primaryColor }}
                  >
                    Bouton principal
                  </Button>
                  <Button
                    variant="contained"
                    sx={{ backgroundColor: customTheme.secondaryColor }}
                  >
                    Bouton secondaire
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
