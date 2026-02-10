'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/components/theme-provider';
import { Link } from '@/navigation';
import { usePageMetadata } from '@/hooks/use-page-metadata';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';

// Theme Switcher Component for Landing Page
function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'light' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
        {theme === 'light2' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        )}
        {theme === 'dark' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="py-2">
              <button
                onClick={() => {
                  setTheme('light');
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  theme === 'light' ? 'text-primary font-semibold' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Light
              </button>
              <button
                onClick={() => {
                  setTheme('light2');
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  theme === 'light2' ? 'text-primary font-semibold' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Light 2
              </button>
              <button
                onClick={() => {
                  setTheme('dark');
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  theme === 'dark' ? 'text-primary font-semibold' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Dark
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const t = useTranslations('landing');
  usePageMetadata('home');
  
  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use default images during SSR to prevent hydration mismatch
  const getImage = (lightImage: string, alternateImage: string) => {
    if (!mounted) return lightImage;
    return theme === 'light' ? lightImage : alternateImage;
  };
  
  return (
    <div className="min-h-screen bg-white dark:bg-[hsl(0,0%,7%)]">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full bg-white dark:bg-[hsl(0,0%,7%)] border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded flex items-center justify-center">
              <img src="/logo.svg" alt="Elevare Logo" className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Elevare</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
            <Link href="#features" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              {t('nav.features')}
            </Link>
            <Link href="#community" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              {t('nav.community')}
            </Link>
            <Link href="#faq" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {t('nav.faq')}
            </Link>
            
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Theme Switcher */}
            <ThemeSwitcher />
            
            <Link href="/login" className="group relative px-4 xl:px-6 py-2 bg-slate-600 text-white text-sm font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-lg">
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t('nav.login')}
              </span>
              <div className="absolute inset-0 bg-slate-800 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </Link>
            <Link href="/register" className="group relative px-4 xl:px-6 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-lg">
              <span className="relative z-10 flex items-center gap-2 text-white">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
                {t('nav.signUp')}
              </span>
              <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </Link>
          </nav>
          
          {/* Mobile Menu Buttons */}
          <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
            
            {/* Login Button - Icon only on mobile */}
            <Link 
              href="/login" 
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-600 text-white rounded-full hover:bg-slate-700 transition-colors flex items-center justify-center"
              title="Login"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline ml-1 text-xs font-semibold">In</span>
            </Link>
            
            {/* Sign Up Button - Icon only on mobile */}
            <Link 
              href="/register" 
              className="p-2 sm:px-3 sm:py-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors flex items-center justify-center"
              title="Sign Up"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
              <span className="hidden sm:inline ml-1 text-xs font-semibold">Up</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 sm:pt-24 pb-0 bg-white dark:bg-[hsl(0,0%,7%)] relative overflow-hidden min-h-screen flex items-center">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-6 sm:space-y-8 animate-fadeIn text-center lg:text-left">
              <div className="inline-block">
                <span className="text-primary text-xs sm:text-sm font-semibold tracking-wider uppercase">
                  {t('hero.badge')}
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
                {t('hero.title')}<br />
                {t('hero.titleBreak')}
              </h1>
              
              {/* Feature List with Checkmarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto lg:mx-0">
                <div className="flex items-center gap-2 sm:gap-3 group">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">{t('hero.features.taskManager')}</span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 group">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">{t('hero.features.noteTaking')}</span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 group">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">{t('hero.features.resourceSharing')}</span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 group">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">{t('hero.features.studyGroups')}</span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 group">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">{t('hero.features.whiteboard')}</span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 group">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">{t('hero.features.aiSummarization')}</span>
                </div>
              </div>
              
              {/* CTA Button */}
              <div className="pt-4 flex justify-center lg:justify-start">
                <Link href="/register">
                  <button className="group px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white text-sm sm:text-base font-semibold rounded-full hover:bg-primary/90 transition-all transform hover:scale-105 hover:shadow-lg flex items-center gap-2">
                    {t('hero.cta')}
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Right Illustration */}
            <div className="relative mt-8 lg:mt-0 order-first lg:order-last">
              <div className="relative animate-float max-w-md mx-auto lg:max-w-none">
                <Image
                  src={getImage("/images/DrawKit Vector Illustration-1.png", "/images/DrawKit Vector Illustration-1-2.png")}
                  alt="Student learning"
                  width={700}
                  height={700}
                  className="w-full h-auto drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Slanted Divider - White to Green */}
      <div className="relative h-32 bg-white dark:bg-[hsl(0,0%,7%)]">
        <div className="absolute inset-0 bg-primary" style={{clipPath: 'polygon(0 0, 100% 100%, 100% 100%, 0 100%)'}}></div>
      </div>

      {/* Trusted Section */}
      <section id="features" className="bg-primary py-12 sm:py-16 lg:py-20 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="text-white space-y-4 sm:space-y-6 text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                {t('trusted.title')}<br />
                {t('trusted.titleBreak')}
              </h2>
              
              <div className="space-y-3 sm:space-y-4">
                <p className="text-base sm:text-lg text-white/90 leading-relaxed">
                  {t('trusted.description')} <span className="font-semibold underline decoration-2">{t('trusted.descriptionHighlight')}</span>
                </p>
                
                <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                  {t('trusted.subDescription')}
                </p>
              </div>
              
              <div className="pt-4 flex justify-center lg:justify-start">
                <Link href="/register">
                  <button className="group px-6 sm:px-8 py-3 sm:py-4 bg-black text-white text-sm sm:text-base font-semibold rounded-full hover:bg-gray-800 transition-all transform hover:scale-105 hover:shadow-xl flex items-center gap-2">
                    {t('trusted.cta')}
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Right Illustration */}
            <div className="relative order-first lg:order-last">
              <div className="relative animate-float max-w-md mx-auto lg:max-w-none" style={{animationDelay: '0.5s'}}>
                <Image
                  src={getImage("/images/DrawKit Vector Illustration-2.png", "/images/DrawKit Vector Illustration-2-2.png")}
                  alt="Learners worldwide"
                  width={600}
                  height={600}
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slanted Divider - Green to Dark */}
      <div className="relative h-32 bg-primary">
        <div className="absolute inset-0 bg-black" style={{clipPath: 'polygon(0 0, 100% 100%, 100% 100%, 0 100%)'}}></div>
      </div>

      {/* Everything You Need Section */}
      <section className="bg-black py-20 relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="text-white space-y-6">
              <p className="text-primary text-sm font-medium">{t('features.subtitle')}</p>
              
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                {t('features.title')}<br />
                {t('features.titleBreak')}
              </h2>
              
              <div className="pt-4">
                <Link href="/register">
                  <button className="group px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 hover:shadow-xl flex items-center gap-2">
                    {t('features.cta')}
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Right Cards Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Card 1 - White */}
              <div className="bg-white rounded-3xl p-8 relative group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl animate-fadeIn min-h-[280px]">
                <div className="absolute -top-3 -left-3 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  1.
                </div>
                <div className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{t('features.cards.taskManagement.title')}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('features.cards.taskManagement.description')}</p>
                </div>
              </div>

              {/* Card 2 - Green */}
              <div className="bg-primary rounded-3xl p-8 relative group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl animate-fadeIn min-h-[280px]" style={{animationDelay: '0.1s'}}>
                <div className="absolute -top-3 -left-3 w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary text-xl font-bold shadow-lg">
                  2.
                </div>
                <div className="pt-6">
                  <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{t('features.cards.noteTaking.title')}</h3>
                  <p className="text-sm text-white/90 leading-relaxed">{t('features.cards.noteTaking.description')}</p>
                </div>
              </div>

              {/* Card 3 - Green */}
              <div className="bg-primary rounded-3xl p-8 relative group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl animate-fadeIn min-h-[280px]" style={{animationDelay: '0.2s'}}>
                <div className="absolute -top-3 -left-3 w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary text-xl font-bold shadow-lg">
                  3.
                </div>
                <div className="pt-6">
                  <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{t('features.cards.studyGroups.title')}</h3>
                  <p className="text-sm text-white/90 leading-relaxed">{t('features.cards.studyGroups.description')}</p>
                </div>
              </div>

              {/* Card 4 - White */}
              <div className="bg-white rounded-3xl p-8 relative group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl animate-fadeIn min-h-[280px]" style={{animationDelay: '0.3s'}}>
                <div className="absolute -top-3 -left-3 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  4.
                </div>
                <div className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{t('features.cards.videoConferencing.title')}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('features.cards.videoConferencing.description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slanted Divider - Dark to Green */}
      <div className="relative h-32 bg-black">
        <div className="absolute inset-0 bg-primary" style={{clipPath: 'polygon(0 0, 100% 100%, 100% 100%, 0 100%)'}}></div>
      </div>

      {/* Join Community Section */}
      <section id="community" className="bg-primary py-20 relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="text-gray-900 space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                {t('community.title')}<br />
                {t('community.titleBreak')}
              </h2>
              
              {/* Feature Pills */}
              <div className="flex flex-wrap gap-3">
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {t('community.pills.collaborative')}
                </div>
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {t('community.pills.knowledge')}
                </div>
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {t('community.pills.builtByStudent')}
                </div>
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {t('community.pills.fullControl')}
                </div>
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {t('community.pills.productivity')}
                </div>
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {t('community.pills.trusted')}
                </div>
              </div>
              
              <div className="pt-4">
                <Link href="/register">
                  <button className="group px-8 py-4 bg-black text-white font-semibold rounded-full hover:bg-gray-800 transition-all transform hover:scale-105 hover:shadow-xl flex items-center gap-2">
                    {t('community.cta')}
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Right Illustration */}
            <div className="relative">
              <div className="relative animate-float" style={{animationDelay: '0.5s'}}>
                <Image
                  src={getImage("/images/DrawKit Vector Illustration-3.png", "/images/DrawKit Vector Illustration-3-2.png")}
                  alt="Join community"
                  width={600}
                  height={600}
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slanted Divider - Green to Dark */}
      <div className="relative h-32 bg-primary">
        <div className="absolute inset-0 bg-black" style={{clipPath: 'polygon(0 0, 100% 100%, 100% 100%, 0 100%)'}}></div>
      </div>

      {/* FAQ Section */}
      <section id="faq" className="bg-black py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('faq.title')}</h2>
            <p className="text-gray-400 text-lg">{t('faq.subtitle')}</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                {t('faq.questions.whatIs.question')}
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t('faq.questions.whatIs.answer')}
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                {t('faq.questions.free.question')}
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t('faq.questions.free.answer')}
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                {t('faq.questions.security.question')}
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t('faq.questions.security.answer')}
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                {t('faq.questions.collaborate.question')}
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t('faq.questions.collaborate.answer')}
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                {t('faq.questions.getStarted.question')}
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t('faq.questions.getStarted.answer')}
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                {t('faq.questions.help.question')}
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t('faq.questions.help.answer')}
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                {t('faq.questions.anySubject.question')}
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {t('faq.questions.anySubject.answer')}
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Slanted Divider - Dark to White */}
      <div className="relative h-32 bg-black">
        <div className="absolute inset-0 bg-white" style={{clipPath: 'polygon(0 0, 100% 100%, 100% 100%, 0 100%)'}}></div>
      </div>

      {/* Footer */}
      <footer className="bg-white text-black py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <img src="/logo.svg" alt="Elevare Logo" className="h-6 w-6" />
                </div>
                <span className="text-2xl font-bold">Elevare</span>
              </div>
              <p className="text-gray-400 text-sm">
                {t('footer.tagline')}
              </p>
            </div>

            {/* Product Column */}
            <div>
              <h3 className="font-semibold text-lg mb-4">{t('footer.product.title')}</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-primary transition-colors">{t('footer.product.features')}</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">{t('footer.product.getStarted')}</Link></li>
                <li><Link href="#faq" className="hover:text-primary transition-colors">{t('footer.product.faq')}</Link></li>
                <li><Link href="/dashboard" className="hover:text-primary transition-colors">{t('footer.product.dashboard')}</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="font-semibold text-lg mb-4">{t('footer.company.title')}</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#community" className="hover:text-primary transition-colors">{t('footer.company.about')}</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">{t('footer.company.blog')}</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">{t('footer.company.contact')}</Link></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="font-semibold text-lg mb-4">{t('footer.legal.title')}</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/register" className="hover:text-primary transition-colors">{t('footer.legal.privacy')}</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">{t('footer.legal.terms')}</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">{t('footer.legal.cookies')}</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              {t('footer.copyright')}
            </p>
            <div className="flex gap-4">
              <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </Link>
              <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </Link>
              <Link href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
