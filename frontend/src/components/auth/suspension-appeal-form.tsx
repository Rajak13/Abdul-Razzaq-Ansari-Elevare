'use client';

import { useState } from 'react';
import { AlertCircle, Send, CheckCircle, Clock, Ban, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import axios from 'axios';

interface SuspensionAppealFormProps {
  userId: string;
  suspensionId: string;
  suspensionReason: string;
  expiresAt?: string;
}

export function SuspensionAppealForm({
  userId,
  suspensionId,
  suspensionReason,
  expiresAt
}: SuspensionAppealFormProps) {
  const { theme } = useTheme();
  const t = useTranslations('suspension');
  const [appealMessage, setAppealMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (appealMessage.length < 10) {
      setError(t('errors.minimumLength'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/suspension-appeals`, {
        user_id: userId,
        suspension_id: suspensionId,
        appeal_message: appealMessage
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('errors.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTemporary = !!expiresAt;
  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  const formattedDate = expiryDate?.toLocaleDateString(undefined, { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (submitted) {
    return (
      <div className="min-h-screen flex">
        {/* Left Side - Success Message */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white dark:bg-[hsl(0,0%,7%)]">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-[hsl(142,71%,45%)]" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('appealSubmitted')}</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('appealSubmittedDescription')}
                </p>
              </div>
              <div className="bg-[#FCFBF7] dark:bg-gray-800 rounded-xl p-6 text-left">
                <p className="font-semibold text-gray-900 dark:text-white mb-3">{t('whatHappensNext')}</p>
                <ul className="space-y-2">
                  {t.raw('reviewProcess').map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 text-[hsl(142,71%,45%)] flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Illustration */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 items-center justify-center p-12 relative">
          {/* Decorative circles */}
          <div className="absolute top-20 left-20 w-24 h-24 bg-primary/20 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-32 w-16 h-16 bg-primary/30 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-32 left-32 w-20 h-20 bg-primary/10 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-20 right-20 w-12 h-12 bg-yellow-400/30 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-primary/40 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          
          <div className="relative z-10 max-w-lg w-full">
            <img
              src={theme === 'light' ? "/images/Suspension-Page.png" : "/images/Suspension-Page(Alternate).png"}
              alt="Success"
              className="w-full h-auto drop-shadow-2xl animate-float"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white dark:bg-[hsl(0,0%,7%)]">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                  <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
                </div>
              </div>
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('goBack')}
              </Link>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              {isTemporary ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{t('temporarySuspension', { date: formattedDate || '' })}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{t('permanentSuspension')}</span>
                </>
              )}
            </div>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Suspension Reason */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">{t('reasonLabel')}</p>
                  <p className="text-sm">{suspensionReason}</p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
              <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
                {t('canAppeal')}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t('appealDescription')}
              </p>
            </div>

            {/* Appeal Textarea */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t('yourAppeal')}
              </label>
              <div className="relative">
                <textarea
                  value={appealMessage}
                  onChange={(e) => setAppealMessage(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                  placeholder={t('appealPlaceholder')}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('charactersCount', { count: appealMessage.length })}
                </p>
                {appealMessage.length >= 10 && (
                  <p className="text-xs text-[hsl(142,71%,45%)] font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {t('minimumLengthMet')}
                  </p>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || appealMessage.length < 10}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? t('submittingAppeal') : t('submitAppeal')}
            </button>

            {/* Footer Note */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              {t('footerNote')}
            </p>
          </form>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 items-center justify-center p-12 relative">
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-24 h-24 bg-red-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-16 h-16 bg-orange-400/30 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-32 w-20 h-20 bg-red-400/10 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 right-20 w-12 h-12 bg-yellow-400/30 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-red-400/40 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        
        <div className="relative z-10 max-w-lg w-full">
          <img
            src={theme === 'light' ? "/images/Suspension-Page.png" : "/images/Suspension-Page(Alternate).png"}
            alt="Account suspended"
            className="w-full h-auto drop-shadow-2xl animate-float"
          />
        </div>
      </div>
    </div>
  );
}
