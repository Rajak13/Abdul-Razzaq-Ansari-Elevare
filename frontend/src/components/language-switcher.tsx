'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/navigation';
import { routing } from '@/i18n/routing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { useRef, useTransition } from 'react';

const LANGUAGE_NAMES = {
  en: 'English',
  ne: 'नेपाली',
  ko: '한국어'
} as const;

const LANGUAGE_NAMES_SHORT = {
  en: 'En',
  ne: 'ने',
  ko: '한'
} as const;

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const announcementRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = async (newLocale: string) => {
    if (newLocale === locale) return;

    console.log('[LanguageSwitcher] Changing locale from', locale, 'to', newLocale);
    console.log('[LanguageSwitcher] Current pathname:', pathname);

    // Announce language change to screen readers
    if (announcementRef.current) {
      announcementRef.current.textContent = `Language changed to ${LANGUAGE_NAMES[newLocale as keyof typeof LANGUAGE_NAMES]}`;
    }

    // Update user preference in database if authenticated
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch('/api/profile/language', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ language: newLocale })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.warn('[LanguageSwitcher] Could not update language preference (user may not be authenticated):', errorData);
        } else {
          console.log('[LanguageSwitcher] Language preference updated successfully');
        }
      } catch (error) {
        // Silently fail if user is not authenticated or API is not available
        console.debug('[LanguageSwitcher] Language preference not saved (user not authenticated)');
      }
    } else {
      console.debug('[LanguageSwitcher] No token found, skipping language preference save');
    }

    // Use next-intl's router for proper locale switching
    // pathname from usePathname() is already locale-agnostic (without /en, /ne, /ko prefix)
    // router.replace will automatically add the correct locale prefix
    startTransition(() => {
      console.log('[LanguageSwitcher] Replacing route with pathname:', pathname, 'locale:', newLocale);
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <>
      {/* Screen reader announcement area */}
      <div
        ref={announcementRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <Select value={locale} onValueChange={handleLocaleChange} disabled={isPending}>
        <SelectTrigger
          className="w-[100px] sm:w-[140px] h-9"
          aria-label={t('languageSwitcher.label')}
          aria-describedby="language-switcher-description"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              <SelectValue />
            </span>
            <span className="sm:hidden font-medium">
              {LANGUAGE_NAMES_SHORT[locale as keyof typeof LANGUAGE_NAMES_SHORT]}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {routing.locales.map((loc) => (
            <SelectItem
              key={loc}
              value={loc}
              aria-current={loc === locale ? 'true' : 'false'}
              aria-label={`${LANGUAGE_NAMES[loc]}${loc === locale ? ' (current)' : ''}`}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{LANGUAGE_NAMES_SHORT[loc]}</span>
                <span className="text-muted-foreground">-</span>
                <span>{LANGUAGE_NAMES[loc]}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Hidden description for screen readers */}
      <span id="language-switcher-description" className="sr-only">
        {t('languageSwitcher.label')}. Current language: {LANGUAGE_NAMES[locale as keyof typeof LANGUAGE_NAMES]}
      </span>
    </>
  );
}
