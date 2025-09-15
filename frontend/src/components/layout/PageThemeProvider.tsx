'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from '@mui/material';
import { usePathname } from 'next/navigation';
import { pageThemes, defaultTheme, getPageTheme, pageRouteMapping } from '@/themes/pageThemes';

// Context for theme management
interface ThemeContextType {
  currentTheme: Theme;
  currentPage: string;
  isDarkMode: boolean;
  setPageTheme: (pageName: string) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hook to use theme context
export const usePageTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('usePageTheme must be used within a PageThemeProvider');
  }
  return context;
};

// Theme provider component
interface PageThemeProviderProps {
  children: React.ReactNode;
}

export default function PageThemeProvider({ children }: PageThemeProviderProps) {
  const pathname = usePathname();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>(() =>
    createTheme(getPageTheme('dashboard'))
  );

  // Function to apply default theme colors to CSS variables
  const applyDefaultTheme = (isDark: boolean) => {
    const root = document.documentElement;
    if (isDark) {
      // Dark theme colors
      root.style.setProperty('--color-bg-primary', '#121212');
      root.style.setProperty('--color-bg-secondary', '#1e1e1e');
      root.style.setProperty('--color-bg-tertiary', '#2a2a2a');
      root.style.setProperty('--color-primary-500', '#2196f3');
      root.style.setProperty('--color-primary-600', '#1976d2');
      root.style.setProperty('--color-secondary-500', '#03dac6');
      root.style.setProperty('--color-text-primary', '#ffffff');
      root.style.setProperty('--color-text-secondary', '#b0b0b0');
      root.style.setProperty('--color-border-light', '#333333');
      root.style.setProperty('--color-error-500', '#f44336');
      root.style.setProperty('--color-success-500', '#4caf50');
      root.style.setProperty('--color-warning-500', '#ff9800');
    } else {
      // Light theme colors
      root.style.setProperty('--color-bg-primary', '#f5f5f7');
      root.style.setProperty('--color-bg-secondary', '#ffffff');
      root.style.setProperty('--color-bg-tertiary', '#f8f9fa');
      root.style.setProperty('--color-primary-500', '#1976d2');
      root.style.setProperty('--color-primary-600', '#1565c0');
      root.style.setProperty('--color-secondary-500', '#dc004e');
      root.style.setProperty('--color-text-primary', '#1a1a1a');
      root.style.setProperty('--color-text-secondary', '#666666');
      root.style.setProperty('--color-border-light', '#e0e0e0');
      root.style.setProperty('--color-error-500', '#d32f2f');
      root.style.setProperty('--color-success-500', '#2e7d32');
      root.style.setProperty('--color-warning-500', '#f57c00');
    }
  };

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedCustomTheme = localStorage.getItem('customTheme');

    if (savedCustomTheme) {
      try {
        const customTheme = JSON.parse(savedCustomTheme);
        setIsDarkMode(customTheme.isDarkMode);

        // Apply custom theme to CSS variables
        const root = document.documentElement;
        root.style.setProperty('--color-bg-primary', customTheme.backgroundColor);
        root.style.setProperty('--color-bg-secondary', customTheme.cardBackground);
        root.style.setProperty('--color-bg-tertiary', customTheme.cardBackground || customTheme.backgroundColor);
        root.style.setProperty('--color-primary-500', customTheme.primaryColor);
        root.style.setProperty('--color-primary-600', customTheme.primaryColor + 'cc');
        root.style.setProperty('--color-secondary-500', customTheme.secondaryColor);
        root.style.setProperty('--color-text-primary', customTheme.textPrimary);
        root.style.setProperty('--color-text-secondary', customTheme.textSecondary);
        root.style.setProperty('--color-border-light', customTheme.borderColor);
        
        // Set error, success, and warning colors with fallbacks
        const isDark = customTheme.isDarkMode;
        root.style.setProperty('--color-error-500', isDark ? '#f44336' : '#d32f2f');
        root.style.setProperty('--color-success-500', isDark ? '#4caf50' : '#2e7d32');
        root.style.setProperty('--color-warning-500', isDark ? '#ff9800' : '#f57c00');
      } catch (error) {
        console.error('Error loading custom theme:', error);
        // Fallback to default theme
        const isDark = savedTheme === 'dark';
        setIsDarkMode(isDark);
        applyDefaultTheme(isDark);
      }
    } else {
      // No custom theme, use default theme
      const isDark = savedTheme === 'dark';
      setIsDarkMode(isDark);
      applyDefaultTheme(isDark);
    }
  }, []);

  // Update theme when pathname or dark mode changes
  useEffect(() => {
    const pageName = pageRouteMapping[pathname] || 'dashboard';

    const savedCustomTheme = localStorage.getItem('customTheme');
    let customTheme = null;

    if (savedCustomTheme) {
      try {
        customTheme = JSON.parse(savedCustomTheme);
      } catch (error) {
        console.error('Error parsing custom theme:', error);
      }
    }

    setCurrentPage(pageName);

    let themeColors;

    if (customTheme && customTheme.isDarkMode === isDarkMode) {
      // Use custom theme colors
      themeColors = {
        primary: {
          main: customTheme.primaryColor,
          light: customTheme.primaryColor + '80',
          dark: customTheme.primaryColor + 'cc',
          contrastText: '#ffffff',
        },
        secondary: {
          main: customTheme.secondaryColor,
          light: customTheme.secondaryColor + '80',
          dark: customTheme.secondaryColor + 'cc',
          contrastText: '#ffffff',
        },
        background: {
          default: customTheme.backgroundColor,
          paper: customTheme.cardBackground,
        },
        text: {
          primary: customTheme.textPrimary,
          secondary: customTheme.textSecondary,
        },
      };
    } else {
      // Use default page theme
      const pageTheme = getPageTheme(pageName);
      themeColors = {
        ...pageTheme.palette,
        mode: (isDarkMode ? 'dark' : 'light') as 'light' | 'dark',
        ...(isDarkMode && {
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#ffffff',
            secondary: '#b0b0b0',
          },
        }),
      };
    }

    const newTheme = createTheme({
      palette: themeColors,
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(33, 150, 243, 0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 30px rgba(33, 150, 243, 0.15)',
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              textTransform: 'none',
              fontWeight: 600,
              padding: '12px 24px',
            },
          },
        },
      },
    });

    setCurrentTheme(newTheme);
  }, [pathname, isDarkMode]);

  // Function to manually set page theme
  const setPageTheme = (pageName: string) => {
    const savedCustomTheme = localStorage.getItem('customTheme');
    let customTheme = null;

    if (savedCustomTheme) {
      try {
        customTheme = JSON.parse(savedCustomTheme);
      } catch (error) {
        console.error('Error parsing custom theme:', error);
      }
    }

    setCurrentPage(pageName);

    let themeColors;

    if (customTheme && customTheme.isDarkMode === isDarkMode) {
      // Use custom theme colors
      themeColors = {
        primary: {
          main: customTheme.primaryColor,
          light: customTheme.primaryColor + '80',
          dark: customTheme.primaryColor + 'cc',
          contrastText: '#ffffff',
        },
        secondary: {
          main: customTheme.secondaryColor,
          light: customTheme.secondaryColor + '80',
          dark: customTheme.secondaryColor + 'cc',
          contrastText: '#ffffff',
        },
        background: {
          default: customTheme.backgroundColor,
          paper: customTheme.cardBackground,
        },
        text: {
          primary: customTheme.textPrimary,
          secondary: customTheme.textSecondary,
        },
      };
    } else {
      // Use default page theme
      const pageTheme = getPageTheme(pageName);
      themeColors = {
        ...pageTheme.palette,
        mode: (isDarkMode ? 'dark' : 'light') as 'light' | 'dark',
        ...(isDarkMode && {
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#ffffff',
            secondary: '#b0b0b0',
          },
        }),
      };
    }

    const newTheme = createTheme({
      palette: themeColors,
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(33, 150, 243, 0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 30px rgba(33, 150, 243, 0.15)',
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              textTransform: 'none',
              fontWeight: 600,
              padding: '12px 24px',
            },
          },
        },
      },
    });

    setCurrentTheme(newTheme);
  };

  // Function to toggle between light and dark mode
  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    localStorage.setItem('theme', newIsDarkMode ? 'dark' : 'light');

    // Update CSS variables for the new theme
    const root = document.documentElement;
    if (newIsDarkMode) {
      // Dark theme colors
      root.style.setProperty('--color-bg-primary', '#121212');
      root.style.setProperty('--color-bg-secondary', '#1e1e1e');
      root.style.setProperty('--color-bg-tertiary', '#2a2a2a');
      root.style.setProperty('--color-primary-500', '#2196f3');
      root.style.setProperty('--color-primary-600', '#1976d2');
      root.style.setProperty('--color-secondary-500', '#03dac6');
      root.style.setProperty('--color-text-primary', '#ffffff');
      root.style.setProperty('--color-text-secondary', '#b0b0b0');
      root.style.setProperty('--color-border-light', '#333333');
      root.style.setProperty('--color-error-500', '#f44336');
      root.style.setProperty('--color-success-500', '#4caf50');
      root.style.setProperty('--color-warning-500', '#ff9800');
    } else {
      // Light theme colors
      root.style.setProperty('--color-bg-primary', '#f5f5f7');
      root.style.setProperty('--color-bg-secondary', '#ffffff');
      root.style.setProperty('--color-bg-tertiary', '#f8f9fa');
      root.style.setProperty('--color-primary-500', '#1976d2');
      root.style.setProperty('--color-primary-600', '#1565c0');
      root.style.setProperty('--color-secondary-500', '#dc004e');
      root.style.setProperty('--color-text-primary', '#1a1a1a');
      root.style.setProperty('--color-text-secondary', '#666666');
      root.style.setProperty('--color-border-light', '#e0e0e0');
      root.style.setProperty('--color-error-500', '#d32f2f');
      root.style.setProperty('--color-success-500', '#2e7d32');
      root.style.setProperty('--color-warning-500', '#f57c00');
    }
  };

  const contextValue: ThemeContextType = {
    currentTheme,
    currentPage,
    isDarkMode,
    setPageTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={currentTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
