'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import { useTranslations } from 'next-intl';
import { usePageMetadata } from '@/hooks/use-page-metadata';
import { isAdmin } from '@/lib/maintenance-checker';

export default function MaintenancePage() {
  usePageMetadata('maintenance');
  const router = useRouter();
  const { theme } = useTheme();
  const t = useTranslations('maintenance');
  const [showAdminBadge, setShowAdminBadge] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  // Determine which image to show: dark image for dark and light2 themes, light image for light theme only
  const maintenanceImage = theme === 'light' 
    ? "/images/Maintainence-mode.png"
    : "/images/Maintainence-mode(Dark).png";

  useEffect(() => {
    const adminStatus = isAdmin();
    setShowAdminBadge(adminStatus);
    setIsUserAdmin(adminStatus);
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFBF7] dark:bg-[hsl(0,0%,7%)] px-6 py-12">
      <div className="max-w-4xl w-full">
        {/* Back Button */}
        <button
          onClick={handleGoBack}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors group"
        >
          <svg 
            className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">{t('goBack')}</span>
        </button>

        {/* Admin Badge */}
        {showAdminBadge && (
          <div className="mb-6 p-4 bg-primary/10 border-2 border-primary rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-primary">Admin Access</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You're viewing this page as an admin. Regular users are currently blocked.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Container */}
        <div className="text-center space-y-8">
          {/* Maintenance Image */}
          <div className="flex justify-center">
            <img
              src={maintenanceImage}
              alt={t('imageAlt')}
              className="w-full max-w-2xl h-auto drop-shadow-2xl"
            />
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            
            {/* Description */}
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('description')}
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-3xl mx-auto">
            {/* Card 1 - What's Happening */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('cards.whatsHappening.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('cards.whatsHappening.description')}
              </p>
            </div>

            {/* Card 2 - When Back */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('cards.whenBack.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('cards.whenBack.description')}
              </p>
            </div>

            {/* Card 3 - Need Help */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('cards.needHelp.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('cards.needHelp.description')}
              </p>
            </div>
          </div>

          {/* Footer Message */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('footer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
