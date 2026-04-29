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
    now: new Date(),
    onError(error) {
      // Suppress MISSING_MESSAGE errors in production to avoid console noise
      if (error.code === 'MISSING_MESSAGE' && process.env.NODE_ENV === 'production') {
        return;
      }
      console.error(error);
    },
    getMessageFallback({ namespace, key }) {
      // Return the last segment of the key as a readable fallback
      return key.split('.').pop() ?? key;
    }
  };
});
