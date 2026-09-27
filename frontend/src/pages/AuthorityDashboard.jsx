import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, FileText, Users, Building2, Map, BarChart3, 
  Camera, TrendingUp, UserCog, Settings, Calendar, Plus, 
  Filter, MoreVertical, X, Check, MapPin, Building, User, 
  ChevronDown, CheckCircle2, AlertCircle, ArrowUpRight, Search, 
  RefreshCw, CheckSquare, Layers, Cpu, ShieldCheck, ArrowRight, 
  Phone, Eye, Clock, Copy, Printer, Sparkles, Send, Wrench, RotateCcw,
  FastForward, CheckCheck, Bot, Zap, Sliders, AlertTriangle
} from 'lucide-react';
import { CivicLogo } from '../components/CivicLogo';
import { MapViewPage } from './MapViewPage';
import { CCTVVisionPage } from './CCTVVisionPage';
import { AnalyticsPage } from './AnalyticsPage';
import { complaintApi } from '../api/complaintApi';

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

// Initial realistic AI Operational & Dispatch logs
export const INITIAL_AI_LOGS = [
  {
    id: 'log-101',
    time: '12:20:15 PM',
    type: 'AI_MATCH_EVAL',
    level: 'INFO',
    issueId: 'CS1039',
    officer: 'Er. Rajesh Patil',
    dept: 'Road Department',
    message: 'AI Vision analyzed Pothole Defect (94% confidence). Matched to primary specialist Er. Rajesh Patil (Utility Truck 1, 0.8 km away).'
  },
  {
    id: 'log-102',
    time: '12:22:04 PM',
    type: 'OFFICIAL_APPROVAL',
    level: 'DISPATCH',
    issueId: 'CS1039',
    officer: 'Er. Rajesh Patil',
    dept: 'Road Department',
    message: 'Official supervisor approved AI work order dispatch. Er. Rajesh Patil deployed on-site. 60-second remediation countdown initiated.'
  },
  {
    id: 'log-103',
    time: '12:22:05 PM',
    type: 'WORKER_BUSY_WAITLIST',
    level: 'WARNING',
    issueId: 'CS1032',
    officer: 'Er. Rajesh Patil',
    dept: 'Road Department',
    message: 'Bridge Approach Pothole (#CS1032) arrived. Primary officer Er. Rajesh Patil is currently BUSY on #CS1039. Ticket queued for automated assignment upon worker availability.'
  },
  {
    id: 'log-104',
    time: '12:24:30 PM',
    type: 'AI_MATCH_EVAL',
    level: 'INFO',
    issueId: 'CS1038',
    officer: 'Priya Deshmukh',
    dept: 'Sanitation Department',
    message: 'Garbage Accumulation evaluated. Matched to Lead Sanitarian Priya Deshmukh (Compactor 4, 1.2 km away).'
  }
];

// Helper to convert live backend Complaint database objects into AuthorityDashboard issue format
const mapApiComplaintToIssue = (c) => {
  const cleanId = c.id ? c.id.replace('#', '') : 'CS1000';
  const d = new Date(c.created_at);
  const createdOnDate = isNaN(d.getTime()) ? 'Today' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const createdOnTime = isNaN(d.getTime()) ? 'Just now' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Map category to appropriate civic visual evidence
  const cat = (c.category || '').toLowerCase();
  let defaultImg = '/sample_evidence/pothole.jpg';
  if (cat.includes('garbage') || cat.includes('waste')) defaultImg = '/sample_evidence/garbage.jpg';
  else if (cat.includes('water') || cat.includes('leak')) defaultImg = '/sample_evidence/water_leak.jpg';
  else if (cat.includes('light') || cat.includes('electric')) defaultImg = '/sample_evidence/streetlight.jpg';
  else if (cat.includes('drain') || cat.includes('manhole')) defaultImg = '/sample_evidence/manhole.jpg';

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
    title: c.title || (c.issue_type ? c.issue_type.replace(/_/g, ' ') : (c.category ? c.category.replace(/_/g, ' ') : 'Civic Issue')),
    location: c.address || 'Indore Urban Ward',
    priority: priority,
    department: deptName,
    departmentId: c.department_id ? String(c.department_id) : 'ROAD_DEPT',
    status: status,
    assignedTo: c.assigned_officer_name || designated.name,
    squad: c.assigned_officer_name ? (c.assigned_officer_name.includes('Patil') ? 'Field Squad A' : 'Field Squad B') : designated.squad,
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
    aiReasoning: c.grounded_explanation || c.severity_reason || `Matched to specialist ${designated.name} (${designated.squad}) based on civic infrastructure defect analysis.`
  };
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
    title: 'Water Leakage',
    location: 'Vijay Nagar, Indore',
    priority: 'Medium',
    department: 'Water Supply Department',
    departmentId: 'WATER_SUPPLY',
    status: 'Under Review',
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
    aiReasoning: 'PHE underground distribution main anomaly detected. Awaiting official confirmation before valve shutdown.'
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
    assignedTo: 'Er. Rajesh Patil',
    squad: 'Field Squad A',
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
    if (t === 'ORDERS') return 'orders';
    if (t === 'OFFICERS' || t === 'CREW') return 'crew';
    if (t === 'MAP') return 'map';
    if (t === 'CCTV') return 'cctv';
    if (t === 'ANALYTICS' || t === 'REPORTS') return 'analytics';
    if (t === 'USERS') return 'users';
    if (t === 'SETTINGS') return 'settings';
    return 'triage';
  };

  const [activeNav, setActiveNav] = useState(getInitialView());
  const [activeTab, setActiveTab] = useState('All Issues');
  const [drawerTab, setDrawerTab] = useState('Overview'); // 'Overview' | 'Timeline' | 'Location' | 'Work Orders'
  const [isDrawerOpenMobile, setIsDrawerOpenMobile] = useState(false);

  // Issues, Squads & Active Remediation Timers
  const [issues, setIssues] = useState(DEFAULT_ISSUES);
  const [squads, setSquads] = useState(INITIAL_SQUADS);
  const [activeJobs, setActiveJobs] = useState({}); // { [issueId]: { remainingSeconds: 60, officerName, squad } }

  // Autonomous Zero-Touch AI Dispatch Engine switch
  const [autoDispatchMode, setAutoDispatchMode] = useState(false);
  const autoDispatchModeRef = useRef(false);
  useEffect(() => {
    autoDispatchModeRef.current = autoDispatchMode;
  }, [autoDispatchMode]);

  // AI Autonomous Dispatch & Worker Activity Audit Log state
  const [aiAuditLogs, setAiAuditLogs] = useState(INITIAL_AI_LOGS);
  const [aiLogFilter, setAiLogFilter] = useState('ALL'); // 'ALL' | 'DISPATCH' | 'WAITLIST' | 'COMPLETE'

  // Helper to append real-time AI audit logs
  const addAiLog = ({ type, level = 'INFO', issueId, officer, dept, message }) => {
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      level,
      issueId: issueId ? issueId.replace('#', '') : 'SYSTEM',
      officer: officer || 'AI Engine',
      dept: dept || 'Municipal Ops',
      message
    };
    setAiAuditLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  // Inspect designated worker availability & busy status for any issue
  const getWorkerStatusForIssue = (issue) => {
    if (!issue) return { state: 'AVAILABLE', workerName: 'Er. Rajesh Patil', squadName: 'Field Squad A', activeTicket: null, remainingSeconds: 0, isAvailable: true };
    const cleanId = issue.id.replace('#', '');
    const designated = resolveDesignatedWorker(issue);
    const workerName = issue.assignedTo || designated.name;
    const squadName = issue.squad || designated.squad;

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

    // 2. Is designated worker engaged on ANOTHER ticket?
    const otherJobEntry = Object.entries(activeJobs).find(
      ([issKey, j]) => j.officerName === workerName && issKey !== cleanId
    );

    if (otherJobEntry) {
      return {
        state: 'BUSY_ON_OTHER',
        workerName,
        squadName,
        activeTicket: otherJobEntry[0],
        remainingSeconds: otherJobEntry[1].remainingSeconds,
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
      state: 'AVAILABLE',
      workerName,
      squadName,
      activeTicket: null,
      remainingSeconds: 0,
      isAvailable: true
    };
  };

  const [selectedIssueId, setSelectedIssueId] = useState('CS1039');
  const [selectedRows, setSelectedRows] = useState(['CS1039']);
  const [activeEvidenceImg, setActiveEvidenceImg] = useState(null);

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
    else if (t === 'ORDERS') setActiveNav('orders');
    else if (t === 'OFFICERS' || t === 'CREW') setActiveNav('crew');
    else if (t === 'MAP') setActiveNav('map');
    else if (t === 'CCTV') setActiveNav('cctv');
    else if (t === 'ANALYTICS' || t === 'REPORTS') setActiveNav('analytics');
    else if (t === 'USERS') setActiveNav('users');
    else if (t === 'SETTINGS') setActiveNav('settings');
    else setActiveNav('triage');

    const searchArg = searchParams.get('search');
    if (searchArg) {
      const clean = searchArg.replace('#', '');
      setSearchQuery(clean);
      setSelectedIssueId(clean);
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
            showToast(`🚨 New Citizen Report: #${newlyDiscovered[0].id} (${newlyDiscovered[0].title}) received in queue.`);
          }

          const liveIds = new Set(mappedLiveIssues.map((m) => m.id.replace('#', '')));
          const nonDupePrev = prev.filter((p) => !liveIds.has(p.id.replace('#', '')));
          return [...mappedLiveIssues, ...nonDupePrev];
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
  const handleJobFinished = (finishedCleanId, officerName, squadName) => {
    // 1. Mark finished issue as Resolved
    setIssues((prevIssues) =>
      prevIssues.map((iss) =>
        iss.id.replace('#', '') === finishedCleanId
          ? { ...iss, status: 'Resolved' }
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

    // 3. Add timeline resolution entry
    const completionNote = {
      text: `Remediation completed and verified on-site by ${officerName} (${squadName || 'Field Squad'}). Infrastructure defect repaired and verified safe.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      author: officerName
    };
    setTimelineNotes((prevNotes) => ({
      ...prevNotes,
      [finishedCleanId]: [completionNote, ...(prevNotes[finishedCleanId] || [])]
    }));

    // 4. AI Audit Log for completion
    addAiLog({
      type: 'REMEDIATION_COMPLETE',
      level: 'SUCCESS',
      issueId: finishedCleanId,
      officer: officerName,
      dept: squadName,
      message: `On-site repair completed by ${officerName} for #${finishedCleanId}. Defect resolved. Officer status changed to AVAILABLE.`
    });

    showToast(`🎉 Work Complete! Issue #${finishedCleanId} marked as RESOLVED. Officer ${officerName} is now AVAILABLE.`);

    // 5. Look for any waiting queued ticket for this officer!
    setTimeout(() => {
      setIssues((currentIssues) => {
        const waitingIssue = currentIssues.find((iss) => {
          const cid = iss.id.replace('#', '');
          if (cid === finishedCleanId) return false;
          if (iss.status === 'Resolved' || iss.status === 'In Progress') return false;
          const des = resolveDesignatedWorker(iss);
          const desName = iss.assignedTo || des.name;
          return desName === officerName;
        });

        if (waitingIssue) {
          const waitCleanId = waitingIssue.id.replace('#', '');
          if (autoDispatchModeRef.current) {
            handleApproveAiDispatch(waitCleanId, true);
          } else {
            addAiLog({
              type: 'WORKER_FREED',
              level: 'INFO',
              issueId: waitCleanId,
              officer: officerName,
              dept: squadName,
              message: `Specialist ${officerName} is now FREE. Ticket #${waitCleanId} assigned and ready for supervisor 1-click Approval or Edit.`
            });
            showToast(`Officer ${officerName} is now FREE. Issue #${waitCleanId} is ready for supervisor 1-click Approval or Edit.`);
          }
        }
        return currentIssues;
      });
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
            handleJobFinished(key, item.officerName, item.squad);
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

    handleJobFinished(cleanId, job.officerName, job.squad);
  };

  // Autonomous Mode Toggle Handler
  const handleToggleAutoDispatch = () => {
    setAutoDispatchMode((prev) => {
      const next = !prev;
      if (next) {
        addAiLog({
          type: 'AUTONOMOUS_DISPATCH',
          level: 'DISPATCH',
          issueId: 'SYSTEM',
          officer: 'AI Engine',
          message: 'Autonomous Zero-Touch AI Dispatch turned ON. Field workers will be automatically selected, approved, and dispatched without human delay.'
        });
        showToast('🤖 Autonomous AI Dispatch (Zero-Touch) ENABLED. Workers will be auto-assigned and dispatched.');

        // Immediately check and auto-dispatch any pending tickets with available workers
        setTimeout(() => {
          setIssues((currIssues) => {
            const pendingIssues = currIssues.filter(
              (i) => i.status !== 'Resolved' && i.status !== 'In Progress' && !activeJobs[i.id.replace('#', '')]
            );
            pendingIssues.forEach((iss) => {
              const des = resolveDesignatedWorker(iss);
              const workerName = iss.assignedTo || des.name;
              const isBusy = Object.values(activeJobs).some((j) => j.officerName === workerName);
              if (!isBusy) {
                handleApproveAiDispatch(iss.id, true);
              }
            });
            return currIssues;
          });
        }, 150);
      } else {
        addAiLog({
          type: 'AI_MATCH_EVAL',
          level: 'INFO',
          issueId: 'SYSTEM',
          officer: 'Human Director',
          message: 'Human-in-the-Loop Supervision mode enabled. Official supervisor must click Approve or Edit for each assignment.'
        });
        showToast('Human Supervision Mode enabled. Supervisor 1-click Approval or Edit required.');
      }
      return next;
    });
  };

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
    if (activeTab === 'Needs Assignment') return !item.assignedTo || item.status === 'Submitted' || item.status === 'Under Review';
    if (activeTab === 'High Priority') return item.priority === 'High';
    if (activeTab === 'In Progress') return item.status === 'In Progress';
    if (activeTab === 'Escalated') return item.status === 'Escalated';
    if (activeTab === 'Resolved') return item.status === 'Resolved';
    return true;
  });

  // Paginated issues
  const totalPages = Math.ceil(filteredIssues.length / pageSize) || 1;
  const paginatedIssues = filteredIssues.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Row selection
  const handleSelectRow = (id) => {
    const cleanId = id.replace('#', '');
    setSelectedIssueId(cleanId);
    if (selectedRows.includes(cleanId)) {
      setSelectedRows(selectedRows.filter((r) => r !== cleanId));
    } else {
      setSelectedRows([...selectedRows, cleanId]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredIssues.map((i) => i.id.replace('#', '')));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowClick = (issue) => {
    const cleanId = issue.id.replace('#', '');
    setSelectedIssueId(cleanId);
    setIsDrawerOpenMobile(true);
  };

  // Status updates
  const handleUpdateStatus = (newStatus) => {
    if (!currentIssue) return;
    setIssues((prev) =>
      prev.map((i) => (i.id === currentIssue.id ? { ...i, status: newStatus } : i))
    );
    setIsUpdateModalOpen(false);
    showToast(`Complaint #${currentIssue.id} status updated to "${newStatus}".`);
  };

  // Squad assignment
  const handleAssignSquad = (squadObj) => {
    if (!currentIssue) return;
    const cleanId = currentIssue.id.replace('#', '');
    setIssues((prev) =>
      prev.map((i) =>
        i.id === currentIssue.id
          ? { ...i, assignedTo: squadObj.name, squad: squadObj.squad, status: 'Assigned' }
          : i
      )
    );
    setIsAssignModalOpen(false);
    addAiLog({
      type: 'REASSIGNMENT',
      level: 'INFO',
      issueId: cleanId,
      officer: squadObj.name,
      dept: squadObj.dept,
      message: `Manual supervisor override: Assigned ${squadObj.name} (${squadObj.squad}) to ticket #${cleanId}. Status set to Assigned.`
    });
    showToast(`Assigned ${squadObj.name} (${squadObj.squad}) to #${currentIssue.id}.`);
  };

  // Bulk actions
  const handleBulkStatusChange = (status) => {
    if (selectedRows.length === 0) return;
    setIssues((prev) =>
      prev.map((i) => (selectedRows.includes(i.id.replace('#', '')) ? { ...i, status } : i))
    );
    showToast(`Updated ${selectedRows.length} selected tickets to "${status}".`);
  };

  // ============================================================
  // APPROVE AI DISPATCH & 1-MINUTE REMEDIATION START
  // ============================================================
  const handleApproveAiDispatch = (issueId, isAutonomous = false) => {
    const cleanId = issueId.replace('#', '');
    const issue = issues.find((i) => i.id.replace('#', '') === cleanId);
    if (!issue) return;

    const designated = resolveDesignatedWorker(issue);
    const officerName = issue.assignedTo || designated.name;
    const squadName = issue.squad || designated.squad;

    // Check if designated worker is already busy on another ticket
    const busyJob = Object.entries(activeJobs).find(
      ([issKey, j]) => j.officerName === officerName && issKey !== cleanId
    );
    if (busyJob) {
      showToast(`Cannot dispatch: ${officerName} is currently busy on #${busyJob[0]} (${busyJob[1].remainingSeconds}s remaining). Queued for auto-assignment.`);
      return;
    }

    // 1. Mark issue as In Progress
    setIssues((prev) =>
      prev.map((i) =>
        i.id.replace('#', '') === cleanId
          ? { ...i, status: 'In Progress', assignedTo: officerName, squad: squadName }
          : i
      )
    );

    // 2. Mark officer as BUSY (ON SITE)
    setSquads((prev) =>
      prev.map((sq) =>
        sq.name === officerName
          ? { ...sq, status: 'BUSY (ON SITE)', activeTicket: cleanId }
          : sq
      )
    );

    // 3. Start 60-second active job timer (1 minute countdown)
    setActiveJobs((prev) => ({
      ...prev,
      [cleanId]: {
        remainingSeconds: 60,
        officerName,
        squad: squadName
      }
    }));

    // 4. Add dispatch note to timeline
    const dispatchNote = {
      text: isAutonomous
        ? `[Zero-Touch Auto-Dispatch] Autonomous AI engine approved & dispatched ${officerName} (${squadName}). Field squad deployed on-site for 60s remediation.`
        : `Approved AI assignment. Work order dispatched to ${officerName} (${squadName}). Field squad deployed on-site. Status marked BUSY for 1-minute remediation repair.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      author: isAutonomous ? '🤖 Autonomous AI Dispatcher' : 'Official Municipal Director'
    };
    setTimelineNotes((prev) => ({
      ...prev,
      [cleanId]: [dispatchNote, ...(prev[cleanId] || [])]
    }));

    // 5. Add to AI Audit Log
    addAiLog({
      type: isAutonomous ? 'AUTONOMOUS_DISPATCH' : 'OFFICIAL_APPROVAL',
      level: 'DISPATCH',
      issueId: cleanId,
      officer: officerName,
      dept: issue.department,
      message: isAutonomous
        ? `[Zero-Touch Mode] AI autonomously selected & dispatched ${officerName} to #${cleanId}. 60s remediation countdown initiated.`
        : `Supervisor confirmed & approved AI assignment for #${cleanId}. Dispatched ${officerName} (${squadName}). 60s remediation countdown initiated.`
    });

    showToast(
      isAutonomous
        ? `🤖 Autonomous AI Dispatch: #${cleanId} dispatched to ${officerName} (Zero-Touch).`
        : `Approved AI assignment for issue #${cleanId}. Work order dispatched. ${officerName} is now BUSY on-site (60s countdown started).`
    );
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
              onClick={() => { setActiveNav('triage'); setSearchParams({}); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'triage'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ClipboardList className={`w-4 h-4 ${activeNav === 'triage' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>Triage & Dispatch</span>
            </button>

            {/* Work Orders */}
            <button
              type="button"
              onClick={() => { setActiveNav('orders'); setSearchParams({ tab: 'ORDERS' }); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'orders'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeNav === 'orders' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>Work Orders</span>
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
            <span className="text-[11px] text-slate-700">Indore Municipal Corp</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">CivicSeva v1.0.0</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Triage & Dispatch
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Review incoming civic issues, assign field crews, and track resolution progress.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-xs text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-700 font-medium">Friday, 26 Sep 2026 &bull; 07:50 PM</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(true)}
                  className="px-3.5 py-2 rounded-md bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs shadow-xs transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Work Order</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs & Filter Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pt-1">
              <div className="flex items-center space-x-3 sm:space-x-5 text-xs overflow-x-auto pb-1">
                {['All Issues', 'Needs Assignment', 'High Priority', 'In Progress', 'Escalated', 'Resolved'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                    className={`pb-2.5 font-medium transition border-b-2 whitespace-nowrap ${
                      activeTab === tab
                        ? 'border-blue-800 text-blue-900 font-semibold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange('In Progress')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded font-medium text-xs transition"
                    >
                      Mark In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange('Resolved')}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium text-xs transition"
                    >
                      Mark Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(true)}
                      className="px-2.5 py-1 bg-blue-800 hover:bg-blue-900 text-white rounded font-medium text-xs transition"
                    >
                      Assign Squad
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRows([])}
                      className="text-slate-500 hover:underline px-1 text-xs"
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
                          checked={selectedRows.length === filteredIssues.length && filteredIssues.length > 0}
                          className="rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                        />
                      </th>
                      <th className="px-3 py-3">ID</th>
                      <th className="px-4 py-3">Issue & Location</th>
                      <th className="px-3 py-3">Priority</th>
                      <th className="px-3 py-3">Department</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Assigned To</th>
                      <th className="px-3 py-3">Created On</th>
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

                        return (
                          <tr
                            key={issue.id}
                            onClick={() => handleRowClick(issue)}
                            className={`hover:bg-slate-50 cursor-pointer transition ${
                              isSelected ? 'bg-blue-50/60 font-medium' : ''
                            }`}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(cleanId)}
                                onChange={() => handleSelectRow(cleanId)}
                                className="rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                              />
                            </td>

                            <td className="px-3 py-3 font-mono font-semibold text-blue-800">
                              <div className="flex items-center gap-1.5">
                                <span>{issue.id.startsWith('#') ? issue.id : `#${issue.id}`}</span>
                                {issue.isLiveReport && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
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
                                  className="w-10 h-10 rounded object-cover border border-slate-200 flex-shrink-0"
                                />
                                <div>
                                  <span className="font-semibold text-slate-900 block leading-snug">
                                    {issue.title}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block line-clamp-1">
                                    {issue.location}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3">
                              {issue.priority === 'High' ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                  High
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                  Medium
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-3 text-slate-700 font-medium">
                              {issue.department}
                            </td>

                            <td className="px-3 py-3">
                              {job ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-xs animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                                  <span>Busy ({job.remainingSeconds}s)</span>
                                </span>
                              ) : workerStatus.state === 'BUSY_ON_OTHER' ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-xs" title={`Worker ${workerStatus.workerName} busy on #${workerStatus.activeTicket}`}>
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Queued ({workerStatus.remainingSeconds}s)</span>
                                </span>
                              ) : (
                                <>
                                  {issue.status === 'Assigned' && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                      Assigned
                                    </span>
                                  )}
                                  {issue.status === 'In Progress' && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                      In Progress
                                    </span>
                                  )}
                                  {issue.status === 'Under Review' && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                      Under Review
                                    </span>
                                  )}
                                  {issue.status === 'Submitted' && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                      Submitted
                                    </span>
                                  )}
                                  {issue.status === 'Escalated' && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                      Escalated
                                    </span>
                                  )}
                                  {issue.status === 'Resolved' && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Resolved</span>
                                    </span>
                                  )}
                                </>
                              )}
                            </td>

                            <td className="px-3 py-3">
                              <div className="leading-tight">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-900 block truncate max-w-[130px]">
                                    {issue.assignedTo || workerStatus.workerName}
                                  </span>
                                  {workerStatus.state === 'BUSY_ON_THIS' && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                                      BUSY
                                    </span>
                                  )}
                                  {workerStatus.state === 'BUSY_ON_OTHER' && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title={`Busy on #${workerStatus.activeTicket}`}>
                                      BUSY ({workerStatus.remainingSeconds}s)
                                    </span>
                                  )}
                                  {workerStatus.state === 'AVAILABLE' && issue.status !== 'Resolved' && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      FREE
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {issue.squad || workerStatus.squadName}
                                </span>
                              </div>
                            </td>

                            <td className="px-3 py-3 text-slate-500 leading-tight">
                              <span className="block text-slate-700 text-[11px]">{issue.createdOnDate}</span>
                              <span className="block text-[10px] text-slate-400">{issue.createdOnTime}</span>
                            </td>

                            <td 
                              className="px-2 py-3 text-slate-400 hover:text-slate-700" 
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
                  Showing {Math.min(1, filteredIssues.length)} to {Math.min(filteredIssues.length, currentPage * pageSize)} of {filteredIssues.length} issues
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveNav('triage'); setSearchParams({}); }}
                  className="px-3.5 py-2 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
                >
                  Back to Triage
                </button>
              </div>
            </div>

            {/* AUTONOMOUS ZERO-TOUCH AI DISPATCH MASTER CONTROL BANNER */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-lg p-5 border border-blue-800 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-lg border flex-shrink-0 ${
                    autoDispatchMode 
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                      : 'bg-blue-500/20 border-blue-400 text-blue-300'
                  }`}>
                    <Cpu className={`w-7 h-7 ${autoDispatchMode ? 'animate-pulse text-emerald-400' : ''}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="font-bold text-base text-white">Autonomous AI Dispatch Engine</h2>
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                        autoDispatchMode
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-700 text-slate-300 border-slate-600'
                      }`}>
                        {autoDispatchMode ? '● Zero-Touch Mode (ACTIVE)' : '○ Human Oversight Mode'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      {autoDispatchMode 
                        ? '🚀 Zero-Touch Active: The AI autonomously selects, approves, and dispatches field squads without requiring human confirmation. If a specialist is busy, tickets are automatically queued and dispatched the moment they become free.'
                        : '🛡️ Human Oversight Active: The AI pairs issues with designated department specialists and monitors live queue availability. When free, supervisors review the AI rationale and simply click Approve or Edit.'}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center gap-3 self-end md:self-center bg-white/5 border border-white/10 p-2.5 rounded-lg flex-shrink-0">
                  <div className="text-right">
                    <span className="text-[11px] font-bold block text-white">
                      {autoDispatchMode ? 'Zero-Touch ENABLED' : 'Manual Review'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {autoDispatchMode ? 'No human clicks needed' : 'Click Approve or Edit'}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoDispatchMode}
                    onClick={handleToggleAutoDispatch}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoDispatchMode ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        autoDispatchMode ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Status Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-blue-900/60 text-xs">
                <div className="bg-white/5 rounded p-2 border border-white/10">
                  <span className="text-slate-400 text-[10px] block font-mono">TOTAL ISSUES</span>
                  <strong className="text-white text-sm font-semibold">{issues.length} Monitored</strong>
                </div>
                <div className="bg-white/5 rounded p-2 border border-white/10">
                  <span className="text-slate-400 text-[10px] block font-mono">ACTIVE REMEDIATIONS</span>
                  <strong className="text-amber-400 text-sm font-semibold">{Object.keys(activeJobs).length} Ongoing (60s)</strong>
                </div>
                <div className="bg-white/5 rounded p-2 border border-white/10">
                  <span className="text-slate-400 text-[10px] block font-mono">AUTONOMOUS DISPATCHES</span>
                  <strong className="text-emerald-400 text-sm font-semibold">{aiAuditLogs.filter(l => l.type === 'AUTONOMOUS_DISPATCH').length} Executed</strong>
                </div>
                <div className="bg-white/5 rounded p-2 border border-white/10">
                  <span className="text-slate-400 text-[10px] block font-mono">AVAILABLE SPECIALISTS</span>
                  <strong className="text-cyan-400 text-sm font-semibold">{squads.filter(s => s.status === 'AVAILABLE').length} On-Call</strong>
                </div>
              </div>
            </div>

            {/* REAL-TIME AI AUTONOMOUS DISPATCH & WORKER ACTIVITY AUDIT LOG */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-blue-100 text-blue-800">
                    <ClipboardList className="w-4 h-4 text-blue-800" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">
                        AI Autonomous Dispatch & Worker Activity Audit Log
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live Stream
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Chronological trace of AI match rationale, worker busy waitlists, auto-dispatches, and completions.
                    </span>
                  </div>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  {['ALL', 'DISPATCH', 'WAITLIST', 'COMPLETE'].map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setAiLogFilter(filterKey)}
                      className={`px-2.5 py-1 rounded font-semibold transition ${
                        aiLogFilter === filterKey
                          ? 'bg-blue-800 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {filterKey === 'ALL' && `All Logs (${aiAuditLogs.length})`}
                      {filterKey === 'DISPATCH' && 'Dispatches'}
                      {filterKey === 'WAITLIST' && 'Waitlists / Busy'}
                      {filterKey === 'COMPLETE' && 'Completions'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAiAuditLogs(INITIAL_AI_LOGS)}
                    className="text-slate-400 hover:text-slate-700 ml-1 p-1"
                    title="Reset to Initial Audit Logs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable logs container */}
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs font-mono">
                {aiAuditLogs
                  .filter((log) => {
                    if (aiLogFilter === 'DISPATCH') return log.type === 'AUTONOMOUS_DISPATCH' || log.type === 'OFFICIAL_APPROVAL';
                    if (aiLogFilter === 'WAITLIST') return log.type === 'WORKER_BUSY_WAITLIST' || log.type === 'WORKER_FREED';
                    if (aiLogFilter === 'COMPLETE') return log.type === 'REMEDIATION_COMPLETE';
                    return true;
                  })
                  .map((log) => {
                    let badgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
                    let badgeLabel = 'AI LOG';

                    if (log.type === 'AUTONOMOUS_DISPATCH') {
                      badgeClass = 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
                      badgeLabel = '🤖 ZERO-TOUCH DISPATCH';
                    } else if (log.type === 'OFFICIAL_APPROVAL') {
                      badgeClass = 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
                      badgeLabel = '👤 SUPERVISOR APPROVED';
                    } else if (log.type === 'WORKER_BUSY_WAITLIST') {
                      badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                      badgeLabel = '⏳ WORKER BUSY / QUEUED';
                    } else if (log.type === 'WORKER_FREED') {
                      badgeClass = 'bg-cyan-100 text-cyan-900 border-cyan-300 font-bold';
                      badgeLabel = '✅ WORKER FREED';
                    } else if (log.type === 'REMEDIATION_COMPLETE') {
                      badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
                      badgeLabel = '🎉 REMEDIATION COMPLETE';
                    } else if (log.type === 'REASSIGNMENT') {
                      badgeClass = 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold';
                      badgeLabel = '✏️ REASSIGNED / OVERRIDE';
                    } else if (log.type === 'AI_MATCH_EVAL') {
                      badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                      badgeLabel = '🧠 AI MATCH EVAL';
                    }

                    return (
                      <div key={log.id} className="p-3 hover:bg-slate-50/80 transition flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <span className="text-slate-400 text-[11px] font-mono whitespace-nowrap mt-0.5">
                            {log.time}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] border whitespace-nowrap ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                          <span className="font-bold text-blue-900 text-xs whitespace-nowrap">
                            #{log.issueId}
                          </span>
                          <p className="text-slate-700 text-xs font-sans leading-relaxed">
                            {log.message}
                          </p>
                        </div>
                        {log.officer && (
                          <span className="text-[11px] text-slate-500 whitespace-nowrap font-sans font-medium hidden md:inline">
                            {log.officer}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* AI Review Queue Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">
                  Incident Roster & Worker Availability Status ({issues.length} Tickets)
                </h3>
                <span className="text-xs text-slate-500">
                  Automated department specialist matching & real-time remediation status
                </span>
              </div>

              {issues.map((item) => {
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
                        <strong className="text-blue-900 block mt-0.5">
                          📍 {item.aiDistanceKm || 0.8} km away (Haversine GPS)
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
                              ? ` 🤖 Zero-Touch Mode is ON: The AI will autonomously assign & dispatch ${workerStatus.workerName} to this issue the moment #${workerStatus.activeTicket} completes in ${workerStatus.remainingSeconds}s.`
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

                        {/* Action depending on availability and state */}
                        {workerStatus.state === 'BUSY_ON_THIS' ? (
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
                            className="px-4 py-1.5 rounded bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve AI Assignment & Dispatch (60s Timer)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

        {/* VIEW G: WORK ORDERS */}
        {activeNav === 'orders' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Operations</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">Work Orders</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Municipal Work Orders & Repair Directives
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track field crew task orders, material allocations, and civic defect remediation milestones.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(true)}
                className="px-3.5 py-2 rounded bg-blue-800 text-white font-medium text-xs hover:bg-blue-900 transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Work Order</span>
              </button>
            </div>

            {/* Work Orders Table */}
            <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Order ID</th>
                    <th className="py-3 px-4 font-semibold">Task Description</th>
                    <th className="py-3 px-4 font-semibold">Department</th>
                    <th className="py-3 px-4 font-semibold">Priority</th>
                    <th className="py-3 px-4 font-semibold">Assigned Squad</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issues.map((it, idx) => {
                    const cleanId = it.id.replace('#', '');
                    const job = activeJobs[cleanId];

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-800">
                          WO-{cleanId}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {it.title} &bull; <span className="text-slate-500 text-[11px]">{it.location}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{it.department}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            it.priority === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {it.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {it.assignedTo || 'Pending Assignment'} {it.squad ? `(${it.squad})` : ''}
                        </td>
                        <td className="py-3 px-4">
                          {job ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] animate-pulse">
                              Busy ({job.remainingSeconds}s)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-medium text-[11px]">
                              {it.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIssueId(cleanId);
                              setIsUpdateModalOpen(true);
                            }}
                            className="text-blue-800 hover:underline font-semibold"
                          >
                            Update Status
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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

              <div className="flex items-center gap-2">
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
                  value="Indore Municipal Corporation (IMC), Madhya Pradesh"
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
      {currentIssue && activeNav === 'triage' && (
        <>
          {/* Mobile Backdrop */}
          {isDrawerOpenMobile && (
            <div 
              className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsDrawerOpenMobile(false)}
            />
          )}

          <aside className={`
            fixed lg:sticky top-0 lg:top-16 right-0 z-50 lg:z-10
            w-full sm:w-[420px] lg:w-80 xl:w-96
            h-screen lg:h-[calc(100vh-64px)]
            bg-white border-l border-slate-200 shadow-2xl lg:shadow-none
            flex flex-col justify-between overflow-y-auto transition-transform duration-300
            ${isDrawerOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          `}>
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
                  onClick={() => {
                    setIsDrawerOpenMobile(false);
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100"
                  title="Close details drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Evidence Photo */}
              <div className="relative rounded-md overflow-hidden border border-slate-200 bg-slate-950 aspect-video flex items-center justify-center">
                <img
                  src={activeEvidenceImg || currentIssue.image}
                  alt={currentIssue.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                  Verified Evidence Photo
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

              {/* Drawer Sub-Tabs: Overview, Timeline, Location, Work Orders */}
              <div className="grid grid-cols-4 border-b border-slate-200 text-xs text-center select-none">
                {['Overview', 'Timeline', 'Location', 'Work Orders'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDrawerTab(tab)}
                    className={`pb-2.5 transition font-medium ${
                      drawerTab === tab
                        ? 'font-bold text-blue-800 border-b-2 border-blue-800'
                        : 'text-slate-400 hover:text-slate-700 border-b-2 border-transparent'
                    }`}
                  >
                    {tab}
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

                  {/* Description */}
                  <div className="border-t border-slate-100 pt-3 space-y-1 text-xs">
                    <span className="font-semibold text-slate-900 block">Description</span>
                    <p className="text-slate-600 leading-relaxed">
                      {currentIssue.description}
                    </p>
                  </div>

                  {/* Multi-Photo Evidence Gallery */}
                  <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                    <span className="font-semibold text-slate-900 block">Evidence Photos (Click to preview)</span>
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
                      <p className="text-slate-600 text-[11px] mt-0.5">Citizen logged report via CivicSeva portal with GPS coordinates and evidence.</p>
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
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nearest Fleet:</span>
                      <span className="font-semibold text-blue-900">📍 {currentIssue.aiDistanceKm || 0.8} km away</span>
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

              {/* TAB 4: WORK ORDERS */}
              {drawerTab === 'Work Orders' && (
                <div className="space-y-4 text-xs pt-1">
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold block">DIRECTIVE ID</span>
                        <strong className="text-sm font-bold text-blue-900">WO-{currentIssue.id.replace('#', '')}-R1</strong>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {currentIssue.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Assigned Squad:</span>
                        <strong className="text-slate-800">{currentIssue.assignedTo || 'Unassigned'} {currentIssue.squad ? `(${currentIssue.squad})` : ''}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target SLA:</span>
                        <span className="font-medium text-slate-800">24 Hours (Standard Municipal SLA)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Allocated Materials:</span>
                        <span className="font-medium text-slate-800">Cold Asphalt Patch / Heavy Tamper</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Operational Directive:</span>
                        <p className="text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200 leading-relaxed">
                          {currentIssue.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsUpdateModalOpen(true)}
                        className="flex-1 py-2 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs transition"
                      >
                        Update Status
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center justify-center gap-1"
                        title="Print Work Order Directive"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons at bottom of Drawer */}
            <div className="p-5 border-t border-slate-200 bg-white space-y-2">
              {/* PRIMARY 1-MINUTE REMEDIATION ACTION BASED ON AVAILABILITY */}
              {activeJobForCurrent ? (
                <button
                  type="button"
                  onClick={() => handleFastForwardJob(currentIssue.id)}
                  className="w-full py-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2"
                >
                  <FastForward className="w-4 h-4" />
                  <span>Mark Work Done Now ({activeJobForCurrent.remainingSeconds}s remaining)</span>
                </button>
              ) : drawerWorkerStatus?.state === 'BUSY_ON_OTHER' ? (
                <div className="space-y-2">
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-amber-950 text-xs space-y-1 shadow-xs">
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
                        No Worker Currently Available
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px]">
                        Free in {drawerWorkerStatus.remainingSeconds}s
                      </span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      Specialist <strong>{drawerWorkerStatus.workerName}</strong> is busy on #{drawerWorkerStatus.activeTicket}.
                      {autoDispatchMode 
                        ? ' Will auto-dispatch immediately when free.' 
                        : ' Will be assigned when free; supervisor can click Approve or Edit.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="w-full py-2.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Override & Reassign Alternative Worker Now</span>
                  </button>
                </div>
              ) : currentIssue.status !== 'Resolved' ? (
                <button
                  type="button"
                  onClick={() => handleApproveAiDispatch(currentIssue.id, autoDispatchMode)}
                  className="w-full py-2.5 rounded bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve AI Assignment & Dispatch (60s Timer)</span>
                </button>
              ) : (
                <div className="w-full py-2 text-center text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  <span>Work Completed & Verified on Site</span>
                </div>
              )}

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
              {squads.map((sq, idx) => (
                <div
                  key={sq.id || idx}
                  onClick={() => handleAssignSquad(sq)}
                  className="p-3 border border-slate-200 hover:border-blue-700 hover:bg-blue-50/50 rounded cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 block font-semibold">{sq.name}</strong>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        sq.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {sq.status}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px] block">{sq.squad} &bull; {sq.dept}</span>
                  </div>
                  <button type="button" className="px-3 py-1 bg-blue-800 text-white rounded text-[11px] font-medium">
                    Assign
                  </button>
                </div>
              ))}
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
    </div>
  );
};
