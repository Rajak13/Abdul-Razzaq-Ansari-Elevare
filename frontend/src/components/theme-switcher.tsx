'use client';

import { useTheme } from './theme-provider';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
      <button
        onClick={() => setTheme('educational')}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          theme === 'educational'
            ? 'bg-primary text-white'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Educational Theme"
      >
        Educational
      </button>
      <button
        onClick={() => setTheme('nepali')}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          theme === 'nepali'
            ? 'bg-primary text-white'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Nepali Theme"
      >
        Nepali
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          theme === 'dark'
            ? 'bg-primary text-white'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Dark Theme"
      >
        Dark
      </button>
    </div>
  );
}
