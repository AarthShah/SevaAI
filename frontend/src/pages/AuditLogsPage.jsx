import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Search, Filter, RotateCcw, Download, Cpu, 
  CheckCircle2, Clock, UserCheck, Wrench, ShieldCheck, 
  ExternalLink, Eye, Video, Image, Play, CheckCircle, 
  Sparkles, RefreshCw, X, MapPin, Building, User, Calendar, Zap
} from 'lucide-react';

export const AuditLogsPage = ({ 
  auditLogs = [], 
  onResetLogs, 
  autoDispatchMode = false, 
  onToggleAutoDispatch, 
  onSelectDispatchMode,
  activeJobsCount = 0, 
  totalIssuesCount = 0,
  availableSquadsCount = 0,
  onOpenTicketInTriage,
  isEmbedded = false
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [selectedLogForModal, setSelectedLogForModal] = useState(null);

  const handleModeClick = (targetIsAuto) => {
    if (onSelectDispatchMode) {
      onSelectDispatchMode(targetIsAuto);
    } else if (onToggleAutoDispatch && targetIsAuto !== autoDispatchMode) {
      onToggleAutoDispatch();
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesIssue = log.issueId && log.issueId.toLowerCase().includes(q);
        const matchesOfficer = log.officer && log.officer.toLowerCase().includes(q);
        const matchesDept = log.dept && log.dept.toLowerCase().includes(q);
        const matchesMsg = log.message && log.message.toLowerCase().includes(q);
        const matchesTitle = log.issueTitle && log.issueTitle.toLowerCase().includes(q);
        if (!matchesIssue && !matchesOfficer && !matchesDept && !matchesMsg && !matchesTitle) {
          return false;
        }
      }

      // Event Type filter
      if (eventTypeFilter === 'DISPATCH') {
        if (log.type !== 'AUTONOMOUS_DISPATCH' && log.type !== 'OFFICIAL_APPROVAL') return false;
      } else if (eventTypeFilter === 'WAITLIST') {
        if (log.type !== 'WORKER_BUSY_WAITLIST' && log.type !== 'WORKER_FREED') return false;
      } else if (eventTypeFilter === 'COMPLETE') {
        if (log.type !== 'REMEDIATION_COMPLETE') return false;
      } else if (eventTypeFilter === 'EVAL') {
        if (log.type !== 'AI_MATCH_EVAL' && log.type !== 'REASSIGNMENT') return false;
      }

      // Department filter
      if (deptFilter !== 'ALL') {
        if (!log.dept || !log.dept.toLowerCase().includes(deptFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, searchQuery, eventTypeFilter, deptFilter]);

  // Download JSON log
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `municipal_ai_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Helper for clean badge styling & icons (NO EMOJIS)
  const getLogBadge = (type) => {
    switch (type) {
      case 'AUTONOMOUS_DISPATCH':
        return {
          icon: <Cpu className="w-3 h-3 text-purple-700" />,
          label: 'Zero-Touch Dispatch',
          className: 'bg-purple-50 text-purple-800 border-purple-200'
        };
      case 'OFFICIAL_APPROVAL':
        return {
          icon: <UserCheck className="w-3 h-3 text-blue-700" />,
          label: 'Supervisor Approved',
          className: 'bg-blue-50 text-blue-800 border-blue-200'
        };
      case 'WORKER_BUSY_WAITLIST':
        return {
          icon: <Clock className="w-3 h-3 text-amber-700" />,
          label: 'Worker Busy / Queued',
          className: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'WORKER_FREED':
        return {
          icon: <CheckCircle className="w-3 h-3 text-cyan-700" />,
          label: 'Worker Freed',
          className: 'bg-cyan-50 text-cyan-800 border-cyan-200'
        };
      case 'REMEDIATION_COMPLETE':
        return {
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-700" />,
          label: 'Remediation Complete',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        };
      case 'REASSIGNMENT':
        return {
          icon: <RefreshCw className="w-3 h-3 text-indigo-700" />,
          label: 'Squad Reassigned',
          className: 'bg-indigo-50 text-indigo-800 border-indigo-200'
        };
      default:
        return {
          icon: <Sparkles className="w-3 h-3 text-slate-600" />,
          label: 'AI Match Evaluation',
          className: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="text-xs text-slate-400 flex items-center gap-1.5">
        <Link to="/" className="hover:text-slate-600">Home</Link>
        <span>&rsaquo;</span>
        <span className="text-slate-500">Operations</span>
        <span>&rsaquo;</span>
        <span className="text-slate-700 font-medium">AI Autonomous Dispatch & Worker Activity Audit Log</span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-xs font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
            <span>Human-in-the-Loop Municipal Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            AI Autonomous Dispatch & Worker Activity Audit Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable chronological ledger of automated AI worker dispatches, waitlist queuing, on-site remediation completions, and verified proof media.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-2 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
            title="Download audit logs as JSON file"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/authority?tab=AI_REVIEW')}
            className="px-3.5 py-2 rounded bg-blue-800 text-white font-medium text-xs hover:bg-blue-900 transition flex items-center gap-1.5 shadow-xs"
          >
            <Cpu className="w-3.5 h-3.5 text-white" />
            <span>AI Dispatch Review</span>
          </button>
        </div>
      </div>

      {/* AUTONOMOUS / MANUAL MODE CONTROLLER - SIMPLE, CLEAR 2-BUTTON SELECTOR */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-slate-900">Dispatch Operating Mode</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                autoDispatchMode 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-blue-50 text-blue-900 border-blue-300'
              }`}>
                {autoDispatchMode ? 'Autonomous AI Mode Active' : 'Manual Review Mode Active'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Select how tickets are dispatched: manually review and approve each assignment, or enable AI to automatically dispatch available specialists.
            </p>
          </div>

          {/* Mode Selector Pill Toggle - Matches Requested Screenshot Design */}
          <div className="inline-flex items-center bg-[#f0f2f6] border border-slate-200/90 rounded-full p-1 shadow-inner self-start lg:self-center">
            <button
              type="button"
              onClick={() => handleModeClick(false)}
              className={`px-7 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                !autoDispatchMode
                  ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-[0_4px_14px_rgba(29,78,216,0.35)]'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Manual Review
            </button>

            <button
              type="button"
              onClick={() => handleModeClick(true)}
              className={`px-7 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                autoDispatchMode
                  ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-[0_4px_14px_rgba(29,78,216,0.35)]'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              AI Auto-Dispatch
            </button>
          </div>
        </div>

        {/* Bold High-Contrast Explainer Callout */}
        {!autoDispatchMode ? (
          <div className="p-3.5 rounded-lg bg-blue-50/90 border border-blue-200 flex items-start gap-3">
            <div className="p-2 rounded-md bg-blue-100 text-blue-900 flex-shrink-0 mt-0.5">
              <UserCheck className="w-5 h-5 text-blue-800" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                  CURRENT STATUS: MANUAL REVIEW REQUIRED (OFFICIAL SUPERVISION)
                </strong>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-blue-800 border border-blue-200">
                  Human Oversight
                </span>
              </div>
              <p className="text-xs text-blue-900/90 mt-1 leading-relaxed">
                The AI has paired issues with specialists based on GPS location and skill set. <strong>You must click "Approve" or "Edit" on each card</strong> in AI Dispatch Review to deploy the specialist. No workers will be dispatched until you approve them.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-lg bg-emerald-50/90 border border-emerald-200 flex items-start gap-3">
            <div className="p-2 rounded-md bg-emerald-100 text-emerald-900 flex-shrink-0 mt-0.5">
              <Cpu className="w-5 h-5 text-emerald-800" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  CURRENT STATUS: AI AUTONOMOUS ZERO-TOUCH DISPATCH (ACTIVE)
                </strong>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200">
                  Autonomous
                </span>
              </div>
              <p className="text-xs text-emerald-900/90 mt-1 leading-relaxed">
                AI is actively dispatching available department specialists automatically without requiring human confirmation. When a specialist is busy on another ticket (60s remediation), subsequent tickets are queued and dispatched the second they become free.
              </p>
            </div>
          </div>
        )}

        {/* Status Metric Strip (Light colored tiles) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/80">
            <span className="text-slate-500 text-[11px] block font-medium">TOTAL MONITORED ISSUES</span>
            <strong className="text-slate-900 text-base font-bold">{totalIssuesCount || 69}</strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">Active registry</span>
          </div>
          <div className="bg-amber-50/60 rounded-lg p-3 border border-amber-200/80">
            <span className="text-amber-800 text-[11px] block font-medium">ACTIVE REMEDIATIONS</span>
            <strong className="text-amber-900 text-base font-bold">{activeJobsCount} Ongoing</strong>
            <span className="text-[10px] text-amber-700 block mt-0.5">60s on-site timer</span>
          </div>
          <div className="bg-emerald-50/60 rounded-lg p-3 border border-emerald-200/80">
            <span className="text-emerald-800 text-[11px] block font-medium">AUTONOMOUS DISPATCHES</span>
            <strong className="text-emerald-900 text-base font-bold">
              {auditLogs.filter(l => l.type === 'AUTONOMOUS_DISPATCH').length} Executed
            </strong>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Zero-touch executions</span>
          </div>
          <div className="bg-blue-50/60 rounded-lg p-3 border border-blue-200/80">
            <span className="text-blue-800 text-[11px] block font-medium">AVAILABLE SPECIALISTS</span>
            <strong className="text-blue-900 text-base font-bold">
              {availableSquadsCount || 6} On-Call
            </strong>
            <span className="text-[10px] text-blue-700 block mt-0.5">Ready for deployment</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit logs by Ticket ID (e.g. CS1039), officer name, keyword, or department..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-md border border-slate-300 focus:ring-1 focus:ring-blue-800 text-slate-900 bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="p-2 border border-slate-300 rounded-md bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-800"
          >
            <option value="ALL">All Departments</option>
            <option value="Road">Road Infrastructure</option>
            <option value="Sanitation">Sanitation & Waste</option>
            <option value="Electricity">Electricity & Lighting</option>
            <option value="Water">Water Supply</option>
            <option value="Drainage">Drainage & Sewage</option>
          </select>

          {/* Live Stream Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Audit Stream</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
            {[
              { key: 'ALL', label: `All Logs (${auditLogs.length})` },
              { key: 'DISPATCH', label: 'Dispatches' },
              { key: 'WAITLIST', label: 'Waitlists / Busy' },
              { key: 'COMPLETE', label: 'Completions & Proof Media' },
              { key: 'EVAL', label: 'AI Evaluations' }
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setEventTypeFilter(key)}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  eventTypeFilter === key
                    ? 'bg-blue-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {onResetLogs && (
            <button
              type="button"
              onClick={onResetLogs}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition"
              title="Reset to default audit logs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* AUDIT LOG TABLE / CARD LIST */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-800" />
            <span>Audit Ledger Entries ({filteredLogs.length} matching)</span>
          </div>
          <span className="text-slate-500 font-normal text-[11px]">
            Click any entry to inspect Before/After photos & worker completion video
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-700">No audit logs found matching your filters</p>
            <p className="text-xs text-slate-400">Try adjusting your search query or reset filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const badge = getLogBadge(log.type);
              const hasProofMedia = log.afterImage || log.videoProof || log.type === 'REMEDIATION_COMPLETE';

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLogForModal(log)}
                  className="p-4 hover:bg-blue-50/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Timestamp */}
                    <span className="text-slate-400 text-xs font-mono whitespace-nowrap mt-0.5">
                      {log.time}
                    </span>

                    {/* Event Type Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${badge.className}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    {/* Issue Tag */}
                    <span className="font-bold text-blue-900 text-xs whitespace-nowrap bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      #{log.issueId}
                    </span>

                    {/* Main Log Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-xs font-sans leading-relaxed group-hover:text-blue-950">
                        {log.message}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                        {log.dept && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{log.dept}</span>
                          </span>
                        )}
                        {log.officer && (
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{log.officer}</span>
                          </span>
                        )}
                        {log.location && (
                          <span className="hidden md:flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{log.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Media Proof Indicator & Inspection Button */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {hasProofMedia && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold" title="Before/After photo and video proof attached">
                        <Image className="w-3 h-3 text-emerald-700" />
                        <Video className="w-3 h-3 text-emerald-700" />
                        <span className="hidden lg:inline">Media Proof Attached</span>
                      </div>
                    )}

                    <button
                      type="button"
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100 flex items-center gap-1 transition shadow-xs group-hover:border-blue-300 group-hover:text-blue-800"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-800" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* LOG DETAIL & PROOF MEDIA INSPECTION MODAL */}
      {/* ============================================================ */}
      {selectedLogForModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedLogForModal(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto my-auto text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getLogBadge(selectedLogForModal.type).className}`}>
                  {getLogBadge(selectedLogForModal.type).icon}
                  <span>{getLogBadge(selectedLogForModal.type).label}</span>
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  Ticket #{selectedLogForModal.issueId}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Log ID: {selectedLogForModal.id}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-6 text-xs">
              {/* Event Metadata Strip (Theme-matched light tiles) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">TARGET DEFECT</span>
                  <strong className="text-slate-900 text-xs font-bold block mt-0.5">
                    {selectedLogForModal.issueTitle || 'Civic Infrastructure Defect'}
                  </strong>
                  <span className="text-[10px] text-slate-400">{selectedLogForModal.dept || 'Municipal Ops'}</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">ASSIGNED SPECIALIST</span>
                  <strong className="text-slate-900 text-xs font-bold block mt-0.5">
                    {selectedLogForModal.officer || 'Er. Rajesh Patil'}
                  </strong>
                  <span className="text-[10px] text-slate-400">On-Site Field Squad</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">TIMESTAMP & MODE</span>
                  <strong className="text-slate-900 text-xs font-bold block mt-0.5">
                    {selectedLogForModal.time}
                  </strong>
                  <span className="text-[10px] text-blue-700 font-medium">
                    {selectedLogForModal.mode || (autoDispatchMode ? 'Autonomous Zero-Touch' : 'Supervisor Oversight')}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">AI VERIFICATION SCORE</span>
                  <strong className="text-emerald-700 text-xs font-bold block mt-0.5">
                    {selectedLogForModal.verificationScore || 98.8}% Defect Cleared
                  </strong>
                  <span className="text-[10px] text-emerald-600 font-medium">Visual Proof Validated</span>
                </div>
              </div>

              {/* BEFORE & AFTER PHOTO COMPARISON SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-blue-800" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Visual Evidence: Before vs Completed Work (After)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Captured on-site and verified by municipal computer vision
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BEFORE PHOTO CARD */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Before Remediation (Initial Report)
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">Citizen / Sensor Photo</span>
                    </div>

                    <div className="relative aspect-4/3 bg-slate-200 overflow-hidden">
                      <img 
                        src={selectedLogForModal.beforeImage || '/sample_evidence/pothole.jpg'} 
                        alt="Before Remediation" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
                        DEFECT REPORT EVIDENCE
                      </div>
                    </div>

                    <div className="p-3 text-xs text-slate-600 space-y-1 bg-white border-t border-slate-100 flex-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Report Location:</span>
                        <span className="font-medium text-slate-700">{selectedLogForModal.location || 'MG Road, Ward 12'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">GPS Coordinates:</span>
                        <span className="font-mono text-slate-700">{selectedLogForModal.coordinates || '22.7196° N, 75.8577° E'}</span>
                      </div>
                    </div>
                  </div>

                  {/* AFTER PHOTO CARD */}
                  <div className="bg-slate-50 rounded-xl border border-emerald-200 overflow-hidden flex flex-col">
                    <div className="px-3.5 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs font-semibold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        After Remediation (Worker Posted Proof)
                      </span>
                      <span className="text-[11px] text-emerald-700 font-medium">Verified Clean</span>
                    </div>

                    <div className="relative aspect-4/3 bg-slate-200 overflow-hidden">
                      <img 
                        src={selectedLogForModal.afterImage || '/sample_evidence/pothole_after.jpg'} 
                        alt="After Remediation" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-emerald-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                        WORK COMPLETE PROOF
                      </div>
                    </div>

                    <div className="p-3 text-xs text-slate-600 space-y-1 bg-white border-t border-slate-100 flex-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Completion Status:</span>
                        <span className="font-bold text-emerald-700">Remediated & Inspected</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Verified By:</span>
                        <span className="font-medium text-slate-700">{selectedLogForModal.officer || 'Er. Rajesh Patil'}</span>
                      </div>
                      {selectedLogForModal.repairSummary && (
                        <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 italic">
                          "{selectedLogForModal.repairSummary}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* WORKER COMPLETED WORK VIDEO PROOF SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-800" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Worker On-Site Field Inspection & Completed Work Video Proof
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Playable Inspection Footage
                  </span>
                </div>

                <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-md">
                  <div className="p-3 bg-slate-950 text-white flex items-center justify-between text-xs border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-mono font-bold tracking-wider">
                        ON-SITE COMPLETED WORK VIDEO VERIFICATION • 1080P
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      GPS LOCKED • FIELD CAMERA
                    </span>
                  </div>

                  <div className="relative aspect-video bg-black flex items-center justify-center">
                    <video
                      src={selectedLogForModal.videoProof || '/sample_evidence/cctv_feed_1.mp4'}
                      controls
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-3 bg-slate-950 text-slate-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>
                        Field Video Authenticated: Worker completed task, recorded area, and submitted video proof for official municipal closure.
                      </span>
                    </div>
                    <span className="text-emerald-400 font-semibold font-mono text-[11px]">
                      STATUS: VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Audit Log Message */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Official Audit Event Log Details
                </span>
                <p className="text-slate-800 text-xs leading-relaxed font-sans">
                  {selectedLogForModal.message}
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 sticky bottom-0">
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-100 transition shadow-xs"
              >
                Close Inspection
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = selectedLogForModal.issueId;
                  setSelectedLogForModal(null);
                  if (onOpenTicketInTriage) {
                    onOpenTicketInTriage(targetId);
                  } else {
                    navigate(`/authority?search=${targetId}`);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-800 text-white font-medium text-xs hover:bg-blue-900 transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Open Ticket #{selectedLogForModal.issueId} in Triage</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
