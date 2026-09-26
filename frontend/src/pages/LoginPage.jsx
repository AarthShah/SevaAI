import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CivicLogo } from '../components/CivicLogo';

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
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 rounded-md border border-slate-200 shadow-sm">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <CivicLogo
              className="h-8 w-8 text-blue-800"
              textClassName="text-xl font-bold text-slate-900 tracking-tight"
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Sign in to CivicSeva
          </h1>
          <p className="text-xs text-slate-500">
            Access citizen grievance tracking or municipal administration portal
          </p>
        </div>

        {/* Quick Demo Personas */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
          <span className="text-[11px] font-semibold text-slate-700 block">
            Demonstration Roles:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleFastDemoLogin('citizen')}
              className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs rounded border border-slate-300 transition text-center"
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => handleFastDemoLogin('authority')}
              className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs rounded border border-slate-300 transition text-center"
            >
              Ward Officer
            </button>
            <button
              type="button"
              onClick={() => handleFastDemoLogin('admin')}
              className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs rounded border border-slate-300 transition text-center"
            >
              Commissioner
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen@civicseva.org"
                className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 focus:ring-1 focus:ring-blue-700 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 focus:ring-1 focus:ring-blue-700 text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs shadow-sm transition flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-blue-800 hover:underline">
            Register as Citizen
          </Link>
        </div>
      </div>
    </div>
  );
};
