'use client';

import { useTheme } from './theme-provider';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
      <button
        onClick={() => setTheme('light')}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          theme === 'light'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Light Theme"
      >
        Light
      </button>
      <button
        onClick={() => setTheme('light2')}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          theme === 'light2'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Light2 Theme"
      >
        Light2
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          theme === 'dark'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Dark Theme"
      >
        Dark
      </button>
    </div>
  );
}
