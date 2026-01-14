import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { routing } from '@/i18n/routing';

/**
 * Configuration for generating localized metadata
 */
interface MetadataConfig {
  /** The translation key for the page title (e.g., 'dashboard', 'tasks') */
  titleKey: string;
  /** The translation key for the page description */
  descriptionKey: string;
  /** The current locale */
  locale: string;
  /** The current pathname without locale prefix */
  pathname?: string;
  /** Additional Open Graph properties */
  openGraph?: {
    type?: 'website' | 'article';
    images?: string[];
  };
}

/**
 * Generates localized metadata for a page including title, description,
 * Open Graph tags, and hreflang alternate links
 * 
 * @param config - Configuration for metadata generation
 * @returns Next.js Metadata object with localized content
 */
export async function generateLocalizedMetadata(
  config: MetadataConfig
): Promise<Metadata> {
  const { titleKey, descriptionKey, locale, pathname = '', openGraph = {} } = config;
  
  // Load translations for the current locale
  const t = await getTranslations({ locale, namespace: 'common' });
  
  // Get localized title and description
  const title = t(`metadata.${titleKey}.title`);
  const description = t(`metadata.${descriptionKey}.description`);
  const siteName = t('metadata.siteName');
  
  // Base URL for the application (should be from environment variable in production)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://elevare.app';
  
  // Generate alternate language links for hreflang
  const alternates = {
    canonical: `${baseUrl}/${locale}${pathname}`,
    languages: routing.locales.reduce((acc, loc) => {
      acc[loc] = `${baseUrl}/${loc}${pathname}`;
      return acc;
    }, {} as Record<string, string>)
  };
  
  // Generate Open Graph metadata
  const ogMetadata = {
    title,
    description,
    siteName,
    locale,
    type: openGraph.type || 'website',
    url: `${baseUrl}/${locale}${pathname}`,
    images: openGraph.images || [
      {
        url: `${baseUrl}/icon.png`,
        width: 512,
        height: 512,
        alt: siteName,
      }
    ],
  };
  
  // Generate Twitter Card metadata
  const twitterMetadata = {
    card: 'summary_large_image' as const,
    title,
    description,
    images: openGraph.images || [`${baseUrl}/icon.png`],
  };
  
  return {
    title,
    description,
    alternates,
    openGraph: ogMetadata,
    twitter: twitterMetadata,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Generates metadata for the home page
 */
export async function generateHomeMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'home',
    descriptionKey: 'home',
    locale,
    pathname: '',
  });
}

/**
 * Generates metadata for the dashboard page
 */
export async function generateDashboardMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'dashboard',
    descriptionKey: 'dashboard',
    locale,
    pathname: '/dashboard',
  });
}

/**
 * Generates metadata for the tasks page
 */
export async function generateTasksMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'tasks',
    descriptionKey: 'tasks',
    locale,
    pathname: '/tasks',
  });
}

/**
 * Generates metadata for the notes page
 */
export async function generateNotesMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'notes',
    descriptionKey: 'notes',
    locale,
    pathname: '/notes',
  });
}

/**
 * Generates metadata for the study groups page
 */
export async function generateGroupsMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'groups',
    descriptionKey: 'groups',
    locale,
    pathname: '/groups',
  });
}

/**
 * Generates metadata for the resources page
 */
export async function generateResourcesMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'resources',
    descriptionKey: 'resources',
    locale,
    pathname: '/resources',
  });
}

/**
 * Generates metadata for the profile page
 */
export async function generateProfileMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'profile',
    descriptionKey: 'profile',
    locale,
    pathname: '/profile',
  });
}

/**
 * Generates metadata for the login page
 */
export async function generateLoginMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'login',
    descriptionKey: 'login',
    locale,
    pathname: '/login',
  });
}

/**
 * Generates metadata for the register page
 */
export async function generateRegisterMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'register',
    descriptionKey: 'register',
    locale,
    pathname: '/register',
  });
}

/**
 * Generates metadata for the search page
 */
export async function generateSearchMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'search',
    descriptionKey: 'search',
    locale,
    pathname: '/search',
  });
}

/**
 * Generates metadata for the files page
 */
export async function generateFilesMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'files',
    descriptionKey: 'files',
    locale,
    pathname: '/files',
  });
}

/**
 * Generates metadata for the notifications page
 */
export async function generateNotificationsMetadata(locale: string): Promise<Metadata> {
  return generateLocalizedMetadata({
    titleKey: 'notifications',
    descriptionKey: 'notifications',
    locale,
    pathname: '/notifications',
  });
}
