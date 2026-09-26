import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { CivicLogo } from './CivicLogo';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 text-xs mt-auto border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Description */}
          <div className="space-y-3 md:col-span-2">
            <CivicLogo
              className="h-6 w-6 text-blue-400"
              textClassName="text-base font-bold text-white tracking-tight"
            />
            <p className="text-slate-400 max-w-sm leading-relaxed">
              AI-assisted civic issue reporting and resolution. Helping residents report local infrastructure issues, identify the appropriate municipal department, and track complaints through resolution.
            </p>
          </div>

          {/* Service Links */}
          <div className="space-y-2.5">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">
              Citizen Services
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <Link to="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-white transition">
                  Report Issue
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-white transition">
                  Track Complaint
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition">
                  My Complaints
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div className="space-y-2.5">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">
              Legal & Support
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <Link to="/terms" className="hover:text-white transition">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li className="pt-2 text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>support@civicseva.org</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-slate-500">
          <p>&copy; {new Date().getFullYear()} CivicSeva. Public Service Digital System.</p>
          <p className="mt-2 sm:mt-0 text-[11px]">Designed for transparent and accessible municipal service delivery.</p>
        </div>
      </div>
    </footer>
  );
};
