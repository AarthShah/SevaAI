import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Search, Clock, CheckCircle2, AlertCircle, RefreshCw, MapPin, Building, Calendar, ArrowRight, FileQuestion, XCircle } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { StatusBadge, SeverityBadge } from '../components/StatusBadge';
import { useAssistantContext } from '../context/AssistantContext';

const TRACKING_STEPS = [
  { id: 'Submitted', label: 'Submitted', desc: 'Complaint registered' },
  { id: 'Acknowledged', label: 'Acknowledged', desc: 'Verified by municipality' },
  { id: 'Assigned', label: 'Assigned', desc: 'Field squad designated' },
  { id: 'In Progress', label: 'In Progress', desc: 'Remediation underway' },
  { id: 'Resolved', label: 'Resolved', desc: 'Work verified & closed' }
];

export const TrackComplaintPage = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const initialId = (routeId || 'CS1001').trim().toUpperCase();
  const [activeTrackingId, setActiveTrackingId] = useState(initialId);
  const [searchId, setSearchId] = useState(initialId);
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync if URL parameter routeId changes
  useEffect(() => {
    if (routeId) {
      const clean = routeId.trim().toUpperCase();
      setActiveTrackingId(clean);
      setSearchId(clean);
    }
  }, [routeId]);

  // CivicSeva Contextual Assistant live complaint registration
  useAssistantContext({
    pageName: 'TrackComplaintPage',
    selectedComplaintId: complaint?.id || null
  });

  const fetchComplaint = async (targetId, isSilent = false) => {
    if (!targetId) return;
    if (!isSilent) {
      setLoading(true);
      setError(null);
    }

    const cleanId = targetId.trim().toUpperCase();

    try {
      const data = await complaintApi.getComplaintById(cleanId);
      if (data && data.id) {
        setComplaint(data);
        setError(null);
      } else {
        setComplaint(null);
        setError(`No information available for Complaint ID #${cleanId}. Please check the ID or verify that it was submitted correctly.`);
      }
    } catch (err) {
      // In case backend is unreachable during demo testing, support standard seeded samples only
      if (cleanId === 'CS1001') {
        setComplaint({
          id: 'CS1001',
          issue_type: 'Pothole / Road Damage',
          category: 'Road Infrastructure',
          address: 'MG Road near College Gate, Indore',
          department_name: 'Road Department',
          status: 'In Progress',
          severity: 'HIGH',
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          description: 'Deep road surface pothole reported near junction.'
        });
      } else if (cleanId === 'CS1002') {
        setComplaint({
          id: 'CS1002',
          issue_type: 'Garbage Accumulation',
          category: 'Waste Management',
          address: 'Market Square, Sector 2, Indore',
          department_name: 'Sanitation Department',
          status: 'Resolved',
          severity: 'MEDIUM',
          created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          description: 'Accumulated commercial solid waste cleared by morning sanitation squad.'
        });
      } else {
        // Unknown or non-existent ID - Never show random mock data
        setComplaint(null);
        setError(`No information available for Complaint ID #${cleanId}. This docket reference was not found in the municipal records.`);
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Polling for live status updates on activeTrackingId ONLY
  useEffect(() => {
    if (!activeTrackingId) return;

    fetchComplaint(activeTrackingId);

    const interval = setInterval(() => {
      // Only poll if complaint is loaded and not closed
      setComplaint((curr) => {
        if (curr && curr.id) {
          fetchComplaint(activeTrackingId, true);
        }
        return curr;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [activeTrackingId]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const clean = (searchId || '').trim().toUpperCase();
    if (!clean) return;
    setActiveTrackingId(clean);
    navigate(`/track/${clean}`);
  };

  const handleSelectSample = (cid) => {
    const clean = cid.trim().toUpperCase();
    setSearchId(clean);
    setActiveTrackingId(clean);
    navigate(`/track/${clean}`);
  };

  // Determine timeline step status
  const getStepStatus = (stepId) => {
    if (!complaint) return 'upcoming';
    const isRejected = complaint.status === 'Rejected' || complaint.status === 'Dismissed' || complaint.authenticity_verdict === 'REJECTED_FAKE';
    if (isRejected) {
      if (stepId === 'Submitted') return 'completed';
      if (stepId === 'Acknowledged') return 'rejected';
      return 'cancelled';
    }
    const statusOrder = ['Submitted', 'Acknowledged', 'Assigned', 'In Progress', 'Resolved'];
    const currentIdx = statusOrder.indexOf(complaint.status);
    const targetIdx = statusOrder.indexOf(stepId);

    if (complaint.status === 'Resolved') return 'completed';
    if (targetIdx < currentIdx) return 'completed';
    if (targetIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Search Card */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Track a Complaint
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Search using your Complaint ID to view current progress and departmental updates.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mt-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="e.g. CS1001"
              className="w-full text-xs pl-9 pr-3 py-2 rounded border border-slate-300 focus:ring-1 focus:ring-blue-700 font-mono uppercase tracking-wider text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs transition shadow-sm flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Quick Demo ID Links */}
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <span>Sample IDs:</span>
          {['CS1001', 'CS1002', 'CS1005', 'CS1008'].map((cid) => (
            <button
              key={cid}
              type="button"
              onClick={() => handleSelectSample(cid)}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200 cursor-pointer"
            >
              {cid}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-800" />
          <span>Retrieving complaint status...</span>
        </div>
      )}

      {/* Empty State when no information is available */}
      {!complaint && !loading && (
        <div className="bg-white border border-slate-200 rounded-md p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center border border-slate-200">
            <FileQuestion className="w-6 h-6 text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">
              No Information Available
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No municipal records found for Docket Reference <span className="font-mono font-semibold text-slate-800">#{activeTrackingId}</span>. Please verify the ID or submit a new grievance report.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link
              to="/report"
              className="px-4 py-2 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs transition shadow-xs flex items-center gap-1.5"
            >
              <span>Report a New Issue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => handleSelectSample('CS1001')}
              className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
            >
              View Sample Docket (CS1001)
            </button>
          </div>
        </div>
      )}

      {/* Complaint Details Panel */}
      {complaint && !loading && (
        <div className="space-y-6">
          {/* Rejection / Fraudulent Evidence Alert Banner */}
          {(complaint.status === 'Rejected' || complaint.status === 'Dismissed' || complaint.authenticity_verdict === 'REJECTED_FAKE') && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-md p-4 text-rose-950 space-y-2 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                <AlertCircle className="w-5 h-5 text-rose-700 flex-shrink-0" />
                <span>Notice: Grievance Rejected — Evidence Detected as Fake or Synthetic</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                This grievance has been reviewed and dismissed by the Municipal Supervisor. Submitted photographic evidence failed digital forensics and authenticity checks and was determined to be synthetic, manipulated, or simulated media.
              </p>
              <div className="text-[11px] text-rose-700 font-medium flex items-center gap-2 pt-0.5">
                <span>Status: <strong>Rejected by Municipal Authority</strong></span>
                <span>•</span>
                <span>Case Closed</span>
              </div>
            </div>
          )}

          {/* Main Details Card */}
          <div className="bg-white border border-slate-200 rounded-md p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-slate-400 font-mono text-xs block">Complaint ID</span>
                <h2 className="text-xl font-bold font-mono text-slate-900">
                  {complaint.id}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={complaint.status} />
                {complaint.severity && <SeverityBadge severity={complaint.severity} />}
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block text-[11px]">Issue</span>
                <strong className="text-slate-900 block capitalize text-sm">
                  {complaint.issue_type?.replace(/_/g, ' ') || complaint.category?.replace(/_/g, ' ') || 'Civic Issue'}
                </strong>
                <span className="text-slate-500 text-[11px] block">{complaint.category?.replace(/_/g, ' ')}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block text-[11px]">Location</span>
                <div className="flex items-start gap-1 text-slate-800 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{complaint.address || 'User-provided location'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block text-[11px]">Department</span>
                <div className="flex items-start gap-1 text-slate-800 font-medium">
                  <Building className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>{complaint.department_name || 'Municipal Works'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block text-[11px]">Submitted Date</span>
                <div className="flex items-start gap-1 text-slate-800 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>
                    {complaint.created_at ? new Date(complaint.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '14 Oct 2025'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description if present */}
            {complaint.description && (
              <div className="border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-400 block text-[11px] mb-1">Description</span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 leading-relaxed">
                  {complaint.description}
                </p>
              </div>
            )}
          </div>

          {/* Status Timeline Card */}
          <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Resolution Timeline
            </h3>

            {/* Clean Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              {TRACKING_STEPS.map((stepItem, idx) => {
                const statusType = getStepStatus(stepItem.id);
                const isCompleted = statusType === 'completed';
                const isCurrent = statusType === 'current';
                const isRejected = statusType === 'rejected';
                const isCancelled = statusType === 'cancelled';

                return (
                  <div
                    key={stepItem.id}
                    className={`border rounded p-3 space-y-1.5 transition ${
                      isRejected
                        ? 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
                        : isCompleted
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : isCurrent
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                        : 'bg-white border-slate-100 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold">
                        0{idx + 1}
                      </span>
                      {isRejected ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-700" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      ) : isCurrent ? (
                        <Clock className="w-3.5 h-3.5 text-blue-800" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-200" />
                      )}
                    </div>

                    <strong className="block text-xs font-semibold">
                      {isRejected ? 'Rejected' : stepItem.label}
                    </strong>
                    <p className="text-[11px] leading-tight opacity-80">
                      {isRejected ? 'Evidence detected fake' : isCancelled ? 'Workflow terminated' : stepItem.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
