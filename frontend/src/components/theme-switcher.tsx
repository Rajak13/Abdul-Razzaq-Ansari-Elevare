'use client';

import { useTheme } from './theme-provider';
import { useTranslations } from 'next-intl';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('common');

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
      <button
        onClick={() => setTheme('light')}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          theme === 'light'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label={t('theme.light')}
      >
        {t('theme.light')}
      </button>
      <button
        onClick={() => setTheme('light2')}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          theme === 'light2'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label={t('theme.light2')}
      >
        {t('theme.light2')}
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          theme === 'dark'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label={t('theme.dark')}
      >
        {t('theme.dark')}
      </button>
    </div>
  );
}
