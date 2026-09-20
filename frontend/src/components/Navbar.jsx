import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Search, Map, BarChart3, Bot, LogOut, Building2, Users, Menu, X, ArrowRightLeft, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

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
    <header className={`app-nav sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${
      isOfficial
        ? 'bg-slate-900/95 border-slate-800 text-slate-100'
        : 'bg-white/95 border-slate-200 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[4.5rem]">
          {/* Brand Logo & Mode Indicator */}
          <Link to={isOfficial ? "/authority" : "/"} className="flex items-center space-x-3 group">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 ${
              isOfficial
                ? 'bg-indigo-700 shadow-indigo-500/25'
                : 'bg-emerald-700 shadow-emerald-500/20'
            }`}>
              {isOfficial ? <Building2 className="w-5 h-5" /> : <Shield className="w-6 h-6" />}
            </div>
            <div>
              <span className={`font-heading text-xl font-bold tracking-tight flex items-center gap-1.5 ${
                isOfficial ? 'text-white' : 'text-slate-900'
              }`}>
                CIVIC<span className={isOfficial ? 'text-indigo-400' : 'text-emerald-600'}>SEVA</span>
              </span>
              <p className={`text-[11px] font-medium flex items-center gap-1 ${
                isOfficial ? 'text-indigo-300' : 'text-slate-500'
              }`}>
                {isOfficial ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    <span>Municipal administration</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Citizen services</span>
                  </>
                )}
              </p>
            </div>
          </Link>

          {/* DEDICATED ROLE-BASED NAVIGATION */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-sm font-medium">
            {isOfficial ? (
              /* === OFFICIAL / MUNICIPAL OFFICER NAVIGATION === */
              <>
                <Link
                  to="/authority"
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                    isActive('/authority')
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Shield className="w-4 h-4 text-indigo-300" />
                  <span>Complaint queue</span>
                </Link>

                <Link
                  to="/authority?tab=OFFICERS"
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                    location.search.includes('OFFICERS')
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4 text-indigo-300" />
                  <span>Field officers</span>
                </Link>

                <Link
                  to="/cctv"
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                    isActive('/cctv')
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Camera className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span className="flex items-center gap-1">
                    CCTV monitoring
                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40">LIVE</span>
                  </span>
                </Link>

                <Link
                  to="/map"
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                    isActive('/map')
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Map className="w-4 h-4 text-indigo-300" />
                  <span>Operations map</span>
                </Link>

                <Link
                  to="/analytics"
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                    isActive('/analytics')
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-indigo-300" />
                  <span>Service analytics</span>
                </Link>

                <Link
                  to="/evaluation"
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                    isActive('/evaluation')
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>System evaluation</span>
                </Link>
              </>
            ) : (
              /* === CITIZEN NAVIGATION === */
              <>
                <Link
                  to="/report"
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold ${
                    isActive('/report')
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <span>Submit complaint</span>
                </Link>

                <Link
                  to="/track"
                  className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                    isActive('/track')
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Search className="w-4 h-4 text-slate-400" />
                  <span>Track Complaint</span>
                </Link>

                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-xl transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>My complaints</span>
                </Link>

                <Link
                  to="/map"
                  className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                    isActive('/map')
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Map className="w-4 h-4 text-slate-400" />
                  <span>Community Map</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Items & One-Click Mode Switcher */}
          <div className="flex items-center space-x-2">
            {/* Direct 1-Click Role Switcher Pill */}
            <button
              onClick={handleToggleRole}
              title={isOfficial ? "Switch back to Citizen View" : "Switch to Municipal Officer Command Center"}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-sm border ${
                isOfficial
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900 hover:text-white'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>{isOfficial ? 'Official view' : 'Citizen view'}</span>
              <span className="text-[10px] opacity-75 hidden sm:inline">
                ({isOfficial ? 'Citizen view' : 'Official view'})
              </span>
            </button>

            <NotificationBell />

            {user ? (
              <div className={`flex items-center space-x-2 pl-2 border-l ${
                isOfficial ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <span className={`text-xs font-medium hidden lg:inline-block ${
                  isOfficial ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {user.name.split(' ')[0]}
                </span>
                <button
                  onClick={logout}
                  className={`p-2 rounded-xl transition ${
                    isOfficial
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl ${
                isOfficial ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t py-3 space-y-1.5 ${
            isOfficial ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
          }`}>
            {isOfficial ? (
              <>
                <Link
                  to="/authority"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Complaint queue
                </Link>
                <Link
                  to="/authority?tab=OFFICERS"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Field officers
                </Link>
                <Link
                  to="/cctv"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-bold text-rose-300 hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>CCTV monitoring</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40">LIVE</span>
                </Link>
                <Link
                  to="/map"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Operations map
                </Link>
                <Link
                  to="/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Service analytics
                </Link>
                <Link
                  to="/evaluation"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  System evaluation
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/report"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-800"
                >
                  Submit complaint
                </Link>
                <Link
                  to="/track"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Track complaint
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  My complaints
                </Link>
                <Link
                  to="/map"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Community map
                </Link>
              </>
            )}

            <div className="pt-2 border-t border-slate-200/50">
              <button
                onClick={() => { handleToggleRole(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-indigo-400 hover:bg-slate-800 flex items-center justify-between"
              >
                <span>{isOfficial ? 'Switch to citizen view' : 'Switch to official view'}</span>
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
