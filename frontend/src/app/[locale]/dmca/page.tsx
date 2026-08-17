'use client';

import React from 'react';
import { LegalPageShell } from '@/components/layout/legal-page-shell';
import { Copyright, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DmcaPage() {
  return (
    <LegalPageShell
      title="DMCA & Copyright Policy"
      subtitle="How Elevare handles copyright infringement notices and protects intellectual property rights."
      lastUpdated="August 17, 2026"
    >
      <section className="space-y-8 text-slate-700 dark:text-slate-300">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            1. Statement of Policy
          </h2>
          <p className="leading-relaxed">
            Elevare respects the intellectual property rights of authors, publishers, educators, and creators. In accordance with the Digital Millennium Copyright Act of 1998 (17 U.S.C. § 512, &quot;DMCA&quot;), we will respond expeditiously to claims of copyright infringement submitted to our designated copyright agent.
          </p>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            2. Filing a DMCA Takedown Notice
          </h2>
          <p className="leading-relaxed mb-3">
            If you are a copyright owner or an agent authorized to act on behalf of a copyright owner and believe that material hosted on Elevare (e.g. uploaded study notes, textbook scans, course files, or images) infringes your copyright, you may submit a written notice containing the following details:
          </p>

          <ol className="space-y-2 list-decimal pl-5 text-xs sm:text-sm">
            <li>A physical or electronic signature of the person authorized to act on behalf of the copyright owner.</li>
            <li>Identification of the copyrighted work claimed to have been infringed (e.g. title, URL, or ISBN of textbook/work).</li>
            <li>Identification of the specific material on Elevare that is claimed to be infringing, including direct URLs or study group links where the material is located.</li>
            <li>Your contact information, including your full name, address, telephone number, and email address.</li>
            <li>A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
            <li>A statement under penalty of perjury that the information in the notification is accurate and that you are authorized to act on behalf of the copyright owner.</li>
          </ol>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-4">
          <Mail className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Designated DMCA Copyright Agent</h3>
            <p className="text-slate-600 dark:text-slate-300">Submit formal takedown notices to our legal copyright agent at:</p>
            <p className="font-semibold text-primary mt-1">Email: <a href="mailto:nantio.official@gmail.com" className="underline">nantio.official@gmail.com</a></p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-mono">Attn: Elevare DMCA Compliance Department</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            3. Takedown & Counter-Notification Procedure
          </h2>
          <p className="leading-relaxed mb-3">
            Upon receipt of a valid DMCA notice, Elevare will remove or disable access to the allegedly infringing material and notify the affected user who uploaded it.
          </p>
          <p className="leading-relaxed">
            If the user believes in good faith that the material was removed due to mistake or misidentification, they may submit a formal counter-notification under 17 U.S.C. § 512(g)(3). If a valid counter-notice is received, Elevare may restore the material within 10 to 14 business days unless the copyright owner files a legal action seeking a court order.
          </p>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
            4. Repeat Infringer Policy
          </h2>
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs sm:text-sm text-red-900 dark:text-red-200 flex gap-3 items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>Elevare maintains a strict <strong>Repeat Infringer Policy</strong>. User accounts that receive multiple verified copyright infringement complaints will have their accounts permanently terminated.</span>
          </div>
        </div>
      </section>
    </LegalPageShell>
  );
}
