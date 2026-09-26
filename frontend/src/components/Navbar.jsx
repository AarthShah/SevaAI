import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, ArrowLeftRight, Search, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CivicLogo } from './CivicLogo';

export const Navbar = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

  const isActive = (path) => location.pathname === path;
  const isOfficial = user?.role === 'authority' || user?.role === 'admin' || location.pathname.startsWith('/authority') || location.pathname.startsWith('/cctv');

  const handleToggleRole = async () => {
    if (isOfficial) {
      await switchDemoRole('citizen');
      navigate('/');
    } else {
      await switchDemoRole('authority');
      navigate('/authority');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (isOfficial) {
      navigate(`/authority?search=${encodeURIComponent(navSearch)}`);
    } else {
      navigate(`/dashboard?search=${encodeURIComponent(navSearch)}`);
    }
  };

  // ============================================================
  // OFFICIAL MUNICIPAL COMMAND CENTER HEADER (Dark Slate Theme)
  // ============================================================
  if (isOfficial) {
    return (
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left: Civic Logo & Title */}
            <Link to="/authority" className="flex items-center gap-2.5 flex-shrink-0">
              <CivicLogo
                className="h-6 w-6 text-white"
                textClassName="text-base sm:text-lg font-bold text-white tracking-tight"
              />
              <span className="hidden sm:inline-block pl-2 border-l border-slate-700 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Command Center
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center space-x-1 text-xs font-medium">
              <Link
                to="/authority"
                className={`px-3 py-1.5 rounded transition ${
                  isActive('/authority') && !location.search.includes('tab=')
                    ? 'bg-blue-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Triage & Dispatch
              </Link>
              <Link
                to="/authority?tab=AI_REVIEW"
                className={`px-3 py-1.5 rounded transition ${
                  location.search.includes('AI_REVIEW')
                    ? 'bg-blue-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                AI Dispatch Review
              </Link>
              <Link
                to="/authority?tab=DEPARTMENTS"
                className={`px-3 py-1.5 rounded transition ${
                  location.search.includes('DEPARTMENTS')
                    ? 'bg-blue-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Departments
              </Link>
              <Link
                to="/cctv"
                className={`px-3 py-1.5 rounded transition ${
                  isActive('/cctv')
                    ? 'bg-blue-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                CCTV Grid
              </Link>
              <Link
                to="/map"
                className={`px-3 py-1.5 rounded transition ${
                  isActive('/map')
                    ? 'bg-blue-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Operations Map
              </Link>
              <Link
                to="/analytics"
                className={`px-3 py-1.5 rounded transition ${
                  isActive('/analytics')
                    ? 'bg-blue-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Analytics
              </Link>
            </nav>

            {/* Center: Search Box */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xs md:max-w-md hidden lg:block">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder="Search complaint ID, road..."
                  className="w-full bg-white text-slate-900 text-xs pl-8 pr-3 py-1.5 rounded border-none focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400"
                />
              </div>
            </form>

            {/* Right: Actions & User Profile */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Role Toggle */}
              <button
                onClick={handleToggleRole}
                className="px-2 py-1 text-xs font-medium border border-slate-700 rounded text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition flex items-center gap-1"
                title="Switch to Citizen View"
              >
                <ArrowLeftRight className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Citizen View</span>
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                </button>
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  1
                </span>
              </div>

              {/* User Avatar */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
                <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 text-white text-xs font-bold flex items-center justify-center">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RP'}
                </div>
                <div className="hidden md:block text-left">
                  <span className="text-xs font-semibold text-white block leading-tight">
                    {user?.name || 'R. Patil'}
                  </span>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    {user?.role === 'admin' ? 'Commissioner' : 'Operations Officer'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mobile Hamburger Toggle for Official Mode */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800"
                aria-label="Toggle command menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer for Official Mode */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-1">
            <Link
              to="/authority"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded text-sm text-slate-200 hover:bg-slate-800"
            >
              Triage & Dispatch
            </Link>
            <Link
              to="/authority?tab=AI_REVIEW"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded text-sm text-blue-300 font-semibold hover:bg-slate-800"
            >
              AI Dispatch Review (Verify AI Assignments)
            </Link>
            <Link
              to="/authority?tab=DEPARTMENTS"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded text-sm text-slate-200 hover:bg-slate-800"
            >
              Departments Overview
            </Link>
            <Link
              to="/cctv"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded text-sm text-slate-200 hover:bg-slate-800"
            >
              CCTV AI Vision Grid
            </Link>
            <Link
              to="/map"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded text-sm text-slate-200 hover:bg-slate-800"
            >
              Operations Map
            </Link>
            <Link
              to="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded text-sm text-slate-200 hover:bg-slate-800"
            >
              Analytics
            </Link>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => { handleToggleRole(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded text-xs font-medium text-blue-400 hover:bg-slate-800 flex items-center justify-between"
              >
                <span>Switch to Citizen Public Portal</span>
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>
    );
  }

  // ============================================================
  // CITIZEN PUBLIC SERVICES HEADER (Clean White Theme)
  // ============================================================
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* CivicSeva Logo */}
          <Link to="/" className="flex items-center">
            <CivicLogo
              className="h-6 w-6 text-blue-800"
              textClassName="text-lg font-bold text-slate-900 tracking-tight"
            />
          </Link>

          {/* Navigation Links with Active Bottom-Indicator */}
          <nav className="hidden md:flex items-center space-x-6 text-sm">
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
          </nav>

          {/* Right Action Items & Mode Switcher */}
          <div className="flex items-center space-x-3">
            {/* Clean rectangular role switcher */}
            <button
              onClick={handleToggleRole}
              title="Switch to Municipal Officer Portal"
              className="px-2.5 py-1 text-xs font-medium border border-slate-300 rounded text-slate-700 bg-white hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-3 h-3 text-slate-500" />
              <span>Municipal Portal</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
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

            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={() => { handleToggleRole(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded text-xs font-medium text-blue-800 hover:bg-blue-50 flex items-center justify-between"
              >
                <span>Switch to Municipal Portal</span>
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
