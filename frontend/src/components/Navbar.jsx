import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, PlusCircle, Search, Map, BarChart3, Bot, User, LogOut, ChevronDown, CheckCircle2, Building2, Users, Radio, Menu, X, ArrowRightLeft, Sparkles, Camera } from 'lucide-react';
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
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b shadow-sm transition-colors duration-300 ${
      isOfficial
        ? 'bg-slate-900/95 border-slate-800 text-slate-100'
        : 'bg-white/95 border-slate-200 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Mode Indicator */}
          <Link to={isOfficial ? "/authority" : "/"} className="flex items-center space-x-3 group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 ${
              isOfficial
                ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-indigo-500/25'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
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
                    <span>Municipal Command Center</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Citizen Grievance Portal</span>
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
                  <span>Triage & Dispatch</span>
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
                  <span>Field Crew Radar</span>
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
                    CCTV AI Vision
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
                  <span>Operations Map</span>
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
                  <span>Civic Analytics</span>
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
                  <span>AI Benchmarks</span>
                </Link>
              </>
            ) : (
              /* === CITIZEN NAVIGATION === */
              <>
                <Link
                  to="/report"
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold ${
                    isActive('/report')
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Report Issue (Instant AI)</span>
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
                  <span>My Grievances</span>
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
              <span>{isOfficial ? '🏛️ Official Mode' : '👤 Citizen Mode'}</span>
              <span className="text-[10px] opacity-75 hidden sm:inline">
                ({isOfficial ? 'Switch to Citizen ➔' : 'Switch to Official ➔'})
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
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
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
                  📋 Triage & Dispatch Queue
                </Link>
                <Link
                  to="/authority?tab=OFFICERS"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  👷 Field Crew Proximity Radar
                </Link>
                <Link
                  to="/cctv"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-bold text-rose-300 hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>📹 CCTV AI Vision Grid</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40">LIVE</span>
                </Link>
                <Link
                  to="/map"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  🗺️ Operations Map
                </Link>
                <Link
                  to="/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  📊 Civic Analytics
                </Link>
                <Link
                  to="/evaluation"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  🧪 AI Benchmarks
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/report"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-800"
                >
                  📸 Report Issue (Instant AI Photo)
                </Link>
                <Link
                  to="/track"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  🔍 Track Complaint
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  📋 My Grievances
                </Link>
                <Link
                  to="/map"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  🗺️ Community Map
                </Link>
              </>
            )}

            <div className="pt-2 border-t border-slate-200/50">
              <button
                onClick={() => { handleToggleRole(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-indigo-400 hover:bg-slate-800 flex items-center justify-between"
              >
                <span>{isOfficial ? 'Switch to 👤 Citizen Mode' : 'Switch to 🏛️ Official Mode'}</span>
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
