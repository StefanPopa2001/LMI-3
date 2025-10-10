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
export const getThemedClasses = {
  page: {
    container: 'min-h-screen bg-background-default p-6',
    header: 'mb-8',
    content: 'space-y-6'
  },
  card: {
    base: 'bg-background-paper rounded-lg shadow-sm border border-border-light',
    header: 'px-6 py-4 border-b border-border-light',
    body: 'px-6 py-4'
  },
  button: {
    primary: 'bg-primary-main text-primary-contrast hover:bg-primary-dark px-4 py-2 rounded-md font-medium transition-colors',
    secondary: 'bg-secondary-main text-secondary-contrast hover:bg-secondary-dark px-4 py-2 rounded-md font-medium transition-colors',
    success: 'bg-success-main text-success-contrast hover:bg-success-dark px-4 py-2 rounded-md font-medium transition-colors',
    danger: 'bg-error-main text-error-contrast hover:bg-error-dark px-4 py-2 rounded-md font-medium transition-colors'
  },
  form: {
    label: 'block text-sm font-medium text-text-primary',
    input: 'border border-border-light rounded-md px-3 py-2 bg-background-paper text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-transparent'
  },
  status: {
    success: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-main text-success-contrast',
    error: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-main text-error-contrast',
    warning: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-main text-warning-contrast',
    info: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-main text-info-contrast'
  }
};

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
