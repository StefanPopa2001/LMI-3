import { colorPalette, tailwindColors, getCardColor, getTailwindClasses } from '@/theme';

// Re-export everything from ThemeRegistry for easy access
export { colorPalette, tailwindColors, getCardColor, getTailwindClasses };

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
  // Page layouts
  page: {
    container: 'min-h-screen bg-gray-900 text-white',
    header: 'bg-gray-800 p-6 border-b border-gray-600',
    content: 'p-6',
  },

  // Cards
  card: {
    base: 'bg-gray-800 rounded-lg border border-gray-600 shadow-lg transition-all duration-200',
    hover: 'hover:shadow-xl hover:border-blue-500',
    header: 'p-4 border-b border-gray-600',
    body: 'p-4',
    footer: 'p-4 border-t border-gray-600',
  },

  // Forms
  form: {
    input: 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500',
    label: 'text-white font-medium',
    error: 'text-red-400 text-sm',
    success: 'text-green-400 text-sm',
  },

  // Buttons
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 font-medium px-4 py-2 rounded-lg transition-colors',
    success: 'bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors',
  },

  // Navigation
  nav: {
    item: 'text-gray-300 hover:text-white px-3 py-2 rounded-md transition-colors',
    active: 'bg-blue-600 text-white',
  },

  // Status indicators
  status: {
    success: 'bg-success-500 text-white px-2 py-1 rounded-full text-xs font-medium',
    error: 'bg-error-500 text-white px-2 py-1 rounded-full text-xs font-medium',
    warning: 'bg-warning-500 text-white px-2 py-1 rounded-full text-xs font-medium',
    info: 'bg-info-500 text-white px-2 py-1 rounded-full text-xs font-medium',
  },
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
    tailwind: tailwindColors,
    getCardColor,
    getStatusColor,
    getTailwindClasses,
    getCardTypeColor,
    getContrastText,
    getThemedClasses,
  };
};

// Type definitions
export type ThemeColors = typeof colorPalette;
export type TailwindThemeColors = typeof tailwindColors;
export type ThemedClasses = typeof getThemedClasses;
