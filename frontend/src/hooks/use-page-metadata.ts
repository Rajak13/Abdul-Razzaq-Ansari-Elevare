import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Hook to dynamically update page metadata for client components
 * This is a workaround for client components that can't export metadata
 * 
 * @param pageKey - The translation key for the page (e.g., 'dashboard', 'tasks')
 */
export function usePageMetadata(pageKey: string) {
  const t = useTranslations('common.metadata');
  
  useEffect(() => {
    // Update document title
    const title = t(`${pageKey}.title`);
    document.title = title;
    
    // Update meta description
    const description = t(`${pageKey}.description`);
    let metaDescription = document.querySelector('meta[name="description"]');
    
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    
    metaDescription.setAttribute('content', description);
    
    // Update Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', title);
    
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', description);
    
  }, [pageKey, t]);
}
