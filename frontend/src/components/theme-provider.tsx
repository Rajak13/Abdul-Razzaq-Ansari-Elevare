'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'light2' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Validate theme name to ensure type safety
function isValidTheme(theme: string): theme is Theme {
  return ['light', 'light2', 'dark'].includes(theme);
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Wrapper function to validate theme before setting
  const setTheme = (newTheme: Theme) => {
    if (isValidTheme(newTheme)) {
      setThemeState(newTheme);
    } else {
      console.warn('Invalid theme provided:', newTheme);
    }
  };

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage with error handling
    try {
      const savedTheme = localStorage.getItem('elevare-theme');
      if (savedTheme) {
        // Handle migration from old theme names
        let migratedTheme = savedTheme;
        if (savedTheme === 'educational') {
          migratedTheme = 'light';
        } else if (savedTheme === 'nepali') {
          migratedTheme = 'light2';
        }
        
        if (isValidTheme(migratedTheme)) {
          setThemeState(migratedTheme);
          // Update localStorage with new theme name if migration occurred
          if (migratedTheme !== savedTheme) {
            localStorage.setItem('elevare-theme', migratedTheme);
          }
        }
      }
    } catch (error) {
      // If localStorage is not available, continue with default theme
      console.warn('Theme persistence unavailable:', error);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Apply theme to document with error handling
    try {
      const root = document.documentElement;
      
      // Remove all theme attributes and classes
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
      
      // Apply new theme
      if (theme === 'light2') {
        // Light2 theme (formerly Nepali) uses data-theme attribute for backward compatibility
        root.setAttribute('data-theme', 'nepali');
      } else if (theme === 'dark') {
        // Enhanced dark theme uses CSS class for improved styling
        root.classList.add('dark');
      }
      // Light theme (formerly Educational) is default (no attribute or class needed)

      // Save to localStorage
      localStorage.setItem('elevare-theme', theme);
    } catch (error) {
      // If DOM manipulation or localStorage fails, log warning but continue
      console.warn('Theme application failed:', error);
    }
  }, [theme, mounted]);

  const value = {
    theme,
    setTheme,
  };

  // Always provide context, but prevent theme application until mounted
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
