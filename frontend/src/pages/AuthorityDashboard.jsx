import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, FileText, Users, Building2, Map, BarChart3, 
  Camera, TrendingUp, UserCog, Settings, Calendar, Plus, 
  Filter, MoreVertical, X, Check, MapPin, Building, User, 
  ChevronDown, CheckCircle2, AlertCircle, ArrowUpRight, Search, 
  RefreshCw, CheckSquare, Layers, Cpu, ShieldCheck, ShieldAlert, ArrowRight, 
  Phone, Eye, Clock, Copy, Printer, Sparkles, Send, Wrench, RotateCcw,
  FastForward, CheckCheck, Bot, Zap, Sliders, AlertTriangle,
  Video, Image, Play, Download, ExternalLink, CheckCircle, UserCheck,
  Route, ListOrdered, Activity
} from 'lucide-react';
import { issueImageFor } from '../utils/issueImages';
import { CivicLogo } from '../components/CivicLogo';
import { MapViewPage } from './MapViewPage';
import { CCTVVisionPage } from './CCTVVisionPage';
import { AnalyticsPage } from './AnalyticsPage';
import { AuditLogsPage } from './AuditLogsPage';
import { complaintApi } from '../api/complaintApi';
import { CivicIntelligenceDossier } from '../components/CivicIntelligenceDossier';
import { useAssistantContext } from '../context/AssistantContext';

// 5 Municipal Departments
const DEPARTMENTS_DATA = [
  {
    id: 'ROAD_DEPT',
    name: 'Road Infrastructure & Public Works',
    shortName: 'Road Department',
    head: 'Er. Vikram Shinde',
    designation: 'Superintending Engineer',
    phone: '+91 731 254 8101',
    openTickets: 14,
    resolvedTickets: 42,
    avgResolution: '28 hours',
    squads: ['Field Squad A', 'Field Squad C', 'Asphalt Patch Squad 1'],
    jurisdiction: 'All city arterial roads, highway flyovers, and pedestrian pavements.'
  },
  {
    id: 'SOLID_WASTE',
    name: 'Sanitation & Solid Waste Management',
    shortName: 'Sanitation Department',
    head: 'Dr. Priya Deshmukh',
    designation: 'Chief Municipal Health Officer',
    phone: '+91 731 254 8102',
    openTickets: 9,
    resolvedTickets: 68,
    avgResolution: '12 hours',
    squads: ['Field Squad B', 'Compactor Squad 4', 'Recycling Quick Unit'],
    jurisdiction: 'Daily domestic garbage collection, market sweepers, and dumpsters.'
  },
  {
    id: 'STREET_LIGHT',
    name: 'Electricity & Public Street Lighting',
    shortName: 'Electricity Department',
    head: 'Er. Amit More',
    designation: 'Executive Electrical Engineer',
    phone: '+91 731 254 8103',
    openTickets: 6,
    resolvedTickets: 31,
    avgResolution: '18 hours',
    squads: ['Field Squad A (Electrical)', 'High-Mast Tower Crew'],
    jurisdiction: 'Roadway luminaires, traffic junction signals, and transformer lines.'
  },
  {
    id: 'WATER_SUPPLY',
    name: 'Water Supply & Distribution Board',
    shortName: 'Water Supply Department',
    head: 'Er. Sneha Jagtap',
    designation: 'Executive Engineer (PHE)',
    phone: '+91 731 254 8104',
    openTickets: 7,
    resolvedTickets: 29,
    avgResolution: '16 hours',
    squads: ['Water Pipe Line Squad 2', 'Leakage Detection Unit'],
    jurisdiction: 'Drinking water distribution mains, valve junctions, and reservoir feed.'
  },
  {
    id: 'DRAINAGE',
    name: 'Stormwater Drainage & Sewerage Board',
    shortName: 'Drainage Board',
    head: 'Er. Kiran Desai',
    designation: 'Drainage Superintendent',
    phone: '+91 731 254 8105',
    openTickets: 3,
    resolvedTickets: 22,
    avgResolution: '24 hours',
    squads: ['Monsoon De-clogging Squad', 'Jetting Vacuum Unit'],
    jurisdiction: 'Catchment basins, storm culverts, and sewer inspection manholes.'
  }
];

// 5 Municipal Department Designated Field Specialist Rosters
export const DEPARTMENT_WORKER_ROSTER = {
  ROAD_DEPT: {
    primary: { name: 'Er. Rajesh Patil', squad: 'Field Squad A', dept: 'Road Department', vehicle: 'Utility Truck 1', phone: '+91 98260 11021', skill: 'Road Infrastructure & Asphalt Paving' },
    backup: { name: 'Kiran Desai', squad: 'Field Squad C', dept: 'Road Department', vehicle: 'Asphalt Roller 1', phone: '+91 98260 11026', skill: 'Structural & Bridge Pavement' }
  },
  SOLID_WASTE: {
    primary: { name: 'Priya Deshmukh', squad: 'Field Squad B', dept: 'Sanitation Department', vehicle: 'Compactor 4', phone: '+91 98260 11022', skill: 'Sanitation & Solid Waste Management' },
    backup: { name: 'Amit More', squad: 'Field Squad A', dept: 'Sanitation Department', vehicle: 'Sweeper Unit 3', phone: '+91 98260 11025', skill: 'Commercial Dump Haulage' }
  },
  STREET_LIGHT: {
    primary: { name: 'Vikram Shinde', squad: 'Field Squad A', dept: 'Electricity Department', vehicle: 'Tower Truck 2', phone: '+91 98260 11023', skill: 'High-Voltage Wiring & Luminaire Repair' },
    backup: { name: 'Er. Rajesh Patil', squad: 'Field Squad A', dept: 'Road Department', vehicle: 'Utility Truck 1', phone: '+91 98260 11021', skill: 'Infrastructure Support' }
  },
  WATER_SUPPLY: {
    primary: { name: 'Sneha Jagtap', squad: 'Field Squad B', dept: 'Water Supply Department', vehicle: 'Water Tanker 1', phone: '+91 98260 11024', skill: 'Pipeline Pressure & Leak Remediation' },
    backup: { name: 'Kiran Desai', squad: 'Field Squad C', dept: 'Drainage Board', vehicle: 'Jetting Vacuum Unit', phone: '+91 98260 11026', skill: 'Hydraulic Systems' }
  },
  DRAINAGE: {
    primary: { name: 'Kiran Desai', squad: 'Field Squad C', dept: 'Drainage Board', vehicle: 'Jetting Vacuum Unit', phone: '+91 98260 11026', skill: 'Stormwater Culverts & Manhole Safety' },
    backup: { name: 'Sneha Jagtap', squad: 'Field Squad B', dept: 'Water Supply Department', vehicle: 'Sanitation Van 1', phone: '+91 98260 11024', skill: 'Underground Drainage Flow' }
  }
};

// Auto-resolver to match any issue to its specific designated department specialist
export const resolveDesignatedWorker = (issue) => {
  const dId = issue?.departmentId || (
    (issue?.department || '').toLowerCase().includes('sanit') || (issue?.department || '').toLowerCase().includes('waste') ? 'SOLID_WASTE' :
    (issue?.department || '').toLowerCase().includes('light') || (issue?.department || '').toLowerCase().includes('electr') ? 'STREET_LIGHT' :
    (issue?.department || '').toLowerCase().includes('water') ? 'WATER_SUPPLY' :
    (issue?.department || '').toLowerCase().includes('drain') || (issue?.department || '').toLowerCase().includes('sewer') ? 'DRAINAGE' :
    'ROAD_DEPT'
  );
  const roster = DEPARTMENT_WORKER_ROSTER[dId] || DEPARTMENT_WORKER_ROSTER.ROAD_DEPT;
  return {
    ...roster.primary,
    departmentId: dId,
    backup: roster.backup
  };
};

// Auto-resolver to match any issue to its Before defect evidence photo
export const resolveBeforeImage = (issue) => {
  if (issue?.image && typeof issue.image === 'string' && !issue.image.startsWith('/sample_evidence/')) {
    return issue.image;
  }
  const cat = (issue?.title || issue?.department || issue?.category || '').toLowerCase();
  return issueImageFor(cat, 'before');
};

// Auto-resolver for completed work proof (After photo, Video proof, and verification metrics)
export const resolveProofMedia = (issue) => {
  const cat = (issue?.title || issue?.department || issue?.category || '').toLowerCase();
  if (cat.includes('garbage') || cat.includes('sanitat') || cat.includes('waste')) {
    return {
      afterImage: issue?.proofMedia?.afterImage || '/image/garbage/after/0151c5e2-0fae-42cb-846b-a28933d1d887.jpg',
      videoProof: '/sample_evidence/cctv_feed_1.mp4',
      verificationScore: 99.1,
      repairSummary: 'Full waste accumulation removed, street sidewalk sanitized, green municipal container deployed.'
    };
  }
  if (cat.includes('water') || cat.includes('leak') || cat.includes('pipeline')) {
    return {
      afterImage: issue?.proofMedia?.afterImage || '/image/water_leak/after/09fbbc53-0904-4a0a-ba9a-c7d27ffd6c88.jpg',
      videoProof: '/sample_evidence/cctv_feed_2.mp4',
      verificationScore: 98.4,
      repairSummary: 'Underground municipal distribution valve gasket replaced, road surface repaved and sealed dry.'
    };
  }
  if (cat.includes('light') || cat.includes('electr') || cat.includes('pole')) {
    return {
      afterImage: issue?.proofMedia?.afterImage || '/image/Strretlight/after/447dba68-3a58-44d4-ba9c-e19d70001011.jpg',
      videoProof: '/sample_evidence/cctv_feed_1.mp4',
      verificationScore: 99.5,
      repairSummary: 'Defective LED armature replaced, photocell sensor recalibrated, street luminaire fully restored.'
    };
  }
  if (cat.includes('drain') || cat.includes('manhole') || cat.includes('sewer') || cat.includes('storm')) {
    return {
      afterImage: issue?.proofMedia?.afterImage || '/image/Storm%20drainage/after/0cda410f-1d4b-4b5d-908d-c20e26df910b.jpg',
      videoProof: '/sample_evidence/cctv_feed_2.mp4',
      verificationScore: 97.9,
      repairSummary: 'Reinforced cast iron stormwater grate installed, drainage silt vacuumed, zero water blockage.'
    };
  }
  // Default road repair
  return {
    afterImage: issue?.proofMedia?.afterImage || '/image/pathole/after/0dc86bc2-7d3c-4b17-bddb-760e35cc3abd.jpg',
    videoProof: '/sample_evidence/cctv_feed_1.mp4',
    verificationScore: 98.8,
    repairSummary: 'High-density bituminous hot-mix asphalt laid and vibratory compacted. Yellow boundary marking repainted.'
  };
};

// Initial realistic AI Operational & Dispatch logs with full media proof
export const INITIAL_AI_LOGS = [
  {
    id: 'log-101',
    time: '12:53:11 PM',
    type: 'REMEDIATION_COMPLETE',
    level: 'SUCCESS',
    issueId: 'CS1039',
    issueTitle: 'Main Junction Deep Pothole',
    officer: 'Er. Rajesh Patil',
    dept: 'Road Infrastructure',
    message: 'On-site repair completed by Er. Rajesh Patil for #CS1039. Bituminous hot-mix asphalt laid and compacted with 10-ton vibratory roller. Officer posted post-repair photo and video verification proof. Officer status changed to AVAILABLE.',
    beforeImage: '/sample_evidence/pothole.jpg',
    afterImage: '/sample_evidence/pothole_after.jpg',
    videoProof: '/sample_evidence/cctv_feed_1.mp4',
    verificationScore: 98.8,
    repairSummary: 'High-density bituminous hot-mix asphalt laid and vibratory compacted. Yellow boundary marking repainted.',
    location: 'MG Road near Regal Square, Ward 12',
    coordinates: '22.7196° N, 75.8577° E',
    completedAt: '12:53:11 PM',
    mode: 'Autonomous Zero-Touch'
  },
  {
    id: 'log-102',
    time: '12:52:31 PM',
    type: 'AUTONOMOUS_DISPATCH',
    level: 'DISPATCH',
    issueId: 'CS1039',
    issueTitle: 'Main Junction Deep Pothole',
    officer: 'Er. Rajesh Patil',
    dept: 'Road Infrastructure',
    message: '[Zero-Touch Mode] AI autonomously selected & dispatched Er. Rajesh Patil to #CS1039. Proximity match 0.8 km, estimated ETA 4 mins. 60-second remediation countdown initiated.',
    beforeImage: '/sample_evidence/pothole.jpg',
    afterImage: '/sample_evidence/pothole_after.jpg',
    videoProof: '/sample_evidence/cctv_feed_1.mp4',
    verificationScore: 98.8,
    repairSummary: 'Asphalt leveling & surface patch operation.',
    location: 'MG Road near Regal Square, Ward 12',
    coordinates: '22.7196° N, 75.8577° E',
    mode: 'Autonomous Zero-Touch'
  },
  {
    id: 'log-103',
    time: '12:50:53 PM',
    type: 'REMEDIATION_COMPLETE',
    level: 'SUCCESS',
    issueId: 'CS1001',
    issueTitle: 'Streetlight Pole Array Malfunction',
    officer: 'Er. Vikram Shinde',
    dept: 'Electricity & Lighting',
    message: 'On-site repair completed by Er. Vikram Shinde for #CS1001. Defective LED armature replaced, photocell sensor recalibrated, street luminaire fully restored. Completion photo and video proof verified.',
    beforeImage: '/sample_evidence/streetlight.jpg',
    afterImage: '/sample_evidence/streetlight_after.jpg',
    videoProof: '/sample_evidence/cctv_feed_1.mp4',
    verificationScore: 99.5,
    repairSummary: 'Armature replaced, photocell sensor recalibrated, luminaire verified.',
    location: 'Scheme 78 Main Road, Sector B, Ward 4',
    coordinates: '22.7533° N, 75.8937° E',
    completedAt: '12:50:53 PM',
    mode: 'Supervisor Approved'
  },
  {
    id: 'log-104',
    time: '12:50:53 PM',
    type: 'REMEDIATION_COMPLETE',
    level: 'SUCCESS',
    issueId: 'CS1002',
    issueTitle: 'Overflowing Commercial Dumpster',
    officer: 'Priya Deshmukh',
    dept: 'Sanitation & Solid Waste',
    message: 'On-site repair completed by Priya Deshmukh for #CS1002. Full waste accumulation removed, sidewalk sanitized, green municipal container deployed. Completion photo and video proof verified.',
    beforeImage: '/sample_evidence/garbage.jpg',
    afterImage: '/sample_evidence/garbage_after.jpg',
    videoProof: '/sample_evidence/cctv_feed_1.mp4',
    verificationScore: 99.1,
    repairSummary: 'Waste clearing and chemical wash completed, container emptied.',
    location: 'AB Road Market Entrance, Ward 7',
    coordinates: '22.7244° N, 75.8711° E',
    completedAt: '12:50:53 PM',
    mode: 'Autonomous Zero-Touch'
  },
  {
    id: 'log-105',
    time: '12:45:10 PM',
    type: 'WORKER_BUSY_WAITLIST',
    level: 'WARNING',
    issueId: 'CS1032',
    issueTitle: 'Stormwater Drain Clogging',
    officer: 'Er. Rajesh Patil',
    dept: 'Road Infrastructure',
    message: 'Bridge Approach Defect (#CS1032) arrived. Designated specialist Er. Rajesh Patil was BUSY on #CS1039. Ticket placed in autonomous priority waitlist queue.',
    beforeImage: '/sample_evidence/drainage.jpg',
    afterImage: '/sample_evidence/drainage_after.jpg',
    videoProof: '/sample_evidence/cctv_feed_2.mp4',
    verificationScore: 97.9,
    repairSummary: 'Drain grate clearing & silt suction.',
    location: 'Bhawarkua Flyover Approach, Ward 21',
    coordinates: '22.6912° N, 75.8654° E',
    mode: 'Autonomous Queue'
  },
  {
    id: 'log-106',
    time: '12:44:00 PM',
    type: 'WORKER_FREED',
    level: 'INFO',
    issueId: 'CS1032',
    issueTitle: 'Stormwater Drain Clogging',
    officer: 'Er. Rajesh Patil',
    dept: 'Road Infrastructure',
    message: 'Specialist Er. Rajesh Patil completed previous ticket and became AVAILABLE. Autonomous queue immediately triggered assignment for #CS1032.',
    beforeImage: '/sample_evidence/drainage.jpg',
    afterImage: '/sample_evidence/drainage_after.jpg',
    videoProof: '/sample_evidence/cctv_feed_2.mp4',
    verificationScore: 97.9,
    repairSummary: 'Drain grate clearing & silt suction.',
    location: 'Bhawarkua Flyover Approach, Ward 21',
    coordinates: '22.6912° N, 75.8654° E',
    mode: 'Autonomous Zero-Touch'
  },
  {
    id: 'log-107',
    time: '12:40:15 PM',
    type: 'AI_MATCH_EVAL',
    level: 'INFO',
    issueId: 'CS1038',
    issueTitle: 'Pressurized Water Distribution Pipe Leak',
    officer: 'Sneha Jagtap',
    dept: 'Water Supply Board',
    message: 'Acoustic & pressure loss telemetry evaluated. High priority water loss matched to Water Supply Specialist Sneha Jagtap (Valve Truck 2, 1.1 km away).',
    beforeImage: '/sample_evidence/water_leak.jpg',
    afterImage: '/sample_evidence/water_leak_after.jpg',
    videoProof: '/sample_evidence/cctv_feed_2.mp4',
    verificationScore: 98.4,
    repairSummary: 'Distribution pipe valve gasket replacement.',
    location: 'Sapna Sangeeta Road, Ward 15',
    coordinates: '22.7051° N, 75.8682° E',
    mode: 'AI Proximity Evaluation'
  }
];

// Helper to determine if an issue has unverified / flagged evidence
export const checkIsUnverified = (issue) => {
  if (!issue) return false;
  if (
    issue.authenticityVerdict === 'APPROVED_BY_SUPERVISOR' ||
    issue.authenticityVerdict === 'PASS' ||
    issue.authenticityVerdict === 'REJECTED_FAKE' ||
    issue.status === 'Dismissed' ||
    issue.status === 'Rejected' ||
    issue.status === 'Resolved' ||
    issue.isUnverified === false ||
    issue.requiresHumanReview === false
  ) {
    return false;
  }
  return Boolean(
    issue.isUnverified ||
    issue.requiresHumanReview ||
    issue.status === 'Review Required' ||
    issue.status === 'Under Review' ||
    issue.authenticityVerdict === 'REVIEW'
  );
};

// Helper to convert live backend Complaint database objects into AuthorityDashboard issue format
const mapApiComplaintToIssue = (c) => {
  const cleanId = c.id ? c.id.replace('#', '') : 'CS1000';
  const d = new Date(c.created_at);
  const createdOnDate = isNaN(d.getTime()) ? 'Today' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const createdOnTime = isNaN(d.getTime()) ? 'Just now' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Map category to appropriate civic visual evidence
  const cat = (c.category || '').toLowerCase();
  let defaultImg = '/image/pathole/before/0428f686-a431-4415-b4f9-9c4d888f2a92.jpg';
  if (cat.includes('garbage') || cat.includes('waste')) defaultImg = '/image/garbage/before/0e61bca7-361e-466a-868a-36cae942872e.jpg';
  else if (cat.includes('water') || cat.includes('leak')) defaultImg = '/image/water_leak/before/23c9fbe3-8d33-4dac-8e87-71b0504d787b.jpg';
  else if (cat.includes('light') || cat.includes('electric')) defaultImg = '/image/Strretlight/before/7980af27-cf7d-4093-9f04-ce507bd7ff4c.jpg';
  else if (cat.includes('drain') || cat.includes('manhole') || cat.includes('storm')) defaultImg = '/image/Storm%20drainage/before/233e9aff-0079-4caa-a0be-b5bb62ff4ef2.jpg';

  const evidenceUrls = (c.evidence_list && c.evidence_list.length > 0)
    ? c.evidence_list.map((e) => e.file_url)
    : [defaultImg];

  const rawSeverity = (c.severity || 'MEDIUM').toUpperCase();
  const priority = rawSeverity === 'CRITICAL' || rawSeverity === 'HIGH' ? 'High' : 'Medium';

  let status = c.status || 'Submitted';
  if (status === 'Draft') status = 'Submitted';

  const deptName = c.department_name || (c.department ? c.department.name : 'Municipal Road Department');
  const isRecent = !isNaN(d.getTime()) && (Date.now() - d.getTime()) < (24 * 3600 * 1000);

  const designated = resolveDesignatedWorker({
    department: deptName,
    departmentId: c.department_id ? String(c.department_id) : 'ROAD_DEPT'
  });

  return {
    id: cleanId,
    title: c.master_issue_type || c.title || (c.issue_type ? c.issue_type.replace(/_/g, ' ') : (c.category ? c.category.replace(/_/g, ' ') : 'Civic Issue')),
    category: c.master_category || c.category || '',
    clusterId: c.cluster_id || null,
    masterGrievanceId: c.master_grievance_id || c.cluster_id || c.id,
    reportCount: c.report_count || 1,
    reporterCount: c.reporter_count || 1,
    showReportCount: Boolean(c.show_report_count),
    isDuplicate: Boolean(c.is_duplicate),
    latitude: c.latitude,
    longitude: c.longitude,
    reporterId: c.citizen_id !== null && c.citizen_id !== undefined ? String(c.citizen_id) : null,
    location: c.address || 'Indore Urban Ward',
    priority: priority,
    department: c.master_department_name || deptName,
    departmentId: (c.master_department_id || c.department_id) ? String(c.master_department_id || c.department_id) : 'ROAD_DEPT',
    masterReports: c.master_reports || [],
    groupingReasons: c.grouping_reasons || [],
    status: status,
    assignedTo: c.assigned_officer_name || null,
    squad: c.assigned_officer_name ? (c.assigned_officer_name.includes('Patil') ? 'Field Squad A' : (c.assigned_officer_name.includes('Deshmukh') ? 'Field Squad B' : 'Field Squad A')) : null,
    createdOnDate,
    createdOnTime,
    isLiveReport: isRecent,
    reportedBy: c.citizen_id ? `Citizen (#${c.citizen_id})` : 'Citizen (via Web Portal)',
    description: c.description || 'Civic infrastructure defect reported by resident.',
    image: evidenceUrls[0] || defaultImg,
    evidenceGallery: evidenceUrls,
    extraEvidenceCount: Math.max(0, evidenceUrls.length - 1),
    aiDistanceKm: c.officer_distance_km !== null && c.officer_distance_km !== undefined ? c.officer_distance_km : 0.8,
    aiConfidence: c.ai_confidence ? `${Math.round(c.ai_confidence * 100)}%` : '92%',
    aiReasoning: c.grounded_explanation || c.severity_reason || `Matched to specialist ${designated.name} (${designated.squad}) based on civic infrastructure defect analysis.`,
    authenticityScore: c.authenticity_verdict === 'APPROVED_BY_SUPERVISOR' ? 98 : c.authenticity_score,
    authenticityVerdict: c.authenticity_verdict,
    authenticityRisk: c.authenticity_verdict === 'APPROVED_BY_SUPERVISOR' ? 'LOW' : c.authenticity_risk,
    authenticityFlags: c.authenticity_verdict === 'APPROVED_BY_SUPERVISOR' ? [] : c.authenticity_flags,
    requiresHumanReview: c.authenticity_verdict === 'APPROVED_BY_SUPERVISOR' || c.status === 'Resolved'
      ? false
      : Boolean(c.requires_human_review || c.authenticity_verdict === 'REVIEW' || c.status === 'Review Required' || (c.authenticity_score !== null && c.authenticity_score !== undefined && c.authenticity_score < 70)),
    isUnverified: c.authenticity_verdict === 'APPROVED_BY_SUPERVISOR' || c.status === 'Resolved'
      ? false
      : Boolean(c.requires_human_review || c.authenticity_verdict === 'REVIEW' || c.status === 'Review Required' || (c.authenticity_score !== null && c.authenticity_score !== undefined && c.authenticity_score < 70)),
    tamperingScore: c.tampering_score,
    aiGeneratedProbability: c.ai_generated_probability
  };
};

const groupIncidentReports = (items) => {
  const byMaster = new globalThis.Map();
  items.forEach((issue) => {
    const masterId = issue.masterGrievanceId || issue.id;
    if (!byMaster.has(masterId)) {
      byMaster.set(masterId, { ...issue, relatedReports: [], reportCount: issue.reportCount || 1,
        reporterCount: issue.reporterCount || 1, showReportCount: Boolean(issue.showReportCount) });
    } else {
      byMaster.get(masterId).relatedReports.push(issue);
    }
  });
  return [...byMaster.values()];
};

const incidentReportIds = (items, issueId) => {
  const cleanId = String(issueId || '').replace('#', '');
  const group = groupIncidentReports(items).find((item) =>
    item.id.replace('#', '') === cleanId || item.relatedReports.some((report) => report.id.replace('#', '') === cleanId)
  );
  return group ? [group.id, ...group.relatedReports.map((report) => report.id)].map((id) => id.replace('#', '')) : [cleanId];
};

// Baseline issues with real photos
const DEFAULT_ISSUES = [
  {
    id: 'CS1039',
    title: 'Pothole Defect',
    location: 'Shivajinagar Main Road, Indore',
    priority: 'High',
    department: 'Road Department',
    departmentId: 'ROAD_DEPT',
    status: 'Assigned',
    assignedTo: 'Er. Rajesh Patil',
    squad: 'Field Squad A',
    createdOnDate: '26 Sep 2026',
    createdOnTime: '05:12 PM',
    reportedBy: 'Citizen (via Web)',
    description: 'Large pothole on the main road causing vehicle damage and traffic hazard.',
    image: '/sample_evidence/pothole.jpg',
    evidenceGallery: ['/sample_evidence/pothole.jpg', '/sample_evidence/manhole.jpg', '/sample_evidence/drainage.jpg'],
    extraEvidenceCount: 2,
    aiDistanceKm: 0.8,
    aiConfidence: '94%',
    aiReasoning: 'Nearest available officer (0.8 km via Haversine GPS) in Road Infrastructure division. Officer currently holds low queue burden (2 active jobs).'
  },
  {
    id: 'CS1038',
    title: 'Garbage Accumulation',
    location: 'Scheme 54, Indore',
    priority: 'Medium',
    department: 'Sanitation Department',
    departmentId: 'SOLID_WASTE',
    status: 'In Progress',
    assignedTo: 'Priya Deshmukh',
    squad: 'Field Squad B',
    createdOnDate: '26 Sep 2026',
    createdOnTime: '04:48 PM',
    reportedBy: 'Citizen (via Mobile)',
    description: 'Uncollected domestic and commercial waste accumulating on pedestrian sidewalk.',
    image: '/sample_evidence/garbage.jpg',
    evidenceGallery: ['/sample_evidence/garbage.jpg', '/sample_evidence/drainage.jpg'],
    extraEvidenceCount: 1,
    aiDistanceKm: 1.2,
    aiConfidence: '91%',
    aiReasoning: 'Sector 54 sanitation compactor route proximity. Assigned to Lead Sanitarian Priya Deshmukh.'
  },
  {
    id: 'CS1037',
    title: 'Street Light Not Working',
    location: 'MG Road, Indore',
    priority: 'High',
    department: 'Electricity Department',
    departmentId: 'STREET_LIGHT',
    status: 'Assigned',
    assignedTo: 'Vikram Shinde',
    squad: 'Field Squad A',
    createdOnDate: '26 Sep 2026',
    createdOnTime: '04:10 PM',
    reportedBy: 'Citizen (via Web)',
    description: 'Dark stretch of broken streetlights near park. Exposed electric wire hanging dangerously from pole.',
    image: '/sample_evidence/streetlight.jpg',
    evidenceGallery: ['/sample_evidence/streetlight.jpg'],
    extraEvidenceCount: 0,
    aiDistanceKm: 1.5,
    aiConfidence: '96%',
    aiReasoning: 'Electrical hazards flagged as HIGH urgency. Vikram Shinde designated due to certification in high-voltage repairs.'
  },
  {
    id: 'CS1036',
    title: 'Water Leakage Pipeline',
    location: 'Vijay Nagar, Indore',
    priority: 'Medium',
    department: 'Water Supply Department',
    departmentId: 'WATER_SUPPLY',
    status: 'Review Required',
    assignedTo: null,
    squad: null,
    createdOnDate: '26 Sep 2026',
    createdOnTime: '03:55 PM',
    reportedBy: 'Resident Report',
    description: 'Drinking water pipeline burst with heavy stream flooding street for past 24 hours.',
    image: '/sample_evidence/water_leak.jpg',
    evidenceGallery: ['/sample_evidence/water_leak.jpg', '/sample_evidence/drainage.jpg'],
    extraEvidenceCount: 1,
    aiDistanceKm: 2.1,
    aiConfidence: '89%',
    aiReasoning: 'PHE underground distribution main anomaly detected. Awaiting official confirmation before valve shutdown.',
    isUnverified: true,
    requiresHumanReview: true,
    authenticityVerdict: 'REVIEW',
    authenticityScore: 54.0,
    authenticityRisk: 'HIGH',
    authenticityFlags: ['High localized ELA compression variance', 'Spectral high-frequency periodic peak detected']
  },
  {
    id: 'CS1035',
    title: 'Open Manhole Hazard',
    location: 'Near C21 Mall, Indore',
    priority: 'High',
    department: 'Drainage Board',
    departmentId: 'DRAINAGE',
    status: 'Escalated',
    assignedTo: null,
    squad: null,
    createdOnDate: '26 Sep 2026',
    createdOnTime: '03:20 PM',
    reportedBy: 'Traffic Police Patrol',
    description: 'Missing sewer cover creating life-threatening hazard on high speed vehicular lane.',
    image: '/sample_evidence/manhole.jpg',
    evidenceGallery: ['/sample_evidence/manhole.jpg', '/sample_evidence/pothole.jpg'],
    extraEvidenceCount: 2,
    aiDistanceKm: 0.5,
    aiConfidence: '98%',
    aiReasoning: 'Critical pedestrian and vehicle life safety alert. Auto-escalated to Level 2 supervisor.'
  },
  {
    id: 'CS1034',
    title: 'Drainage Overflow',
    location: 'Scheme 78, Indore',
    priority: 'Medium',
    department: 'Drainage Board',
    departmentId: 'DRAINAGE',
    status: 'In Progress',
    assignedTo: 'Sneha Jagtap',
    squad: 'Field Squad B',
    createdOnDate: '26 Sep 2026',
    createdOnTime: '02:44 PM',
    reportedBy: 'Citizen (via Web)',
    description: 'Monsoon catch basin choked with plastic debris causing local street waterlogging.',
    image: '/sample_evidence/drainage.jpg',
    evidenceGallery: ['/sample_evidence/drainage.jpg', '/sample_evidence/water_leak.jpg'],
    extraEvidenceCount: 1,
    aiDistanceKm: 1.8,
    aiConfidence: '93%',
    aiReasoning: 'Stormwater catchment choke pattern matched to Scheme 78 culvert drainage grid.'
  },
  {
    id: 'CS1033',
    title: 'Commercial Waste Dump',
    location: 'Vijay Nagar, Indore',
    priority: 'Medium',
    department: 'Sanitation Department',
    departmentId: 'SOLID_WASTE',
    status: 'Assigned',
    assignedTo: 'Amit More',
    squad: 'Field Squad A',
    createdOnDate: '26 Sep 2026',
    createdOnTime: '01:10 PM',
    reportedBy: 'Ward Inspector',
    description: 'Commercial market overflow bins need immediate municipal compactor dispatch.',
    image: '/sample_evidence/garbage.jpg',
    evidenceGallery: ['/sample_evidence/garbage.jpg'],
    extraEvidenceCount: 0,
    aiDistanceKm: 1.1,
    aiConfidence: '90%',
    aiReasoning: 'Assigned to Ward Inspector Amit More for scheduled commercial evening haul.'
  },
  {
    id: 'CS1032',
    title: 'Bridge Approach Pothole',
    location: 'Palasia Square, Indore',
    priority: 'High',
    department: 'Road Department',
    departmentId: 'ROAD_DEPT',
    status: 'Submitted',
    assignedTo: null,
    squad: null,
    createdOnDate: '26 Sep 2026',
    createdOnTime: '12:34 PM',
    reportedBy: 'Citizen (via Web)',
    description: 'Sub-surface road settlement creating deep rut on bridge approach curve.',
    image: '/sample_evidence/pothole.jpg',
    evidenceGallery: ['/sample_evidence/pothole.jpg'],
    extraEvidenceCount: 0,
    aiDistanceKm: 0.9,
    aiConfidence: '95%',
    aiReasoning: 'Arterial bridge approach. Matched to primary specialist Er. Rajesh Patil for urgent hot-mix asphalt patching.'
  },
  {
    id: 'CS1002',
    title: 'Commercial Solid Waste Cleared',
    location: 'Market Square, Sector 2, Indore',
    priority: 'Medium',
    department: 'Sanitation Department',
    departmentId: 'SOLID_WASTE',
    status: 'Resolved',
    assignedTo: 'Priya Deshmukh',
    squad: 'Field Squad B',
    createdOnDate: '24 Sep 2026',
    createdOnTime: '09:15 AM',
    resolvedAt: '11:45 AM',
    reportedBy: 'Citizen (via Mobile App)',
    description: 'Accumulated commercial solid waste cleared and disinfected by morning sanitation squad.',
    image: '/sample_evidence/garbage.jpg',
    evidenceGallery: ['/sample_evidence/garbage.jpg', '/sample_evidence/garbage_after.jpg'],
    extraEvidenceCount: 1,
    aiDistanceKm: 1.2,
    aiConfidence: '97%',
    aiReasoning: 'Remediation completed and verified with photographic completion proof.',
    proofMedia: {
      beforeImage: '/sample_evidence/garbage.jpg',
      afterImage: '/sample_evidence/garbage_after.jpg',
      videoProof: '/sample_evidence/cctv_feed_1.mp4',
      verificationScore: 99.1,
      repairSummary: 'Full waste accumulation removed, street sidewalk sanitized, green municipal container deployed.',
      completedAt: '11:45 AM',
      officer: 'Priya Deshmukh',
      squad: 'Field Squad B'
    }
  }
];

const INITIAL_SQUADS = [
  { id: 'sq-1', name: 'Er. Rajesh Patil', squad: 'Field Squad A', dept: 'Road Department', status: 'AVAILABLE', activeTicket: null, vehicle: 'Utility Truck 1' },
  { id: 'sq-2', name: 'Priya Deshmukh', squad: 'Field Squad B', dept: 'Sanitation Department', status: 'AVAILABLE', activeTicket: null, vehicle: 'Compactor 4' },
  { id: 'sq-3', name: 'Vikram Shinde', squad: 'Field Squad A', dept: 'Electricity Department', status: 'AVAILABLE', activeTicket: null, vehicle: 'Tower Truck 2' },
  { id: 'sq-4', name: 'Sneha Jagtap', squad: 'Field Squad B', dept: 'Water Supply Department', status: 'AVAILABLE', activeTicket: null, vehicle: 'Water Tanker 1' },
  { id: 'sq-5', name: 'Amit More', squad: 'Field Squad A', dept: 'Sanitation Department', status: 'AVAILABLE', activeTicket: null, vehicle: 'Sweeper Unit 3' },
  { id: 'sq-6', name: 'Kiran Desai', squad: 'Field Squad C', dept: 'Drainage Board', status: 'AVAILABLE', activeTicket: null, vehicle: 'Jetting Vacuum Unit' }
];

export const AuthorityDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Navigation tab view: 'triage' | 'departments' | 'ai_review' | 'orders' | 'crew' | 'map' | 'cctv' | 'analytics' | 'users' | 'settings'
  const tabParam = searchParams.get('tab');
  const getInitialView = () => {
    const t = (tabParam || '').toUpperCase();
    if (t === 'DEPARTMENTS') return 'departments';
    if (t === 'AI_REVIEW') return 'ai_review';
    if (t === 'OFFICERS' || t === 'CREW') return 'crew';
    if (t === 'MAP') return 'map';
    if (t === 'CCTV') return 'cctv';
    if (t === 'ANALYTICS' || t === 'REPORTS') return 'analytics';
    if (t === 'USERS') return 'users';
    if (t === 'SETTINGS') return 'settings';
    if (t === 'RESOLVED' || t === 'RESOLVED_ISSUES') return 'resolved_issues';
    return 'triage';
  };

  const [activeNav, setActiveNav] = useState(getInitialView());
  const [activeTab, setActiveTab] = useState('All Issues');
  const [drawerTab, setDrawerTab] = useState('Overview'); // 'Overview' | 'Timeline' | 'Location' | 'Work Orders'
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(true);


  // Issues, Squads & Active Remediation Timers
  const [issues, setIssues] = useState(DEFAULT_ISSUES);
  const issuesRef = useRef(issues);
  useEffect(() => {
    issuesRef.current = issues;
  }, [issues]);

  const [squads, setSquads] = useState(INITIAL_SQUADS);
  const [activeJobs, setActiveJobs] = useState({}); // { [issueId]: { remainingSeconds: 60, officerName, squad } }
  const activeJobsRef = useRef(activeJobs);
  useEffect(() => {
    activeJobsRef.current = activeJobs;
  }, [activeJobs]);

  // Autonomous Zero-Touch AI Dispatch Engine switch
  const [autoDispatchMode, setAutoDispatchMode] = useState(false);
  const autoDispatchModeRef = useRef(false);
  useEffect(() => {
    autoDispatchModeRef.current = autoDispatchMode;
  }, [autoDispatchMode]);

  // AI Autonomous Dispatch & Worker Activity Audit Log state
  const [aiAuditLogs, setAiAuditLogs] = useState(INITIAL_AI_LOGS);
  const [aiLogFilter, setAiLogFilter] = useState('ALL'); // 'ALL' | 'DISPATCH' | 'WAITLIST' | 'COMPLETE'
  const [selectedAuditLogInAuthority, setSelectedAuditLogInAuthority] = useState(null);

  // Helper to append real-time AI audit logs with rich media proof
  const addAiLog = ({ 
    type, 
    level = 'INFO', 
    issueId, 
    issueTitle,
    officer, 
    dept, 
    message,
    beforeImage,
    afterImage,
    videoProof,
    verificationScore,
    repairSummary,
    location,
    coordinates
  }) => {
    const cleanId = issueId ? issueId.replace('#', '') : 'SYSTEM';
    const matchedIssue = (issuesRef.current || issues).find((i) => i.id.replace('#', '') === cleanId);
    const resolvedBefore = beforeImage || (matchedIssue ? resolveBeforeImage(matchedIssue) : '/sample_evidence/pothole.jpg');
    const proof = matchedIssue ? resolveProofMedia(matchedIssue) : resolveProofMedia({ title: 'Pothole' });

    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      level,
      issueId: cleanId,
      issueTitle: issueTitle || matchedIssue?.title || 'Civic Infrastructure Defect',
      officer: officer || (matchedIssue ? matchedIssue.assignedTo : 'Er. Rajesh Patil'),
      dept: dept || (matchedIssue ? matchedIssue.department : 'Road Infrastructure'),
      message,
      beforeImage: resolvedBefore,
      afterImage: afterImage || proof.afterImage,
      videoProof: videoProof || proof.videoProof,
      verificationScore: verificationScore || proof.verificationScore,
      repairSummary: repairSummary || proof.repairSummary,
      location: location || matchedIssue?.location || 'MG Road, Ward 12',
      coordinates: coordinates || matchedIssue?.coordinates || '22.7196° N, 75.8577° E',
      mode: autoDispatchModeRef.current ? 'Autonomous Zero-Touch' : 'Supervisor Oversight'
    };
    setAiAuditLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  // Inspect designated worker availability & busy status for any issue
  const getWorkerStatusForIssue = (issue) => {
    if (!issue) {
      return { 
        state: 'UNASSIGNED', 
        workerName: null, 
        squadName: null, 
        activeTicket: null, 
        remainingSeconds: 0, 
        isAvailable: true 
      };
    }
    const cleanId = issue.id.replace('#', '');
    const des = resolveDesignatedWorker(issue);
    const workerName = issue.assignedTo || des.name;
    const squadName = issue.squad || des.squad;

    // 1. Is active job running on THIS ticket?
    if (activeJobs[cleanId]) {
      return {
        state: 'BUSY_ON_THIS',
        workerName,
        squadName,
        activeTicket: cleanId,
        remainingSeconds: activeJobs[cleanId].remainingSeconds,
        isAvailable: false
      };
    }

    // 2. Is this worker currently running an active job on ANOTHER ticket?
    const busyJobEntry = Object.entries(activeJobs).find(
      ([tId, j]) => j.officerName === workerName && tId !== cleanId
    );
    if (busyJobEntry) {
      return {
        state: 'BUSY_ON_OTHER',
        workerName,
        squadName,
        activeTicket: busyJobEntry[0],
        remainingSeconds: busyJobEntry[1].remainingSeconds,
        isAvailable: false
      };
    }

    if (issue.status === 'Resolved') {
      return {
        state: 'RESOLVED',
        workerName,
        squadName,
        activeTicket: null,
        remainingSeconds: 0,
        isAvailable: true
      };
    }

    return {
      state: issue.assignedTo ? 'ASSIGNED' : 'AVAILABLE',
      workerName,
      squadName,
      activeTicket: null,
      remainingSeconds: 0,
      isAvailable: true
    };
  };

  // Build sequential route pipeline / task queue for an officer:
  // e.g. [1. Active on-site #CS1039 (38s)] -> [2. Next #CS1045] -> [3. Target #CS1077 (This Issue)]
  const getWorkerTaskQueue = (issue) => {
    if (!issue) return { workerName: '', squadName: '', isBusy: false, activeTicket: null, remainingSeconds: 0, route: [] };
    const cleanId = issue.id.replace('#', '');
    const des = resolveDesignatedWorker(issue);
    const workerName = issue.assignedTo || des.name;
    const squadName = issue.squad || des.squad;

    // Active job for this worker
    const activeJobEntry = Object.entries(activeJobs).find(
      ([tId, j]) => j.officerName === workerName
    );

    const route = [];

    // Stop 1: If worker has an active job running on-site
    if (activeJobEntry) {
      const [actTicketId, actJob] = activeJobEntry;
      const actIssue = (issuesRef.current || issues).find((i) => i.id.replace('#', '') === actTicketId);
      route.push({
        step: 1,
        ticketId: actTicketId,
        title: actIssue?.title || 'Civic Infrastructure Defect',
        location: actIssue?.location || 'Indore Urban Ward',
        status: 'BUSY_ON_SITE',
        remainingSeconds: actJob.remainingSeconds,
        isCurrentIssue: actTicketId === cleanId,
        label: actTicketId === cleanId ? 'Current Active Job (On-Site)' : 'First: Active On-Site Remediation'
      });
    }

    // Stop 2..N: Any OTHER tickets already assigned to this worker in queue
    const otherQueued = (issuesRef.current || issues).filter((iss) => {
      const cid = iss.id.replace('#', '');
      if (iss.status === 'Resolved' || iss.status === 'Dismissed' || iss.status === 'Rejected') return false;
      if (activeJobEntry && cid === activeJobEntry[0]) return false;
      if (cid === cleanId) return false;
      return iss.assignedTo === workerName;
    });

    otherQueued.forEach((qIss) => {
      const qCleanId = qIss.id.replace('#', '');
      route.push({
        step: route.length + 1,
        ticketId: qCleanId,
        title: qIss.title,
        location: qIss.location,
        status: 'QUEUED',
        remainingSeconds: null,
        isCurrentIssue: false,
        label: `Next: Queue Pos #${route.length + 1}`
      });
    });

    // Target Stop: This issue (if it wasn't already the active on-site job)
    if (!activeJobEntry || activeJobEntry[0] !== cleanId) {
      route.push({
        step: route.length + 1,
        ticketId: cleanId,
        title: issue.title,
        location: issue.location,
        status: issue.assignedTo ? 'ASSIGNED_QUEUED' : 'DESIGNATED_TARGET',
        remainingSeconds: null,
        isCurrentIssue: true,
        label: `Destination: Ticket #${cleanId} (This Work Order)`
      });
    }

    return {
      workerName,
      squadName,
      isBusy: Boolean(activeJobEntry),
      activeTicket: activeJobEntry ? activeJobEntry[0] : null,
      remainingSeconds: activeJobEntry ? activeJobEntry[1].remainingSeconds : 0,
      route
    };
  };

  // ============================================================
  // APPROVE AI DISPATCH & 1-MINUTE REMEDIATION START
  // ============================================================
  const handleApproveAiDispatch = (issueId, isAutonomous = false) => {
    const cleanId = issueId.replace('#', '');
    const currentList = issuesRef.current || issues;
    const issue = currentList.find((i) => i.id.replace('#', '') === cleanId);
    if (!issue) return;
    const relatedIssueIds = incidentReportIds(currentList, cleanId);

    const designated = resolveDesignatedWorker(issue);
    const officerName = issue.assignedTo || designated.name;
    const squadName = issue.squad || designated.squad;

    // Check if designated worker is already busy on another ticket
    const busyJob = Object.entries(activeJobsRef.current || activeJobs).find(
      ([issKey, j]) => j.officerName === officerName && issKey !== cleanId
    );
    if (busyJob) {
      setIssues((prev) => {
        const next = prev.map((i) =>
          relatedIssueIds.includes(i.id.replace('#', ''))
            ? { ...i, status: 'Assigned', assignedTo: officerName, squad: squadName }
            : i
        );
        issuesRef.current = next;
        return next;
      });
      complaintApi.updateStatus(cleanId, 'Assigned', `Master grievance #${cleanId}: assigned to ${officerName} (${squadName}) and queued behind active ticket #${busyJob[0]}.`, undefined, { name: officerName }).catch(() => {});
      addAiLog({
        type: 'AI_PIPELINE_ENQUEUE',
        level: 'INFO',
        issueId: cleanId,
        issueTitle: issue.title,
        officer: officerName,
        dept: squadName,
        message: `Work order #${cleanId} enqueued into ${officerName}'s task route. Specialist is currently busy on #${busyJob[0]} (${busyJob[1].remainingSeconds}s remaining).`
      });
      if (!isAutonomous) {
        showToast(`Assignment approved into pipeline: ${officerName} is currently busy on #${busyJob[0]} (${busyJob[1].remainingSeconds}s remaining). Ticket queued and will auto-dispatch when freed.`);
      }
      return;
    }

    // 1. Mark issue as In Progress
    setIssues((prev) => {
      const next = prev.map((i) =>
        relatedIssueIds.includes(i.id.replace('#', ''))
          ? { ...i, status: 'In Progress', assignedTo: officerName, squad: squadName }
          : i
      );
      issuesRef.current = next;
      return next;
    });

    // Persist dispatch status to backend database
    complaintApi.updateStatus(cleanId, 'In Progress', `Master grievance #${cleanId}: field squad ${officerName} (${squadName}) dispatched on-site for remediation.`, undefined, { name: officerName }).catch((err) => {
      console.warn(`API updateStatus for dispatch failed for ${cleanId}:`, err);
    });

    // 2. Mark officer as BUSY (ON SITE)
    setSquads((prev) =>
      prev.map((sq) =>
        sq.name === officerName
          ? { ...sq, status: 'BUSY (ON SITE)', activeTicket: cleanId }
          : sq
      )
    );

    // 3. Start 60-second active job timer (1 minute countdown)
    const newJob = {
      remainingSeconds: 60,
      officerName,
      squad: squadName,
      relatedIssueIds
    };
    if (activeJobsRef.current) {
      activeJobsRef.current = {
        ...activeJobsRef.current,
        [cleanId]: newJob
      };
    }
    setActiveJobs((prev) => ({
      ...prev,
      [cleanId]: newJob
    }));

    // 4. Add dispatch note to timeline
    const dispatchNote = {
      text: isAutonomous
        ? `[Zero-Touch Auto-Dispatch] Autonomous AI engine approved & dispatched ${officerName} (${squadName}). Field squad deployed on-site for 60s remediation.`
        : `Approved AI assignment. Work order dispatched to ${officerName} (${squadName}). Field squad deployed on-site. Status marked BUSY for 1-minute remediation repair.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      author: isAutonomous ? 'Autonomous AI Engine' : 'Supervisor Office'
    };
    setTimelineNotes((prev) => ({
      ...prev,
      [cleanId]: [dispatchNote, ...(prev[cleanId] || [])]
    }));

    // 5. Add to AI Audit Log
    addAiLog({
      type: isAutonomous ? 'AUTONOMOUS_DISPATCH' : 'AI_ASSIGNMENT_APPROVED',
      level: 'DISPATCH',
      issueId: cleanId,
      issueTitle: issue.title,
      officer: officerName,
      dept: squadName,
      message: isAutonomous
        ? `[Zero-Touch Mode] AI autonomously selected & dispatched ${officerName} to #${cleanId}. 60s remediation countdown initiated.`
        : `Supervisor confirmed & approved AI assignment for #${cleanId}. Dispatched ${officerName} (${squadName}). 60s remediation countdown initiated.`
    });

    showToast(
      isAutonomous
        ? `[Zero-Touch] Auto-dispatched ${officerName} to #${cleanId} (60s timer started).`
        : `Approved AI assignment for issue #${cleanId}. Work order dispatched. ${officerName} is now BUSY on-site (60s countdown started).`
    );
  };

  // Autonomous Zero-Touch Dispatch Engine Tick (Evaluates availability and auto-dispatches)
  const executeAutoDispatchTick = () => {
    if (!autoDispatchModeRef.current) return;

    const currentIssues = issuesRef.current || [];
    const activeJobsSnapshot = activeJobsRef.current || {};
    const busyOfficers = new Set(
      Object.values(activeJobsSnapshot).map((j) => j.officerName)
    );

    // Eligible pending tickets
    const eligibleTickets = currentIssues.filter((iss) => {
      const cid = iss.id.replace('#', '');
      if (iss.status === 'Resolved' || iss.status === 'Dismissed' || iss.status === 'Rejected') return false;
      if (iss.status === 'In Progress' || activeJobsSnapshot[cid]) return false;
      if (checkIsUnverified(iss)) return false;
      return true;
    });

    if (eligibleTickets.length === 0) return;

    const newlyDispatched = {};
    for (const ticketGroup of groupIncidentReports(eligibleTickets)) {
      const ticket = ticketGroup;
      const des = resolveDesignatedWorker(ticket);
      let officer = ticket.assignedTo || des.name;
      let squad = ticket.squad || des.squad;

      if (busyOfficers.has(officer) && des.backup && !busyOfficers.has(des.backup.name)) {
        officer = des.backup.name;
        squad = des.backup.squad;
      }

      if (!busyOfficers.has(officer)) {
        busyOfficers.add(officer);
        const cid = ticket.id.replace('#', '');
        newlyDispatched[cid] = {
          remainingSeconds: 60,
          officerName: officer,
          squad: squad,
          ticketTitle: ticket.title,
          ticketId: cid,
          relatedIssueIds: [cid, ...ticketGroup.relatedReports.map((report) => report.id.replace('#', ''))]
        };
      }
    }

    const dispatchedKeys = Object.keys(newlyDispatched);
    if (dispatchedKeys.length === 0) return;

    // Synchronously update activeJobsRef
    if (activeJobsRef.current) {
      activeJobsRef.current = {
        ...activeJobsRef.current,
        ...newlyDispatched
      };
    }
    setActiveJobs((prev) => ({
      ...prev,
      ...newlyDispatched
    }));

    // Update issues and synchronously update issuesRef
    const updatedIssues = (issuesRef.current || currentIssues).map((iss) => {
      const cid = iss.id.replace('#', '');
      const info = Object.values(newlyDispatched).find((job) => job.relatedIssueIds.includes(cid));
      if (info) {
        return {
          ...iss,
          status: 'In Progress',
          assignedTo: info.officerName,
          squad: info.squad
        };
      }
      return iss;
    });
    issuesRef.current = updatedIssues;
    setIssues(updatedIssues);

    // Update squads
    setSquads((prevSquads) =>
      prevSquads.map((sq) => {
        const entry = Object.entries(newlyDispatched).find(([, j]) => j.officerName === sq.name);
        if (entry) {
          return { ...sq, status: 'BUSY (ON SITE)', activeTicket: entry[0] };
        }
        return sq;
      })
    );

    // Audit logs & backend
    dispatchedKeys.forEach((cid) => {
      const job = newlyDispatched[cid];
      addAiLog({
        type: 'AUTONOMOUS_DISPATCH',
        level: 'DISPATCH',
        issueId: cid,
        officer: job.officerName,
        dept: job.squad,
        message: `[Zero-Touch Auto-Dispatch] Autonomous AI engine matched and dispatched ${job.officerName} (${job.squad}) to #${cid} (${job.ticketTitle}). 60s on-site remediation started.`
      });

      complaintApi.updateStatus(cid, 'In Progress', `Master grievance #${cid}: [Municipal auto dispatch] field squad ${job.officerName} dispatched on-site.`, undefined, { name: job.officerName }).catch(() => {});
    });

    showToast(`[Zero-Touch AI] Autonomously dispatched ${dispatchedKeys.length} specialist(s). 60s remediation active.`);
  };

  const [selectedIssueId, setSelectedIssueId] = useState('CS1001');
  const [selectedRows, setSelectedRows] = useState(['CS1001']);
  const [activeEvidenceImg, setActiveEvidenceImg] = useState(null);
  const [hasLoadedLiveIssues, setHasLoadedLiveIssues] = useState(false);

  // Seva AI Contextual Assistant live authority context registration
  // Only send selected complaint if in triage or resolved_issues and user explicitly opened drawer
  const effectiveSelectedComplaintId = ((activeNav === 'triage' || activeNav === 'resolved_issues') && isDetailsDrawerOpen)
    ? selectedIssueId
    : null;

  useAssistantContext({
    pageName: 'AuthorityDashboard',
    activeTab: activeNav,
    activeSubTab: activeTab,
    selectedComplaintId: effectiveSelectedComplaintId
  });

  // Filter toolbar state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [deptFilter, setDeptFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modals state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // New Work Order form state
  const [newOrderTitle, setNewOrderTitle] = useState('');
  const [newOrderDept, setNewOrderDept] = useState('Road Department');
  const [newOrderPriority, setNewOrderPriority] = useState('High');
  const [newOrderLocation, setNewOrderLocation] = useState('Indore Urban Ward');
  const [newOrderDesc, setNewOrderDesc] = useState('');

  // Timeline note state
  const [timelineNotes, setTimelineNotes] = useState({});
  const [newTimelineNote, setNewTimelineNote] = useState('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);
  const [isAiScanning, setIsAiScanning] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync with searchParams
  useEffect(() => {
    const t = (searchParams.get('tab') || '').toUpperCase();
    if (t === 'DEPARTMENTS') setActiveNav('departments');
    else if (t === 'AI_REVIEW') setActiveNav('ai_review');
    else if (t === 'AUDIT_LOGS' || t === 'AUDIT' || t === 'LOGS') setActiveNav('audit_logs');
    else if (t === 'OFFICERS' || t === 'CREW') setActiveNav('crew');
    else if (t === 'MAP') setActiveNav('map');
    else if (t === 'CCTV') setActiveNav('cctv');
    else if (t === 'ANALYTICS' || t === 'REPORTS') setActiveNav('analytics');
    else if (t === 'USERS') setActiveNav('users');
    else if (t === 'SETTINGS') setActiveNav('settings');
    else if (t === 'RESOLVED' || t === 'RESOLVED_ISSUES') setActiveNav('resolved_issues');
    else setActiveNav('triage');

    const issueArg = searchParams.get('id') || searchParams.get('issue') || searchParams.get('complaint');
    if (issueArg) {
      const clean = issueArg.replace('#', '').trim();
      setSelectedIssueId(clean);
      setIsDetailsDrawerOpen(true);
      setSelectedRows([clean]);
      setActiveNav('triage');
      setDeptFilter('All');
      setPriorityFilter('All');
    }

    const searchArg = searchParams.get('search');
    if (searchArg) {
      const clean = searchArg.replace('#', '');
      setSearchQuery(clean);
      setSelectedIssueId(clean);
      setIsDetailsDrawerOpen(true);
      setSelectedRows([clean]);
      setCurrentPage(1);
      setActiveTab('All Issues');
      setDeptFilter('All');
      setPriorityFilter('All');
      setActiveNav('triage');
    }
  }, [searchParams]);

  // ============================================================
  // LIVE ISSUES SYNC FROM BACKEND DATABASE
  // Polls backend /api/complaints so newly submitted issues appear immediately
  // ============================================================
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAndSyncIssues = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const liveComplaints = await complaintApi.getComplaints();
      if (Array.isArray(liveComplaints) && liveComplaints.length > 0) {
        setHasLoadedLiveIssues(true);
        const mappedLiveIssues = liveComplaints.map(mapApiComplaintToIssue);

        // Sort descending so highest / newest ticket number appears at the top of Page 1
        mappedLiveIssues.sort((a, b) => {
          const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
          return numB - numA;
        });

        setIssues((prev) => {
          const prevIds = new Set(prev.map((p) => p.id.replace('#', '')));
          const newlyDiscovered = mappedLiveIssues.filter((m) => !prevIds.has(m.id.replace('#', '')));
          if (newlyDiscovered.length > 0 && !manual) {
            showToast(`New Citizen Report: #${newlyDiscovered[0].id} (${newlyDiscovered[0].title}) received in queue.`);
          }

          return mappedLiveIssues;
        });

        if (manual) showToast(`Synced ${liveComplaints.length} live issues from municipal database.`);
      }
    } catch (err) {
      console.warn('Could not sync live complaints from backend', err);
    } finally {
      if (manual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAndSyncIssues();
    const interval = setInterval(() => {
      fetchAndSyncIssues();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // 1-MINUTE REMEDIATION COUNTDOWN ENGINE (60 Seconds Work Simulation)
  // When an issue AI assignment is approved:
  // - Officer is marked BUSY on-site
  // - After 1 minute (60s), status automatically becomes RESOLVED
  // - Officer is marked back to AVAILABLE
  // - Any queued ticket waiting for this worker is auto-assigned/dispatched!
  // ============================================================
  const handleJobFinished = (finishedCleanId, officerName, squadName, relatedIssueIds = null) => {
    const resolvedIssueIds = relatedIssueIds?.length
      ? relatedIssueIds
      : incidentReportIds(issuesRef.current || issues, finishedCleanId);
    // Synchronously remove from activeJobsRef
    if (activeJobsRef.current) {
      const nextRef = { ...activeJobsRef.current };
      delete nextRef[finishedCleanId];
      activeJobsRef.current = nextRef;
    }

    // 0. Resolve media proof
    let matchedIssue = issues.find((iss) => iss.id.replace('#', '') === finishedCleanId);
    const beforeImg = matchedIssue ? resolveBeforeImage(matchedIssue) : '/sample_evidence/pothole.jpg';
    const proof = matchedIssue ? resolveProofMedia(matchedIssue) : resolveProofMedia({ title: 'Pothole' });

    // 1. Mark finished issue as Resolved with proof media
    setIssues((prevIssues) =>
      prevIssues.map((iss) =>
        resolvedIssueIds.includes(iss.id.replace('#', ''))
          ? { 
              ...iss, 
              status: 'Resolved',
              resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              proofMedia: {
                beforeImage: beforeImg,
                afterImage: proof.afterImage,
                videoProof: proof.videoProof,
                verificationScore: proof.verificationScore,
                repairSummary: proof.repairSummary,
                completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                officer: officerName,
                squad: squadName
              }
            }
          : iss
      )
    );

    // 2. Mark officer back to AVAILABLE
    setSquads((prevSquads) =>
      prevSquads.map((sq) =>
        sq.name === officerName
          ? { ...sq, status: 'AVAILABLE', activeTicket: null }
          : sq
      )
    );

    // Persist completion status to backend database
    complaintApi.updateStatus(
      finishedCleanId,
      'Resolved',
      `Incident #${finishedCleanId}: remediation completed and verified on-site by ${officerName} (${squadName || 'Field Squad'}). Photographic & video proof logged.`
    ).catch((err) => {
      console.warn(`API updateStatus for master grievance ${finishedCleanId} failed, keeping local state:`, err);
    });

    // 3. Add timeline resolution entry with media proof reference
    const completionNote = {
      text: `Remediation completed and verified on-site by ${officerName} (${squadName || 'Field Squad'}). Infrastructure defect repaired and verified safe. On-site after photo and inspection video proof uploaded.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      author: officerName
    };
    setTimelineNotes((prevNotes) => ({
      ...prevNotes,
      [finishedCleanId]: [completionNote, ...(prevNotes[finishedCleanId] || [])]
    }));

    // 4. AI Audit Log for completion with media proof
    addAiLog({
      type: 'REMEDIATION_COMPLETE',
      level: 'SUCCESS',
      issueId: finishedCleanId,
      issueTitle: matchedIssue?.title || 'Civic Infrastructure Defect',
      officer: officerName,
      dept: squadName,
      message: `On-site repair completed by ${officerName} for #${finishedCleanId}. Defect resolved. Officer status changed to AVAILABLE. Worker posted completion photo and video proof.`,
      beforeImage: beforeImg,
      afterImage: proof.afterImage,
      videoProof: proof.videoProof,
      verificationScore: proof.verificationScore,
      repairSummary: proof.repairSummary,
      location: matchedIssue?.location || 'MG Road, Ward 12',
      coordinates: matchedIssue?.coordinates || '22.7196° N, 75.8577° E',
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    showToast(`Work Complete: Issue #${finishedCleanId} marked as RESOLVED. Officer ${officerName} posted completion photo and video proof.`);

    // 5. Run auto-dispatch tick or notify supervisor that officer is free
    setTimeout(() => {
      if (autoDispatchModeRef.current) {
        executeAutoDispatchTick();
      } else {
        const waitingIssue = (issuesRef.current || issues).find((iss) => {
          const cid = iss.id.replace('#', '');
          if (cid === finishedCleanId) return false;
          if (iss.status === 'Resolved' || iss.status === 'In Progress' || iss.status === 'Dismissed' || iss.status === 'Rejected') return false;
          return iss.assignedTo === officerName;
        });

        if (waitingIssue) {
          const waitCleanId = waitingIssue.id.replace('#', '');
          addAiLog({
            type: 'WORKER_FREED',
            level: 'INFO',
            issueId: waitCleanId,
            officer: officerName,
            dept: squadName,
            message: `Specialist ${officerName} is now FREE. Ticket #${waitCleanId} is next in task queue and ready for supervisor 1-click Approval or Edit.`
          });
          showToast(`Officer ${officerName} is now FREE. Issue #${waitCleanId} is ready for supervisor 1-click Approval or Edit.`);
        }
      }
    }, 250);
  };

  useEffect(() => {
    const jobKeys = Object.keys(activeJobs);
    if (jobKeys.length === 0) return;

    const timer = setInterval(() => {
      setActiveJobs((prev) => {
        const next = { ...prev };

        jobKeys.forEach((key) => {
          const item = next[key];
          if (!item) return;

          if (item.remainingSeconds <= 1) {
            delete next[key];
            handleJobFinished(key, item.officerName, item.squad, item.relatedIssueIds);
          } else {
            next[key] = { ...item, remainingSeconds: item.remainingSeconds - 1 };
          }
        });

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeJobs]);

  // Fast forward / Mark done immediately (skip 60s wait)
  const handleFastForwardJob = (issueId) => {
    const cleanId = issueId.replace('#', '');
    const job = activeJobs[cleanId];
    if (!job) return;

    setActiveJobs((prev) => {
      const next = { ...prev };
      delete next[cleanId];
      return next;
    });

    handleJobFinished(cleanId, job.officerName, job.squad, job.relatedIssueIds);
  };

  // Autonomous Mode Handler - Supports direct selection or toggle
  const handleSelectDispatchMode = (targetIsAuto) => {
    if (autoDispatchMode === targetIsAuto) return;

    if (targetIsAuto) {
      setAutoDispatchMode(true);
      autoDispatchModeRef.current = true;
      addAiLog({
        type: 'AUTONOMOUS_DISPATCH',
        level: 'DISPATCH',
        issueId: 'SYSTEM',
        officer: 'AI Engine',
        message: 'Autonomous Zero-Touch AI Dispatch turned ON. Field workers will be automatically selected, approved, and dispatched without human delay.'
      });
      showToast('Autonomous AI Dispatch (Zero-Touch) ENABLED. Available specialists will be dispatched.');

      // Immediately run auto-dispatch tick
      setTimeout(() => {
        executeAutoDispatchTick();
      }, 100);
    } else {
      setAutoDispatchMode(false);
      autoDispatchModeRef.current = false;
      addAiLog({
        type: 'AI_MATCH_EVAL',
        level: 'INFO',
        issueId: 'SYSTEM',
        officer: 'Human Director',
        message: 'Manual Review Supervision mode enabled. Official supervisor must click Approve or Edit for each assignment.'
      });
      showToast('Manual Review Mode enabled. Supervisor 1-click Approval or Edit required.');
    }
  };

  const handleToggleAutoDispatch = () => {
    handleSelectDispatchMode(!autoDispatchMode);
  };

  // Continuous Auto-Dispatch Runner when Zero-Touch mode is active
  useEffect(() => {
    if (!autoDispatchMode) return;
    executeAutoDispatchTick();
    const interval = setInterval(() => {
      executeAutoDispatchTick();
    }, 2500);
    return () => clearInterval(interval);
  }, [autoDispatchMode]);

  // Municipal Supervisor Evidence Authenticity Decision Gateway
  const handleAuthenticityDecision = async (issueId, decision) => {
    const cleanId = issueId.replace('#', '');
    const relatedIssueIds = incidentReportIds(issuesRef.current || issues, cleanId);
    try {
      // Immediately close the Issue Details drawer when dismissed
      if (decision === 'REJECT') {
        setIsDetailsDrawerOpen(false);
      }

      let res = null;
      try {
        res = await complaintApi.submitAuthenticityDecision(cleanId, decision, `Supervisor manual evidence verification for master grievance #${cleanId}`);
      } catch (apiErr) {
        console.warn('API submitAuthenticityDecision failed, proceeding with state update:', apiErr);
      }

      setIssues((prev) =>
        prev.map((iss) => {
          if (!relatedIssueIds.includes(iss.id.replace('#', ''))) return iss;
          if (decision === 'APPROVE') {
            return {
              ...iss,
              status: res?.status || (iss.status === 'Review Required' || iss.status === 'Under Review' ? 'Submitted' : iss.status),
              requiresHumanReview: false,
              isUnverified: false,
              authenticityVerdict: 'APPROVED_BY_SUPERVISOR',
              authenticityScore: 98,
              authenticityRisk: 'LOW',
              authenticityFlags: [],
              assignedTo: res?.assigned_officer_name || iss.assignedTo
            };
          } else {
            return {
              ...iss,
              status: 'Dismissed',
              requiresHumanReview: false,
              isUnverified: false,
              authenticityVerdict: 'REJECTED_FAKE',
              authenticityRisk: 'DISMISSED'
            };
          }
        })
      );

      // If dismissed, advance selectedIssueId if current issue was dismissed
      if (decision === 'REJECT') {
        const remaining = filteredIssues.filter((i) => !relatedIssueIds.includes(i.id.replace('#', '')));
        if (remaining.length > 0) {
          setSelectedIssueId(remaining[0].id.replace('#', ''));
        }
      }

      addAiLog({
        type: decision === 'APPROVE' ? 'OFFICIAL_APPROVAL' : 'SUPERVISOR_EVIDENCE_REJECTION',
        level: decision === 'APPROVE' ? 'SUCCESS' : 'WARNING',
        issueId: cleanId,
        officer: 'Municipal Supervisor',
        message: decision === 'APPROVE' 
          ? `Evidence verified and marked REAL by Municipal Supervisor. Docket #${cleanId} cleared for squad deployment.`
          : `Docket #${cleanId} dismissed and rejected: Evidence identified as fraudulent or synthetic media. Citizen notified.`
      });

      showToast(
        decision === 'APPROVE'
          ? `Incident #${cleanId} verified across ${relatedIssueIds.length} related report(s).`
          : `Incident #${cleanId} dismissed across ${relatedIssueIds.length} related report(s).`
      );
    } catch (err) {
      showToast(`Action failed: ${err.message || 'Could not record supervisor decision'}`);
    }
  };

  const handleMarkReal = (issueId) => handleAuthenticityDecision(issueId, 'APPROVE');
  const handleDismiss = (issueId) => handleAuthenticityDecision(issueId, 'REJECT');

  // Currently selected issue
  const currentIssue = issues.find((i) => i.id === selectedIssueId || i.id === `#${selectedIssueId}`) || issues[0];
  const currentCleanId = currentIssue ? currentIssue.id.replace('#', '') : '';
  const activeJobForCurrent = activeJobs[currentCleanId];
  const drawerWorkerStatus = currentIssue ? getWorkerStatusForIssue(currentIssue) : null;

  // Reset active evidence thumbnail when current issue changes
  useEffect(() => {
    if (currentIssue) {
      setActiveEvidenceImg(currentIssue.image);
    }
  }, [selectedIssueId]);

  // Filtered issues
  const filteredIssues = issues.filter((item) => {
    // Fake / Dismissed / Rejected issues NEVER appear in operational Triage (only in Audit Logs)
    if (item.status === 'Dismissed' || item.status === 'Rejected' || item.authenticityVerdict === 'REJECTED_FAKE') {
      return false;
    }

    // Resolved issues ONLY appear in the dedicated 'Resolved Issues' tab or view
    if (item.status === 'Resolved' && activeTab !== 'Resolved' && activeTab !== 'Resolved Issues') {
      return false;
    }

    // 1. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 2. Department Dropdown Filter
    if (deptFilter !== 'All' && !item.department.toLowerCase().includes(deptFilter.toLowerCase())) {
      return false;
    }

    // 3. Priority Dropdown Filter
    if (priorityFilter !== 'All' && item.priority.toLowerCase() !== priorityFilter.toLowerCase()) {
      return false;
    }

    // 4. Status Tabs
    if (activeTab === 'All Issues') return true;
    if (activeTab === 'Unverified Detected' || activeTab === 'Review Required') return checkIsUnverified(item);
    if (activeTab === 'Needs Assignment') return (!item.assignedTo || item.status === 'Submitted') && !checkIsUnverified(item);
    if (activeTab === 'High Priority') return item.priority === 'High';
    if (activeTab === 'In Progress') return item.status === 'In Progress';
    if (activeTab === 'Escalated') return item.status === 'Escalated';
    if (activeTab === 'Resolved' || activeTab === 'Resolved Issues') return item.status === 'Resolved';
    return true;
  });

  // Triage shows one parent row per shared incident, with related reports nested underneath.
  const triageGroups = groupIncidentReports(filteredIssues);
  const totalPages = Math.ceil(triageGroups.length / pageSize) || 1;
  const paginatedIssues = triageGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Row selection
  const handleSelectRow = (id) => {
    const cleanId = id.replace('#', '');
    setSelectedIssueId(cleanId);
    setIsDetailsDrawerOpen(true);
    if (selectedRows.includes(cleanId)) {
      setSelectedRows(selectedRows.filter((r) => r !== cleanId));
    } else {
      setSelectedRows([...selectedRows, cleanId]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(triageGroups.map((i) => i.id.replace('#', '')));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowClick = (issue) => {
    const cleanId = issue.id.replace('#', '');
    setSelectedIssueId(cleanId);
    setIsDetailsDrawerOpen(true);
  };

  // Status updates
  const handleUpdateStatus = (newStatus) => {
    if (!currentIssue) return;
    const cleanId = currentIssue.id.replace('#', '');
    const relatedIssueIds = incidentReportIds(issuesRef.current || issues, cleanId);

    // 1. Optimistic local state update
    setIssues((prev) =>
      prev.map((i) => {
        if (relatedIssueIds.includes(i.id.replace('#', ''))) {
          const proof = resolveProofMedia(i);
          return {
            ...i,
            status: newStatus,
            ...(newStatus === 'Resolved' && !i.proofMedia ? {
              resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              proofMedia: {
                beforeImage: resolveBeforeImage(i),
                afterImage: proof.afterImage,
                videoProof: proof.videoProof,
                verificationScore: proof.verificationScore,
                repairSummary: proof.repairSummary,
                completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                officer: i.assignedTo || 'Municipal Duty Squad',
                squad: i.squad || 'Field Squad A'
              }
            } : {})
          };
        }
        return i;
      })
    );
    setIsUpdateModalOpen(false);

    // 2. Clear any active countdown timer if resolving
    if (newStatus === 'Resolved') {
      const completedJobIds = Object.keys(activeJobsRef.current || {}).filter((id) => relatedIssueIds.includes(id));
      if (completedJobIds.length > 0) {
        const nextRef = { ...activeJobsRef.current };
        completedJobIds.forEach((id) => delete nextRef[id]);
        activeJobsRef.current = nextRef;
        setActiveJobs((prev) => {
          const next = { ...prev };
          completedJobIds.forEach((id) => delete next[id]);
          return next;
        });
      }
    }

    // 3. Persist to backend database so polling & citizen portal see new status
    complaintApi.updateStatus(cleanId, newStatus, `Master grievance #${cleanId}: status transitioned to "${newStatus}" by Municipal Authority`).catch((err) => {
      console.warn(`API updateStatus failed for master grievance ${cleanId}, keeping local override:`, err);
    });

    if (newStatus === 'Resolved') {
      showToast(`Incident #${cleanId} resolved across ${relatedIssueIds.length} related report(s).`);
    } else {
      showToast(`Complaint #${cleanId} status updated to "${newStatus}".`);
    }
  };

  // Squad assignment
  const handleAssignSquad = (squadObj) => {
    if (!currentIssue) return;
    const cleanId = currentIssue.id.replace('#', '');
    const relatedIssueIds = incidentReportIds(issuesRef.current || issues, cleanId);
    setIssues((prev) =>
      prev.map((i) =>
        relatedIssueIds.includes(i.id.replace('#', ''))
          ? { ...i, assignedTo: squadObj.name, squad: squadObj.squad, status: 'Assigned' }
          : i
      )
    );
    setIsAssignModalOpen(false);

    // Persist to backend database
    complaintApi.updateStatus(cleanId, 'Assigned', `Master grievance #${cleanId}: assigned to ${squadObj.name} (${squadObj.squad})`, undefined, { name: squadObj.name }).catch((err) => {
      console.warn('API updateStatus for assign squad failed:', err);
    });
    addAiLog({
      type: 'REASSIGNMENT',
      level: 'INFO',
      issueId: cleanId,
      officer: squadObj.name,
      dept: squadObj.dept,
      message: `Official decision: assigned ${squadObj.name} (${squadObj.squad}) to incident #${cleanId} and its ${relatedIssueIds.length} report(s). Status set to Assigned.`
    });
    showToast(`Assigned ${squadObj.name} (${squadObj.squad}) to incident #${cleanId} across ${relatedIssueIds.length} report(s).`);
  };

  // Bulk actions
  const handleBulkStatusChange = (status) => {
    if (selectedRows.length === 0) return;
    const relatedIssueIds = [...new Set(selectedRows.flatMap((id) => incidentReportIds(issuesRef.current || issues, id)))];
    setIssues((prev) =>
      prev.map((i) => {
        if (relatedIssueIds.includes(i.id.replace('#', ''))) {
          const proof = resolveProofMedia(i);
          return {
            ...i,
            status,
            ...(status === 'Resolved' && !i.proofMedia ? {
              resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              proofMedia: {
                beforeImage: resolveBeforeImage(i),
                afterImage: proof.afterImage,
                videoProof: proof.videoProof,
                verificationScore: proof.verificationScore,
                repairSummary: proof.repairSummary,
                completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                officer: i.assignedTo || 'Municipal Duty Squad',
                squad: i.squad || 'Field Squad A'
              }
            } : {})
          };
        }
        return i;
      })
    );
    selectedRows.forEach((cleanId) => {
      complaintApi.updateStatus(cleanId, status, `Incident action: status transitioned to "${status}" by Municipal Authority`).catch((err) => {
        console.warn('API updateStatus failed:', err);
      });
    });
    if (status === 'Resolved') {
      showToast(`Updated ${selectedRows.length} selected tickets to "Resolved" and moved to Resolved Issues.`);
    } else {
      showToast(`Updated ${selectedRows.length} selected tickets to "${status}".`);
    }
    setSelectedRows([]);
  };

  // Re-run AI Analysis
  const handleRerunAiScan = () => {
    setIsAiScanning(true);
    setTimeout(() => {
      setIsAiScanning(false);
      showToast(`AI Computer Vision re-verification complete (96% Confidence). Verified by YOLOv8.`);
    }, 700);
  };

  // Add timeline note
  const handleAddTimelineNote = (e) => {
    e.preventDefault();
    if (!newTimelineNote.trim() || !currentIssue) return;
    const cleanId = currentIssue.id.replace('#', '');
    const currentNotes = timelineNotes[cleanId] || [];
    const newEntry = {
      text: newTimelineNote.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      author: 'Operations Officer'
    };
    setTimelineNotes({ ...timelineNotes, [cleanId]: [newEntry, ...currentNotes] });
    setNewTimelineNote('');
    showToast('Inspection audit note posted to timeline.');
  };

  // Copy GPS Coordinates
  const handleCopyCoords = () => {
    navigator.clipboard?.writeText('22.7196, 75.8577');
    showToast('GPS Coordinates (22.7196° N, 75.8577° E) copied to clipboard.');
  };

  // Create Work Order
  const handleCreateWorkOrder = (e) => {
    e.preventDefault();
    const newId = `CS10${Math.floor(100 + Math.random() * 900)}`;
    const newEntry = {
      id: newId,
      title: newOrderTitle || 'Pothole Remediation Directive',
      location: newOrderLocation || 'Indore Urban Ward',
      priority: newOrderPriority,
      department: newOrderDept,
      departmentId: 'ROAD_DEPT',
      status: 'Assigned',
      assignedTo: 'Er. Rajesh Patil',
      squad: 'Field Squad A',
      createdOnDate: '26 Sep 2026',
      createdOnTime: '07:45 PM',
      reportedBy: 'Operations Officer',
      description: newOrderDesc || 'Direct supervisory work order issued from municipal command center.',
      image: '/sample_evidence/pothole.jpg',
      evidenceGallery: ['/sample_evidence/pothole.jpg'],
      extraEvidenceCount: 0,
      aiDistanceKm: 1.0,
      aiConfidence: '95%',
      aiReasoning: 'Manual supervisor ticket committed with automatic department routing.'
    };

    setIssues([newEntry, ...issues]);
    setSelectedIssueId(newEntry.id);
    setIsNewOrderModalOpen(false);
    setNewOrderTitle('');
    setNewOrderDesc('');
    setActiveNav('triage');
    showToast(`Work Order #${newId} committed and dispatched to ${newOrderDept}.`);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setDeptFilter('All');
    setPriorityFilter('All');
    setActiveTab('All Issues');
    setCurrentPage(1);
    setSearchParams({});
    showToast('Filters reset to default view.');
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-md shadow-xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. LEFT SIDEBAR */}
      {/* ============================================================ */}
      <aside className="w-full lg:w-60 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex-shrink-0 flex flex-col justify-between py-4 px-3 select-none">
        <div className="space-y-4 lg:space-y-6">
          {/* Operations Nav Group */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 block">
              Operations
            </span>

            {/* Triage & Dispatch */}
            <button
              type="button"
              onClick={() => { setActiveNav('triage'); setActiveTab('All Issues'); setSearchParams({}); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'triage' && activeTab !== 'Resolved Issues'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className={`w-4 h-4 ${activeNav === 'triage' && activeTab !== 'Resolved Issues' ? 'text-blue-800' : 'text-slate-400'}`} />
                <span>Triage &amp; Dispatch</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {issues.filter((i) => i.status !== 'Resolved' && i.status !== 'Dismissed' && i.status !== 'Rejected').length}
              </span>
            </button>

            {/* Resolved Issues Section */}
            <button
              type="button"
              onClick={() => {
                setActiveNav('resolved_issues');
                setSearchParams({ tab: 'RESOLVED_ISSUES' });
                setActiveTab('Resolved Issues');
                setCurrentPage(1);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'resolved_issues' || (activeNav === 'triage' && activeTab === 'Resolved Issues')
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`w-4 h-4 ${activeNav === 'resolved_issues' || (activeNav === 'triage' && activeTab === 'Resolved Issues') ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>Resolved Issues</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {issues.filter((i) => i.status === 'Resolved').length}
              </span>
            </button>


            {/* Field Crew */}
            <button
              type="button"
              onClick={() => { setActiveNav('crew'); setSearchParams({ tab: 'CREW' }); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'crew'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 ${activeNav === 'crew' ? 'text-blue-800' : 'text-slate-400'}`} />
                <span>Field Crew</span>
              </div>
              {Object.keys(activeJobs).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {Object.keys(activeJobs).length} Busy
                </span>
              )}
            </button>

            {/* Departments */}
            <button
              type="button"
              onClick={() => { setActiveNav('departments'); setSearchParams({ tab: 'DEPARTMENTS' }); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'departments'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Building2 className={`w-4 h-4 ${activeNav === 'departments' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>Departments</span>
            </button>

            {/* Operations Map */}
            <button
              type="button"
              onClick={() => { setActiveNav('map'); setSearchParams({ tab: 'MAP' }); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'map'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Map className={`w-4 h-4 ${activeNav === 'map' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>Operations Map</span>
            </button>

            {/* Reports */}
            <button
              type="button"
              onClick={() => { setActiveNav('analytics'); setSearchParams({ tab: 'REPORTS' }); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'analytics'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${activeNav === 'analytics' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>Reports</span>
            </button>
          </div>

          {/* Monitoring Group */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 block">
              Monitoring
            </span>

            {/* CCTV & AI Vision */}
            <button
              type="button"
              onClick={() => { setActiveNav('cctv'); setSearchParams({ tab: 'CCTV' }); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'cctv'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Camera className={`w-4 h-4 ${activeNav === 'cctv' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>CCTV & AI Vision</span>
            </button>

            {/* AI Dispatch Review */}
            <button
              type="button"
              onClick={() => { setActiveNav('ai_review'); setSearchParams({ tab: 'AI_REVIEW' }); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'ai_review'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Cpu className={`w-4 h-4 ${activeNav === 'ai_review' ? 'text-blue-800' : 'text-slate-400'}`} />
                <span>AI Dispatch Review</span>
              </div>
              {Object.keys(activeJobs).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>

            {/* AI Audit & Activity Logs */}
            <button
              type="button"
              onClick={() => { setActiveNav('audit_logs'); setSearchParams({ tab: 'AUDIT_LOGS' }); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'audit_logs'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className={`w-4 h-4 ${activeNav === 'audit_logs' ? 'text-blue-800' : 'text-slate-400'}`} />
                <span>AI Audit & Activity Logs</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {aiAuditLogs.length}
              </span>
            </button>
          </div>

          {/* Administration Group */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 block">
              Administration
            </span>

            <button
              type="button"
              onClick={() => { setActiveNav('users'); setSearchParams({ tab: 'USERS' }); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'users'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <UserCog className={`w-4 h-4 ${activeNav === 'users' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>Users & Roles</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveNav('settings'); setSearchParams({ tab: 'SETTINGS' }); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'settings'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Settings className={`w-4 h-4 ${activeNav === 'settings' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-100 px-2 space-y-0.5 hidden lg:block">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
            <CivicLogo className="w-4 h-4 text-blue-800" textClassName="text-xs font-semibold text-slate-800" />
            <span className="text-[11px] text-slate-700">Kolhapur Municipal Corporation</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Seva AI v1.0.0</p>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. CENTER CONTENT */}
      {/* ============================================================ */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-5 overflow-y-auto">
        {/* VIEW A: TRIAGE & DISPATCH */}
        {activeNav === 'triage' && (
          <div className="space-y-5">
            {/* Breadcrumb */}
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Operations</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">Triage & Dispatch</span>
            </div>

            {/* Header Row */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Triage & Dispatch
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Review incoming civic issues, assign field crews, and track resolution progress.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-xs text-xs whitespace-nowrap shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-medium whitespace-nowrap">Friday, 26 Sep 2026 &bull; 07:50 PM</span>
                </div>

                {!isDetailsDrawerOpen && (
                  <button
                    type="button"
                    onClick={() => setIsDetailsDrawerOpen(true)}
                    className="px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    title="Open details drawer"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span className="whitespace-nowrap">Show Details ({currentIssue ? (currentIssue.id.startsWith('#') ? currentIssue.id : `#${currentIssue.id}`) : 'Drawer'})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      showToast('Running proactive AI watchdog sweep across all municipal dockets...');
                      const sweep = await complaintApi.runWatchdogSweep();
                      showToast(`Watchdog sweep complete: ${sweep.stalled_count} stalled, ${sweep.sla_risk_count} SLA risks detected.`);
                      fetchAndSyncIssues(true);
                    } catch (e) {
                      showToast('Watchdog sweep error: ' + e.message);
                    }
                  }}
                  className="px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  title="Scan all active tickets for stalls and SLA risks"
                >
                  <Activity className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="whitespace-nowrap">AI Watchdog Sweep</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(true)}
                  className="px-3.5 py-2 rounded-md bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs shadow-xs transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">New Work Order</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs & Filter Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pt-1">
              <div className="flex items-center space-x-3 sm:space-x-5 text-xs overflow-x-auto pb-1">
                {['All Issues', 'Unverified Detected', 'Needs Assignment', 'High Priority', 'In Progress', 'Escalated', 'Resolved Issues'].map((tab) => {
                  const unverifiedCount = issues.filter((i) => checkIsUnverified(i) && i.status !== 'Dismissed' && i.status !== 'Rejected' && i.status !== 'Resolved').length;
                  const activeIssuesCount = issues.filter((i) => i.status !== 'Resolved' && i.status !== 'Dismissed' && i.status !== 'Rejected').length;
                  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                      className={`pb-2.5 font-medium transition border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                        activeTab === tab
                          ? 'border-blue-800 text-blue-900 font-semibold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>{tab}</span>
                      {tab === 'All Issues' && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {activeIssuesCount}
                        </span>
                      )}
                      {tab === 'Unverified Detected' && unverifiedCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          {unverifiedCount}
                        </span>
                      )}
                      {tab === 'Resolved Issues' && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {resolvedCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {(searchQuery || deptFilter !== 'All' || priorityFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-xs text-rose-700 hover:underline flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className={`px-3 py-1.5 rounded border text-xs font-medium flex items-center gap-1.5 shadow-xs transition ${
                    isFilterPanelOpen || deptFilter !== 'All' || priorityFilter !== 'All'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>Filters {deptFilter !== 'All' || priorityFilter !== 'All' ? '(Active)' : ''}</span>
                </button>
              </div>
            </div>

            {/* Search and Advanced Filters Bar */}
            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search by ID (e.g. CS1039), keyword, road, or department..."
                    className="w-full text-xs pl-9 pr-8 py-2 rounded border border-slate-300 focus:ring-1 focus:ring-blue-800 text-slate-900"
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

                <select
                  value={deptFilter}
                  onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                  className="p-2 border border-slate-300 rounded bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-800"
                >
                  <option value="All">All Departments</option>
                  <option value="Road">Road Department</option>
                  <option value="Sanitation">Sanitation Department</option>
                  <option value="Electricity">Electricity Department</option>
                  <option value="Water">Water Supply Department</option>
                  <option value="Drainage">Drainage Board</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                  className="p-2 border border-slate-300 rounded bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-800"
                >
                  <option value="All">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>

                <button
                  type="button"
                  onClick={() => fetchAndSyncIssues(true)}
                  disabled={isRefreshing}
                  className="px-3 py-2 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                  title="Sync latest live complaints from Municipal Database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-800 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleAutoDispatch}
                  className={`px-3 py-2 border rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition ${
                    autoDispatchMode
                      ? 'bg-emerald-700 border-emerald-600 text-white hover:bg-emerald-800'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Toggle Autonomous Zero-Touch AI Dispatch Engine"
                >
                  <Cpu className={`w-3.5 h-3.5 ${autoDispatchMode ? 'animate-pulse text-emerald-200' : 'text-slate-500'}`} />
                  <span>AI Zero-Touch: <strong>{autoDispatchMode ? 'ON' : 'OFF'}</strong></span>
                </button>
              </div>

              {/* Bulk Actions Bar if any row is checked */}
              {selectedRows.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold">
                    <CheckSquare className="w-4 h-4 text-blue-800" />
                    <span>{selectedRows.length} tickets selected</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange('In Progress')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded font-medium text-xs transition whitespace-nowrap shrink-0"
                    >
                      Mark In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange('Resolved')}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium text-xs transition whitespace-nowrap shrink-0"
                    >
                      Mark Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(true)}
                      className="px-2.5 py-1 bg-blue-800 hover:bg-blue-900 text-white rounded font-medium text-xs transition whitespace-nowrap shrink-0"
                    >
                      Assign Squad
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRows([])}
                      className="text-slate-500 hover:underline px-1 text-xs whitespace-nowrap shrink-0"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Issues Table */}
            <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 select-none">
                    <tr>
                      <th className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={selectedRows.length === triageGroups.length && triageGroups.length > 0}
                          className="rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                        />
                      </th>
                      <th className="px-3 py-3 whitespace-nowrap">ID</th>
                      <th className="px-4 py-3 whitespace-nowrap">Issue & Location</th>
                      <th className="px-3 py-3 whitespace-nowrap">Priority</th>
                      <th className="px-3 py-3 whitespace-nowrap">Department</th>
                      <th className="px-3 py-3 whitespace-nowrap">Status</th>
                      <th className="px-3 py-3 whitespace-nowrap">Assigned To</th>
                      <th className="px-3 py-3 whitespace-nowrap">Created On</th>
                      <th className="px-2 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                    {paginatedIssues.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No issues matched your active filters. Click <button onClick={handleClearFilters} className="text-blue-800 underline font-semibold">Reset Filters</button> to view all tickets.
                        </td>
                      </tr>
                    ) : (
                      paginatedIssues.map((issue) => {
                        const cleanId = issue.id.replace('#', '');
                        const isSelected = selectedIssueId === cleanId;
                        const job = activeJobs[cleanId];
                        const workerStatus = getWorkerStatusForIssue(issue);
                        const isUnverified = checkIsUnverified(issue);

                        return (
                          <tr
                            key={issue.id}
                            onClick={() => handleRowClick(issue)}
                            className={`cursor-pointer transition ${
                              isUnverified
                                ? 'bg-rose-50/30 border-y-2 border-rose-500 ring-1 ring-rose-400'
                                : isSelected
                                ? 'bg-blue-50/60 font-medium'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className={`px-4 py-3 ${isUnverified ? 'border-l-4 border-rose-600' : ''}`} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(cleanId)}
                                onChange={() => handleSelectRow(cleanId)}
                                className="rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                              />
                            </td>

                            <td className="px-3 py-3 font-mono font-semibold text-blue-800 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={isUnverified ? 'text-rose-900 font-bold' : ''}>
                                  {issue.clusterId ? issue.masterGrievanceId : (issue.id.startsWith('#') ? issue.id : `#${issue.id}`)}
                                </span>
                                {issue.isLiveReport && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-300 whitespace-nowrap">
                                    LIVE
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={issue.image}
                                  alt={issue.title}
                                  className={`w-10 h-10 rounded object-cover border flex-shrink-0 ${
                                    isUnverified ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200'
                                  }`}
                                />
                                <div>
                                  <span className="font-bold text-slate-900 block leading-snug uppercase text-xs">
                                    {issue.title}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block line-clamp-1">
                                    {issue.location}
                                  </span>
                                  {issue.showReportCount && issue.reporterCount > 1 && (
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                                        <Users className="h-3 w-3" aria-hidden="true" />
                                        {issue.reporterCount} people reported this issue
                                      </span>
                                      <details className="text-[10px] text-slate-500" onClick={(event) => event.stopPropagation()}>
                                        <summary className="cursor-pointer select-none hover:text-blue-700">Related report IDs</summary>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {issue.relatedReports.map((report) => (
                                            <button
                                              key={report.id}
                                              type="button"
                                              onClick={(event) => { event.stopPropagation(); handleRowClick(report); }}
                                              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-blue-700 hover:bg-blue-50"
                                            >
                                              #{report.id}
                                            </button>
                                          ))}
                                        </div>
                                      </details>
                                    </div>
                                  )}
                                  {isUnverified && (
                                    <div className="mt-1.5 flex items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 shadow-2xs whitespace-nowrap">
                                        <ShieldAlert className="w-3 h-3 text-rose-700" />
                                        <span>Unverified Evidence Flagged &bull; Open Details to Review</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3 whitespace-nowrap">
                              {issue.priority === 'High' ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                                  High
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                  Medium
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-3 text-slate-700 font-medium whitespace-nowrap">
                              {issue.department}
                            </td>

                            <td className="px-3 py-3 whitespace-nowrap">
                              {job ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5 shadow-xs animate-pulse whitespace-nowrap">
                                  <Clock className="w-3 h-3 text-amber-700 animate-spin shrink-0" />
                                  <span className="whitespace-nowrap">Busy ({job.remainingSeconds}s)</span>
                                </span>
                              ) : (
                                <>
                                  {isUnverified && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1 whitespace-nowrap">
                                      <ShieldAlert className="w-3 h-3 text-rose-700 shrink-0" />
                                      <span className="whitespace-nowrap">Unverified</span>
                                    </span>
                                  )}
                                  {issue.status === 'Assigned' && !isUnverified && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 inline-block whitespace-nowrap">
                                      Assigned
                                    </span>
                                  )}
                                  {issue.status === 'In Progress' && !isUnverified && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 inline-block whitespace-nowrap">
                                      In Progress
                                    </span>
                                  )}
                                  {issue.status === 'Submitted' && !isUnverified && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 inline-block whitespace-nowrap">
                                      Submitted
                                    </span>
                                  )}
                                  {issue.status === 'Escalated' && !isUnverified && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 inline-block whitespace-nowrap">
                                      Escalated
                                    </span>
                                  )}
                                  {issue.status === 'Resolved' && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 whitespace-nowrap">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span className="whitespace-nowrap">Resolved</span>
                                    </span>
                                  )}
                                  {issue.status === 'Dismissed' && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1 whitespace-nowrap">
                                      <X className="w-3 h-3 text-slate-500 shrink-0" />
                                      <span className="whitespace-nowrap">Dismissed</span>
                                    </span>
                                  )}
                                </>
                              )}
                            </td>

                            <td className="px-3 py-3 whitespace-nowrap">
                              {issue.assignedTo ? (
                                <div className="leading-tight">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-900 block truncate max-w-[130px] whitespace-nowrap">
                                      {issue.assignedTo}
                                    </span>
                                    {workerStatus.state === 'BUSY_ON_THIS' && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-900 border border-amber-300 whitespace-nowrap">
                                        BUSY
                                      </span>
                                    )}
                                    {workerStatus.state === 'ASSIGNED' && issue.status !== 'Resolved' && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                        ASSIGNED
                                      </span>
                                    )}
                                  </div>
                                  {issue.squad && (
                                    <span className="text-[10px] text-slate-400 block whitespace-nowrap">
                                      {issue.squad}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 text-xs font-normal italic whitespace-nowrap">
                                    Unassigned
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedIssueId(cleanId);
                                      setIsAssignModalOpen(true);
                                    }}
                                    className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 hover:underline px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 cursor-pointer whitespace-nowrap"
                                    title="Assign field squad to this issue"
                                  >
                                    Assign
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-3 text-slate-500 leading-tight whitespace-nowrap">
                              <span className="block text-slate-700 text-[11px] whitespace-nowrap">{issue.createdOnDate}</span>
                              <span className="block text-[10px] text-slate-400 whitespace-nowrap">{issue.createdOnTime}</span>
                            </td>

                            <td 
                              className={`px-2 py-3 text-slate-400 hover:text-slate-700 ${isUnverified ? 'border-r-4 border-rose-600' : ''}`}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedIssueId(cleanId);
                                setIsUpdateModalOpen(true); 
                              }}
                            >
                              <MoreVertical className="w-4 h-4 cursor-pointer" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Footer */}
              <div className="bg-white border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing {Math.min(1, triageGroups.length)} to {Math.min(triageGroups.length, currentPage * pageSize)} of {triageGroups.length} incidents ({filteredIssues.length} reports)
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    type="button" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40"
                  >
                    &lsaquo; Prev
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`px-2.5 py-1 rounded font-semibold transition ${
                        currentPage === pg
                          ? 'bg-blue-800 text-white'
                          : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}

                  <button 
                    type="button" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40"
                  >
                    Next &rsaquo;
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select 
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="border border-slate-200 rounded px-2 py-1 text-slate-700 bg-white"
                  >
                    <option value={8}>8</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: RESOLVED ISSUES REGISTRY */}
        {activeNav === 'resolved_issues' && (
          <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Operations</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">Resolved Issues</span>
            </div>

            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Resolved Issues
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {issues.filter((i) => i.status === 'Resolved').length} Closed &amp; Verified
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Audit registry of completed municipal remediations, field crew before/after photographic proof, and citizen sign-offs.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => { setActiveNav('triage'); setActiveTab('All Issues'); setSearchParams({}); }}
                  className="px-3.5 py-2 rounded-md bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs shadow-xs transition flex items-center gap-1.5"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Go to Active Triage</span>
                </button>
              </div>
            </div>

            {/* Resolved Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Total Resolved</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  {issues.filter((i) => i.status === 'Resolved').length}
                </div>
                <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
                  100% Closed in System
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Verification Proofs</span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  {issues.filter((i) => i.status === 'Resolved').length}
                </div>
                <span className="text-[11px] text-blue-700 font-medium mt-0.5 block">
                  Before &amp; After Photo Logged
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Average Turnaround</span>
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  14.2 hrs
                </div>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                  Within 24h municipal SLA
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Citizen Satisfaction</span>
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                    <CheckCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  98.6%
                </div>
                <span className="text-[11px] text-purple-700 font-medium mt-0.5 block">
                  High Quality Resolution
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search resolved issues by ID, location, or department..."
                  className="w-full text-xs pl-9 pr-8 py-2 rounded border border-slate-300 focus:ring-1 focus:ring-blue-800 text-slate-900"
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

              <select
                value={deptFilter}
                onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                className="p-2 border border-slate-300 rounded bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-800"
              >
                <option value="All">All Departments</option>
                <option value="Road">Road Department</option>
                <option value="Sanitation">Sanitation Department</option>
                <option value="Electricity">Electricity Department</option>
                <option value="Water">Water Supply Department</option>
                <option value="Drainage">Drainage Board</option>
              </select>
            </div>

            {/* Resolved Issues Table */}
            <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Docket ID</th>
                      <th className="py-3 px-4">Grievance &amp; Location</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Resolved By</th>
                      <th className="py-3 px-4">Completion Proof</th>
                      <th className="py-3 px-4">Completed At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {issues.filter((i) => {
                      if (i.status !== 'Resolved') return false;
                      if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        const match = i.id.toLowerCase().includes(q) ||
                          i.title.toLowerCase().includes(q) ||
                          i.location.toLowerCase().includes(q) ||
                          i.department.toLowerCase().includes(q);
                        if (!match) return false;
                      }
                      if (deptFilter !== 'All' && !i.department.toLowerCase().includes(deptFilter.toLowerCase())) {
                        return false;
                      }
                      return true;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No Resolved Issues Found</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Issues resolved by field crews will appear in this registry with photographic completion proof.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      issues
                        .filter((i) => {
                          if (i.status !== 'Resolved') return false;
                          if (searchQuery) {
                            const q = searchQuery.toLowerCase();
                            const match = i.id.toLowerCase().includes(q) ||
                              i.title.toLowerCase().includes(q) ||
                              i.location.toLowerCase().includes(q) ||
                              i.department.toLowerCase().includes(q);
                            if (!match) return false;
                          }
                          if (deptFilter !== 'All' && !i.department.toLowerCase().includes(deptFilter.toLowerCase())) {
                            return false;
                          }
                          return true;
                        })
                        .map((issue) => {
                          const cleanId = issue.id.replace('#', '');
                          const beforeImg = resolveBeforeImage(issue);
                          const proof = issue.proofMedia || resolveProofMedia(issue);
                          const afterImg = proof.afterImage || '/sample_evidence/pothole_after.jpg';

                          return (
                            <tr
                              key={issue.id}
                              onClick={() => {
                                setSelectedIssueId(cleanId);
                                setIsDetailsDrawerOpen(true);
                              }}
                              className="hover:bg-slate-50/80 transition cursor-pointer"
                            >
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{issue.id}</span>
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Resolved</span>
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4 max-w-xs">
                                <div className="font-semibold text-slate-900 truncate">{issue.title}</div>
                                <div className="text-slate-500 text-[11px] flex items-center gap-1 truncate mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{issue.location}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                                  {issue.department}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-medium text-slate-800">{issue.assignedTo || 'Municipal Duty Squad'}</div>
                                <div className="text-[11px] text-slate-400">{issue.squad || 'Field Unit'}</div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="relative group cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveEvidenceImg(beforeImg);
                                    }}
                                    title="View Before photo"
                                  >
                                    <img 
                                      src={beforeImg} 
                                      alt="Before" 
                                      className="w-9 h-9 object-cover rounded border border-slate-200 group-hover:ring-2 group-hover:ring-blue-600 transition" 
                                    />
                                    <span className="absolute -bottom-1 -left-1 px-1 rounded text-[8px] font-bold bg-slate-800 text-white">
                                      Before
                                    </span>
                                  </div>

                                  <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />

                                  <div 
                                    className="relative group cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveEvidenceImg(afterImg);
                                    }}
                                    title="View After photo"
                                  >
                                    <img 
                                      src={afterImg} 
                                      alt="After" 
                                      className="w-9 h-9 object-cover rounded border border-emerald-300 group-hover:ring-2 group-hover:ring-emerald-600 transition" 
                                    />
                                    <span className="absolute -bottom-1 -right-1 px-1 rounded text-[8px] font-bold bg-emerald-700 text-white">
                                      After
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-slate-600 text-[11px]">
                                {issue.resolvedAt || issue.createdOnTime || 'Today'}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedIssueId(cleanId);
                                    setIsDetailsDrawerOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View Dossier</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW B: DEPARTMENTS OVERVIEW */}
        {activeNav === 'departments' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Operations</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">Departments Overview</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Municipal Departments & Fleet Jurisdiction
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage departmental queues, chief engineers in charge, and deployed field response units.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setActiveNav('triage'); setSearchParams({}); }}
                className="px-3.5 py-2 rounded bg-blue-800 text-white font-medium text-xs hover:bg-blue-900 transition flex items-center gap-1.5"
              >
                <span>Back to Triage Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {DEPARTMENTS_DATA.map((dept) => (
                <div key={dept.id} className="bg-white border border-slate-200 rounded-md p-5 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block font-semibold">{dept.id}</span>
                        <h2 className="text-sm font-bold text-slate-900 leading-snug">{dept.name}</h2>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[11px] font-bold">
                        {dept.openTickets} open
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Officer in Charge</span>
                        <strong className="text-slate-900 block">{dept.head}</strong>
                        <span className="text-[11px] text-slate-500">{dept.designation}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">Dedicated Field Squads</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {dept.squads.map((sq, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                              {sq}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">Jurisdiction</span>
                        <p className="text-[11px] text-slate-600 leading-normal">{dept.jurisdiction}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveNav('triage');
                      setDeptFilter(dept.shortName.split(' ')[0]);
                      setSearchParams({ search: dept.shortName });
                      showToast(`Filtered Triage for ${dept.shortName}.`);
                    }}
                    className="w-full py-2 rounded border border-blue-800 text-blue-900 hover:bg-blue-50 text-xs font-semibold transition text-center"
                  >
                    View {dept.shortName} Issues &rarr;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW C: AI DISPATCH REVIEW */}
        {activeNav === 'ai_review' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Operations</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">AI Dispatch & Assignment Review</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-xs font-bold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
                  <span>Human-in-the-Loop Municipal Governance</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  AI Autonomous Dispatch & Officer Assignment Review
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect autonomous proximity matching, review AI rationale, and confirm or override field crew designations.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setActiveNav('audit_logs');
                    setSearchParams({ tab: 'AUDIT_LOGS' });
                  }}
                  className="px-3 py-2 rounded bg-blue-50 border border-blue-200 text-blue-900 font-semibold text-xs hover:bg-blue-100 transition flex items-center gap-1.5"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-blue-700" />
                  <span>View Activity & Audit Logs &rarr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveNav('triage'); setSearchParams({}); }}
                  className="px-3.5 py-2 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
                >
                  Back to Triage
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
                    onClick={() => handleSelectDispatchMode(false)}
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
                    onClick={() => handleSelectDispatchMode(true)}
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
                      The AI has paired issues with specialists based on GPS location and skill set. <strong>You must click "Approve" or "Edit" on each card below</strong> to deploy the specialist. No workers will be dispatched until you approve them.
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] block font-medium">TOTAL MONITORED ISSUES</span>
                  <strong className="text-slate-900 text-base font-bold">{issues.length}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Active registry</span>
                </div>
                <div className="bg-amber-50/60 rounded-lg p-3 border border-amber-200/80">
                  <span className="text-amber-800 text-[11px] block font-medium">ACTIVE REMEDIATIONS</span>
                  <strong className="text-amber-900 text-base font-bold">{Object.keys(activeJobs).length} Ongoing</strong>
                  <span className="text-[10px] text-amber-700 block mt-0.5">60s on-site timer</span>
                </div>
                <div className="bg-emerald-50/60 rounded-lg p-3 border border-emerald-200/80">
                  <span className="text-emerald-800 text-[11px] block font-medium">AUTONOMOUS DISPATCHES</span>
                  <strong className="text-emerald-900 text-base font-bold">{aiAuditLogs.filter(l => l.type === 'AUTONOMOUS_DISPATCH').length} Executed</strong>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">Zero-touch executions</span>
                </div>
                <div className="bg-blue-50/60 rounded-lg p-3 border border-blue-200/80">
                  <span className="text-blue-800 text-[11px] block font-medium">AVAILABLE SPECIALISTS</span>
                  <strong className="text-blue-900 text-base font-bold">{squads.filter(s => s.status === 'AVAILABLE').length} On-Call</strong>
                  <span className="text-[10px] text-blue-700 block mt-0.5">Ready for deployment</span>
                </div>
              </div>
            </div>

            {/* AI Review Queue Cards */}
            <div className="space-y-4">
              {(() => {
                const aiReviewPendingIssues = issues.filter(
                  (item) =>
                    item.status !== 'Resolved' &&
                    item.status !== 'Dismissed' &&
                    item.status !== 'Rejected' &&
                    item.authenticityVerdict !== 'REJECTED_FAKE' &&
                    !item.assignedTo &&
                    item.status !== 'In Progress' &&
                    !checkIsUnverified(item)
                );

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900">
                        Incident Roster & Worker Availability Status ({aiReviewPendingIssues.length} Tickets Awaiting Review)
                      </h3>
                      <span className="text-xs text-slate-500">
                        Automated department specialist matching & real-time remediation status
                      </span>
                    </div>

                    {aiReviewPendingIssues.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3 shadow-xs">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                          <CheckCheck className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-bold text-slate-900">All Incident Dispatches Processed</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                          All active civic complaints have been triaged, assigned to field squads, or marked resolved. No pending tickets require AI assignment review.
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => { setActiveNav('triage'); setSearchParams({}); }}
                            className="px-4 py-2 rounded bg-blue-800 text-white text-xs font-semibold hover:bg-blue-900 transition shadow-xs cursor-pointer"
                          >
                            Return to Operations Triage &rarr;
                          </button>
                        </div>
                      </div>
                    ) : (
                      aiReviewPendingIssues.map((item) => {
                        const cleanId = item.id.replace('#', '');
                        const job = activeJobs[cleanId];
                        const workerStatus = getWorkerStatusForIssue(item);

                        return (
                          <div key={item.id} className="bg-white border border-slate-200 rounded-md p-5 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-12 h-12 rounded object-cover border border-slate-200 flex-shrink-0"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <strong className="text-sm font-bold text-slate-900">{item.title}</strong>
                                    <span className="font-mono text-xs text-blue-800 font-semibold">{item.id}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      item.priority === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                                    }`}>
                                      {item.priority} Priority
                                    </span>
                                    {item.requiresHumanReview || item.status === 'Review Required' ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                        <ShieldAlert className="w-3 h-3 text-amber-700" />
                                        <span>Evidence Verification Hold</span>
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                        <span>Verified Authentic</span>
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-500 block mt-0.5">{item.location} &bull; {item.department}</span>
                                </div>
                              </div>

                              <div className="text-right flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-mono">CV Confidence: <strong>{item.aiConfidence || '94%'}</strong></span>
                                <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                                  workerStatus.state === 'BUSY_ON_THIS'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                                    : workerStatus.state === 'BUSY_ON_OTHER'
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : item.status === 'Resolved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-blue-50 text-blue-800 border-blue-200'
                                }`}>
                                  {workerStatus.state === 'BUSY_ON_THIS' && `Remediating (${workerStatus.remainingSeconds}s)`}
                                  {workerStatus.state === 'BUSY_ON_OTHER' && `Queued (Free in ${workerStatus.remainingSeconds}s)`}
                                  {workerStatus.state === 'RESOLVED' && 'Resolved & Verified'}
                                  {workerStatus.state === 'AVAILABLE' && 'Worker Ready'}
                                </span>
                              </div>
                            </div>

                            {/* AI Matching Analysis Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded border border-slate-200 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[11px]">AI-Assigned Field Officer</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <strong className="text-slate-900 text-sm block">
                                    {workerStatus.workerName}
                                  </strong>
                                  {workerStatus.state === 'BUSY_ON_THIS' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                                      BUSY ON-SITE
                                    </span>
                                  )}
                                  {workerStatus.state === 'BUSY_ON_OTHER' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      BUSY ON #{workerStatus.activeTicket}
                                    </span>
                                  )}
                                  {workerStatus.state === 'AVAILABLE' && item.status !== 'Resolved' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      AVAILABLE
                                    </span>
                                  )}
                                </div>
                                <span className="text-slate-500 text-[11px] block">{workerStatus.squadName}</span>
                              </div>

                              <div>
                                <span className="text-slate-400 block text-[11px]">Proximity & Workload Calculation</span>
                                <strong className="text-blue-900 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{item.aiDistanceKm || 0.8} km away (Haversine GPS)</span>
                                </strong>
                                <span className="text-slate-500 text-[11px] block">
                                  {workerStatus.state === 'BUSY_ON_THIS' && 'Active remediation in progress on this location.'}
                                  {workerStatus.state === 'BUSY_ON_OTHER' && `Engaged on #${workerStatus.activeTicket}. Free in ${workerStatus.remainingSeconds}s.`}
                                  {workerStatus.state === 'AVAILABLE' && '0 active jobs. Stationed nearby and available.'}
                                  {workerStatus.state === 'RESOLVED' && 'Ticket resolved and verified safe.'}
                                </span>
                              </div>

                              <div>
                                <span className="text-slate-400 block text-[11px]">Dispatch Algorithm Rationale</span>
                                <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed">
                                  {item.aiReasoning || `Matched to specialist ${workerStatus.workerName} (${workerStatus.squadName}) based on municipal division heuristics.`}
                                </p>
                              </div>
                            </div>

                            {/* PROMINENT ALERT: WORKER CURRENTLY BUSY WAITLIST BANNER */}
                            {workerStatus.state === 'BUSY_ON_OTHER' && (
                              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                                <div>
                                  <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                                    <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse flex-shrink-0" />
                                    <span>No Worker Currently Available</span>
                                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-xs">
                                      {workerStatus.workerName} free in {workerStatus.remainingSeconds}s
                                    </span>
                                  </div>
                                  <p className="text-slate-700 mt-1 leading-relaxed">
                                    Designated specialist <strong>{workerStatus.workerName}</strong> is actively engaged on ticket <strong>#{workerStatus.activeTicket}</strong>. 
                                    {autoDispatchMode 
                                      ? ` Zero-Touch Mode is ON: The AI will autonomously assign & dispatch ${workerStatus.workerName} to this issue the moment #${workerStatus.activeTicket} completes in ${workerStatus.remainingSeconds}s.`
                                      : ` The AI will automatically assign ${workerStatus.workerName} as soon as #${workerStatus.activeTicket} completes in ${workerStatus.remainingSeconds}s. An official supervisor can then click Approve or Edit.`}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedIssueId(cleanId);
                                    setIsAssignModalOpen(true);
                                  }}
                                  className="px-3.5 py-1.5 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition flex-shrink-0"
                                >
                                  Edit / Override Worker
                                </button>
                              </div>
                            )}

                            {/* Supervisor Oversight Actions */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Reported {item.createdOnDate} at {item.createdOnTime} by {item.reportedBy}</span>
                              </span>

                              <div className="flex items-center gap-2">
                                {/* Edit / Override Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedIssueId(cleanId);
                                    setIsAssignModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                                >
                                  Edit / Reassign Squad
                                </button>

                                {/* Action depending on availability, review requirement, and state */}
                                {item.requiresHumanReview || item.status === 'Review Required' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1.5 rounded bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5">
                                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Evidence Review Hold</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAuthenticityDecision(item.id, 'APPROVE')}
                                      className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition flex items-center gap-1 shadow-xs"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Approve & Dispatch</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAuthenticityDecision(item.id, 'REJECT')}
                                      className="px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium transition flex items-center gap-1 shadow-xs"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Reject Media</span>
                                    </button>
                                  </div>
                                ) : workerStatus.state === 'BUSY_ON_THIS' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-1.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                                      <span>Remediating ({workerStatus.remainingSeconds}s)</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleFastForwardJob(item.id)}
                                      className="px-3.5 py-1.5 rounded bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1"
                                    >
                                      <FastForward className="w-3.5 h-3.5" />
                                      <span>Mark Done Now</span>
                                    </button>
                                  </div>
                                ) : workerStatus.state === 'BUSY_ON_OTHER' ? (
                                  autoDispatchMode ? (
                                    <span className="px-3.5 py-1.5 rounded bg-purple-50 text-purple-900 border border-purple-200 font-semibold text-xs flex items-center gap-1.5">
                                      <Bot className="w-4 h-4 text-purple-700" />
                                      <span>Auto-Dispatches in {workerStatus.remainingSeconds}s (Zero-Touch)</span>
                                    </span>
                                  ) : (
                                    <span className="px-3.5 py-1.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-medium text-xs flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Queued: Free in {workerStatus.remainingSeconds}s (Official Action Ready upon Free)</span>
                                    </span>
                                  )
                                ) : item.status === 'Resolved' ? (
                                  <span className="px-3 py-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center gap-1">
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Work Completed & Verified</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveAiDispatch(item.id, autoDispatchMode)}
                                    className="px-4 py-1.5 rounded bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve AI Assignment & Dispatch (60s Timer)</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* VIEW: DEDICATED AI AUTONOMOUS DISPATCH & WORKER ACTIVITY AUDIT LOG */}
        {activeNav === 'audit_logs' && (
          <div className="space-y-4">
            <AuditLogsPage 
              auditLogs={aiAuditLogs}
              onResetLogs={() => setAiAuditLogs(INITIAL_AI_LOGS)}
              autoDispatchMode={autoDispatchMode}
              onToggleAutoDispatch={handleToggleAutoDispatch}
              onSelectDispatchMode={handleSelectDispatchMode}
              activeJobsCount={Object.keys(activeJobs).length}
              totalIssuesCount={issues.length}
              availableSquadsCount={squads.filter(s => s.status === 'AVAILABLE').length}
              onOpenTicketInTriage={(ticketId) => {
                setActiveNav('triage');
                setSearchParams({ search: ticketId });
              }}
              isEmbedded={true}
            />
          </div>
        )}

        {/* VIEW D: OPERATIONS MAP */}
        {activeNav === 'map' && (
          <div className="space-y-4">
            <MapViewPage isEmbedded={true} />
          </div>
        )}

        {/* VIEW E: CCTV & AI VISION GRID */}
        {activeNav === 'cctv' && (
          <div className="space-y-4">
            <CCTVVisionPage isEmbedded={true} />
          </div>
        )}

        {/* VIEW F: ANALYTICS & REPORTS */}
        {activeNav === 'analytics' && (
          <div className="space-y-4">
            <AnalyticsPage isEmbedded={true} />
          </div>
        )}



        {/* VIEW H: FIELD CREW RADAR */}
        {activeNav === 'crew' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Operations</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">Field Crew Radar</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Municipal Field Crews & Mobile Units
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live status, vehicle designations, and active dispatch queues across all municipal response squads.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link to="/crew" className="inline-flex items-center gap-1.5 rounded bg-blue-800 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900">
                  Open Field Crew Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                  {squads.filter(s => s.status === 'AVAILABLE').length} Available
                </span>
                {squads.filter(s => s.status !== 'AVAILABLE').length > 0 && (
                  <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 animate-pulse">
                    {squads.filter(s => s.status !== 'AVAILABLE').length} Busy On-Site
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {squads.map((sq, idx) => {
                const isBusy = sq.status !== 'AVAILABLE';
                const jobInfo = sq.activeTicket ? activeJobs[sq.activeTicket] : null;

                return (
                  <div key={sq.id || idx} className={`bg-white border rounded-md p-5 shadow-xs space-y-4 transition ${
                    isBusy ? 'border-amber-300 ring-1 ring-amber-300' : 'border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">{sq.squad}</span>
                        <h2 className="text-sm font-bold text-slate-900">{sq.name}</h2>
                        <span className="text-xs text-slate-500">{sq.dept}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isBusy 
                          ? 'bg-amber-100 text-amber-900 border border-amber-400 animate-pulse' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {sq.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Response Vehicle:</span>
                        <span className="font-medium text-slate-800">{sq.vehicle || `Utility Truck ${idx + 1}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Assigned Zone:</span>
                        <span className="font-medium text-slate-800">Ward {12 + idx * 8} &bull; Indore</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Task:</span>
                        <span className={`font-semibold ${isBusy ? 'text-amber-800' : 'text-slate-700'}`}>
                          {isBusy ? `Remediation #${sq.activeTicket}` : 'Standby / Ready'}
                        </span>
                      </div>
                      {jobInfo && (
                        <div className="flex justify-between items-center pt-1 border-t border-amber-100">
                          <span className="text-amber-800 font-medium">Time to Completion:</span>
                          <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                            {jobInfo.remainingSeconds}s
                          </span>
                        </div>
                      )}
                    </div>

                    {isBusy ? (
                      <button
                        type="button"
                        onClick={() => handleFastForwardJob(sq.activeTicket)}
                        className="w-full py-2 rounded bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                        <span>Complete Work Now (Free Officer)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentIssue) {
                            handleAssignSquad(sq);
                          } else {
                            setActiveNav('triage');
                            setSearchParams({});
                          }
                        }}
                        className="w-full py-2 rounded border border-blue-800 text-blue-800 hover:bg-blue-50 text-xs font-medium transition"
                      >
                        Assign to Active Issue ({currentIssue ? `#${currentIssue.id}` : 'Select Issue'})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW I: USERS & ROLES */}
        {activeNav === 'users' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Administration</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">Users & Roles</span>
            </div>

            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-2xl font-bold text-slate-900">
                Municipal Authority Personnel & Access Governance
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized municipal operators, superintending engineers, and departmental dispatch officers.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Official Name</th>
                    <th className="py-3 px-4 font-semibold">Role & Designation</th>
                    <th className="py-3 px-4 font-semibold">Department Jurisdiction</th>
                    <th className="py-3 px-4 font-semibold">Direct Contact</th>
                    <th className="py-3 px-4 font-semibold">Permission Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">Er. Rajesh Patil</td>
                    <td className="py-3 px-4 text-slate-600">Senior Operations Officer</td>
                    <td className="py-3 px-4 text-slate-800">Road Infrastructure</td>
                    <td className="py-3 px-4 font-mono text-slate-500">+91 731 254 8101</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[10px]">Dispatch Lead</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">Dr. Priya Deshmukh</td>
                    <td className="py-3 px-4 text-slate-600">Chief Municipal Health Officer</td>
                    <td className="py-3 px-4 text-slate-800">Sanitation & Solid Waste</td>
                    <td className="py-3 px-4 font-mono text-slate-500">+91 731 254 8102</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[10px]">Department Head</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">Er. Vikram Shinde</td>
                    <td className="py-3 px-4 text-slate-600">Superintending Engineer</td>
                    <td className="py-3 px-4 text-slate-800">Public Works & Highways</td>
                    <td className="py-3 px-4 font-mono text-slate-500">+91 731 254 8103</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-bold text-[10px]">Commissioner Admin</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW J: SETTINGS */}
        {activeNav === 'settings' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Administration</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">Settings</span>
            </div>

            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-2xl font-bold text-slate-900">
                Municipal Command Center Configuration
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                City boundaries, autonomous AI dispatch sensitivity, and SLA escalation thresholds.
              </p>
            </div>

            <div className="max-w-2xl bg-white border border-slate-200 rounded-md p-6 shadow-xs space-y-5 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-slate-900 block">Municipal Corporation Body</span>
                <input
                  type="text"
                  readOnly
                  value="Kolhapur Municipal Corporation, Maharashtra"
                  className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-900 block">AI Computer Vision Auto-Dispatch Threshold</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="70"
                    max="99"
                    defaultValue="85"
                    className="flex-1"
                  />
                  <span className="font-bold text-blue-900 font-mono text-sm">85% Confidence</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Detections from smart CCTV streams exceeding this threshold automatically initiate field work orders.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-900 block">Emergency Defect Escalation Timeout</span>
                <select className="w-full p-2 border border-slate-200 rounded bg-white text-slate-700">
                  <option>4 hours (High Priority)</option>
                  <option>8 hours</option>
                  <option>24 hours (Standard SLA)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => showToast('Command Center settings saved successfully.')}
                  className="px-4 py-2 bg-blue-800 text-white rounded font-medium shadow-xs hover:bg-blue-900 transition"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* 3. RIGHT DETAILS DRAWER ("Issue Details") */}
      {/* ============================================================ */}
      {currentIssue && isDetailsDrawerOpen && (activeNav === 'triage' || activeNav === 'resolved_issues') && (
        <>
          {/* Mobile Backdrop */}
          <div 
            className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsDetailsDrawerOpen(false)}
          />

          <aside className="fixed lg:sticky top-0 lg:top-16 right-0 z-50 lg:z-10 w-full sm:w-[420px] lg:w-80 xl:w-96 h-screen lg:h-[calc(100vh-64px)] bg-white border-l border-slate-200 shadow-2xl lg:shadow-none flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Issue Details</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800">
                    {currentIssue.id.startsWith('#') ? currentIssue.id : `#${currentIssue.id}`}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setIsDetailsDrawerOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100 cursor-pointer transition"
                  title="Close details drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Evidence Photo */}
              <div className={`relative rounded-md overflow-hidden border aspect-video flex items-center justify-center ${
                checkIsUnverified(currentIssue) ? 'border-2 border-rose-500 ring-2 ring-rose-200' : 'border-slate-200 bg-slate-950'
              }`}>
                <img
                  src={activeEvidenceImg || currentIssue.image}
                  alt={currentIssue.title}
                  className="w-full h-full object-cover"
                />
                <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded text-white text-[10px] font-mono ${
                  checkIsUnverified(currentIssue) ? 'bg-rose-900/90 text-rose-100 font-bold' : 'bg-black/60'
                }`}>
                  {checkIsUnverified(currentIssue) ? 'Flagged Unverified Evidence' : 'Evidence Photo'}
                </span>
              </div>

              {/* Title & Priority Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {currentIssue.title}
                  </h3>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {currentIssue.location}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium flex-shrink-0 ${
                  currentIssue.priority === 'High'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {currentIssue.priority} Priority
                </span>
              </div>

              {/* ACTIVE 1-MINUTE REMEDIATION LIVE BANNER IF BUSY */}
              {activeJobForCurrent && (
                <div className="bg-amber-50 border border-amber-300 rounded p-3 text-xs space-y-2 animate-in fade-in shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                      <Clock className="w-4 h-4 text-amber-700 animate-spin" />
                      <span>Field Squad Active On-Site</span>
                    </div>
                    <span className="font-mono font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded text-[11px]">
                      {activeJobForCurrent.remainingSeconds}s remaining
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-tight">
                    <strong>{activeJobForCurrent.officerName}</strong> is actively remediating this defect on-site. Squad status is marked <strong>BUSY</strong>.
                  </p>
                  <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-700 h-1.5 rounded-full transition-all duration-1000"
                      style={{ width: `${((60 - activeJobForCurrent.remainingSeconds) / 60) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-amber-700">Auto-marks Resolved at 0s</span>
                    <button
                      type="button"
                      onClick={() => handleFastForwardJob(currentIssue.id)}
                      className="text-amber-950 font-bold hover:underline bg-white px-2 py-0.5 rounded border border-amber-300 shadow-xs"
                    >
                      Fast Forward / Mark Done &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* Drawer Sub-Tabs: Overview, AI Intelligence, Timeline, Location */}
              <div className="grid grid-cols-4 border-b border-slate-200 text-[11px] text-center select-none">
                {['Overview', 'AI Intelligence', 'Timeline', 'Location'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDrawerTab(tab)}
                    className={`pb-2 transition font-medium ${
                      drawerTab === tab
                        ? 'font-bold text-blue-800 border-b-2 border-blue-800'
                        : 'text-slate-400 hover:text-slate-700 border-b-2 border-transparent'
                    }`}
                  >
                    {tab === 'AI Intelligence' ? 'AI Intel' : tab}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW */}
              {drawerTab === 'Overview' && (
                <div className="space-y-4">
                  {/* Metadata List */}
                  <div className="space-y-3 text-xs pt-1">
                    {/* Location */}
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[11px]">Location</span>
                        <span className="text-slate-800 font-medium block leading-tight">
                          {currentIssue.location}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDrawerTab('Location')}
                          className="text-blue-800 text-[11px] hover:underline font-medium mt-0.5 inline-block"
                        >
                          View Geo-Map Details &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Department */}
                    <div className="flex items-start gap-3">
                      <Building className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[11px]">Department</span>
                        <span className="text-slate-800 font-semibold block">
                          {currentIssue.department}
                        </span>
                      </div>
                    </div>

                    {/* Reported On */}
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[11px]">Reported On</span>
                        <span className="text-slate-800 font-medium block">
                          {currentIssue.createdOnDate}, {currentIssue.createdOnTime}
                        </span>
                      </div>
                    </div>

                    {/* Reported By */}
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[11px]">Reported By</span>
                        <span className="text-slate-800 font-medium block">
                          {currentIssue.reportedBy}
                        </span>
                      </div>
                    </div>

                    {/* Assigned To */}
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[11px]">Assigned Squad</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 font-semibold block">
                            {currentIssue.assignedTo || 'Unassigned — Pending Dispatch'}
                          </span>
                          {activeJobForCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                              BUSY ON-SITE
                            </span>
                          )}
                        </div>
                        {currentIssue.squad && (
                          <span className="text-[11px] text-slate-400 block">
                            {currentIssue.squad}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Current Status */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        currentIssue.status === 'Resolved' ? 'bg-emerald-600' :
                        activeJobForCurrent ? 'bg-amber-500 animate-ping' :
                        'bg-blue-600'
                      }`}></span>
                      <span className="text-slate-700 text-xs">
                        Current Status: <strong className="text-blue-900 ml-1">{currentIssue.status}</strong>
                        {activeJobForCurrent && <span className="ml-1 text-amber-700 font-bold">({activeJobForCurrent.remainingSeconds}s remaining)</span>}
                      </span>
                    </div>
                  </div>

                  {/* AI Confidence & Analysis Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-800" />
                        <span>AI Defect Triage Analysis</span>
                      </span>
                      <span className="font-mono text-blue-800 font-bold">{currentIssue.aiConfidence || '94%'}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {currentIssue.aiReasoning || 'Nearest available squad in primary division matched via GPS proximity.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleRerunAiScan}
                      disabled={isAiScanning}
                      className="text-blue-800 font-medium text-[11px] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isAiScanning ? 'animate-spin' : ''}`} />
                      <span>{isAiScanning ? 'Scanning...' : 'Re-verify with Computer Vision'}</span>
                    </button>
                  </div>
                  {/* EVIDENCE AUTHENTICITY & FORENSICS DOSSIER CARD */}
                  <div className={`rounded-lg p-3.5 text-xs space-y-3 border ${
                    checkIsUnverified(currentIssue)
                      ? 'bg-rose-50/70 border-2 border-rose-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        {checkIsUnverified(currentIssue) ? (
                          <ShieldAlert className="w-4 h-4 text-rose-700" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-blue-700" />
                        )}
                        <span>Evidence Authenticity & Forensics</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        checkIsUnverified(currentIssue)
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}>
                        {checkIsUnverified(currentIssue) ? 'UNVERIFIED DETECTED' : 'VERIFIED AUTHENTIC'}
                      </span>
                    </div>

                    {/* Forensic Score & Indicators */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">Trust & Authenticity</span>
                        <strong className={`text-sm ${
                          (currentIssue.authenticityScore || 94) >= 70 && !checkIsUnverified(currentIssue) ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {Math.round(currentIssue.authenticityScore || (checkIsUnverified(currentIssue) ? 54 : 94))} / 100
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">Synthetic / AI Likelihood</span>
                        <strong className="text-sm text-slate-800">
                          {currentIssue.aiGeneratedProbability !== undefined && currentIssue.aiGeneratedProbability !== null 
                            ? `${Math.round(currentIssue.aiGeneratedProbability * 100)}%` 
                            : (checkIsUnverified(currentIssue) ? '48% (Flagged)' : '2% (Natural Sensor)')}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">Tampering / ELA Delta</span>
                        <strong className="text-sm text-slate-800">
                          {currentIssue.tamperingScore !== undefined && currentIssue.tamperingScore !== null 
                            ? `${Math.round(currentIssue.tamperingScore)}%` 
                            : (checkIsUnverified(currentIssue) ? '42% (Anomalous)' : '4% (Uniform)')}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">EXIF & GPS Integrity</span>
                        <strong className={`text-sm ${checkIsUnverified(currentIssue) ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {checkIsUnverified(currentIssue) ? 'Discrepancy Detected' : 'Match Confirmed'}
                        </strong>
                      </div>
                    </div>

                    {/* Flags if any */}
                    {Array.isArray(currentIssue.authenticityFlags) && currentIssue.authenticityFlags.length > 0 && (
                      <div className="bg-rose-100/70 border border-rose-200 rounded p-2 text-[11px] text-rose-950 space-y-1">
                        <span className="font-bold block text-[10px] text-rose-900 uppercase tracking-wider">Forensic Audit Triggers</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {currentIssue.authenticityFlags.map((f, idx) => (
                            <li key={idx}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Supervisor Decision Gateway Action when Hold is active */}
                    {checkIsUnverified(currentIssue) && (
                      <div className="pt-2 border-t border-rose-200 space-y-2">
                        <p className="text-[11px] text-rose-900 font-medium">
                          Supervisor Decision Required: Confirm physical authenticity to remove red boundary hold or dismiss invalid report.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleMarkReal(currentIssue.id)}
                            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Real</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismiss(currentIssue.id)}
                            className="px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="border-t border-slate-100 pt-3 space-y-1 text-xs">
                    <span className="font-semibold text-slate-900 block">Description</span>
                    <p className="text-slate-600 leading-relaxed">
                      {currentIssue.description}
                    </p>
                  </div>

                  {currentIssue.masterReports?.length > 1 && (
                    <section className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-3">
                      <header className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-800">Master grievance · {currentIssue.masterGrievanceId}</p>
                          <h3 className="text-sm font-bold text-slate-900">{currentIssue.title}</h3>
                          <p className="text-[11px] text-slate-600">{currentIssue.department} · {currentIssue.masterReports.length} citizen reports</p>
                        </div>
                        <Users className="h-4 w-4 text-blue-700" />
                      </header>
                      <div className="space-y-2">
                        {currentIssue.masterReports.map((report) => (
                          <article key={report.complaint_id} className="rounded-md border border-slate-200 bg-white p-2">
                            <div className="flex flex-wrap items-baseline justify-between gap-1">
                              <strong className="font-mono text-[11px] text-slate-900">REPORT {report.complaint_id}</strong>
                              <span className="text-[10px] text-slate-500">Original department: {report.department_name || 'Unassigned'}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-700">{report.issue_type} · {report.category}</p>
                            {report.description && <p className="mt-1 text-[10px] text-slate-500">{report.description}</p>}
                            {report.evidence?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {report.evidence.map((evidence, index) => (
                                  <a key={`${evidence.file_url}-${index}`} href={evidence.file_url} target="_blank" rel="noreferrer" className="block">
                                    <img src={evidence.file_url} alt={`Evidence for ${report.complaint_id}`} className="h-20 w-24 rounded border border-slate-200 object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                      <div className="border-t border-blue-200 pt-2 text-[10px] text-blue-900">
                        <strong>Grouping record:</strong> {(currentIssue.groupingReasons || []).join(' · ')}
                      </div>
                    </section>
                  )}

                  {/* Multi-Photo Evidence Gallery */}
                  <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                    <span className="font-semibold text-slate-900 block">Initial Evidence Photos (Click to preview)</span>
                    <div className="grid grid-cols-3 gap-2">
                      {currentIssue.evidenceGallery?.map((imgUrl, i) => (
                        <img
                          key={i}
                          src={imgUrl}
                          alt={`Evidence ${i + 1}`}
                          onClick={() => setActiveEvidenceImg(imgUrl)}
                          className={`w-full h-16 object-cover rounded border cursor-pointer transition ${
                            activeEvidenceImg === imgUrl ? 'border-blue-700 ring-2 ring-blue-700' : 'border-slate-200 hover:opacity-80'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* WORKER COMPLETED REMEDIATION PROOF (BEFORE/AFTER PHOTO & VIDEO) */}
                  {currentIssue.status === 'Resolved' && (
                    <div className="border-t border-slate-200 pt-3 space-y-3 text-xs bg-slate-50/70 p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>Worker Completed Work Proof (Verified)</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold text-[10px]">
                          Resolved & Verified
                        </span>
                      </div>

                      {/* Before / After side by side comparison */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-medium block">BEFORE (REPORT PHOTO)</span>
                          <img 
                            src={resolveBeforeImage(currentIssue)} 
                            alt="Before Remediation" 
                            className="w-full h-24 object-cover rounded border border-slate-200"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-emerald-700 font-semibold block">AFTER (WORKER PROOF)</span>
                          <img 
                            src={currentIssue.proofMedia?.afterImage || resolveProofMedia(currentIssue).afterImage} 
                            alt="After Remediation" 
                            className="w-full h-24 object-cover rounded border border-emerald-300 shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Completed Video Proof */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-600 font-medium flex items-center gap-1">
                          <Video className="w-3.5 h-3.5 text-slate-500" />
                          <span>Worker Completed Work Video Proof</span>
                        </span>
                        <video 
                          src={currentIssue.proofMedia?.videoProof || resolveProofMedia(currentIssue).videoProof}
                          controls
                          loop
                          muted
                          className="w-full h-32 object-cover rounded-lg bg-black border border-slate-300"
                        />
                      </div>

                      <div className="bg-white border border-emerald-200 rounded p-2.5 text-[11px] text-slate-700 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-500">AI Visual Clearance:</span>
                          <span className="text-emerald-700 font-bold">{currentIssue.proofMedia?.verificationScore || resolveProofMedia(currentIssue).verificationScore}% Defect Cleared</span>
                        </div>
                        <p className="text-slate-600 text-[11px] italic">
                          "{currentIssue.proofMedia?.repairSummary || resolveProofMedia(currentIssue).repairSummary}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 8 CIVIC AI FEATURES INTELLIGENCE DOSSIER EMBEDDED IN OVERVIEW */}
                  <div className="border-t border-slate-100 pt-3">
                    <CivicIntelligenceDossier
                      complaintId={currentIssue.id}
                      currentStatus={currentIssue.status}
                      enabled={hasLoadedLiveIssues}
                      onStatusUpdated={(newSt) => {
                        handleStatusChange(currentIssue.id, newSt);
                      }}
                      onSelectComplaint={(cId) => {
                        setSelectedIssueId(cId);
                        setIsDetailsDrawerOpen(true);
                      }}
                      isAuthority={true}
                    />
                  </div>
                </div>
              )}

              {/* TAB: DEDICATED AI INTELLIGENCE & AUDIT */}
              {drawerTab === 'AI Intelligence' && (
                <div className="pt-2">
                  <CivicIntelligenceDossier
                    complaintId={currentIssue.id}
                    currentStatus={currentIssue.status}
                    enabled={hasLoadedLiveIssues}
                    onStatusUpdated={(newSt) => {
                      handleStatusChange(currentIssue.id, newSt);
                    }}
                    onSelectComplaint={(cId) => {
                      setSelectedIssueId(cId);
                      setIsDetailsDrawerOpen(true);
                    }}
                    isAuthority={true}
                  />
                </div>
              )}

              {/* TAB 2: TIMELINE */}
              {drawerTab === 'Timeline' && (
                <div className="space-y-4 text-xs pt-1">
                  <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {/* Step 1 */}
                    <div className="relative">
                      <span className="absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white"></span>
                      <strong className="text-slate-900 block font-semibold">Grievance Registered</strong>
                      <span className="text-[11px] text-slate-500 block">{currentIssue.createdOnDate}, {currentIssue.createdOnTime}</span>
                      <p className="text-slate-600 text-[11px] mt-0.5">Citizen logged report via Seva AI portal with GPS coordinates and evidence.</p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative">
                      <span className="absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white"></span>
                      <strong className="text-slate-900 block font-semibold">AI Defect Detection & Verification</strong>
                      <span className="text-[11px] text-slate-500 block">{currentIssue.createdOnDate}, {currentIssue.createdOnTime}</span>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        Edge Computer Vision model classified defect as <strong>{currentIssue.title}</strong> with {currentIssue.aiConfidence || '94%'} confidence. Severity categorized as <strong>{currentIssue.priority}</strong>.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative">
                      <span className="absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white"></span>
                      <strong className="text-slate-900 block font-semibold">Department Jurisdiction Assigned</strong>
                      <span className="text-[11px] text-slate-500 block">Routed to {currentIssue.department}</span>
                      <p className="text-slate-600 text-[11px] mt-0.5">Autonomous routing matched issue category to primary municipal division queue.</p>
                    </div>

                    {/* Step 4 */}
                    <div className="relative">
                      <span className={`absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${currentIssue.assignedTo ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
                      <strong className="text-slate-900 block font-semibold">Field Crew Dispatch Designation</strong>
                      <span className="text-[11px] text-slate-500 block">
                        {currentIssue.assignedTo ? `${currentIssue.assignedTo} (${currentIssue.squad || 'Field Unit'})` : 'Awaiting Squad Confirmation'}
                      </span>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        {currentIssue.assignedTo 
                          ? `Assigned to squad (${currentIssue.aiDistanceKm || 0.8} km away). Squad actively deployed on-site.`
                          : 'Currently pending supervisory officer designation.'}
                      </p>
                    </div>

                    {/* Step 5 */}
                    <div className="relative">
                      <span className={`absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                        currentIssue.status === 'Resolved' ? 'bg-emerald-600' : 
                        activeJobForCurrent ? 'bg-amber-500 animate-ping' : 
                        'bg-slate-300'
                      }`}></span>
                      <strong className="text-slate-900 block font-semibold">Remediation Status</strong>
                      <span className="text-[11px] text-slate-500 block font-medium text-blue-800">
                        {currentIssue.status} {activeJobForCurrent && `(${activeJobForCurrent.remainingSeconds}s remaining)`}
                      </span>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        {currentIssue.status === 'Resolved'
                          ? 'Defect resolved and verified by municipal field inspector.'
                          : activeJobForCurrent
                          ? 'Field crew is actively on-site conducting repair remediation. 1-minute work timer active.'
                          : 'Scheduled for prompt on-site execution.'}
                      </p>
                    </div>

                    {/* Custom Officer Audit Notes */}
                    {timelineNotes[currentIssue.id.replace('#', '')]?.map((note, idx) => (
                      <div key={idx} className="relative bg-blue-50/50 p-2.5 rounded border border-blue-100">
                        <span className="absolute -left-5 top-2.5 w-2.5 h-2.5 rounded-full bg-blue-800 ring-4 ring-white"></span>
                        <strong className="text-blue-900 block font-semibold">Inspection Note Added</strong>
                        <span className="text-[10px] text-slate-400 block">{note.author} &bull; {note.time}</span>
                        <p className="text-slate-700 text-[11px] mt-0.5">{note.text}</p>
                      </div>
                    ))}

                    {/* AI Autonomous Audit Trace for this Issue */}
                    {aiAuditLogs
                      .filter((l) => l.issueId === currentIssue.id.replace('#', '') || l.issueId === 'SYSTEM')
                      .slice(0, 4)
                      .map((log) => (
                        <div key={log.id} className="relative bg-slate-50 p-2.5 rounded border border-slate-200">
                          <span className="absolute -left-5 top-2.5 w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-white"></span>
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 block font-semibold text-[11px]">{log.type.replace(/_/g, ' ')}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">{log.time}</span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{log.message}</p>
                        </div>
                      ))}
                  </div>

                  {/* Post Audit Note Input */}
                  <form onSubmit={handleAddTimelineNote} className="pt-2 border-t border-slate-100 space-y-2">
                    <label className="text-[11px] font-semibold text-slate-700 block">Add Inspection Log Note</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newTimelineNote}
                        onChange={(e) => setNewTimelineNote(e.target.value)}
                        placeholder="e.g. Squad on-site with asphalt roller..."
                        className="flex-1 p-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-800 text-slate-800"
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded text-xs font-semibold"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: LOCATION */}
              {drawerTab === 'Location' && (
                <div className="space-y-4 text-xs pt-1">
                  {/* Visual Map Pin Box */}
                  <div className="relative h-36 bg-slate-100 rounded-md overflow-hidden border border-slate-200 flex items-center justify-center">
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#1E3A8A_1px,transparent_1px)] [background-size:12px_12px]"></div>
                    <div className="relative flex flex-col items-center">
                      <span className="w-8 h-8 rounded-full bg-blue-800 text-white flex items-center justify-center shadow-lg animate-bounce">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <span className="text-[11px] font-semibold text-slate-800 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded shadow mt-1">
                        {currentIssue.location}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5 bg-slate-50 p-3.5 rounded border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Street Address:</span>
                      <span className="font-semibold text-slate-900 text-right">{currentIssue.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Municipal Zone:</span>
                      <span className="font-medium text-slate-800">Zone 3 &bull; Ward 42</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">GPS Coordinates:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-800">22.7196° N, 75.8577° E</span>
                        <button
                          type="button"
                          onClick={handleCopyCoords}
                          className="p-1 text-slate-400 hover:text-blue-800 rounded"
                          title="Copy GPS Coordinates"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Nearest Fleet:</span>
                      <span className="font-semibold text-blue-900 inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{currentIssue.aiDistanceKm || 0.8} km away</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setActiveNav('map'); setSearchParams({ tab: 'MAP' }); }}
                    className="w-full py-2.5 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 font-medium text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Open in Full Operations Map &rarr;</span>
                  </button>
                </div>
              )}


            </div>

            {/* Action Buttons at bottom of Drawer */}
            <div className="p-5 border-t border-slate-200 bg-white space-y-2">
              {/* PRIMARY ACTION: UNVERIFIED / ACTIVE TIMER / QUEUED / AVAILABLE / RESOLVED */}
              {(() => {
                const taskQueueData = currentIssue ? getWorkerTaskQueue(currentIssue) : null;
                const isCurrentUnverified = checkIsUnverified(currentIssue);
                const isDismissed = currentIssue.status === 'Dismissed' || currentIssue.status === 'Rejected' || currentIssue.authenticityVerdict === 'REJECTED_FAKE';
                const isResolved = currentIssue.status === 'Resolved';

                return (
                  <div className="space-y-3">
                    {/* SPECIALIST STATUS & SEQUENTIAL TASK QUEUE PIPELINE DOSSIER (Rendered for operational tickets) */}
                    {!isCurrentUnverified && !isDismissed && !isResolved && taskQueueData && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs shadow-2xs">
                        {/* Header with worker name, squad and live availability badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-blue-800 text-white font-bold flex items-center justify-center text-xs shrink-0">
                              {(taskQueueData.workerName || 'W').charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 leading-tight truncate">
                                {taskQueueData.workerName}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {taskQueueData.squadName}
                              </div>
                            </div>
                          </div>

                          {taskQueueData.isBusy ? (
                            <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                              <span>BUSY ON-SITE ({taskQueueData.remainingSeconds}s left)</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] flex items-center gap-1 shrink-0">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                              <span>AVAILABLE (IDLE)</span>
                            </span>
                          )}
                        </div>

                        {/* Sequential Task Queue Route if Worker is BUSY */}
                        {taskQueueData.isBusy ? (
                          <div className="space-y-2 pt-2 border-t border-slate-200">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <Route className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                                <span>Sequential Deployment Route &amp; Task Queue</span>
                              </span>
                              <span className="font-mono text-[10px] text-amber-900 bg-amber-200/70 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                                {taskQueueData.route.length} Stop{taskQueueData.route.length > 1 ? 's' : ''} in Pipeline
                              </span>
                            </div>

                            {/* Step list: first he will go there then there and then go this */}
                            <div className="space-y-1.5">
                              {taskQueueData.route.map((stop, idx) => (
                                <div
                                  key={`${stop.ticketId}-${idx}`}
                                  className={`p-2 rounded border text-[11px] transition ${
                                    stop.isCurrentIssue
                                      ? 'bg-blue-50 border-blue-300 text-blue-950 font-medium ring-1 ring-blue-300'
                                      : stop.status === 'BUSY_ON_SITE'
                                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                        stop.isCurrentIssue
                                          ? 'bg-blue-800 text-white'
                                          : stop.status === 'BUSY_ON_SITE'
                                          ? 'bg-amber-600 text-white'
                                          : 'bg-slate-300 text-slate-800'
                                      }`}>
                                        {stop.step}
                                      </span>
                                      <span className="truncate font-semibold">
                                        #{stop.ticketId}: {stop.title}
                                      </span>
                                    </div>

                                    {stop.status === 'BUSY_ON_SITE' && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-mono text-[10px] font-bold shrink-0">
                                        {stop.remainingSeconds}s remaining
                                      </span>
                                    )}
                                    {stop.isCurrentIssue && (
                                      <span className="px-1.5 py-0.2 rounded bg-blue-200 text-blue-900 text-[10px] font-bold shrink-0">
                                        This Work Order
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 pl-5 truncate">
                                    <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{stop.location}</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Natural language route description */}
                            <div className="p-2 rounded bg-slate-100 text-slate-700 text-[11px] leading-relaxed border border-slate-200">
                              <strong className="text-slate-900">Deployment Route: </strong>
                              {taskQueueData.route.length === 1 ? (
                                <span>
                                  Currently performing active remediation at <strong>#{taskQueueData.route[0].ticketId}</strong> ({taskQueueData.route[0].remainingSeconds}s left).
                                </span>
                              ) : (
                                <span>
                                  First, {taskQueueData.workerName} will finish active on-site work at <strong>#{taskQueueData.route[0].ticketId}</strong> ({taskQueueData.route[0].remainingSeconds}s remaining)
                                  {taskQueueData.route.slice(1, -1).map((mid) => (
                                    <span key={mid.ticketId}> &rarr; then proceed to <strong>#{mid.ticketId}</strong></span>
                                  ))}
                                  {' '}&rarr; then proceed to <strong>#{currentCleanId}</strong> ({currentIssue.location}) to remediate this ticket.
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>Specialist has 0 active tickets. Available for immediate on-site deployment upon approval.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PRIMARY ACTION BUTTONS */}
                    {isCurrentUnverified ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-lg text-rose-950 text-xs shadow-xs space-y-1">
                          <span className="font-bold flex items-center gap-1.5 text-rose-900">
                            <ShieldAlert className="w-4 h-4 text-rose-700" />
                            <span>Unverified Evidence Flagged &bull; Hold Active</span>
                          </span>
                          <p className="text-[11px] text-slate-700 leading-snug">
                            Authenticity verification pending. Mark real to clear hold and approve dispatch, or dismiss as fraudulent.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleMarkReal(currentIssue.id)}
                            className="py-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Mark Real & Verify</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismiss(currentIssue.id)}
                            className="py-2.5 rounded bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>Dismiss as Fake</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedIssueId(currentIssue.id.replace('#', '')); setIsUpdateModalOpen(true); }}
                          className="w-full py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs transition flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
                        >
                          <span>Assign Squad & Perform Actions &rarr;</span>
                        </button>
                      </div>
                    ) : activeJobForCurrent ? (
                      <button
                        type="button"
                        onClick={() => handleFastForwardJob(currentIssue.id)}
                        className="w-full py-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FastForward className="w-4 h-4" />
                        <span>Mark Work Done Now ({activeJobForCurrent.remainingSeconds}s remaining)</span>
                      </button>
                    ) : isDismissed ? (
                      <div className="w-full p-2.5 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-300 rounded flex items-center justify-between gap-1.5 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-left">
                          <X className="w-4 h-4 text-rose-600 shrink-0" />
                          <div>
                            <span className="font-bold block">Dismissed as Fraudulent</span>
                            <span className="text-[10px] text-slate-500 font-normal">Rejected by municipal supervisor.</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMarkReal(currentIssue.id)}
                          className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                        >
                          Restore
                        </button>
                      </div>
                    ) : isResolved ? (
                      <div className="w-full py-2.5 text-center text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-center gap-1.5">
                        <CheckCheck className="w-4 h-4 text-emerald-600" />
                        <span>Work Completed & Verified on Site</span>
                      </div>
                    ) : taskQueueData?.isBusy ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleApproveAiDispatch(currentIssue.id, autoDispatchMode)}
                          className="w-full py-2.5 rounded bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <ListOrdered className="w-4 h-4" />
                          <span>Approve AI Assignment & Queue in Pipeline</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAssignModalOpen(true)}
                          className="w-full py-2 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reassign to Alternative Available Worker</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApproveAiDispatch(currentIssue.id, autoDispatchMode)}
                        className="w-full py-2.5 rounded bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve AI Assignment & Dispatch (60s Timer)</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="flex-1 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition flex items-center justify-center gap-1"
                >
                  <span>Update Status</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex-1 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition flex items-center justify-center gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit / Reassign</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ============================================================ */}
      {/* 4. MODALS (Update Status / Assign Squad / New Work Order) */}
      {/* ============================================================ */}

      {/* Update Status Modal */}
      {isUpdateModalOpen && currentIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Update Complaint Status</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Select the new status for #{currentIssue.id} ({currentIssue.title}):
            </p>
            <div className="space-y-1.5 text-xs">
              {['Under Review', 'Assigned', 'In Progress', 'Escalated', 'Resolved'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleUpdateStatus(st)}
                  className={`w-full text-left px-3 py-2.5 rounded transition flex items-center justify-between ${
                    currentIssue.status === st
                      ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200'
                      : 'hover:bg-slate-50 text-slate-700 border border-slate-100'
                  }`}
                >
                  <span>{st}</span>
                  {currentIssue.status === st && <Check className="w-3.5 h-3.5 text-blue-800" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assign Squad Modal */}
      {isAssignModalOpen && currentIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Assign Field Squad</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Select an available municipal field squad for dispatch to {currentIssue.location}:
            </p>
            <div className="space-y-2 text-xs max-h-72 overflow-y-auto">
              {squads.map((sq, idx) => {
                const activeJobEntry = Object.entries(activeJobs).find(
                  ([, j]) => j.officerName === sq.name
                );
                const isBusy = Boolean(activeJobEntry) || (sq.status && sq.status.includes('BUSY'));
                const busyTicket = activeJobEntry ? activeJobEntry[0] : (sq.activeTicket || null);
                const busySeconds = activeJobEntry ? activeJobEntry[1].remainingSeconds : 60;

                return (
                  <div
                    key={sq.id || idx}
                    onClick={() => handleAssignSquad(sq)}
                    className="p-3 border border-slate-200 hover:border-blue-700 hover:bg-blue-50/50 rounded cursor-pointer transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-slate-900 font-semibold">{sq.name}</strong>
                        {isBusy ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-amber-700 animate-spin" />
                            <span>BUSY ({busySeconds}s left on #{busyTicket})</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>AVAILABLE</span>
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[11px] block mt-0.5 truncate">
                        {sq.squad} &bull; {sq.dept}
                      </span>
                      {isBusy && (
                        <span className="text-amber-800 text-[10px] block mt-0.5">
                          Currently on-site at #{busyTicket} &bull; Will be queued next in pipeline
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded text-[11px] font-semibold shrink-0 cursor-pointer ${
                        isBusy 
                          ? 'bg-amber-700 hover:bg-amber-800 text-white' 
                          : 'bg-blue-800 hover:bg-blue-900 text-white'
                      }`}
                    >
                      {isBusy ? 'Queue Next' : 'Assign Now'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* New Work Order Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Create New Work Order</h3>
              <button onClick={() => setIsNewOrderModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arterial Road Crater Remediation"
                  value={newOrderTitle}
                  onChange={(e) => setNewOrderTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department</label>
                <select
                  value={newOrderDept}
                  onChange={(e) => setNewOrderDept(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-white"
                >
                  <option>Road Department</option>
                  <option>Sanitation Department</option>
                  <option>Electricity Department</option>
                  <option>Water Supply Department</option>
                  <option>Drainage Board</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Priority</label>
                <select
                  value={newOrderPriority}
                  onChange={(e) => setNewOrderPriority(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-white"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Location</label>
                <input
                  type="text"
                  value={newOrderLocation}
                  onChange={(e) => setNewOrderLocation(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newOrderDesc}
                  onChange={(e) => setNewOrderDesc(e.target.value)}
                  placeholder="Operational details and remediation instructions"
                  className="w-full p-2 border border-slate-300 rounded text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-800 text-white font-medium shadow-xs hover:bg-blue-900"
                >
                  Commit Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ============================================================ */}
      {/* AUDIT LOG & COMPLETED WORK INSPECTION MODAL (IN AUTHORITY DASHBOARD) */}
      {/* ============================================================ */}
      {selectedAuditLogInAuthority && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedAuditLogInAuthority(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto my-auto text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-800 border-blue-200">
                  <ClipboardList className="w-3.5 h-3.5 text-blue-700" />
                  <span>{selectedAuditLogInAuthority.type.replace(/_/g, ' ')}</span>
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  Ticket #{selectedAuditLogInAuthority.issueId}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Event ID: {selectedAuditLogInAuthority.id}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAuditLogInAuthority(null)}
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
                    {selectedAuditLogInAuthority.issueTitle || 'Civic Infrastructure Defect'}
                  </strong>
                  <span className="text-[10px] text-slate-400">{selectedAuditLogInAuthority.dept || 'Municipal Ops'}</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">ASSIGNED SPECIALIST</span>
                  <strong className="text-slate-900 text-xs font-bold block mt-0.5">
                    {selectedAuditLogInAuthority.officer || 'Er. Rajesh Patil'}
                  </strong>
                  <span className="text-[10px] text-slate-400">On-Site Field Squad</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">TIMESTAMP & MODE</span>
                  <strong className="text-slate-900 text-xs font-bold block mt-0.5">
                    {selectedAuditLogInAuthority.time}
                  </strong>
                  <span className="text-[10px] text-blue-700 font-medium">
                    {selectedAuditLogInAuthority.mode || (autoDispatchMode ? 'Autonomous Zero-Touch' : 'Supervisor Oversight')}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">AI VERIFICATION SCORE</span>
                  <strong className="text-emerald-700 text-xs font-bold block mt-0.5">
                    {selectedAuditLogInAuthority.verificationScore || 98.8}% Defect Cleared
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
                        src={selectedAuditLogInAuthority.beforeImage || '/sample_evidence/pothole.jpg'} 
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
                        <span className="font-medium text-slate-700">{selectedAuditLogInAuthority.location || 'MG Road, Ward 12'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">GPS Coordinates:</span>
                        <span className="font-mono text-slate-700">{selectedAuditLogInAuthority.coordinates || '22.7196° N, 75.8577° E'}</span>
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
                        src={selectedAuditLogInAuthority.afterImage || '/sample_evidence/pothole_after.jpg'} 
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
                        <span className="font-medium text-slate-700">{selectedAuditLogInAuthority.officer || 'Er. Rajesh Patil'}</span>
                      </div>
                      {selectedAuditLogInAuthority.repairSummary && (
                        <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 italic">
                          "{selectedAuditLogInAuthority.repairSummary}"
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
                      src={selectedAuditLogInAuthority.videoProof || '/sample_evidence/cctv_feed_1.mp4'}
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
                  {selectedAuditLogInAuthority.message}
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 sticky bottom-0">
              <button
                type="button"
                onClick={() => setSelectedAuditLogInAuthority(null)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-100 transition shadow-xs"
              >
                Close Inspection
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = selectedAuditLogInAuthority.issueId;
                  setSelectedAuditLogInAuthority(null);
                  setActiveNav('triage');
                  setSearchParams({ search: targetId });
                }}
                className="px-4 py-2 rounded-lg bg-blue-800 text-white font-medium text-xs hover:bg-blue-900 transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Open Ticket #{selectedAuditLogInAuthority.issueId} in Triage</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
