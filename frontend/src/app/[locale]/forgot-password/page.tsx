'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { useTheme } from '@/components/theme-provider';
import { usePageMetadata } from '@/hooks/use-page-metadata';
import apiClient from '@/lib/api-client';
import { AxiosError } from 'axios';

export default function ForgotPasswordPage() {
  usePageMetadata('forgotPassword');
  const t = useTranslations('auth.forgotPassword');
  const tValidation = useTranslations('auth.validation');
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError(tValidation('emailRequired'));
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSuccessMessage(t('success'));
      setEmail('');
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(
        axiosError.response?.data?.error?.message || t('failed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-white dark:bg-[hsl(0,0%,7%)]">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          {/* Heading */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('heading')}</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {t('description')}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            {/* Email Field */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                  placeholder={t('emailPlaceholder')}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? t('submitting') : t('submit')}
            </button>

            {/* Back to Sign In Link */}
            <div className="text-center">
              <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                {t('backToSignIn')}
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 items-center justify-center p-8 xl:p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-10 lg:top-20 left-10 lg:left-20 w-16 lg:w-24 h-16 lg:h-24 bg-primary/20 rounded-full animate-pulse"></div>
        <div className="absolute top-20 lg:top-40 right-16 lg:right-32 w-12 lg:w-16 h-12 lg:h-16 bg-primary/30 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-16 lg:bottom-32 left-16 lg:left-32 w-16 lg:w-20 h-16 lg:h-20 bg-primary/10 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-10 lg:bottom-20 right-10 lg:right-20 w-10 lg:w-12 h-10 lg:h-12 bg-yellow-400/30 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/2 left-1/4 w-6 lg:w-8 h-6 lg:h-8 bg-primary/40 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        
        <div className="relative z-10 max-w-md lg:max-w-lg w-full px-4">
          <img
            src={theme === 'light' ? "/images/DrawKit Vector Illustration-2.png" : "/images/DrawKit Vector Illustration-2-2.png"}
            alt="Reset password illustration"
            className="w-full h-auto drop-shadow-2xl animate-float"
          />
        </div>
      </div>
    </div>
  );
}
