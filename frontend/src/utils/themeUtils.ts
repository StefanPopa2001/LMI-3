import { colorPalette, getCardColor } from '@/theme';

// Re-export minimal theme bits
export { colorPalette, getCardColor };

// Additional utility functions for common use cases

/**
 * Get status color based on status type
 */
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    'success': colorPalette.success.main,
    'error': colorPalette.error.main,
    'warning': colorPalette.warning.main,
    'info': colorPalette.info.main,
    'default': colorPalette.text.secondary,
    'present': colorPalette.success.main,
    'absent': colorPalette.error.main,
    'no_status': colorPalette.text.disabled,
    'awaiting': colorPalette.warning.main,
  };

  return statusColors[status] || colorPalette.text.secondary;
};

/**
 * Get a complete set of classes for a themed component
 */
// Removed Tailwind class helpers; use MUI sx and theme instead.

/**
 * Get color for specific card types
 */
export const getCardTypeColor = (type: string): string => {
  const cardColors: Record<string, string> = {
    users: colorPalette.cards.users,
    classes: colorPalette.cards.classes,
    attendance: colorPalette.cards.attendance,
    analytics: colorPalette.cards.analytics,
    settings: colorPalette.cards.settings,
    profile: colorPalette.cards.profile,
    default: colorPalette.primary.main,
  };

  return cardColors[type] || cardColors.default;
};

/**
 * Get appropriate text color based on background
 */
export const getContrastText = (backgroundColor: string): string => {
  // Simple contrast calculation - you might want to use a more sophisticated algorithm
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 128 ? colorPalette.text.primary : colorPalette.text.secondary;
};

/**
 * Generate a color palette for a given base color
 */
export const generateColorPalette = (baseColor: string) => {
  // This is a simplified version - you might want to use a color manipulation library
  return {
    50: baseColor, // You would calculate lighter versions
    100: baseColor,
    200: baseColor,
    300: baseColor,
    400: baseColor,
    500: baseColor,
    600: baseColor,
    700: baseColor,
    800: baseColor,
    900: baseColor,
  };
};

/**
 * Apply theme to a component's style object
 */
export const applyTheme = (componentStyles: Record<string, any>) => {
  const themedStyles = { ...componentStyles };

  // Replace theme variables with actual colors
  Object.keys(themedStyles).forEach(key => {
    if (typeof themedStyles[key] === 'string') {
      themedStyles[key] = themedStyles[key]
        .replace(/theme-bg-primary/g, colorPalette.background.default)
        .replace(/theme-bg-secondary/g, colorPalette.background.paper)
        .replace(/theme-text-primary/g, colorPalette.text.primary)
        .replace(/theme-text-secondary/g, colorPalette.text.secondary)
        .replace(/theme-border-light/g, colorPalette.border.light);
    }
  });

  return themedStyles;
};

/**
 * Hook for using theme colors in components
 */
export const useThemeColors = () => {
  return {
    colors: colorPalette,
    getCardColor,
    getStatusColor,
    getCardTypeColor,
    getContrastText,
  };
};

// Type definitions
export type ThemeColors = typeof colorPalette;
// Tailwind types removed
