'use client';

import React from 'react';
import { LegalPageShell } from '@/components/layout/legal-page-shell';
import { Lock, Eye, Database, Server, UserCheck, ShieldCheck } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="Learn how Elevare collects, protects, uses, and respects your personal information."
      lastUpdated="August 17, 2026"
    >
      <section className="space-y-8 text-slate-700 dark:text-slate-300">
        {/* Intro */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            1. Overview & Commitment
          </h2>
          <p className="leading-relaxed">
            Elevare (&quot;We&quot;, &quot;Us&quot;, &quot;Service&quot;) takes data privacy and user trust seriously. This Privacy Policy details how we collect, store, process, and protect your information when you access or use our collaborative learning platform.
          </p>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
            <strong className="text-slate-900 dark:text-white block mb-1">Encrypted Sessions</strong>
            Authentication uses HttpOnly secure cookies to prevent unauthorized access.
          </div>
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs">
            <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
            <strong className="text-slate-900 dark:text-white block mb-1">No Third-Party Ads</strong>
            We do not sell your personal data or use cross-site tracking ad pixels.
          </div>
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs">
            <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
            <strong className="text-slate-900 dark:text-white block mb-1">13+ Age Restricted</strong>
            We strictly enforce COPPA rules and do not collect data from children under 13.
          </div>
        </div>

        {/* Section 2 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            2. Information We Collect
          </h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">A. Account & Profile Information</h3>
              <p className="text-xs sm:text-sm">When you register, we collect your name, email address, password (stored strictly as a cryptographic hash using bcrypt), profile avatar, and language preferences.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">B. User Content & Study Data</h3>
              <p className="text-xs sm:text-sm">We process notes, tasks, study group chat messages, whiteboard canvas elements, and files you upload or share on Elevare.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">C. Technical & Diagnostic Logs</h3>
              <p className="text-xs sm:text-sm">We automatically log your IP address, browser type, operating system, endpoint request timestamps, and performance metrics for security and service operation.</p>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            3. AI Feature Processing (Note Summaries)
          </h2>
          <p className="leading-relaxed mb-3">
            Elevare offers AI-assisted features (such as note summarization via Google Generative AI / Pegasus). When you request an AI summary:
          </p>
          <ul className="space-y-2 list-disc pl-5 text-xs sm:text-sm">
            <li>The text of your specific note is sent securely to the AI processing model solely to compute the summary.</li>
            <li>Note text sent for AI processing is <strong>not sold or shared with advertising networks</strong>.</li>
            <li>We store generated summary text alongside your note for your convenience.</li>
          </ul>
        </div>

        {/* Section 4 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            4. Third-Party Service Providers (Sub-Processors)
          </h2>
          <p className="leading-relaxed mb-3">
            We rely on trusted third-party infrastructure providers to host and run Elevare:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold">
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2">Data Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-2 pr-4 font-semibold">Render</td>
                  <td className="py-2 pr-4">Backend & PostgreSQL Hosting</td>
                  <td className="py-2">Encrypted Database & Server Logs</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold">Google OAuth</td>
                  <td className="py-2 pr-4">Single Sign-On Authentication</td>
                  <td className="py-2">Email, Name, Profile ID</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold">LiveKit / Socket.io</td>
                  <td className="py-2 pr-4">Real-Time Messaging & Video Calls</td>
                  <td className="py-2">Socket session IDs, WebRTC signals</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold">SendGrid / Resend</td>
                  <td className="py-2 pr-4">Transactional Email Delivery</td>
                  <td className="py-2">Email address, OTP codes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            5. Children&apos;s Privacy (COPPA Notice)
          </h2>
          <p className="leading-relaxed mb-3">
            Elevare is strictly designated for individuals aged <strong>13 and older</strong>. We do not knowingly solicit, collect, or retain personal data from children under 13.
          </p>
          <p className="leading-relaxed">
            If you are a parent or legal guardian and believe that your child under 13 has registered or provided personal information to Elevare without authorization, please contact us immediately at{' '}
            <a href="mailto:nantio.official@gmail.com" className="text-primary font-semibold hover:underline">
              nantio.official@gmail.com
            </a>. Upon verification, we will promptly delete the account and purge all associated records.
          </p>
        </div>

        {/* Section 6 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            6. Your Data Rights (GDPR & CCPA)
          </h2>
          <p className="leading-relaxed mb-3">
            Regardless of your geographic location, Elevare grants you full control over your personal data:
          </p>
          <ul className="space-y-2 list-disc pl-5 text-xs sm:text-sm">
            <li><strong>Right to Access:</strong> You can view all your stored notes, tasks, files, and account profile information at any time inside the app.</li>
            <li><strong>Right to Data Export:</strong> You can request an export of your account data directly from account settings.</li>
            <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> You can request full account deletion, which permanently purges your personal profile, uploaded files, and stored content from our active database.</li>
          </ul>
        </div>

        {/* Section 7 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            7. Contact Privacy Office
          </h2>
          <p className="leading-relaxed">
            If you have questions, feedback, or data privacy requests, email our data protection officer at{' '}
            <a href="mailto:nantio.official@gmail.com" className="text-primary font-semibold hover:underline">
              nantio.official@gmail.com
            </a>.
          </p>
        </div>
      </section>
    </LegalPageShell>
  );
}
