'use client';

import { useTheme } from './theme-provider';
import { Sun, Palette, Moon } from 'lucide-react';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-1 shadow-sm">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-full transition-colors ${
          theme === 'light'
            ? 'bg-primary text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Light Theme"
        aria-label="Light Theme"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('light2')}
        className={`p-1.5 rounded-full transition-colors ${
          theme === 'light2'
            ? 'bg-primary text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Light 2 Theme"
        aria-label="Light 2 Theme"
      >
        <Palette className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-full transition-colors ${
          theme === 'dark'
            ? 'bg-primary text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Dark Theme"
        aria-label="Dark Theme"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}
