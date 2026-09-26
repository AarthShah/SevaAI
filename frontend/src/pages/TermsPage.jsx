import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, ChevronRight } from 'lucide-react';

export const TermsPage = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Navigation */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white border border-slate-200 rounded-md p-4 space-y-1">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
              Legal Documents
            </h2>
            <Link
              to="/terms"
              className="flex items-center justify-between px-3 py-2 text-sm font-semibold rounded bg-blue-50 text-blue-900 border-l-2 border-blue-800"
            >
              <span>Terms & Conditions</span>
              <ChevronRight className="w-4 h-4 text-blue-800" />
            </Link>
            <Link
              to="/privacy"
              className="flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded"
            >
              <span>Privacy Policy</span>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-md p-6 sm:p-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium mb-3">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Public Service Operating Guidelines</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Terms & Conditions
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Last updated: 10 October 2025
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-6">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                1. Introduction
              </h2>
              <p>
                Welcome to CivicSeva. These Terms & Conditions govern your access to and use of the CivicSeva civic grievance reporting platform, including associated web applications, digital intake workflows, and notification services. By accessing or submitting information via CivicSeva, you agree to comply with these terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                2. Use of the Service
              </h2>
              <p>
                CivicSeva provides an online channel for residents to report non-emergency civic defects (including potholes, uncollected waste, non-functional streetlights, water pipeline leaks, and stormwater drainage issues) to relevant municipal administrations.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>You agree to submit accurate, truthful, and non-fraudulent reports.</li>
                <li>You agree not to use the platform to report life-threatening emergencies requiring immediate police, fire, or ambulance dispatch.</li>
                <li>You are solely responsible for content and photographs uploaded through your session.</li>
                <li>You must not upload defamatory, offensive, harassing, or unlawful material.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                3. AI-Assisted Information and Disclaimers
              </h2>
              <p>
                CivicSeva utilizes automated machine learning models to analyze photographs, infer defect categories, estimate severity, and suggest the responsible municipal department.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>Automated suggestions are advisory aids designed to expedite routing.</li>
                <li>Users are presented with suggested categories and departments for review prior to submission.</li>
                <li>Municipal departments review submissions in accordance with municipal operational procedures and available field resources.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                4. Account and User Responsibilities
              </h2>
              <p>
                Users may submit grievances as registered users or as guest residents. When creating an account, you are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                5. Resolution Timelines and Service Levels
              </h2>
              <p>
                Service Level Agreements (SLAs) displayed on the platform reflect standard municipal response benchmarks. Actual completion depends on site safety, weather conditions, parts procurement, and municipal crew scheduling. Display of an estimated resolution time does not create a binding legal guarantee.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                6. Limitation of Liability
              </h2>
              <p>
                CivicSeva operates as a technology coordination interface. To the maximum extent permitted by applicable law, CivicSeva and participating municipal authorities shall not be liable for any indirect, incidental, or consequential damages resulting from technical downtime or delayed municipal remediation.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                7. Contact Information
              </h2>
              <p>
                If you have questions regarding these Terms & Conditions, please contact the CivicSeva administrative team at <span className="font-mono text-slate-900">support@civicseva.org</span>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
