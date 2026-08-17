'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Shield, FileText, Cookie, Copyright, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';

interface LegalPageShellProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPageShell({
  title,
  subtitle,
  lastUpdated,
  children,
}: LegalPageShellProps) {
  const pathname = usePathname();
  const t = useTranslations('legal');

  const legalNav = [
    { name: t('nav.terms'), href: '/terms', icon: FileText },
    { name: t('nav.privacy'), href: '/privacy', icon: Shield },
    { name: t('nav.cookies'), href: '/cookies', icon: Cookie },
    { name: t('nav.dmca'), href: '/dmca', icon: Copyright },
    { name: t('nav.academicIntegrity'), href: '/academicIntegrity', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[hsl(0,0%,7%)] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[hsl(0,0%,7%)]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <img src="/logo.svg" alt="Elevare Logo" className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Elevare</span>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('shell.backToHome')}
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold rounded-full transition-all"
            >
              {t('shell.logIn')}
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm font-semibold rounded-full shadow-md transition-all"
            >
              {t('shell.signUp')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner (Solid clean background, no gradient) */}
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-10 sm:py-14">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4" />
            <span>{t('shell.documentation')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            {title}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('shell.lastUpdated')}: <strong className="text-slate-700 dark:text-slate-200">{lastUpdated}</strong></span>
            <span>•</span>
            <span>{t('shell.appliesGlobally')}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar / Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 sticky top-[61px] z-40">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 sm:gap-2 py-2 min-w-max">
            {legalNav.map((item) => {
              const isActive = pathname.endsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 sm:px-6 max-w-6xl py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Quick Nav Sidebar (Desktop) */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="sticky top-[130px] p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
                {t('shell.directory')}
              </h3>
              <nav className="space-y-1.5">
                {legalNav.map((item) => {
                  const isActive = pathname.endsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">{t('shell.questions')}</p>
                  <p className="text-slate-500 dark:text-slate-400 mb-2">{t('shell.contactTeam')}</p>
                  <a
                    href="mailto:nantio.official@gmail.com"
                    className="text-primary font-semibold hover:underline"
                  >
                    nantio.official@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Document Content */}
          <article className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm prose prose-slate dark:prose-invert max-w-none">
            {children}
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-10">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <img src="/logo.svg" alt="Elevare Logo" className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 dark:text-white">Elevare Platform</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">Collaborative Learning & Productivity</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Link href="/terms" className="hover:text-primary transition-colors">{t('nav.terms')}</Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-primary transition-colors">{t('nav.privacy')}</Link>
              <span>•</span>
              <Link href="/cookies" className="hover:text-primary transition-colors">{t('nav.cookies')}</Link>
              <span>•</span>
              <Link href="/dmca" className="hover:text-primary transition-colors">{t('nav.dmca')}</Link>
              <span>•</span>
              <Link href="/academic-integrity" className="hover:text-primary transition-colors">{t('nav.academicIntegrity')}</Link>
            </div>

            <div className="flex flex-col items-center md:items-end gap-1 text-xs text-slate-400 dark:text-slate-500">
              <p>© {new Date().getFullYear()} Elevare Inc. All rights reserved.</p>
              <p className="text-slate-500 dark:text-slate-400">
                Built by <a href="mailto:nantio.official@gmail.com" className="text-primary font-bold hover:underline">Nantio</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
