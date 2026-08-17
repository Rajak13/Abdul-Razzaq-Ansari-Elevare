'use client';

import React from 'react';
import { LegalPageShell } from '@/components/layout/legal-page-shell';
import { Cookie, ShieldCheck, Check, X } from 'lucide-react';

export default function CookiePolicyPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      subtitle="Understand how Elevare uses cookies and local session storage to secure and deliver services."
      lastUpdated="August 17, 2026"
    >
      <section className="space-y-8 text-slate-700 dark:text-slate-300">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            1. What Are Cookies?
          </h2>
          <p className="leading-relaxed">
            Cookies are small text files stored on your browser or device by web servers when you visit a website. They allow the web application to recognize your session, keep you securely logged in, and remember your language or theme preferences.
          </p>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            2. Cookies Used by Elevare
          </h2>
          <p className="leading-relaxed mb-4">
            Elevare uses **only essential functional cookies** to operate the Service. We do not use third-party advertising or cross-site tracking cookies.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold">
                  <th className="py-2 pr-4">Cookie Name</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Expiration</th>
                  <th className="py-2">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-primary font-semibold">auth_token</td>
                  <td className="py-2.5 pr-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">Essential / HttpOnly</span></td>
                  <td className="py-2.5 pr-4">24 Hours / 7 Days</td>
                  <td className="py-2.5">Stores secure session token. HttpOnly flag prevents JavaScript access for XSS protection.</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-primary font-semibold">NEXT_LOCALE</td>
                  <td className="py-2.5 pr-4"><span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">Functional</span></td>
                  <td className="py-2.5 pr-4">1 Year</td>
                  <td className="py-2.5">Remembers your preferred language selection (e.g. English, Nepali, Korean).</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-primary font-semibold">theme</td>
                  <td className="py-2.5 pr-4"><span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">Local Storage</span></td>
                  <td className="py-2.5 pr-4">Persistent</td>
                  <td className="py-2.5">Remembers your dark mode / light mode interface preference.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            3. No Third-Party Ad Cookies
          </h2>
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 flex gap-3 items-center">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Elevare contains <strong>zero third-party advertising pixels</strong> (e.g. Facebook Pixel, Google AdSense) and zero cross-site behavioral tracking scripts.</span>
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            4. Managing Cookies in Your Browser
          </h2>
          <p className="leading-relaxed">
            You can clear or block cookies at any time through your browser settings. However, blocking the essential <code className="text-primary font-mono text-xs">auth_token</code> cookie will prevent you from logging in and using your Elevare account.
          </p>
        </div>
      </section>
    </LegalPageShell>
  );
}
