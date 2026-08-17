'use client';

import React from 'react';
import { LegalPageShell } from '@/components/layout/legal-page-shell';
import { AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      subtitle="Please read these Terms carefully before accessing or using the Elevare collaborative learning platform."
      lastUpdated="August 17, 2026"
    >
      <section className="space-y-8 text-slate-700 dark:text-slate-300">
        {/* Notice Banner */}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex gap-3.5 items-start">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <strong>Important Notice Regarding Age Restrictions:</strong> Elevare is strictly intended for individuals who are <strong>13 years of age or older</strong>. If you are under 13, you may not register, access, or provide any personal information to Elevare.
          </div>
        </div>

        {/* Section 1 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span>1. Acceptance of Terms</span>
          </h2>
          <p className="leading-relaxed">
            By creating an account, accessing, or using Elevare (&quot;Platform&quot;, &quot;Service&quot;, &quot;We&quot;, &quot;Us&quot;, or &quot;Our&quot;), you enter into a legally binding agreement and agree to comply with and be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must immediately cease accessing and using the Service.
          </p>
        </div>

        {/* Section 2 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            2. Eligibility & Age Restrictions (13+ Requirement)
          </h2>
          <p className="leading-relaxed mb-3">
            To register and use Elevare, you must satisfy the following minimum requirements:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>
              <strong>Minimum Age:</strong> You must be at least <strong>13 years of age</strong> (or 16 years of age if residing in certain European Union jurisdictions requiring higher digital consent age).
            </li>
            <li>
              <strong>COPPA Compliance:</strong> Elevare does not intentionally target, collect, or process personal data from children under 13 years of age in compliance with the U.S. Children&apos;s Online Privacy Protection Act (COPPA).
            </li>
            <li>
              <strong>Account Termination for Underage Users:</strong> If we discover or have reason to suspect that an account belongs to a child under 13 years of age, we reserve the right to immediately terminate the account and erase all associated personal data without prior notice.
            </li>
          </ul>
        </div>

        {/* Section 3 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            3. User Conduct & Acceptable Use Policy
          </h2>
          <p className="leading-relaxed mb-3">
            You agree to use Elevare solely for lawful educational and collaborative purposes. You agree <strong>NOT</strong> to engage in any of the following prohibited activities:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <strong className="text-red-600 dark:text-red-400 block mb-1">Academic Dishonesty</strong>
              Posting live test answers, unauthorized exam distribution, or violating academic honor codes.
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <strong className="text-red-600 dark:text-red-400 block mb-1">Harassment & Abuse</strong>
              Bullying, hate speech, threats, harassment, or posting harmful content in study groups.
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <strong className="text-red-600 dark:text-red-400 block mb-1">Copyright Infringement</strong>
              Uploading copyrighted textbooks, paid course materials, or proprietary content without permission.
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <strong className="text-red-600 dark:text-red-400 block mb-1">System Security Violations</strong>
              Attempting to bypass authentication, reverse engineer, scrape data, or introduce malware.
            </div>
          </div>
        </div>

        {/* Section 4 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            4. User-Generated Content & License
          </h2>
          <p className="leading-relaxed mb-3">
            You retain full ownership of all notes, tasks, whiteboards, files, and materials (&quot;User Content&quot;) that you create or upload to Elevare.
          </p>
          <p className="leading-relaxed">
            By uploading or submitting User Content to Elevare, you grant Us a non-exclusive, worldwide, royalty-free license to store, host, process, format, display, and transmit your content solely for the purpose of operating, improving, and delivering the Service to you and your shared study groups.
          </p>
        </div>

        {/* Section 5 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            5. Disclaimer of Warranties (&quot;AS IS&quot;)
          </h2>
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm leading-relaxed uppercase tracking-wider font-semibold">
            Elevare and all its features, including AI note summarization, real-time whiteboards, and group video calls, are provided strictly on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express, implied, or statutory. We disclaim all warranties including merchantability, fitness for a particular purpose, non-infringement, or uninterrupted availability.
          </div>
        </div>

        {/* Section 6 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            6. Limitation of Liability
          </h2>
          <p className="leading-relaxed mb-3">
            To the maximum extent permitted by applicable law, in no event shall Elevare, its operators, developers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, notes, study materials, loss of profits, or service interruption arising out of or related to your use of the Service.
          </p>
          <p className="leading-relaxed">
            Our aggregate financial liability to you for any claim arising from or relating to the Service shall not exceed $100 USD or the total amount paid by you to Elevare in the preceding twelve months.
          </p>
        </div>

        {/* Section 7 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            7. Account Suspension & Termination
          </h2>
          <p className="leading-relaxed">
            We reserve the right, at Our sole discretion, to suspend, disable, or permanently delete any user account if we determine that the user has violated these Terms, engaged in security abuses, or violated applicable law, without liability or requirement of advance notice.
          </p>
        </div>

        {/* Section 8 */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            8. Governing Law & Contact
          </h2>
          <p className="leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Elevare operates. If you have questions regarding these Terms, please contact our legal team at{' '}
            <a href="mailto:nantio.official@gmail.com" className="text-primary font-semibold hover:underline">
              nantio.official@gmail.com
            </a>.
          </p>
        </div>
      </section>
    </LegalPageShell>
  );
}
