import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Search, Clock, CheckCircle2, AlertTriangle, ArrowRight, Shield, RefreshCw, MessageSquare, ChevronDown, ChevronUp, MapPin, Building2, Zap, Radio, Send, User, Phone, Layers } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { StatusBadge, SeverityBadge } from '../components/StatusBadge';
import { AgentTraceTimeline } from '../components/AgentTraceTimeline';
import { LeafletMap } from '../components/LeafletMap';

const SIMPLE_STEPS = [
  { id: 'Submitted', label: '1. Received', desc: 'Logged on ledger' },
  { id: 'Assigned', label: '2. Assigned', desc: 'Auto-routed to department' },
  { id: 'In Progress', label: '3. Repair Underway', desc: 'Crew at site' },
  { id: 'Resolved', label: '4. Fixed & Verified', desc: 'Remediation closed' }
];

export const TrackComplaintPage = () => {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const [searchId, setSearchId] = useState(routeId || 'CS1001');
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [followupMsg, setFollowupMsg] = useState(null);
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const fetchComplaint = async (targetId) => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    setFollowupMsg(null);

    try {
      const data = await complaintApi.getComplaintById(targetId.trim().toUpperCase());
      setComplaint(data);
    } catch (err) {
      setError(err.message || 'Complaint not found. Try searching with CS1001 or CS1008.');
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeId) {
      setSearchId(routeId);
      fetchComplaint(routeId);
    } else {
      fetchComplaint('CS1001');
    }
  }, [routeId]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchComplaint(searchId);
  };

  // Autonomous status inquiry to department
  const handleAutoInquire = async () => {
    if (!complaint) return;
    setIsFollowingUp(true);
    setError(null);
    setFollowupMsg(null);
    try {
      const res = await complaintApi.autoInquireComplaint(complaint.id);
      setFollowupMsg(`Status update request sent to ${res.department}. The complaint record has been refreshed.`);
      await fetchComplaint(complaint.id);
    } catch (err) {
      setError(err.message || 'Failed to dispatch autonomous status inquiry.');
    } finally {
      setIsFollowingUp(false);
    }
  };

  const isStepComplete = (stepId) => {
    if (!complaint) return false;
    const s = complaint.status;
    if (s === 'Resolved') return true;
    if (s === 'In Progress' && ['Submitted', 'Acknowledged', 'Assigned', 'In Progress'].includes(stepId)) return true;
    if (s === 'Assigned' && ['Submitted', 'Acknowledged', 'Assigned'].includes(stepId)) return true;
    if (['Submitted', 'Acknowledged'].includes(s) && stepId === 'Submitted') return true;
    return false;
  };

  const isStepActive = (stepId) => {
    if (!complaint) return false;
    const s = complaint.status;
    if (stepId === 'In Progress' && s === 'In Progress') return true;
    if (stepId === 'Assigned' && s === 'Assigned') return true;
    if (stepId === 'Submitted' && ['Submitted', 'Acknowledged'].includes(s)) return true;
    return false;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Bar Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="text-center max-w-md mx-auto space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Complaint status service</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">
            Track complaint status
          </h1>
          <p className="text-xs text-slate-500">
            Enter your docket number to view the latest status, department, and resolution updates.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="e.g. CS1001"
              className="w-full text-xs pl-9 pr-3 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono font-bold uppercase tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Quick Demo Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-500">
          <span>Sample docket numbers:</span>
          {['CS1001', 'CS1002', 'CS1005', 'CS1008'].map((cid) => (
            <button
              key={cid}
              type="button"
              onClick={() => { setSearchId(cid); fetchComplaint(cid); }}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 font-mono text-xs font-bold text-slate-700 border border-slate-200 transition"
            >
              #{cid}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {followupMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2 animate-scale-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{followupMsg}</span>
        </div>
      )}

      {complaint && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8 animate-scale-up">
          {/* Header Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-mono text-slate-900">#{complaint.id}</span>
                <StatusBadge status={complaint.status} />
                <SeverityBadge severity={complaint.severity} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mt-1 capitalize">
                {complaint.issue_type?.replace('_', ' ') || complaint.category?.replace('_', ' ')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {complaint.address || 'Location on map'} &bull; Submitted on {new Date(complaint.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Autonomous Action Button */}
            {complaint.status !== 'Resolved' && (
              <button
                type="button"
                onClick={handleAutoInquire}
                disabled={isFollowingUp}
                className="px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-2 self-start sm:self-auto disabled:opacity-60"
              >
                {isFollowingUp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Requesting status update...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 text-amber-100" />
                    <span>Request department update ({complaint.follow_up_count || 0})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Autonomous Watchdog Telemetry Bar */}
          <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <strong className="text-white block">Service monitoring active</strong>
                <span className="text-slate-400 text-[11px]">
                  Status monitoring continues while the complaint is open. Updates are recorded in the complaint history.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 font-bold border border-slate-700">
                Updates Requested: {complaint.follow_up_count || 0}
              </span>
            </div>
          </div>

          {/* Clean 4-Stage Visual Progress Stepper */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolution Progress</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SIMPLE_STEPS.map((step) => {
                const complete = isStepComplete(step.id);
                const active = isStepActive(step.id);

                return (
                  <div
                    key={step.id}
                    className={`p-4 rounded-2xl border text-center transition ${
                      complete
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : active
                        ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full mx-auto mb-2 flex items-center justify-center">
                      {complete ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      ) : active ? (
                        <Clock className="w-6 h-6 text-blue-600 animate-spin" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                      )}
                    </div>
                    <strong className="text-xs font-bold block">{step.label}</strong>
                    <span className="text-[11px] opacity-75">{step.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {complaint.status === 'Escalated' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>
                <strong>Complaint escalated:</strong> This complaint has exceeded the expected service period and has been referred for further departmental review.
              </span>
            </div>
          )}

          {/* Assigned Municipal Field Officer Card */}
          {complaint.assigned_officer_name && (
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Assigned Municipal Field Officer</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-bold text-[10px]">
                  On duty
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <strong className="text-base font-bold text-slate-900 block">
                    {complaint.assigned_officer_name}
                  </strong>
                  <span className="text-xs text-slate-600 block">
                    Field Squad Lead &bull; {complaint.department_name || 'Municipal Works'}
                  </span>
                  {complaint.assigned_officer_phone && (
                    <a
                      href={`tel:${complaint.assigned_officer_phone}`}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 mt-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Contact: {complaint.assigned_officer_phone}</span>
                    </a>
                  )}
                </div>

                <div className="bg-white px-4 py-3 rounded-xl border border-emerald-200 text-center self-start sm:self-auto shadow-sm">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Proximity</span>
                      <strong className="text-sm font-mono text-slate-800">
                        {complaint.officer_distance_km ? `${complaint.officer_distance_km} km` : '0.8 km'}
                      </strong>
                    </div>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Estimated Arrival</span>
                      <strong className="text-sm font-mono text-emerald-600">
                        {complaint.officer_eta_minutes ? `${complaint.officer_eta_minutes} mins` : '15 mins'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Neighborhood Incident Cluster Alert */}
          {(complaint.cluster_id || complaint.is_duplicate) && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Layers className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-950 font-bold">
                  Related neighbourhood reports: #{complaint.cluster_id || 'group'}
                </strong>
                <span>
                  Other residents have reported a related issue nearby. The department can review these reports together.
                </span>
              </div>
            </div>
          )}

          {/* Information Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold block">Auto-Checked Municipal Office</span>
              <strong className="text-sm font-bold text-slate-900 block flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                {complaint.department_name || 'Responsible Department'}
              </strong>
              <p className="text-slate-500 text-[11px] leading-relaxed">{complaint.grounded_explanation}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold block">Official Remediation Directive</span>
              <strong className="text-sm font-bold text-slate-900 block">Assigned Work Order</strong>
              <p className="text-emerald-800 text-[11px] leading-relaxed font-medium">{complaint.recommended_action || 'On-site engineer verification and remediation scheduled.'}</p>
            </div>
          </div>

          {/* Collapsible Accordion for Autonomous Decision History & Department Audit */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="w-full px-4 py-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition"
            >
              <span>View processing details and audit history</span>
              {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTechnicalDetails && (
              <div className="p-5 border-t border-slate-200 space-y-6 bg-white">
                <AgentTraceTimeline trace={complaint.agent_actions} />

                {complaint.history && complaint.history.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Status history and department updates
                    </h5>
                    <div className="divide-y divide-slate-100 text-xs">
                      {complaint.history.map((h, idx) => (
                        <div key={idx} className="py-2.5 flex justify-between items-start">
                          <div className="space-y-0.5 max-w-xl">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800">{h.changed_by}: </span>
                              <span className="text-emerald-700 font-medium font-mono text-[11px]">
                                {h.old_status} → {h.new_status}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] whitespace-pre-wrap leading-relaxed">{h.remarks}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                            {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
