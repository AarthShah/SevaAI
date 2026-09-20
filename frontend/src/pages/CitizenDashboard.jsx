import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, RefreshCw, Eye, CheckCircle2, Clock, ShieldAlert, User, MapPin, ArrowRight } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { StatusBadge, SeverityBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const CitizenDashboard = () => {
  const { user } = useAuth();
  const isOfficial = user?.role === 'authority' || user?.role === 'admin';

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await complaintApi.getComplaints({
        status: statusFilter,
        search: searchQuery
      });
      setComplaints(data);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const total = complaints.length;
  const active = complaints.filter((c) => ['Submitted', 'Acknowledged', 'Assigned', 'In Progress'].includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;
  const escalated = complaints.filter((c) => c.status === 'Escalated').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Official Mode Notice (if official views citizen dashboard) */}
      {isOfficial && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-900">
          <span>🏛️ You are currently viewing the <strong>Citizen Grievance View</strong> as an official.</span>
          <Link
            to="/authority"
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-1"
          >
            <span>Go to Official Command Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Friendly Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Citizen Grievance Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 mt-2">
            My Neighborhood Grievances
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor the status of issues you reported, check assigned field officers, and view repair progress.
          </p>
        </div>

        <Link
          to="/report"
          className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-bold block">Total Reported</span>
          <div className="text-2xl font-black font-heading text-slate-900 mt-1">{total}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-blue-600 font-bold block">Being Repaired</span>
          <div className="text-2xl font-black font-heading text-blue-600 mt-1">{active}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-emerald-600 font-bold block">Resolved & Fixed</span>
          <div className="text-2xl font-black font-heading text-emerald-600 mt-1">{resolved}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-rose-600 font-bold block">Escalated Priority</span>
          <div className="text-2xl font-black font-heading text-rose-600 mt-1">{escalated}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID (CS1001), road, keyword..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Escalated">Escalated</option>
          </select>
        </div>
      </div>

      {/* Clean Complaints Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading complaints...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            No complaints found. Click 'Report New Issue' to log your first one!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Docket #</th>
                  <th className="px-5 py-3">Issue & Location</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Assigned Field Squad</th>
                  <th className="px-5 py-3">Urgency</th>
                  <th className="px-5 py-3">Current Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      #{c.id}
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <strong className="text-slate-900 block capitalize">
                        {c.issue_type?.replace('_', ' ') || c.category?.replace('_', ' ')}
                      </strong>
                      <span className="text-[11px] text-slate-400 line-clamp-1">{c.address}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {c.department_name || 'Public Works'}
                    </td>
                    <td className="px-5 py-4">
                      {c.assigned_officer_name ? (
                        <div className="space-y-0.5">
                          <strong className="text-slate-900 block text-xs flex items-center gap-1">
                            <User className="w-3 h-3 text-emerald-600" />
                            <span>{c.assigned_officer_name}</span>
                          </strong>
                          <span className="text-[11px] text-emerald-700 font-mono">
                            📍 {c.officer_distance_km ? `${c.officer_distance_km} km` : '0.8 km'} &bull; ETA {c.officer_eta_minutes || 15}m
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Pending Assignment</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <SeverityBadge severity={c.severity} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/track/${c.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-bold transition inline-block"
                      >
                        Track Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
