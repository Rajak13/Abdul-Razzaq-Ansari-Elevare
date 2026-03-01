import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale and fallback to default if invalid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  // Dynamically load messages for the requested locale
  const messages = (await import(`./locales/${locale}/index.ts`)).default;

  return {
    locale,
    messages,
    timeZone: 'UTC',
    now: new Date()
  };
});
