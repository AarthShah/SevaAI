import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, ArrowLeftRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { CivicLogo } from './CivicLogo';

export const Navbar = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const isOfficial = user?.role === 'authority' || user?.role === 'admin';

  const handleToggleRole = async () => {
    if (isOfficial) {
      await switchDemoRole('citizen');
      navigate('/report');
    } else {
      await switchDemoRole('authority');
      navigate('/authority');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* CivicSeva Logo */}
          <Link to={isOfficial ? "/authority" : "/"} className="flex items-center">
            <CivicLogo
              className="h-6 w-6 text-blue-800"
              textClassName="text-lg font-bold text-slate-900 tracking-tight"
            />
          </Link>

          {/* Navigation Links with Active Bottom-Indicator */}
          <nav className="hidden md:flex items-center space-x-6 text-sm">
            {isOfficial ? (
              /* === OFFICIAL / MUNICIPAL OFFICER NAVIGATION === */
              <>
                <Link
                  to="/authority"
                  className={`py-5 transition-colors border-b-2 font-medium ${
                    isActive('/authority') && !location.search.includes('OFFICERS')
                      ? 'border-blue-800 text-blue-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Triage Queue
                </Link>

                <Link
                  to="/authority?tab=OFFICERS"
                  className={`py-5 transition-colors border-b-2 font-medium ${
                    location.search.includes('OFFICERS')
                      ? 'border-blue-800 text-blue-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Field Squads
                </Link>

                <Link
                  to="/cctv"
                  className={`py-5 transition-colors border-b-2 font-medium ${
                    isActive('/cctv')
                      ? 'border-blue-800 text-blue-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  CCTV Grid
                </Link>

                <Link
                  to="/map"
                  className={`py-5 transition-colors border-b-2 font-medium ${
                    isActive('/map')
                      ? 'border-blue-800 text-blue-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Operations Map
                </Link>

                <Link
                  to="/analytics"
                  className={`py-5 transition-colors border-b-2 font-medium ${
                    isActive('/analytics')
                      ? 'border-blue-800 text-blue-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Analytics
                </Link>
              </>
            ) : (
              /* === CITIZEN NAVIGATION === */
              <>
                <Link
                  to="/"
                  className={`py-5 transition-colors border-b-2 font-medium ${
                    isActive('/')
                      ? 'border-blue-800 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Home
                </Link>

                <Link
                  to="/report"
                  className={`py-5 transition-colors border-b-2 font-medium ${
                    isActive('/report')
                      ? 'border-blue-800 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Report Issue
                </Link>

                <Link
                  to="/track"
                  className={`py-5 transition-colors border-b-2 font-medium ${
                    isActive('/track')
                      ? 'border-blue-800 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Track Complaint
                </Link>

                <Link
                  to="/dashboard"
                  className={`py-5 transition-colors border-b-2 font-medium ${
                    isActive('/dashboard')
                      ? 'border-blue-800 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Complaints
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Items & Mode Switcher */}
          <div className="flex items-center space-x-3">
            {/* Clean rectangular role switcher */}
            <button
              onClick={handleToggleRole}
              title={isOfficial ? "Switch to Citizen View" : "Switch to Municipal Officer Portal"}
              className="px-2.5 py-1 text-xs font-medium border border-slate-300 rounded text-slate-700 bg-white hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-3 h-3 text-slate-500" />
              <span>{isOfficial ? 'Switch to Citizen' : 'Municipal Portal'}</span>
            </button>

            <NotificationBell />

            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                {/* Circular Avatar with Initial */}
                <div className="w-7 h-7 rounded-full bg-slate-600 text-white text-xs font-semibold flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="text-xs font-medium text-slate-700 hidden sm:inline-block">
                  {user.name ? user.name.split(' ')[0] : 'User'}
                </span>
                <button
                  onClick={logout}
                  className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs transition"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded text-slate-700 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-3 space-y-1 bg-white">
            {isOfficial ? (
              <>
                <Link
                  to="/authority"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-50"
                >
                  Triage Queue
                </Link>
                <Link
                  to="/authority?tab=OFFICERS"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-50"
                >
                  Field Squads
                </Link>
                <Link
                  to="/cctv"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-50"
                >
                  CCTV Grid
                </Link>
                <Link
                  to="/map"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-50"
                >
                  Operations Map
                </Link>
                <Link
                  to="/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-50"
                >
                  Analytics
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-50"
                >
                  Home
                </Link>
                <Link
                  to="/report"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-50"
                >
                  Report Issue
                </Link>
                <Link
                  to="/track"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-50"
                >
                  Track Complaint
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-50"
                >
                  My Complaints
                </Link>
              </>
            )}

            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={() => { handleToggleRole(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded text-xs font-medium text-blue-800 hover:bg-blue-50 flex items-center justify-between"
              >
                <span>{isOfficial ? 'Switch to Citizen View' : 'Switch to Municipal Portal'}</span>
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
