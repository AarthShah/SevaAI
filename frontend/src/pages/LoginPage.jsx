import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login, switchDemoRole, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(email, password);
      if (user.role === 'authority' || user.role === 'admin') {
        navigate('/authority');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleFastDemoLogin = async (role) => {
    try {
      const user = await switchDemoRole(role);
      if (role === 'authority' || role === 'admin') {
        navigate('/authority');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-14">
      <div className="max-w-lg w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 app-surface">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold font-heading text-slate-900">Sign in to CivicSeva</h2>
          <p className="text-xs text-slate-500">Access citizen grievance tracking and authority triage portals</p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
            Service access options:
          </span>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleFastDemoLogin('citizen')}
              className="px-2 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] rounded-lg border border-emerald-300 shadow-sm transition"
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => handleFastDemoLogin('authority')}
              className="px-2 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] rounded-lg border border-emerald-300 shadow-sm transition"
            >
              Ward Officer
            </button>
            <button
              type="button"
              onClick={() => handleFastDemoLogin('admin')}
              className="px-2 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] rounded-lg border border-emerald-300 shadow-sm transition"
            >
              Commissioner
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen@civicseva.org"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-emerald-600 hover:underline">
            Register as Citizen
          </Link>
        </div>
      </div>
    </div>
  );
};
