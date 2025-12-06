'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'educational' | 'nepali' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('educational');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('elevare-theme') as Theme;
    if (savedTheme && ['educational', 'nepali', 'dark'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Apply theme to document
    const root = document.documentElement;
    
    // Remove all theme attributes
    root.removeAttribute('data-theme');
    
    // Apply new theme (educational is default, no attribute needed)
    if (theme === 'nepali' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
    }

    // Save to localStorage
    localStorage.setItem('elevare-theme', theme);
  }, [theme, mounted]);

  const value = {
    theme,
    setTheme,
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
