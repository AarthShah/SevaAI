import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, ChevronRight } from 'lucide-react';

export const PrivacyPage = () => {
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
              className="flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded"
            >
              <span>Terms & Conditions</span>
            </Link>
            <Link
              to="/privacy"
              className="flex items-center justify-between px-3 py-2 text-sm font-semibold rounded bg-blue-50 text-blue-900 border-l-2 border-blue-800"
            >
              <span>Privacy Policy</span>
              <ChevronRight className="w-4 h-4 text-blue-800" />
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-md p-6 sm:p-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium mb-3">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Resident Data Protection Standard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Last updated: 10 October 2025
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-6">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                1. Information We Collect
              </h2>
              <p>
                CivicSeva collects only the information necessary to identify, verify, and resolve reported municipal issues:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li><strong className="text-slate-800">Issue Evidence:</strong> Photos, text descriptions, and voice notes submitted by the user depicting civic defects.</li>
                <li><strong className="text-slate-800">Location Coordinates:</strong> Device-provided latitude/longitude or user-entered landmark/road descriptions to pinpoint the defect location for field crews.</li>
                <li><strong className="text-slate-800">Contact Details:</strong> Email address or telephone number (optional for guest submissions) used strictly to transmit status updates and completion notifications.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                2. Neighborhood Privacy and Location Protection
              </h2>
              <p>
                To protect citizen privacy, public neighborhood grievance views never expose exact house addresses or submitter personal details. Public neighborhood displays show only approximate area names (for example, "MG Road area" or "Market Circle") and defect categories.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                3. Automated Machine Learning Processing
              </h2>
              <p>
                Photographs submitted to CivicSeva are processed by automated vision algorithms exclusively to identify infrastructure defects (such as potholes, garbage accumulation, or broken fixtures).
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>Uploaded images are not used for facial recognition or commercial profiling.</li>
                <li>Any incidental human faces or vehicle license plates are filtered or obscured where technically feasible during departmental archival.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                4. Data Sharing and Third Parties
              </h2>
              <p>
                Your complaint details and location are shared solely with authorized municipal departments (such as Road Infrastructure, Waste Management, Electricity Board, Water Supply, and Stormwater Drainage) and assigned municipal field contractors responsible for performing remediation work. We do not sell or monetize resident personal information.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                5. Data Retention and Security
              </h2>
              <p>
                Complaint records are retained for auditing and public accountability in accordance with municipal records retention regulations. Standard encryption (TLS in transit and AES-256 at rest) protects database storage and image repositories.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">
                6. Contact the Data Protection Liaison
              </h2>
              <p>
                For questions regarding data processing or to request removal of personal data associated with a completed complaint, please contact <span className="font-mono text-slate-900">privacy@civicseva.org</span>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
