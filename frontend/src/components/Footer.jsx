import React from 'react';
import { Shield, Phone, Mail, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-bold text-lg font-heading">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span>CIVIC<span className="text-emerald-400">SEVA</span></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Autonomous AI agent for municipal issue resolution. Understanding citizen grievances, analyzing visual evidence, predicting severity, and routing issues directly to responsible civic departments.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Core Capabilities</h4>
            <ul className="space-y-1.5 text-xs">
              <li>Multimodal Issue Classification</li>
              <li>Vision Evidence Extraction</li>
              <li>Grounded RAG Department Routing</li>
              <li>AI-estimated Severity Assessment</li>
              <li>SLA Follow-up & Escalation Engine</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Emergency Civic Lines</h4>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-400" /> 1800-CIVIC-SEVA (24x7)</li>
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-emerald-400" /> grievance@civicseva.org</li>
              <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-400" /> Central Municipal HQ</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Hackathon Note</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Built for the 24-hour AI Hackathon. Demonstrates autonomous civic agent orchestration, human-in-the-loop governance, and verifiable decision traceability.
            </p>
            <div className="mt-3 text-[11px] text-emerald-400 bg-emerald-950/60 p-2 rounded-lg border border-emerald-800/40">
              ✓ 100% Agentic Traceability &bull; Zero Direct Hallucination
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>&copy; 2026 CivicSeva. Public Service AI Architecture.</p>
          <p className="mt-2 sm:mt-0">Report it. We understand it. We route it. We track it.</p>
        </div>
      </div>
    </footer>
  );
};
