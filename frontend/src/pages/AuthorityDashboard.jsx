import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Shield, AlertTriangle, CheckCircle2, Clock, Filter, RefreshCw, X, Building2, UserCheck, Wrench, Users, Phone, MapPin, Zap, User, ArrowRight, Radio, Star, ChevronRight } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { departmentApi } from '../api/departmentApi';
import { officerApi } from '../api/officerApi';
import { StatusBadge, SeverityBadge } from '../components/StatusBadge';
import { AutonomousAgentWidget } from '../components/AutonomousAgentWidget';
import { useAuth } from '../context/AuthContext';

export const AuthorityDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary View Mode: 'TRIAGE' | 'OFFICERS' | 'WATCHDOG'
  const initialView = searchParams.get('tab') === 'OFFICERS' ? 'OFFICERS' : 'TRIAGE';
  const [activeView, setActiveView] = useState(initialView);

  // Data
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [fleetSummary, setFleetSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Triage sub-filters
  const [activeTab, setActiveTab] = useState('ALL');

  // Officer sub-filters
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Smart Match Assistant state
  const [inspectingComplaint, setInspectingComplaint] = useState(null);
  const [smartCandidates, setSmartCandidates] = useState([]);
  const [loadingSmartMatch, setLoadingSmartMatch] = useState(false);
  const [smartMatchSuccess, setSmartMatchSuccess] = useState(null);

  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState('Assigned');
  const [newDeptId, setNewDeptId] = useState('');
  const [newOfficerId, setNewOfficerId] = useState('');
  const [officialRemarks, setOfficialRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'OFFICERS') setActiveView('OFFICERS');
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, dData, oData, fSummary] = await Promise.all([
        complaintApi.getComplaints(),
        departmentApi.getDepartments(),
        officerApi.getOfficers(),
        officerApi.getFleetSummary()
      ]);
      setComplaints(cData);
      setDepartments(dData);
      setOfficers(oData);
      setFleetSummary(fSummary);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openActionModal = (complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status === 'Submitted' ? 'Assigned' : complaint.status === 'Assigned' ? 'In Progress' : 'Resolved');
    setNewDeptId(complaint.department_id || '');
    setNewOfficerId(complaint.assigned_officer_id || '');
    setOfficialRemarks('');
    setActionSuccess(null);
    setActionError(null);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setIsUpdating(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await complaintApi.updateStatus(
        selectedComplaint.id,
        newStatus,
        officialRemarks || `Status updated to ${newStatus} by officer.`,
        newDeptId ? Number(newDeptId) : undefined
      );

      // If officer was changed or selected
      if (newOfficerId && Number(newOfficerId) !== selectedComplaint.assigned_officer_id) {
        await officerApi.assignOfficer(selectedComplaint.id, Number(newOfficerId), officialRemarks);
      }

      setActionSuccess(`Docket #${selectedComplaint.id} updated to '${newStatus}'.`);
      await loadData();
      setTimeout(() => setSelectedComplaint(null), 1000);
    } catch (err) {
      setActionError(err.message || 'Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Instant 1-Click Smart Auto-Assign
  const handleQuickAutoAssign = async (complaint) => {
    try {
      const lat = complaint.latitude || 18.5204;
      const lon = complaint.longitude || 73.8567;
      const match = await officerApi.smartMatch(lat, lon, complaint.department_id);
      if (match.best_match) {
        await officerApi.assignOfficer(complaint.id, match.best_match.id, "Auto-assigned by Municipal Smart Dispatch Assistant.");
        await loadData();
        alert(`Docket #${complaint.id} auto-assigned to ${match.best_match.name} (${match.best_match.distance_km} km away).`);
      } else {
        alert("No field officers available for auto-assignment.");
      }
    } catch (err) {
      alert(err.message || "Failed to auto-assign officer.");
    }
  };

  // Toggle Officer Status (for simulation)
  const handleToggleOfficerStatus = async (officerId, currentStatus) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'BUSY' : 'AVAILABLE';
    try {
      await officerApi.updateOfficerStatus(officerId, nextStatus);
      await loadData();
    } catch (err) {
      alert("Could not update officer status.");
    }
  };

  // Run Smart Match Assistant for an inspected complaint
  const handleInspectComplaint = async (complaint) => {
    setInspectingComplaint(complaint);
    setLoadingSmartMatch(true);
    setSmartMatchSuccess(null);
    try {
      const lat = complaint.latitude || 18.5204;
      const lon = complaint.longitude || 73.8567;
      const res = await officerApi.smartMatch(lat, lon, complaint.department_id);
      setSmartCandidates(res.candidates || []);
    } catch {
      setSmartCandidates([]);
    } finally {
      setLoadingSmartMatch(false);
    }
  };

  const handleAssignCandidate = async (officerId) => {
    if (!inspectingComplaint) return;
    try {
      await officerApi.assignOfficer(inspectingComplaint.id, officerId, "Assigned via Proximity Dispatch Radar.");
      setSmartMatchSuccess(`Assigned Docket #${inspectingComplaint.id} to selected squad.`);
      await loadData();
      setTimeout(() => {
        setInspectingComplaint(null);
        setSmartMatchSuccess(null);
      }, 1200);
    } catch (err) {
      alert(err.message || "Assignment failed.");
    }
  };

  // Filter complaints for Triage view
  const filteredComplaints = complaints.filter((c) => {
    if (activeTab === 'NEW') return c.status === 'Submitted';
    if (activeTab === 'HIGH_PRIORITY') return ['HIGH', 'CRITICAL'].includes(c.severity);
    if (activeTab === 'IN_PROGRESS') return ['Assigned', 'In Progress'].includes(c.status);
    if (activeTab === 'ESCALATED') return c.status === 'Escalated';
    if (activeTab === 'RESOLVED') return c.status === 'Resolved';
    return true;
  });

  // Filter officers
  const filteredOfficers = officers.filter((o) => {
    if (selectedDeptFilter !== 'ALL' && o.department_id !== Number(selectedDeptFilter)) return false;
    if (selectedStatusFilter !== 'ALL' && o.status !== selectedStatusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
            <Building2 className="w-3.5 h-3.5" />
            <span>Municipal Operations Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
            Civic Operations & Dispatch Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Autonomous grievance triage, intelligent field staff proximity matching, and SLA watchdog management.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1.5 self-start sm:self-auto border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Operations</span>
        </button>
      </div>

      {/* Primary Dashboard Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveView('TRIAGE')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeView === 'TRIAGE'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Work Orders & Triage</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {complaints.length}
          </span>
        </button>

        <button
          onClick={() => setActiveView('OFFICERS')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeView === 'OFFICERS'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Field Squads & Proximity Radar</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold">
            {fleetSummary?.available || officers.filter(o => o.status === 'AVAILABLE').length} Free
          </span>
        </button>

        <button
          onClick={() => setActiveView('WATCHDOG')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeView === 'WATCHDOG'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>Autonomous AI Watchdog</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: WORK ORDERS & TRIAGE QUEUE */}
      {/* ========================================================================= */}
      {activeView === 'TRIAGE' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Sub-Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Tickets', count: complaints.length },
              { id: 'NEW', label: 'Needs Assignment', count: complaints.filter(c => c.status === 'Submitted').length },
              { id: 'HIGH_PRIORITY', label: 'High Priority', count: complaints.filter(c => ['HIGH', 'CRITICAL'].includes(c.severity)).length },
              { id: 'IN_PROGRESS', label: 'In Progress / Assigned', count: complaints.filter(c => ['Assigned', 'In Progress'].includes(c.status)).length },
              { id: 'ESCALATED', label: 'Escalated', count: complaints.filter(c => c.status === 'Escalated').length },
              { id: 'RESOLVED', label: 'Resolved', count: complaints.filter(c => c.status === 'Resolved').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-indigo-900 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Docket #</th>
                    <th className="px-5 py-3">Issue & Location</th>
                    <th className="px-5 py-3">Severity</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Assigned Field Squad</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        <Link to={`/track/${c.id}`} className="hover:text-indigo-600 underline">
                          #{c.id}
                        </Link>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <strong className="text-slate-900 block capitalize">
                          {c.issue_type?.replace('_', ' ') || c.category?.replace('_', ' ')}
                        </strong>
                        <span className="text-[11px] text-slate-400 line-clamp-1">{c.address}</span>
                      </td>
                      <td className="px-5 py-4">
                        <SeverityBadge severity={c.severity} />
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {c.department_name || 'Public Works'}
                      </td>
                      <td className="px-5 py-4">
                        {c.assigned_officer_name ? (
                          <div className="space-y-0.5">
                            <strong className="text-slate-900 block text-xs">
                              {c.assigned_officer_name}
                            </strong>
                            <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                              <span>📍 {c.officer_distance_km ? `${c.officer_distance_km} km` : '0.8 km'}</span>
                              <span>&bull;</span>
                              <span>⏱️ ETA {c.officer_eta_minutes ? `${c.officer_eta_minutes}m` : '12m'}</span>
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickAutoAssign(c)}
                            className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3 text-amber-600 fill-amber-600" />
                            <span>Auto-Assign Nearest</span>
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleInspectComplaint(c)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs"
                          title="View Proximity Radar for this ticket"
                        >
                          Radar
                        </button>
                        <button
                          onClick={() => openActionModal(c)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition text-xs shadow-sm"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: FIELD SQUADS & PROXIMITY DISPATCH RADAR */}
      {/* ========================================================================= */}
      {activeView === 'OFFICERS' && (
        <div className="space-y-8 animate-fade-in">
          {/* Fleet Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-400 font-bold block">Total On-Duty Squads</span>
              <div className="text-2xl font-black font-heading text-slate-900 mt-1">{officers.length}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-emerald-600 font-bold block">Free for Immediate Dispatch</span>
              <div className="text-2xl font-black font-heading text-emerald-600 mt-1">
                {officers.filter(o => o.status === 'AVAILABLE').length} Available
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-blue-600 font-bold block">Active On-Site / In Transit</span>
              <div className="text-2xl font-black font-heading text-blue-600 mt-1">
                {officers.filter(o => o.status === 'ON_DUTY').length} On Duty
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-amber-600 font-bold block">High Workload Squads</span>
              <div className="text-2xl font-black font-heading text-amber-600 mt-1">
                {officers.filter(o => o.status === 'BUSY').length} Busy
              </div>
            </div>
          </div>

          {/* PROXIMITY DISPATCH RADAR ASSISTANT (If inspecting a complaint) */}
          {inspectingComplaint && (
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-indigo-800 shadow-2xl space-y-5 animate-scale-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-bold border border-indigo-400/30">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>Autonomous Proximity Radar Matcher</span>
                  </div>
                  <h3 className="text-xl font-bold font-heading text-white">
                    Matching Closest Free Field Officer for Docket #{inspectingComplaint.id}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Issue: <span className="font-semibold text-white capitalize">{inspectingComplaint.issue_type}</span> &bull; Location: {inspectingComplaint.address}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingComplaint(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition self-start sm:self-auto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {smartMatchSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{smartMatchSuccess}</span>
                </div>
              )}

              {loadingSmartMatch ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Computing geospatial distances and checking squad availability...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Ranked Field Officers (Sorted by Nearest Distance & Lowest Workload)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {smartCandidates.map((cand, idx) => (
                      <div
                        key={cand.id}
                        className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                          idx === 0
                            ? 'bg-indigo-950/80 border-indigo-500/80 ring-2 ring-indigo-500/20'
                            : 'bg-slate-900/90 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <strong className="text-sm font-bold text-white block">
                                {cand.name}
                              </strong>
                              {idx === 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] border border-amber-400/30">
                                  ⭐ Top AI Choice
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-300 block">{cand.role}</span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{cand.current_address}</span>
                            </span>
                          </div>

                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                            cand.status === 'AVAILABLE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : cand.status === 'ON_DUTY'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {cand.status}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-indigo-200">
                          {cand.match_reason}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                          <div className="text-[11px] font-mono text-slate-400 space-x-3">
                            <span>📍 <strong>{cand.distance_km} km</strong> away</span>
                            <span>⏱️ ETA <strong>{cand.eta_minutes}m</strong></span>
                            <span>📋 <strong>{cand.active_tickets}</strong> tasks</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAssignCandidate(cand.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                          >
                            <span>Dispatch Squad</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Officers Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="font-bold text-slate-700">Filter Department:</span>
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
              >
                <option value="ALL">All Municipal Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {['ALL', 'AVAILABLE', 'ON_DUTY', 'BUSY'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    selectedStatusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Officer Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOfficers.map((off) => (
              <div
                key={off.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-slate-800 text-white flex items-center justify-center font-bold font-heading text-lg shadow-md shadow-indigo-600/20">
                        {off.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <strong className="text-sm font-bold text-slate-900 block">
                          {off.name}
                        </strong>
                        <span className="text-xs text-slate-500 block">{off.role}</span>
                        <span className="text-[11px] text-indigo-700 font-semibold">
                          {off.department_name}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      off.status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : off.status === 'ON_DUTY'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {off.status === 'AVAILABLE' ? '🟢 Available' : off.status === 'ON_DUTY' ? '🟡 On Duty' : '🔴 Busy'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{off.current_address || 'Stationed in Central Ward'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <a href={`tel:${off.phone}`} className="text-indigo-600 hover:underline font-mono">
                        {off.phone}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">Active Workload</span>
                    <strong className="text-sm font-mono text-slate-900">
                      {off.active_tickets} {off.active_tickets === 1 ? 'task' : 'tasks'}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleOfficerStatus(off.id, off.status)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                  >
                    Toggle {off.status === 'AVAILABLE' ? 'to Busy' : 'to Free'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: AUTONOMOUS AI WATCHDOG CONSOLE */}
      {/* ========================================================================= */}
      {activeView === 'WATCHDOG' && (
        <div className="space-y-6 animate-fade-in">
          <AutonomousAgentWidget onSweepComplete={loadData} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTION & REASSIGNMENT MODAL */}
      {/* ========================================================================= */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-700 uppercase">Docket Management</span>
                <h3 className="text-xl font-bold text-slate-900 font-heading">
                  Update Docket #{selectedComplaint.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Resolution Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                >
                  <option value="Submitted">Submitted (Pending Triage)</option>
                  <option value="Acknowledged">Acknowledged</option>
                  <option value="Assigned">Assigned to Field Squad</option>
                  <option value="In Progress">In Progress (Work Underway)</option>
                  <option value="Awaiting Verification">Awaiting Verification</option>
                  <option value="Resolved">Resolved & Fixed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Assigned Field Squad / Engineer</label>
                <select
                  value={newOfficerId}
                  onChange={(e) => setNewOfficerId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                >
                  <option value="">Unassigned</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} - {o.role} ({o.status}, {o.active_tickets} active)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Official Action Remarks</label>
                <textarea
                  rows={3}
                  value={officialRemarks}
                  onChange={(e) => setOfficialRemarks(e.target.value)}
                  placeholder="e.g. Field inspection completed. Asphalt patching scheduled for 4:00 PM."
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition flex items-center gap-2"
                >
                  {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Docket Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
