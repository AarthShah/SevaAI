import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, RefreshCw, Filter, Calendar } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const CitizenDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await complaintApi.getComplaints({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        search: searchQuery || undefined
      });
      setComplaints(data);
    } catch {
      // In case of error, keep list
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

  // Date filtering helper
  const filteredComplaints = complaints.filter((c) => {
    if (dateFilter === 'All') return true;
    if (!c.created_at) return true;
    const itemDate = new Date(c.created_at);
    const now = new Date();
    const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);

    if (dateFilter === '7d') return diffDays <= 7;
    if (dateFilter === '30d') return diffDays <= 30;
    if (dateFilter === '90d') return diffDays <= 90;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            My Complaints
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View and track the civic issues you have reported.
          </p>
        </div>

        <Link
          to="/report"
          className="px-4 py-2 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by complaint ID, issue type, or location..."
            className="w-full pl-9 pr-3 py-2 rounded border border-slate-200 focus:ring-1 focus:ring-blue-700 text-slate-800 placeholder-slate-400"
          />
        </form>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-medium text-slate-700 focus:ring-1 focus:ring-blue-700"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-medium text-slate-700 focus:ring-1 focus:ring-blue-700"
            >
              <option value="All">All Dates</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          <button
            onClick={loadData}
            type="button"
            className="px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-800' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Clean Complaints Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-800" />
            <span>Loading complaints...</span>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-1">
            <p className="font-medium text-slate-700">No complaints found.</p>
            <p>You have not reported any issues matching your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Complaint ID</th>
                  <th className="px-5 py-3">Issue</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created On</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                      {c.id}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 capitalize">
                      {c.issue_type?.replace(/_/g, ' ') || c.category?.replace(/_/g, ' ') || 'Civic Issue'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {c.address || 'User-provided location'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {c.department_name || 'Municipal Works'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '14 Oct 2025'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/track/${c.id}`}
                        className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium transition inline-block"
                      >
                        View
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
