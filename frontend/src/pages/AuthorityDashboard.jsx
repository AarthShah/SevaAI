import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, FileText, Users, Building2, Map, BarChart3, 
  Camera, TrendingUp, UserCog, Settings, Calendar, Plus, 
  Filter, MoreVertical, X, Check, MapPin, Building, User, 
  ChevronDown, CheckCircle2, AlertCircle, ArrowUpRight, Search, 
  RefreshCw, CheckSquare, Layers, Cpu, ShieldCheck, ArrowRight, 
  Phone, Eye, Clock, Radio, Menu, Bell, LogOut, ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { complaintApi } from '../api/complaintApi';
import { officerApi } from '../api/officerApi';
import { departmentApi } from '../api/departmentApi';
import { cctvApi } from '../api/cctvApi';
import { analyticsApi } from '../api/analyticsApi';
import { LeafletMap } from '../components/LeafletMap';
import { CivicLogo } from '../components/CivicLogo';

// 5 Municipal Departments Data
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

// Baseline issues matching reference screenshot
const DEFAULT_ISSUES = [
  {
    id: 'CS1039',
    title: 'Pothole',
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
    description: 'Large pothole on the main road causing vehicle damage and safety risk.',
    image: '/sample_evidence/pothole.jpg',
    evidenceGallery: ['/sample_evidence/pothole.jpg', '/sample_evidence/pothole.jpg', '/sample_evidence/pothole.jpg'],
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
    evidenceGallery: ['/sample_evidence/garbage.jpg'],
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
    evidenceGallery: ['/sample_evidence/water_leak.jpg'],
    extraEvidenceCount: 1,
    aiDistanceKm: 2.1,
    aiConfidence: '89%',
    aiReasoning: 'PHE underground distribution main anomaly detected. Awaiting official confirmation before valve shutdown.'
  },
  {
    id: 'CS1035',
    title: 'Open Manhole',
    location: 'Near C21 Mall, Indore',
    priority: 'High',
    department: 'Road Department',
    departmentId: 'ROAD_DEPT',
    status: 'Escalated',
    assignedTo: null,
    squad: null,
    createdOnDate: '26 Sep 2026',
    createdOnTime: '03:20 PM',
    reportedBy: 'Traffic Police Patrol',
    description: 'Missing sewer cover creating life-threatening hazard on high speed vehicular lane.',
    image: '/sample_evidence/pothole.jpg',
    evidenceGallery: ['/sample_evidence/pothole.jpg'],
    extraEvidenceCount: 3,
    aiDistanceKm: 0.5,
    aiConfidence: '98%',
    aiReasoning: 'Critical pedestrian and vehicle life safety alert. Auto-escalated to Level 2 supervisor.'
  },
  {
    id: 'CS1034',
    title: 'Drainage Overflow',
    location: 'Scheme 78, Indore',
    priority: 'Medium',
    department: 'Sanitation Department',
    departmentId: 'SOLID_WASTE',
    status: 'In Progress',
    assignedTo: 'Sneha Jagtap',
    squad: 'Field Squad B',
    createdOnDate: '26 Sep 2026',
    createdOnTime: '02:44 PM',
    reportedBy: 'Citizen (via Web)',
    description: 'Monsoon catch basin choked with plastic debris causing local street waterlogging.',
    image: '/sample_evidence/water_leak.jpg',
    evidenceGallery: ['/sample_evidence/water_leak.jpg'],
    extraEvidenceCount: 0,
    aiDistanceKm: 1.8,
    aiConfidence: '93%',
    aiReasoning: 'Stormwater catchment choke pattern matched to Scheme 78 culvert drainage grid.'
  },
  {
    id: 'CS1033',
    title: 'Garbage Accumulation',
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
    extraEvidenceCount: 2,
    aiDistanceKm: 1.1,
    aiConfidence: '90%',
    aiReasoning: 'Assigned to Ward Inspector Amit More for scheduled commercial evening haul.'
  },
  {
    id: 'CS1032',
    title: 'Pothole',
    location: 'Palasia Square, Indore',
    priority: 'High',
    department: 'Road Department',
    departmentId: 'ROAD_DEPT',
    status: 'In Progress',
    assignedTo: 'Kiran Desai',
    squad: 'Field Squad C',
    createdOnDate: '26 Sep 2026',
    createdOnTime: '12:34 PM',
    reportedBy: 'Citizen (via Web)',
    description: 'Sub-surface road settlement creating deep rut on bridge approach curve.',
    image: '/sample_evidence/pothole.jpg',
    evidenceGallery: ['/sample_evidence/pothole.jpg'],
    extraEvidenceCount: 1,
    aiDistanceKm: 0.9,
    aiConfidence: '95%',
    aiReasoning: 'Heavy axle route intersection. Dispatched to Quick Asphalt Response Unit C.'
  }
];

const AVAILABLE_SQUADS = [
  { name: 'Er. Rajesh Patil', squad: 'Field Squad A', dept: 'Road Department' },
  { name: 'Priya Deshmukh', squad: 'Field Squad B', dept: 'Sanitation Department' },
  { name: 'Vikram Shinde', squad: 'Field Squad A', dept: 'Electricity Department' },
  { name: 'Sneha Jagtap', squad: 'Field Squad B', dept: 'Sanitation Department' },
  { name: 'Amit More', squad: 'Field Squad A', dept: 'Sanitation Department' },
  { name: 'Kiran Desai', squad: 'Field Squad C', dept: 'Road Department' }
];

const CCTV_CHANNELS = [
  { camera_id: 'CCTV-PN-01', location: 'Shivajinagar Junction Arterial Cam', ward: 'Central Ward', sample_snapshot: '/sample_evidence/pothole.jpg' },
  { camera_id: 'CCTV-PN-02', location: 'Market Central Produce Cam', ward: 'Market Yard', sample_snapshot: '/sample_evidence/garbage.jpg' },
  { camera_id: 'CCTV-PN-03', location: 'Riverbank Water Distribution Hub', ward: 'Utility Corridor', sample_snapshot: '/sample_evidence/water_leak.jpg' },
  { camera_id: 'CCTV-PN-04', location: 'Outer Bypass Highway KM 14', ward: 'Highway Sector', sample_snapshot: '/sample_evidence/streetlight.jpg' },
  { camera_id: 'CCTV-PN-05', location: 'Swargate Multi-Modal Transit Terminal', ward: 'South Hub', sample_snapshot: '/sample_evidence/pothole.jpg' }
];

export const AuthorityDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active view: 'triage' | 'departments' | 'ai_review' | 'map' | 'cctv' | 'analytics'
  const tabParam = searchParams.get('tab');
  const getInitialView = () => {
    if (tabParam === 'DEPARTMENTS') return 'departments';
    if (tabParam === 'AI_REVIEW') return 'ai_review';
    if (tabParam === 'MAP') return 'map';
    if (tabParam === 'CCTV') return 'cctv';
    if (tabParam === 'ANALYTICS') return 'analytics';
    return 'triage';
  };

  const [activeNav, setActiveNav] = useState(getInitialView());
  const [activeTab, setActiveTab] = useState('All Issues');

  // Issues and details drawer state
  const [issues, setIssues] = useState(DEFAULT_ISSUES);
  const [selectedIssueId, setSelectedIssueId] = useState('CS1039');
  const [selectedRows, setSelectedRows] = useState(['CS1039']);

  // Modals
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // CCTV State
  const [selectedCctv, setSelectedCctv] = useState(CCTV_CHANNELS[0]);
  const [cctvScanning, setCctvScanning] = useState(false);

  // New Work Order form state
  const [newOrderTitle, setNewOrderTitle] = useState('');
  const [newOrderDept, setNewOrderDept] = useState('Road Department');
  const [newOrderPriority, setNewOrderPriority] = useState('High');
  const [newOrderLocation, setNewOrderLocation] = useState('Indore Central Ward');
  const [newOrderDesc, setNewOrderDesc] = useState('');

  const { user, logout, switchDemoRole } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState(searchParams.get('search') || '');

  // Sync tab param changes
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'DEPARTMENTS') setActiveNav('departments');
    else if (t === 'AI_REVIEW') setActiveNav('ai_review');
    else if (t === 'MAP') setActiveNav('map');
    else if (t === 'CCTV') setActiveNav('cctv');
    else if (t === 'ANALYTICS') setActiveNav('analytics');
    else setActiveNav('triage');
  }, [searchParams]);

  // Sync search input when URL param changes
  useEffect(() => {
    setSidebarSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSidebarSearchSubmit = (e) => {
    e.preventDefault();
    if (sidebarSearch.trim()) {
      setSearchParams({ search: sidebarSearch.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleToggleToCitizen = async () => {
    await switchDemoRole('citizen');
    navigate('/');
  };

  const searchQuery = searchParams.get('search') || '';
  const currentIssue = issues.find((i) => i.id === selectedIssueId || i.id === `#${selectedIssueId}`) || issues[0];

  // Filtered issues
  const filteredIssues = issues.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    if (activeTab === 'All Issues') return true;
    if (activeTab === 'Needs Assignment') return !item.assignedTo || item.status === 'Submitted' || item.status === 'Under Review';
    if (activeTab === 'High Priority') return item.priority === 'High';
    if (activeTab === 'In Progress') return item.status === 'In Progress';
    if (activeTab === 'Escalated') return item.status === 'Escalated';
    if (activeTab === 'Resolved') return item.status === 'Resolved';
    return true;
  });

  const handleSelectRow = (id) => {
    setSelectedIssueId(id);
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((r) => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredIssues.map((i) => i.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleUpdateStatus = (newStatus) => {
    if (!currentIssue) return;
    setIssues((prev) =>
      prev.map((i) => (i.id === currentIssue.id ? { ...i, status: newStatus } : i))
    );
    setIsUpdateModalOpen(false);
  };

  const handleAssignSquad = (squadObj) => {
    if (!currentIssue) return;
    setIssues((prev) =>
      prev.map((i) =>
        i.id === currentIssue.id
          ? { ...i, assignedTo: squadObj.name, squad: squadObj.squad, status: 'Assigned' }
          : i
      )
    );
    setIsAssignModalOpen(false);
  };

  const handleApproveAiDispatch = (issueId) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: 'Assigned' } : i))
    );
  };

  const handleCreateWorkOrder = (e) => {
    e.preventDefault();
    const newId = `CS10${Math.floor(100 + Math.random() * 900)}`;
    const newEntry = {
      id: `#${newId}`,
      title: newOrderTitle || 'Road Defect Remediation',
      location: newOrderLocation || 'Indore Urban Ward',
      priority: newOrderPriority,
      department: newOrderDept,
      departmentId: 'ROAD_DEPT',
      status: 'Assigned',
      assignedTo: 'Er. Rajesh Patil',
      squad: 'Field Squad A',
      createdOnDate: '26 Sep 2026',
      createdOnTime: '07:35 PM',
      reportedBy: 'Operations Officer',
      description: newOrderDesc || 'Direct work order issued from municipal command center.',
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
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      {/* ============================================================ */}
      {/* MOBILE COMPACT APP HEADER (Visible only on mobile screens < lg) */}
      {/* ============================================================ */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded text-slate-700 hover:bg-slate-100 transition"
            aria-label="Open Municipal Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <CivicLogo className="w-5 h-5 text-blue-800" textClassName="text-sm font-bold text-slate-900 tracking-tight" />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider pl-2 border-l border-slate-200">
            Command Center
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleToCitizen}
            className="px-2 py-1 text-[11px] font-medium border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition flex items-center gap-1"
            title="Switch to Citizen Public Portal"
          >
            <ArrowLeftRight className="w-3 h-3 text-slate-500" />
            <span className="hidden sm:inline">Citizen</span>
          </button>
          <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RP'}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 1. THE SOLE NAVIGATION BAR: LEFT SIDEBAR (Desktop & Mobile Drawer) */}
      {/* ============================================================ */}
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between py-4 px-3 select-none transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:h-screen lg:sticky lg:top-0 lg:z-30 flex-shrink-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="space-y-3.5 overflow-y-auto">
          {/* Agency Brand & Mobile Close */}
          <div className="px-2 pt-0.5 flex items-center justify-between">
            <Link to="/authority" onClick={() => setMobileSidebarOpen(false)} className="flex items-center gap-2">
              <CivicLogo className="w-6 h-6 text-blue-800" textClassName="text-base font-bold text-slate-900 tracking-tight" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-700 rounded"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-2 -mt-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Municipal Command Center
            </span>
          </div>

          {/* Quick Search */}
          <form onSubmit={handleSidebarSearchSubmit} className="px-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search ticket, ward, squad..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs pl-8 pr-7 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
              {sidebarSearch && (
                <button
                  type="button"
                  onClick={() => { setSidebarSearch(''); setSearchParams({}); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </form>

          {/* Operations Navigation */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1 block">
              Operations
            </span>

            <button
              type="button"
              onClick={() => { setActiveNav('triage'); setSearchParams({}); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'triage'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ClipboardList className={`w-4 h-4 ${activeNav === 'triage' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>Triage & Dispatch</span>
            </button>

            {/* AI Dispatch Review */}
            <button
              type="button"
              onClick={() => { setActiveNav('ai_review'); setSearchParams({ tab: 'AI_REVIEW' }); setMobileSidebarOpen(false); }}
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
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                AI
              </span>
            </button>

            {/* Departments */}
            <button
              type="button"
              onClick={() => { setActiveNav('departments'); setSearchParams({ tab: 'DEPARTMENTS' }); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'departments'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className={`w-4 h-4 ${activeNav === 'departments' ? 'text-blue-800' : 'text-slate-400'}`} />
                <span>Departments</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                5
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setIsNewOrderModalOpen(true); setMobileSidebarOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Work Orders</span>
            </button>

            <button
              type="button"
              onClick={() => { setIsAssignModalOpen(true); setMobileSidebarOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>Field Crew Radar</span>
            </button>

            {/* Operations Map */}
            <button
              type="button"
              onClick={() => { setActiveNav('map'); setSearchParams({ tab: 'MAP' }); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'map'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Map className={`w-4 h-4 ${activeNav === 'map' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>Operations Map</span>
            </button>
          </div>

          {/* Monitoring Navigation */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1 block">
              Monitoring
            </span>

            {/* CCTV & AI Vision */}
            <button
              type="button"
              onClick={() => { setActiveNav('cctv'); setSearchParams({ tab: 'CCTV' }); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'cctv'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Camera className={`w-4 h-4 ${activeNav === 'cctv' ? 'text-blue-800' : 'text-slate-400'}`} />
                <span>CCTV & AI Vision</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE
              </span>
            </button>

            {/* Analytics */}
            <button
              type="button"
              onClick={() => { setActiveNav('analytics'); setSearchParams({ tab: 'ANALYTICS' }); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition text-left font-medium ${
                activeNav === 'analytics'
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${activeNav === 'analytics' ? 'text-blue-800' : 'text-slate-400'}`} />
              <span>Analytics & Reports</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Switch Role + Officer Card + Jurisdictional Note */}
        <div className="pt-3 border-t border-slate-200 px-1 space-y-2.5">
          {/* Switch to Citizen Button */}
          <button
            type="button"
            onClick={handleToggleToCitizen}
            className="w-full py-1.5 px-2.5 text-xs font-medium border border-slate-200 rounded text-slate-700 bg-slate-50 hover:bg-slate-100 transition flex items-center justify-between"
            title="Switch to Citizen Public Portal"
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
              <span>Citizen Portal</span>
            </div>
            <span className="text-[10px] text-slate-400">Exit &rsaquo;</span>
          </button>

          {/* Officer Profile Card */}
          <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RP'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-900 block truncate leading-tight">
                  {user?.name || 'Er. Rajesh Patil'}
                </span>
                <span className="text-[10px] text-slate-500 block truncate leading-tight">
                  {user?.role === 'admin' ? 'Commissioner' : 'Operations Officer'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-slate-700 rounded relative"
                title="Notifications"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>
              <button
                type="button"
                onClick={logout}
                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center font-mono">
            Indore Municipal Corp &bull; v1.0.0
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN CONTENT AREA (All views rendered under single layout) */}
      {/* ============================================================ */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-5 overflow-y-auto">
        {/* ============================================================ */}
        {/* VIEW 1: TRIAGE & DISPATCH */}
        {/* ============================================================ */}
        {activeNav === 'triage' && (
          <div className="space-y-5">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Operations</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">Triage & Dispatch</span>
            </div>

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
                <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-700 font-medium">Friday, 26 Sep 2026 &bull; 07:35 PM</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(true)}
                  className="px-3.5 py-2 rounded-md bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Work Order</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pt-1">
              <div className="flex items-center space-x-4 sm:space-x-6 text-xs overflow-x-auto pb-1">
                {['All Issues', 'Needs Assignment', 'High Priority', 'In Progress', 'Escalated', 'Resolved'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
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

              <button
                type="button"
                className="self-end sm:self-auto px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-sm"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filters</span>
              </button>
            </div>

            {/* Issues Table */}
            <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
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
                    {filteredIssues.map((issue) => {
                      const isSelected = selectedIssueId === issue.id || selectedIssueId === issue.id.replace('#', '');

                      return (
                        <tr
                          key={issue.id}
                          onClick={() => setSelectedIssueId(issue.id.replace('#', ''))}
                          className={`hover:bg-slate-50 cursor-pointer transition ${
                            isSelected ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(issue.id)}
                              onChange={() => handleSelectRow(issue.id)}
                              className="rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                            />
                          </td>

                          <td className="px-3 py-3 font-mono font-semibold text-blue-800">
                            {issue.id.startsWith('#') ? issue.id : `#${issue.id}`}
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
                            {issue.status === 'Escalated' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                Escalated
                              </span>
                            )}
                            {issue.status === 'Resolved' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Resolved
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {issue.assignedTo ? (
                              <div className="leading-tight">
                                <span className="font-semibold text-slate-900 block truncate max-w-[130px]">
                                  {issue.assignedTo}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {issue.squad || 'Field Squad'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-slate-500 leading-tight">
                            <span className="block text-slate-700 text-[11px]">{issue.createdOnDate}</span>
                            <span className="block text-[10px] text-slate-400">{issue.createdOnTime}</span>
                          </td>

                          <td className="px-2 py-3 text-slate-400 hover:text-slate-700" onClick={(e) => { e.stopPropagation(); setIsUpdateModalOpen(true); }}>
                            <MoreVertical className="w-4 h-4 cursor-pointer" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="bg-white border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>Showing 1 to {filteredIssues.length} of 39 issues</div>
                <div className="flex items-center gap-1">
                  <button type="button" className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">&lsaquo;</button>
                  <button type="button" className="px-2.5 py-1 rounded bg-blue-800 text-white font-semibold">1</button>
                  <button type="button" className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700">2</button>
                  <button type="button" className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700">3</button>
                  <button type="button" className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">&rsaquo;</button>
                </div>
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select className="border border-slate-200 rounded px-2 py-1 text-slate-700 bg-white">
                    <option>8</option>
                    <option>15</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: AI DISPATCH & ASSIGNMENT REVIEW */}
        {/* ============================================================ */}
        {activeNav === 'ai_review' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Operations</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">AI Dispatch Review</span>
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

              <button
                type="button"
                onClick={() => { setActiveNav('triage'); setSearchParams({}); }}
                className="px-3.5 py-2 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
              >
                Back to Triage
              </button>
            </div>

            {/* AI Review Queue Cards */}
            <div className="space-y-4">
              {issues.map((item) => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-md p-5 shadow-sm space-y-4">
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
                      <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* AI Matching Analysis Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">AI-Assigned Field Officer</span>
                      <strong className="text-slate-900 text-sm block mt-0.5">
                        {item.assignedTo || 'Pending Assignment'}
                      </strong>
                      <span className="text-slate-500 text-[11px] block">{item.squad || 'Squad unassigned'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Proximity & Workload Calculation</span>
                      <strong className="text-blue-900 block mt-0.5">
                        📍 {item.aiDistanceKm || 0.8} km away (Haversine GPS)
                      </strong>
                      <span className="text-slate-500 text-[11px] block">Current Active Queue: 2 tickets</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Dispatch Algorithm Rationale</span>
                      <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed">
                        {item.aiReasoning || 'Nearest unencumbered municipal squad in primary department.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reported {item.createdOnDate} at {item.createdOnTime} by {item.reportedBy}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIssueId(item.id.replace('#', ''));
                          setIsAssignModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                      >
                        Override & Reassign
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveAiDispatch(item.id)}
                        className="px-4 py-1.5 rounded bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve AI Assignment</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: DEPARTMENTS OVERVIEW */}
        {/* ============================================================ */}
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
                <div key={dept.id} className="bg-white border border-slate-200 rounded-md p-5 shadow-sm space-y-4 flex flex-col justify-between">
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
                      setSearchParams({ search: dept.shortName });
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

        {/* ============================================================ */}
        {/* VIEW 4: OPERATIONS MAP EMBEDDED UNDER SINGLE SIDEBAR */}
        {/* ============================================================ */}
        {activeNav === 'map' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Operations</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">Operations Map</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Operations Map & Fleet Geospatial Radar
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time visualization of reported issues and active field squad coordinates across Indore.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setActiveNav('triage'); setSearchParams({}); }}
                className="px-3.5 py-2 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
              >
                Back to Triage
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-md p-3 shadow-sm">
              <div className="h-[520px] rounded border border-slate-200 overflow-hidden">
                <LeafletMap complaints={issues} officers={AVAILABLE_SQUADS} showRadar={true} />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 5: CCTV & AI VISION EMBEDDED UNDER SINGLE SIDEBAR */}
        {/* ============================================================ */}
        {activeNav === 'cctv' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Monitoring</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">CCTV & AI Vision</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  CCTV Edge AI Vision Grid
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live traffic camera feed inspection with automated computer vision defect classification.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setActiveNav('triage'); setSearchParams({}); }}
                className="px-3.5 py-2 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
              >
                Back to Triage
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    <strong className="text-slate-900">{selectedCctv.camera_id}</strong>
                    <span className="text-slate-400">({selectedCctv.location})</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">1080p 60fps &bull; LIVE</span>
                </div>

                <div className="relative rounded overflow-hidden aspect-video bg-slate-900 flex items-center justify-center">
                  <img
                    src={selectedCctv.sample_snapshot}
                    alt={selectedCctv.camera_id}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute border-2 border-red-500 bg-red-500/10 rounded" style={{ top: '35%', left: '30%', width: '40%', height: '35%' }}>
                    <span className="absolute -top-5 left-0 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      Defect Detected &bull; 94%
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-3">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Camera Feeds (5 Active)
                </h3>
                <div className="space-y-2">
                  {CCTV_CHANNELS.map((c) => (
                    <div
                      key={c.camera_id}
                      onClick={() => setSelectedCctv(c)}
                      className={`p-2.5 rounded border cursor-pointer transition flex items-center gap-2.5 ${
                        selectedCctv.camera_id === c.camera_id
                          ? 'bg-blue-50 border-blue-700'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <img src={c.sample_snapshot} alt={c.camera_id} className="w-10 h-10 object-cover rounded border border-slate-200" />
                      <div className="text-xs truncate">
                        <strong className="text-slate-900 block truncate">{c.camera_id}</strong>
                        <span className="text-slate-500 text-[11px] block truncate">{c.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 6: ANALYTICS EMBEDDED UNDER SINGLE SIDEBAR */}
        {/* ============================================================ */}
        {activeNav === 'analytics' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-600">Home</Link>
              <span>&rsaquo;</span>
              <span className="text-slate-500">Monitoring</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-medium">Operations Analytics</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Municipal Performance Analytics
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resolution timelines, department distribution, and open caseload benchmarks.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setActiveNav('triage'); setSearchParams({}); }}
                className="px-3.5 py-2 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
              >
                Back to Triage
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                <span className="text-[11px] text-slate-500 font-medium">Total Issues</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">39</div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded this cycle</span>
              </div>

              <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                <span className="text-[11px] text-blue-800 font-medium">Active In Progress</span>
                <div className="text-2xl font-bold text-blue-800 mt-1">18</div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Field crew dispatched</span>
              </div>

              <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                <span className="text-[11px] text-emerald-800 font-medium">Resolved</span>
                <div className="text-2xl font-bold text-emerald-800 mt-1">17</div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Remediation closed</span>
              </div>

              <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                <span className="text-[11px] text-amber-800 font-medium">Average SLA</span>
                <div className="text-2xl font-bold text-amber-800 mt-1">24h</div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Municipal target</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* 3. RIGHT DETAILS DRAWER ("Issue Details" - Responsive) */}
      {/* ============================================================ */}
      {currentIssue && activeNav === 'triage' && (
        <aside className="w-full lg:w-80 xl:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex-shrink-0 flex flex-col justify-between overflow-y-auto lg:h-screen lg:sticky lg:top-0">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Issue Details</h2>
              <button type="button" onClick={() => setSelectedIssueId(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-md overflow-hidden border border-slate-200 bg-slate-100">
              <img src={currentIssue.image} alt={currentIssue.title} className="w-full h-44 object-cover" />
            </div>

            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{currentIssue.title}</h3>
                <span className="font-mono text-xs text-slate-400 block mt-0.5">{currentIssue.id.startsWith('#') ? currentIssue.id : `#${currentIssue.id}`}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                currentIssue.priority === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {currentIssue.priority} Priority
              </span>
            </div>

            <div className="flex items-center space-x-4 border-b border-slate-200 text-xs">
              <button className="pb-2 font-semibold text-blue-800 border-b-2 border-blue-800">Overview</button>
              <button className="pb-2 text-slate-400 hover:text-slate-700">Timeline</button>
              <button className="pb-2 text-slate-400 hover:text-slate-700">Location</button>
              <button className="pb-2 text-slate-400 hover:text-slate-700">Work Orders</button>
            </div>

            <div className="space-y-3 text-xs pt-1">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Location</span>
                  <span className="text-slate-800 font-medium block leading-tight">{currentIssue.location}</span>
                  <button onClick={() => { setActiveNav('map'); setSearchParams({ tab: 'MAP' }); }} className="text-blue-800 text-[11px] hover:underline font-medium mt-0.5 inline-block">
                    View on Map
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Department</span>
                  <span className="text-slate-800 font-semibold block">{currentIssue.department}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Reported On</span>
                  <span className="text-slate-800 font-medium block">{currentIssue.createdOnDate}, {currentIssue.createdOnTime}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Reported By</span>
                  <span className="text-slate-800 font-medium block">{currentIssue.reportedBy}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned To</span>
                  <span className="text-slate-800 font-semibold block">{currentIssue.assignedTo || 'Unassigned'}</span>
                  {currentIssue.squad && <span className="text-[11px] text-slate-400 block">{currentIssue.squad}</span>}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ml-1"></span>
                <span className="text-slate-700 text-xs">
                  Current Status <strong className="text-blue-900 ml-1">{currentIssue.status}</strong>
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1 text-xs">
              <span className="font-semibold text-slate-900 block">Description</span>
              <p className="text-slate-600 leading-relaxed">{currentIssue.description}</p>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
              <span className="font-semibold text-slate-900 block">Evidence</span>
              <div className="grid grid-cols-4 gap-2">
                {currentIssue.evidenceGallery?.slice(0, 3).map((imgUrl, i) => (
                  <img key={i} src={imgUrl} alt="Evidence thumbnail" className="w-full h-14 object-cover rounded border border-slate-200" />
                ))}
                {currentIssue.extraEvidenceCount > 0 && (
                  <div className="w-full h-14 rounded bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center">
                    +{currentIssue.extraEvidenceCount}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-slate-200 bg-white space-y-2.5">
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="w-full py-2.5 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs shadow-sm transition flex items-center justify-center gap-2"
            >
              <span>Update Status</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="w-full py-2.5 rounded border border-blue-800 text-blue-900 hover:bg-blue-50 font-medium text-xs transition flex items-center justify-center gap-2"
            >
              <Users className="w-3.5 h-3.5 text-blue-800" />
              <span>Assign / Reassign</span>
            </button>
          </div>
        </aside>
      )}

      {/* ============================================================ */}
      {/* 4. MODALS (Update Status / Assign Squad / New Work Order) */}
      {/* ============================================================ */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Update Complaint Status</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Select the new status for {currentIssue.id} ({currentIssue.title}):
            </p>
            <div className="space-y-1.5 text-xs">
              {['Under Review', 'Assigned', 'In Progress', 'Escalated', 'Resolved'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleUpdateStatus(st)}
                  className={`w-full text-left px-3 py-2 rounded transition flex items-center justify-between ${
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

      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
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
              {AVAILABLE_SQUADS.map((sq, idx) => (
                <div
                  key={idx}
                  onClick={() => handleAssignSquad(sq)}
                  className="p-3 border border-slate-200 hover:border-blue-700 hover:bg-blue-50/50 rounded cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <strong className="text-slate-900 block font-semibold">{sq.name}</strong>
                    <span className="text-slate-500 text-[11px] block">{sq.squad} &bull; {sq.dept}</span>
                  </div>
                  <button className="px-2.5 py-1 bg-blue-800 text-white rounded text-[11px] font-medium">
                    Assign
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
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
                  placeholder="e.g. Road Crater Repair"
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
                  className="px-4 py-1.5 rounded bg-blue-800 text-white font-medium shadow-sm hover:bg-blue-900"
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
