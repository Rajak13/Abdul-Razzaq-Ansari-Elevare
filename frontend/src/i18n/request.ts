import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale and fallback to default if invalid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  // Load all translation namespaces based on locale
  let messages;
  
  if (locale === 'ko') {
    messages = {
      common: (await import('./locales/ko/common.json')).default,
      auth: (await import('./locales/ko/auth.json')).default,
      dashboard: (await import('./locales/ko/dashboard.json')).default,
      tasks: (await import('./locales/ko/tasks.json')).default,
      notes: (await import('./locales/ko/notes.json')).default,
      groups: (await import('./locales/ko/groups.json')).default,
      resources: (await import('./locales/ko/resources.json')).default,
      profile: (await import('./locales/ko/profile.json')).default,
      notifications: (await import('./locales/ko/notifications.json')).default,
      validation: (await import('./locales/ko/validation.json')).default,
      errors: (await import('./locales/ko/errors.json')).default,
    };
  } else if (locale === 'ne') {
    messages = {
      common: (await import('./locales/ne/common.json')).default,
      auth: (await import('./locales/ne/auth.json')).default,
      dashboard: (await import('./locales/ne/dashboard.json')).default,
      tasks: (await import('./locales/ne/tasks.json')).default,
      notes: (await import('./locales/ne/notes.json')).default,
      groups: (await import('./locales/ne/groups.json')).default,
      resources: (await import('./locales/ne/resources.json')).default,
      profile: (await import('./locales/ne/profile.json')).default,
      notifications: (await import('./locales/ne/notifications.json')).default,
      validation: (await import('./locales/ne/validation.json')).default,
      errors: (await import('./locales/ne/errors.json')).default,
    };
  } else {
    // Default to English
    messages = {
      common: (await import('./locales/en/common.json')).default,
      auth: (await import('./locales/en/auth.json')).default,
      dashboard: (await import('./locales/en/dashboard.json')).default,
      tasks: (await import('./locales/en/tasks.json')).default,
      notes: (await import('./locales/en/notes.json')).default,
      groups: (await import('./locales/en/groups.json')).default,
      resources: (await import('./locales/en/resources.json')).default,
      profile: (await import('./locales/en/profile.json')).default,
      notifications: (await import('./locales/en/notifications.json')).default,
      validation: (await import('./locales/en/validation.json')).default,
      errors: (await import('./locales/en/errors.json')).default,
    };
  }

  return {
    locale,
    messages,
    timeZone: 'UTC',
    now: new Date()
  };
});
