import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, GitBranch, Layers, MapPin,
  Building, Clock, Sparkles, CheckCircle2,
  ChevronDown, ChevronUp, RefreshCw,
  Check, X, HelpCircle, Info, AlertTriangle,
  Users, ChevronRight, ExternalLink, ArrowRight,
  Folder, FolderOpen, FileText, Terminal
} from 'lucide-react';
import { complaintApi } from '../api/complaintApi';

const getShortDeptName = (name) => {
  if (!name) return 'Assigned';
  if (/road/i.test(name)) return 'Road Dept';
  if (/sanitation|waste|garbage/i.test(name)) return 'Sanitation';
  if (/water/i.test(name)) return 'Water Dept';
  if (/drain/i.test(name)) return 'Drainage';
  if (/electr|light/i.test(name)) return 'Electrical';
  if (/horticult|tree|garden/i.test(name)) return 'Horticulture';
  return name.length > 12 ? name.substring(0, 11) + '…' : name;
};

const formatDeadlineTime = (hours) => {
  const totalMinutes = Math.ceil(Math.abs(hours) * 60);
  const days = Math.floor(totalMinutes / 1440);
  const remainingHours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (remainingHours || days) parts.push(`${remainingHours}h`);
  if (!days && minutes) parts.push(`${minutes}m`);
  return parts.join(' ') || '<1m';
};

/* ------------------------------------------------------------------ */
/* InfoTip — small (i) icon with simple explanation tooltip            */
/* Instant hover, hides on mouse leave, clamped to stay on-screen     */
/* ------------------------------------------------------------------ */
const InfoTip = ({ text }) => {
  const [show, setShow] = useState(false);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 250 });

  const updatePosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(260, window.innerWidth - 24);

    // Horizontal: align near button, clamped strictly within viewport margins
    let left = rect.left - 10;
    if (left + tooltipWidth > window.innerWidth - 12) {
      left = window.innerWidth - tooltipWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    // Vertical: place below button; if near bottom of screen, place above
    let top = rect.bottom + 6;
    if (rect.bottom + 85 > window.innerHeight && rect.top > 85) {
      top = rect.top - 75;
    }

    setPos({ top, left, width: tooltipWidth });
  };

  useEffect(() => {
    if (!show) return;
    updatePosition();

    const handleScrollResize = () => updatePosition();
    window.addEventListener('resize', handleScrollResize);
    window.addEventListener('scroll', handleScrollResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollResize);
      window.removeEventListener('scroll', handleScrollResize, true);
    };
  }, [show]);

  return (
    <span
      className="inline-flex items-center ml-1.5"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        ref={btnRef}
        type="button"
        className="w-[18px] h-[18px] rounded-full border border-slate-300 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-400 flex items-center justify-center transition cursor-pointer flex-shrink-0"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.stopPropagation();
          setShow((v) => !v);
        }}
        aria-label="More info"
      >
        <Info className="w-2.5 h-2.5" />
      </button>

      {show && (
        <div
          className="fixed z-[9999] bg-slate-900 text-slate-100 text-[11px] leading-relaxed rounded-lg px-3 py-2 border border-slate-700 pointer-events-none select-none"
          style={{
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            width: `${pos.width}px`,
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.4)'
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* SectionCard — reusable layout for every collapsible row             */
/* ------------------------------------------------------------------ */
const SectionCard = ({
  icon: Icon,
  iconColor = 'text-slate-500',
  iconBg = 'bg-slate-100',
  title,
  infoText,
  badge,
  badgeColor = 'bg-slate-100 text-slate-700 border-slate-200',
  expanded,
  onToggle,
  cardBg = 'bg-white',
  cardBorder = 'border-slate-200',
  children
}) => (
  <div className={`${cardBg} border ${cardBorder} rounded-xl shadow-sm relative transition-all`}>
    {/* Header row */}
    <div
      className="flex items-center gap-2.5 px-3.5 py-3 cursor-pointer select-none hover:bg-slate-50/60 transition-colors"
      onClick={onToggle}
    >
      {/* Icon circle */}
      <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>

      {/* Title + info */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="font-semibold text-[13px] text-slate-800 leading-snug break-words">
          {title}
        </span>
        {infoText && <InfoTip text={infoText} />}
      </div>

      {/* Badge */}
      {badge && (
        <span
          className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border flex-shrink-0 max-w-[125px] truncate text-center ${badgeColor}`}
          title={typeof badge === 'string' ? badge : undefined}
        >
          {badge}
        </span>
      )}

      {/* Chevron */}
      <div className="flex-shrink-0 text-slate-400">
        {expanded
          ? <ChevronUp className="w-4 h-4" />
          : <ChevronDown className="w-4 h-4" />
        }
      </div>
    </div>

    {/* Expanded body */}
    {expanded && (
      <div className="px-4 pb-4 pt-0 border-t border-slate-100">
        {children}
      </div>
    )}
  </div>
);

/* ================================================================== */
/* Main Component                                                      */
/* ================================================================== */
export const CivicIntelligenceDossier = ({
  complaintId,
  currentStatus,
  enabled = true,
  onStatusUpdated,
  isAuthority = true,
  onSelectComplaint
}) => {
  const navigate = useNavigate();
  const cleanId = complaintId ? String(complaintId).replace('#', '').trim() : '';

  const handleOpenReport = (targetId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!targetId) return;
    const clean = String(targetId).replace('#', '').trim();
    if (onSelectComplaint) {
      onSelectComplaint(clean);
    } else {
      navigate(`/track/${clean}`);
    }
  };
  const [loading, setLoading] = useState(true);

  // Feature data
  const [resolutionData, setResolutionData] = useState(null);
  const [duplicateData, setDuplicateData] = useState(null);
  const [clusterData, setClusterData] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [deptRoutingData, setDeptRoutingData] = useState(null);
  const [evidenceData, setEvidenceData] = useState(null);
  const [slaData, setSlaData] = useState(null);
  const [slaClock, setSlaClock] = useState(Date.now());
  const [watchdogData, setWatchdogData] = useState([]);
  const [hotspotData, setHotspotData] = useState(null);

  const [expandedSections, setExpandedSections] = useState({
    sla: true,
    resolution: false,
    duplicates: false,
    hotspot: false,
    location: false,
    routing: false,
    evidence: false,
    watchdog: true
  });

  // Modals & actions
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideDept, setOverrideDept] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState(null);

  // Folder tree open/closed state for 150m hotspot
  const [openFolders, setOpenFolders] = useState({});

  useEffect(() => {
    if (hotspotData?.folders) {
      const initial = {};
      hotspotData.folders.forEach((f) => {
        initial[f.folder_name] = true;
      });
      setOpenFolders(initial);
    }
  }, [hotspotData]);

  const toggleFolder = (folderName) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const toggle = (key) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  /* ---------- data loading ---------- */
  const loadAllIntelligence = async () => {
    if (!enabled || !cleanId) return;
    setLoading(true);
    try {
      const [resVerif, dupes, cluster, loc, dept, evidence, sla, watchdog, hotspot] =
        await Promise.allSettled([
          complaintApi.getResolutionVerification(cleanId),
          complaintApi.getDuplicates(cleanId),
          complaintApi.getComplaintCluster(cleanId),
          complaintApi.getLocationIntelligence(cleanId),
          complaintApi.getDepartmentRecommendation(cleanId),
          complaintApi.getAiDecisionEvidence(cleanId),
          complaintApi.getSlaPrediction(cleanId),
          complaintApi.getWatchdogStatus(cleanId),
          complaintApi.getHierarchicalHotspot(cleanId),
        ]);

      if (resVerif.status === 'fulfilled') setResolutionData(resVerif.value);
      if (dupes.status === 'fulfilled') setDuplicateData(dupes.value);
      if (cluster.status === 'fulfilled') setClusterData(cluster.value);
      if (loc.status === 'fulfilled') setLocationData(loc.value);
      if (dept.status === 'fulfilled') setDeptRoutingData(dept.value);
      if (evidence.status === 'fulfilled') setEvidenceData(evidence.value);
      if (sla.status === 'fulfilled') setSlaData({ ...sla.value, fetched_at: Date.now() });
      if (watchdog.status === 'fulfilled') setWatchdogData(Array.isArray(watchdog.value) ? watchdog.value : []);
      if (hotspot.status === 'fulfilled') setHotspotData(hotspot.value);
    } catch (err) {
      console.warn('Intelligence load error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAllIntelligence(); }, [cleanId, currentStatus, enabled]);

  useEffect(() => {
    const interval = window.setInterval(() => setSlaClock(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const flash = (msg) => { setNotificationMsg(msg); setTimeout(() => setNotificationMsg(null), 4000); };

  /* ---------- action handlers ---------- */
  const handleConfirmResolution = async () => {
    setActionInProgress(true);
    try {
      await complaintApi.confirmResolution(cleanId, 'Supervisor confirmed work is done.');
      flash('Work confirmed. Complaint closed.');
      if (onStatusUpdated) onStatusUpdated('Resolved');
      loadAllIntelligence();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setActionInProgress(false); }
  };

  const handleReopenResolution = async () => {
    if (!reopenReason.trim()) { alert('Please write a reason.'); return; }
    setActionInProgress(true);
    try {
      await complaintApi.reopenResolution(cleanId, reopenReason);
      setIsReopenModalOpen(false); setReopenReason('');
      flash('Report returned for additional work.');
      if (onStatusUpdated) onStatusUpdated('In Progress');
      loadAllIntelligence();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setActionInProgress(false); }
  };

  const handleApplyDeptOverride = async () => {
    if (!overrideDept) { alert('Select a department.'); return; }
    setActionInProgress(true);
    try {
      await complaintApi.overrideDepartment(cleanId, overrideDept, overrideReason);
      setIsOverrideModalOpen(false); setOverrideReason('');
      flash(`Department changed to ${overrideDept}`);
      loadAllIntelligence();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setActionInProgress(false); }
  };

  const handleAcknowledgeWatchdog = async (eventId) => {
    try {
      await complaintApi.markWatchdogAction(eventId, 'Supervisor acknowledged');
      flash('Alert marked as seen.');
      loadAllIntelligence();
    } catch (err) { console.error(err); }
  };

  if (!cleanId) return null;

  /* ---------- derived values ---------- */
  const slaElapsedHours = slaData
    ? Number(slaData.elapsed_hours || 0) + Math.max(0, slaClock - (slaData.fetched_at || slaClock)) / 3600000
    : 0;
  const slaRemainingHours = slaData ? Number(slaData.target_sla_hours || 0) - slaElapsedHours : 0;
  const slaLabel = !slaData ? '' : slaRemainingHours <= 0 ? 'Deadline Missed' :
    slaRemainingHours <= 12 ? 'Due Soon' : slaRemainingHours < 30 ? 'On Watch' : 'On Time';
  const slaBadgeColor = !slaData ? '' : slaRemainingHours > 30
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : slaRemainingHours > 12 && slaRemainingHours < 30
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-700 border-red-200';
  const slaBarColor = !slaData ? 'bg-slate-300' : slaRemainingHours > 30
    ? 'bg-emerald-500'
    : slaRemainingHours > 12 && slaRemainingHours < 30
      ? 'bg-amber-500'
      : 'bg-red-500';
  const slaTimeText = !slaData ? '' : slaRemainingHours <= 0
    ? `Overdue by ${formatDeadlineTime(slaRemainingHours)}`
    : `${formatDeadlineTime(slaRemainingHours)} remaining`;

  const hotspotCluster = hotspotData?.this_cluster || clusterData;
  const hotspotClusterId = hotspotCluster?.cluster_id || hotspotCluster?.cluster_id || null;
  const hotspotCount = hotspotCluster?.complaint_count || clusterData?.complaint_count || 0;
  const reportCount = hotspotData?.same_issue_same_location_count || 1;

  /* ================================================================ */
  return (
    <div className="space-y-2.5 text-[13px]">

      {/* Toast */}
      {notificationMsg && (
        <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium flex items-center justify-between text-[12.5px]">
          <span>{notificationMsg}</span>
          <button onClick={() => setNotificationMsg(null)} className="text-emerald-600 hover:text-emerald-900 ml-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Intelligence</span>
        </div>
        <button
          onClick={loadAllIntelligence}
          disabled={loading}
          className="text-slate-400 hover:text-blue-600 transition p-1 rounded-md hover:bg-slate-100 cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. DEADLINE STATUS (SLA)                                     */}
      {/* ============================================================ */}
      {slaData && (
        <SectionCard
          icon={Clock}
          iconColor="text-slate-600"
          iconBg="bg-slate-100"
          title="Deadline Status"
          infoText="The government sets a deadline to fix each problem. This shows whether the team is on time or has missed the deadline."
          badge={`${slaLabel} · ${Math.round(slaData.sla_breach_probability * 100)}% risk`}
          badgeColor={slaBadgeColor}
          expanded={expandedSections.sla}
          onToggle={() => toggle('sla')}
        >
          <div className="pt-3 space-y-3">
            {/* Target vs Predicted */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <div className="text-[11px] text-slate-500 font-medium">Must fix within</div>
                <div className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">{slaData.target_sla_hours}h</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <div className="text-[11px] text-slate-500 font-medium">AI estimate</div>
                <div className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">{slaData.predicted_resolution_hours}h</div>
              </div>
            </div>

            {/* Time elapsed against the statutory target */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${slaBarColor}`}
                style={{ width: `${Math.min(100, Math.max(3, (slaElapsedHours / Math.max(1, slaData.target_sla_hours)) * 100))}%` }}
              />
            </div>

            <div className="-mt-1 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-[11px] font-medium text-slate-500">Time remaining</span>
              <span className={`text-[12px] font-bold tabular-nums ${slaRemainingHours > 30 ? 'text-emerald-700' : slaRemainingHours > 12 && slaRemainingHours < 30 ? 'text-amber-700' : 'text-red-700'}`}>
                {slaTimeText}
              </span>
            </div>

            {/* Factors */}
            {slaData.influencing_factors?.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="text-[11.5px] text-slate-400 font-medium">Why is this the estimate?</div>
                <ul className="space-y-1">
                  {slaData.influencing_factors.map((f, i) => (
                    <li key={i} className="text-[12px] text-slate-600 flex items-start gap-2">
                      <span className="text-slate-300 mt-0.5">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ============================================================ */}
      {/* 2. PROBLEM HOTSPOT (150m Radius - Windows CMD Tree View)     */}
      {/* ============================================================ */}
      {(hotspotData || clusterData) && (
        <SectionCard
          icon={Layers}
          iconColor="text-slate-600"
          iconBg="bg-slate-100"
          title="Hotspot (150m Radius)"
          infoText="Shows all civic complaints strictly within a 150m radius of this issue's GPS coordinates. Grouped like Windows CMD tree folders. Click any report to open it in a new tab."
          badge={`${hotspotData?.total_nearby_count || hotspotCount || 1} Reports Nearby`}
          badgeColor="bg-slate-100 text-slate-700 border-slate-200"
          expanded={expandedSections.hotspot}
          onToggle={() => toggle('hotspot')}
        >
          <div className="pt-3 space-y-3">
            {/* GPS & Location context */}
            <div className="flex items-center justify-between text-[11.5px] bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{hotspotData?.ward || 'Ward'}, {hotspotData?.zone || 'Zone'}</span>
                {hotspotData?.street && (
                  <span className="text-slate-400 text-[11px]">· {hotspotData.street}</span>
                )}
              </div>
              <span className="text-emerald-700 font-mono text-[10.5px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                <MapPin className="mr-1 inline h-3 w-3" aria-hidden="true" />150m radius
              </span>
            </div>

            {/* Clean Hierarchical Folder Structure (150m Radius) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Nearby Defect Hierarchy ({hotspotData?.total_nearby_count || 1} Total)
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  150m Radius
                </span>
              </div>

              {/* Tree Folders & Files */}
              {(() => {
                const activeFolders = (hotspotData?.folders || []).filter(
                  (f) => f.complaints && f.complaints.length > 0
                );

                if (activeFolders.length === 0) {
                  return (
                    <div className="text-slate-400 text-[11px] py-2 italic">
                      No other complaints found within 150 meters.
                    </div>
                  );
                }

                return (
                  <div className="space-y-1 text-[12px]">
                    {activeFolders.map((folder, fIdx) => {
                      const isLastFolder = fIdx === activeFolders.length - 1;
                      const isOpen = openFolders[folder.folder_name] !== false;
                      const folderPrefix = isLastFolder ? '└── ' : '├── ';
                      const childIndent = isLastFolder ? '    ' : '│   ';

                      return (
                        <div key={folder.folder_name} className="select-text">
                          {/* Folder row */}
                          <div
                            onClick={() => toggleFolder(folder.folder_name)}
                            className="flex items-center gap-2 text-slate-800 font-semibold hover:text-blue-700 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-slate-100/80 transition-colors group select-none"
                            title="Click to expand/collapse folder"
                          >
                            <span className="text-slate-400 font-mono text-[12px] whitespace-pre select-none">{folderPrefix}</span>
                            <span className={`font-mono font-bold text-[13px] select-none transition-transform duration-150 inline-block text-slate-500 group-hover:text-blue-600 ${isOpen ? 'rotate-90 text-blue-600' : ''}`}>
                              &gt;
                            </span>
                            <span className="group-hover:underline text-[12.5px] text-slate-800">{folder.folder_name}</span>
                            <span className="text-slate-500 text-[10.5px] bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium ml-1">
                              {folder.complaint_count}
                            </span>
                          </div>

                          {/* Complaints inside folder */}
                          {isOpen && (
                            <div className="space-y-1.5 my-2 ml-5 pl-3 border-l-2 border-slate-200/90">
                              {folder.complaints.map((c, cIdx) => {
                                const isLastFile = cIdx === folder.complaints.length - 1;
                                const filePrefix = isLastFile ? '└── ' : '├── ';
                                const clean = String(c.id).replace('#', '');
                                const isCurrent = c.is_current || clean === cleanId;
                                const targetUrl = `/authority?id=${clean}`;

                                return (
                                  <a
                                    key={c.id}
                                    href={targetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      if (!e.metaKey && !e.ctrlKey && onSelectComplaint) {
                                        e.preventDefault();
                                        onSelectComplaint(clean);
                                      }
                                    }}
                                    className={`flex items-start gap-1 py-1.5 px-2 rounded-lg transition-all group/item no-underline cursor-pointer border ${
                                      isCurrent
                                        ? 'bg-blue-50/90 text-blue-900 border-blue-200 font-medium shadow-xs'
                                        : 'bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200/80 hover:border-slate-300'
                                    }`}
                                    title={`Open issue #${clean} in authority view`}
                                  >
                                    <span className="text-slate-300 font-mono text-[12px] whitespace-pre select-none">
                                      {childIndent}{filePrefix}
                                    </span>
                                    <FileText className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                                    <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 font-sans">
                                      {/* Click to open in issue page */}
                                      <span className="font-mono font-bold text-blue-600 group-hover/item:text-blue-800 group-hover/item:underline inline-flex items-center gap-1 shrink-0 text-[12px]">
                                        #{clean}
                                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                      </span>

                                      {/* Distance tag */}
                                      <span className="text-amber-700 font-mono text-[10px] bg-amber-50 border border-amber-200/70 px-1.5 py-0.2 rounded font-medium shrink-0">
                                        {c.distance_meters}m
                                      </span>

                                      {/* Issue type */}
                                      <span className="text-slate-700 text-[11.5px] truncate max-w-[210px] font-medium" title={c.issue_type || c.category}>
                                        {c.issue_type}
                                      </span>

                                      {/* Status badge */}
                                      <span className={`text-[9.5px] px-1.5 py-0.2 rounded border font-medium shrink-0 ${
                                        c.status === 'Resolved'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : c.status === 'In Progress'
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : 'bg-slate-100 text-slate-700 border-slate-200'
                                      }`}>
                                        {c.status}
                                      </span>

                                      {/* Current tag */}
                                      {isCurrent && (
                                        <span className="text-[9px] bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.2 rounded font-bold shrink-0">
                                          CURRENT
                                        </span>
                                      )}
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Priority boost from 150m cluster */}
            {hotspotData?.priority_boost && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-slate-700">150m Hotspot Priority Impact</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    hotspotData.priority_boost.label === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                    hotspotData.priority_boost.label === 'VERY_HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    hotspotData.priority_boost.label === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {hotspotData.priority_boost.description}
                  </span>
                </div>
                {hotspotData.priority_boost.factors?.length > 0 && (
                  <ul className="space-y-0.5">
                    {hotspotData.priority_boost.factors.map((f, i) => (
                      <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                        <span className="text-slate-300">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ============================================================ */}
      {/* 3. WHERE EXACTLY? (Location Intelligence)                    */}
      {/* ============================================================ */}
      {(locationData || hotspotData) && (
        <SectionCard
          icon={MapPin}
          iconColor="text-slate-600"
          iconBg="bg-slate-100"
          title="Where Exactly?"
          infoText="Shows the ward, zone, nearest landmark, and GPS coordinates. Also checks if the photo location matches the reported GPS to prevent fake reports."
          badge={(locationData?.ward || hotspotData?.ward || 'Unknown')}
          badgeColor="bg-slate-100 text-slate-700 border-slate-200"
          expanded={expandedSections.location}
          onToggle={() => toggle('location')}
        >
          <div className="pt-3 space-y-2.5">
            {/* Ward + Zone row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-2.5">
                <div className="text-[10.5px] text-slate-400 font-medium uppercase tracking-wide">Ward</div>
                <div className="text-[13px] font-semibold text-slate-800 mt-0.5">{locationData?.ward || hotspotData?.ward}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5">
                <div className="text-[10.5px] text-slate-400 font-medium uppercase tracking-wide">Zone</div>
                <div className="text-[13px] font-semibold text-slate-800 mt-0.5">{locationData?.zone || hotspotData?.zone}</div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-1.5 text-[12px]">
              {(locationData?.street || hotspotData?.street) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Road:</span>
                  <span className="text-slate-700 font-medium text-right max-w-[60%] truncate">{locationData?.street || hotspotData?.street}</span>
                </div>
              )}
              {(locationData?.area || hotspotData?.area) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Area:</span>
                  <span className="text-slate-700 font-medium">{locationData?.area || hotspotData?.area}</span>
                </div>
              )}
              {(locationData?.landmark || hotspotData?.landmark) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Landmark:</span>
                  <span className="text-slate-700 font-medium">{locationData?.landmark || hotspotData?.landmark}</span>
                </div>
              )}
              {(locationData?.latitude || hotspotData?.latitude) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Coordinates:</span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {(locationData?.latitude || hotspotData?.latitude)?.toFixed(4)}, {(locationData?.longitude || hotspotData?.longitude)?.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            {/* GPS consistency */}
            {locationData?.consistency_flag && (
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                <span className="text-[12px] text-slate-400">Photo matches GPS?</span>
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                  locationData.consistency_flag === 'CONSISTENT'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  <span className="inline-flex items-center gap-1">
                    {locationData.consistency_flag === 'CONSISTENT'
                      ? <><Check className="h-3 w-3" aria-hidden="true" />Yes</>
                      : <><X className="h-3 w-3" aria-hidden="true" />Mismatch</>}
                  </span>
                </span>
              </div>
            )}

            {/* Same-location report count */}
            {reportCount > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-center gap-2.5 mt-1">
                <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div>
                  <div className="text-[12px] font-semibold text-blue-800">
                    {reportCount} people reported this issue
                  </div>
                  <div className="text-[10.5px] text-blue-600">Same location + same issue category</div>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ============================================================ */}
      {/* 4. WHICH TEAM SHOULD FIX IT? (Routing)                       */}
      {/* ============================================================ */}
      {deptRoutingData && (
        <SectionCard
          icon={Building}
          iconColor="text-slate-600"
          iconBg="bg-slate-100"
          title="Which Team Should Fix It?"
          infoText="The AI picks the best department based on what the problem is, how busy each team is, and which team covers this area."
          badge={getShortDeptName(deptRoutingData.primary_recommendation?.department_name)}
          badgeColor="bg-slate-100 text-slate-700 border-slate-200"
          expanded={expandedSections.routing}
          onToggle={() => toggle('routing')}
        >
          <div className="pt-3 space-y-2.5">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-[12.5px]">
                <span className="text-slate-400">Recommended:</span>
                <span className="font-semibold text-slate-800">{deptRoutingData.primary_recommendation?.department_name}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>AI confidence: {Math.round((deptRoutingData.primary_recommendation?.confidence || 0.88) * 100)}%</span>
                <span>Pending jobs: {deptRoutingData.primary_recommendation?.workload?.active_tickets || 0}</span>
              </div>
              {deptRoutingData.primary_recommendation?.reasons && (
                <ul className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 mt-1.5">
                  {deptRoutingData.primary_recommendation.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-slate-300 mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isAuthority && (
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(true)}
                className="w-full py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-medium text-[12px] transition cursor-pointer"
              >
                Change Department Manually <ArrowRight className="ml-1 inline h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </SectionCard>
      )}

      {/* ============================================================ */}
      {/* 5. HOW DID AI DECIDE? (Evidence)                             */}
      {/* ============================================================ */}
      {evidenceData && (
        <SectionCard
          icon={HelpCircle}
          iconColor="text-slate-500"
          iconBg="bg-slate-100"
          title="How Did AI Decide?"
          infoText="Shows all the checks the AI performed — whether the photo is real, how serious the problem is, which team should fix it, and if the deadline will be met."
          badge={`${evidenceData.decisions_count || evidenceData.grounded_decisions?.length || 4} checks done`}
          badgeColor="bg-slate-100 text-slate-700 border-slate-200"
          expanded={expandedSections.evidence}
          onToggle={() => toggle('evidence')}
        >
          <div className="pt-3 space-y-2">
            {evidenceData.grounded_decisions?.map((dec, i) => {
              const labels = {
                'AUTHENTICITY_VERIFICATION': { label: 'Photo verified' },
                'SEVERITY_CLASSIFICATION': { label: 'Severity assessed' },
                'DEPARTMENT_ROUTING': { label: 'Department identified' },
                'SLA_PREDICTION': { label: 'Deadline estimated' },
              };
              const meta = labels[dec.facet] || { label: dec.facet.replace(/_/g, ' ') };
              const isPass = dec.confidence >= 0.5;

              return (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[12px] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center ${isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isPass ? <Check className="h-3 w-3" aria-hidden="true" /> : <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                      </span>
                      <span className="font-semibold text-slate-700">{meta.label}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{Math.round(dec.confidence * 100)}%</span>
                  </div>
                  <div className="text-slate-600 font-medium text-[11.5px]">{dec.decision}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{dec.explanation}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ============================================================ */}
      {/* 6. IS THE WORK DONE? (Resolution)                            */}
      {/* ============================================================ */}
      {(resolutionData || currentStatus === 'Resolved') && (
        <SectionCard
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          title="Is the Work Done?"
          infoText="The AI compares before and after photos to check if the problem was really fixed."
          badge={
            resolutionData?.status === 'LIKELY_RESOLVED' || currentStatus === 'Resolved'
              ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" aria-hidden="true" />Looks Fixed</span>
              : resolutionData?.status === 'LIKELY_NOT_RESOLVED'
              ? <span className="inline-flex items-center gap-1"><X className="h-3 w-3" aria-hidden="true" />Not Fixed</span>
              : 'Needs Review'
          }
          badgeColor={
            resolutionData?.status === 'LIKELY_RESOLVED' || currentStatus === 'Resolved'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }
          expanded={expandedSections.resolution}
          onToggle={() => toggle('resolution')}
        >
          <div className="pt-3 space-y-3">
            {/* Before / After */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="text-[10.5px] text-slate-400 font-medium uppercase mb-1">Before</div>
                <img
                  src={resolutionData?.before_image_url || '/sample_evidence/pothole.jpg'}
                  alt="Before" className="w-full h-24 object-cover rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <div className="text-[10.5px] text-emerald-600 font-medium uppercase mb-1">After</div>
                <img
                  src={resolutionData?.after_image_url || '/sample_evidence/pothole_repaired.jpg'}
                  alt="After" className="w-full h-24 object-cover rounded-lg border border-emerald-200"
                />
              </div>
            </div>

            {/* Confidence */}
            <div className="flex items-center justify-between text-[12px] bg-slate-50 rounded-lg p-2.5 border border-slate-200">
              <span className="text-slate-400">AI confidence:</span>
              <span className="font-semibold text-slate-700">{Math.round((resolutionData?.confidence || 0.92) * 100)}%</span>
            </div>

            {/* Buttons */}
            {isAuthority && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button" onClick={handleConfirmResolution} disabled={actionInProgress}
                  className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[12px] transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Yes, Done
                </button>
                <button
                  type="button" onClick={() => setIsReopenModalOpen(true)} disabled={actionInProgress}
                  className="py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-[12px] transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Send Back ✗
                </button>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ============================================================ */}
      {/* 7. SIMILAR COMPLAINTS (Duplicates)                           */}
      {/* ============================================================ */}
      {duplicateData?.candidates?.length > 0 && (
        <SectionCard
          icon={GitBranch}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          title={`Similar Complaints (${duplicateData.candidates.length})`}
          infoText="Other complaints filed nearby about the same kind of problem. They are NOT merged — each stays separate."
          badge={`${Math.round((duplicateData.duplicate_probability || 0.8) * 100)}% Match`}
          badgeColor="bg-amber-50 text-amber-700 border-amber-200"
          expanded={expandedSections.duplicates}
          onToggle={() => toggle('duplicates')}
        >
          <div className="pt-3 space-y-2">
            {duplicateData.candidates.map((cand, idx) => (
              <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[12px]">
                <div className="flex justify-between items-center">
                  <a
                    href={`/authority?id=${cand.candidate_complaint_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey && onSelectComplaint) {
                        e.preventDefault();
                        onSelectComplaint(cand.candidate_complaint_id);
                      }
                    }}
                    className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    title={`Open issue #${cand.candidate_complaint_id} in authority view`}
                  >
                    #{cand.candidate_complaint_id}
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                  <span className="text-amber-700 text-[11px] font-medium">{Math.round((cand.duplicate_probability || 0.75) * 100)}% alike</span>
                </div>
                <div className="text-[11px] text-slate-400 flex gap-3 mt-0.5">
                  {cand.distance_meters != null && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />{Math.round(cand.distance_meters)}m away</span>}
                  {cand.text_similarity != null && <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" aria-hidden="true" />{Math.round(cand.text_similarity * 100)}% text match</span>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ============================================================ */}
      {/* 8. AI ALERTS (Watchdog)                                      */}
      {/* ============================================================ */}
      {watchdogData?.length > 0 && (
        <SectionCard
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          title={`AI Alerts (${watchdogData.length})`}
          infoText="The AI monitors complaints in the background. If something is stuck, forgotten, or way past deadline, it raises an alert here."
          badge="Needs Attention"
          badgeColor="bg-red-50 text-red-600 border-red-200"
          cardBg="bg-red-50/30"
          cardBorder="border-red-200"
          expanded={expandedSections.watchdog}
          onToggle={() => toggle('watchdog')}
        >
          <div className="pt-3 space-y-2.5">
            {watchdogData.map((ev) => (
              <div key={ev.id} className="bg-white p-3 rounded-lg border border-red-200 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    </div>
                    <span className="font-bold text-[12.5px] text-slate-800 uppercase tracking-wide">
                      {(ev.event || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 flex-shrink-0">
                    {ev.risk}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">{ev.reason}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 italic">Suggested action: {ev.recommended_action}</span>
                  {!ev.action_taken && (
                    <button
                      type="button"
                      onClick={() => handleAcknowledgeWatchdog(ev.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] transition cursor-pointer"
                    >
                      I've Seen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ============================================================ */}
      {/* MODAL: Reopen                                                */}
      {/* ============================================================ */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-[14px]">Send Back for Rework</h3>
              <button onClick={() => setIsReopenModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[12px] text-slate-500">Why was the work not done properly?</p>
            <textarea
              value={reopenReason} onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. The pothole is still there..."
              className="w-full h-20 p-2.5 text-[12px] border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setIsReopenModalOpen(false)} className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium cursor-pointer hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleReopenResolution} disabled={actionInProgress} className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold cursor-pointer">Send Back</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Department Override                                   */}
      {/* ============================================================ */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-[14px]">Change Department</h3>
              <button onClick={() => setIsOverrideModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-slate-600">Choose department:</label>
              <select value={overrideDept} onChange={(e) => setOverrideDept(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select --</option>
                <option value="ROAD_DEPT">Road & Infrastructure Department</option>
                <option value="SANITATION_DEPT">Solid Waste & Sanitation Department</option>
                <option value="WATER_DEPT">Water Supply & Distribution Department</option>
                <option value="DRAINAGE_DEPT">Drainage & Sewerage Board</option>
                <option value="ELECTRICAL_DEPT">Electrical & Public Lighting Department</option>
                <option value="HORTICULTURE_DEPT">Horticulture & Urban Forestry Department</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-slate-600">Reason (optional):</label>
              <input type="text" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="e.g. Needs drainage equipment" className="w-full p-2.5 border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setIsOverrideModalOpen(false)} className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium cursor-pointer hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleApplyDeptOverride} disabled={actionInProgress} className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold cursor-pointer">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CivicIntelligenceDossier;
