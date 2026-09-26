import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CivicLogo } from '../components/CivicLogo';

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('citizen');
  const [error, setError] = useState(null);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await register(name, email, password, role);
      if (user.role === 'authority' || user.role === 'admin') {
        navigate('/authority');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
            Create Civic Account
          </h1>
          <p className="text-xs text-slate-500">
            Register to lodge and track municipal grievance reports
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 focus:ring-1 focus:ring-blue-700 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="resident@civicseva.org"
                className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 focus:ring-1 focus:ring-blue-700 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
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

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2 rounded border border-slate-300 bg-white font-medium text-slate-800 text-xs"
            >
              <option value="citizen">Citizen Resident</option>
              <option value="authority">Municipal Authority / Ward Officer</option>
              <option value="admin">Administrator / Commissioner</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs shadow-sm transition flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Registering...' : 'Complete Registration'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-blue-800 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
