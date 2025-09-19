// Base color palette & access helpers extracted from old ThemeRegistry.
export const colorPalette = {
  primary: { main: '#90caf9', light: '#e3f2fd', dark: '#42a5f5', contrastText: '#000000' },
  secondary: { main: '#f48fb1', light: '#fce4ec', dark: '#ec407a', contrastText: '#000000' },
  background: { default: '#121212', paper: '#1e1e1e', alt: '#2a2a2a' },
  text: { primary: '#ffffff', secondary: '#b0b0b0', disabled: '#666666' },
  success: { main: '#4caf50', light: '#81c784', dark: '#388e3c' },
  error: { main: '#f44336', light: '#ef5350', dark: '#d32f2f' },
  warning: { main: '#ff9800', light: '#ffb74d', dark: '#f57c00' },
  info: { main: '#2196f3', light: '#64b5f6', dark: '#1976d2' },
  cards: {
    users: '#2196f3',
    classes: '#4caf50',
    attendance: '#ff9800',
    analytics: '#9c27b0',
    settings: '#607d8b',
    profile: '#795548',
  },
  border: { light: '#333333', medium: '#444444', dark: '#555555' },
  accentuation: {
    green: { main: '#4caf50', light: '#81c784', dark: '#388e3c' },
    red: { main: '#f44336', light: '#ef5350', dark: '#d32f2f' },
    yellow: { main: '#ffeb3b', light: '#fff176', dark: '#fbc02d' },
    orange: { main: '#ff9800', light: '#ffb74d', dark: '#f57c00' },
    blue: { main: '#2196f3', light: '#64b5f6', dark: '#1976d2' },
    purple: { main: '#9c27b0', light: '#ba68c8', dark: '#7b1fa2' },
    pink: { main: '#e91e63', light: '#f48fb1', dark: '#c2185b' },
    teal: { main: '#009688', light: '#4db6ac', dark: '#00695c' },
    cyan: { main: '#00bcd4', light: '#4dd0e1', dark: '#0097a7' },
    indigo: { main: '#3f51b5', light: '#7986cb', dark: '#303f9f' },
    brown: { main: '#795548', light: '#a1887f', dark: '#5d4037' },
    grey: { main: '#9e9e9e', light: '#e0e0e0', dark: '#616161' },
  },
};

export const getCardColor = (type: keyof typeof colorPalette.cards) => colorPalette.cards[type];
export const getAccentuationColor = (
  color: keyof typeof colorPalette.accentuation,
  shade: 'main' | 'light' | 'dark' = 'main'
) => colorPalette.accentuation[color][shade];

export type ColorPalette = typeof colorPalette;
