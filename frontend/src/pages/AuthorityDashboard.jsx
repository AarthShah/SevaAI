import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, FileText, Users, Building2, Map, BarChart3, 
  Camera, TrendingUp, UserCog, Settings, Calendar, Plus, 
  Filter, MoreVertical, X, Check, MapPin, Building, User, 
  ChevronDown, CheckCircle2, AlertCircle, ArrowUpRight, Search, 
  RefreshCw, CheckSquare, Layers
} from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { officerApi } from '../api/officerApi';
import { departmentApi } from '../api/departmentApi';
import { CivicLogo } from '../components/CivicLogo';

// Initial baseline issues matching reference mockup
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
    evidenceGallery: [
      '/sample_evidence/pothole.jpg',
      '/sample_evidence/pothole.jpg',
      '/sample_evidence/pothole.jpg'
    ],
    extraEvidenceCount: 2
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
    extraEvidenceCount: 1
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
    extraEvidenceCount: 0
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
    extraEvidenceCount: 1
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
    extraEvidenceCount: 3
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
    extraEvidenceCount: 0
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
    extraEvidenceCount: 2
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
    extraEvidenceCount: 1
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

export const AuthorityDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Navigation sidebar item
  const [activeNav, setActiveNav] = useState('triage');

  // Filter tabs: 'All Issues' | 'Needs Assignment' | 'High Priority' | 'In Progress' | 'Escalated' | 'Resolved'
  const [activeTab, setActiveTab] = useState('All Issues');

  // Issues state
  const [issues, setIssues] = useState(DEFAULT_ISSUES);
  const [selectedIssueId, setSelectedIssueId] = useState('CS1039');
  const [selectedRows, setSelectedRows] = useState(['CS1039']);

  // Modals & Action Menus
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // New Work Order form state
  const [newOrderTitle, setNewOrderTitle] = useState('');
  const [newOrderDept, setNewOrderDept] = useState('Road Department');
  const [newOrderPriority, setNewOrderPriority] = useState('High');
  const [newOrderLocation, setNewOrderLocation] = useState('Indore Central Ward');
  const [newOrderDesc, setNewOrderDesc] = useState('');

  // Search filter
  const searchQuery = searchParams.get('search') || '';

  // Load live complaints from backend and merge
  useEffect(() => {
    const fetchLiveComplaints = async () => {
      try {
        const liveList = await complaintApi.getComplaints();
        if (liveList && liveList.length > 0) {
          // Format backend complaints into our unified command center structure
          const formattedLive = liveList.map((c, idx) => ({
            id: c.id.startsWith('#') ? c.id : `#${c.id}`,
            title: c.issue_type?.replace(/_/g, ' ') || c.category?.replace(/_/g, ' ') || 'Civic Issue',
            location: c.address || 'Indore Urban Ward',
            priority: c.severity === 'CRITICAL' || c.severity === 'HIGH' ? 'High' : 'Medium',
            department: c.department_name || 'Road Department',
            departmentId: c.department_id || 'ROAD_DEPT',
            status: c.status || 'Assigned',
            assignedTo: c.assigned_officer_name || null,
            squad: c.assigned_officer_name ? 'Field Squad A' : null,
            createdOnDate: c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '26 Sep 2026',
            createdOnTime: c.created_at ? new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '05:12 PM',
            reportedBy: c.citizen_name || 'Citizen (via Web)',
            description: c.description || 'Civic defect requiring departmental dispatch.',
            image: c.image_url || '/sample_evidence/pothole.jpg',
            evidenceGallery: [c.image_url || '/sample_evidence/pothole.jpg'],
            extraEvidenceCount: 1
          }));

          // Merge without duplicates
          const liveIds = new Set(formattedLive.map((item) => item.id.replace('#', '')));
          const existingFiltered = DEFAULT_ISSUES.filter((d) => !liveIds.has(d.id.replace('#', '')));
          setIssues([...formattedLive, ...existingFiltered]);
        }
      } catch {
        // Fallback to default list
      }
    };
    fetchLiveComplaints();
  }, []);

  // Currently selected issue for the right details drawer
  const currentIssue = issues.find((i) => i.id === selectedIssueId || i.id === `#${selectedIssueId}`) || issues[0];

  // Filtering based on activeTab & search
  const filteredIssues = issues.filter((item) => {
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // Tab filter
    if (activeTab === 'All Issues') return true;
    if (activeTab === 'Needs Assignment') return !item.assignedTo || item.status === 'Submitted' || item.status === 'Under Review';
    if (activeTab === 'High Priority') return item.priority === 'High';
    if (activeTab === 'In Progress') return item.status === 'In Progress';
    if (activeTab === 'Escalated') return item.status === 'Escalated';
    if (activeTab === 'Resolved') return item.status === 'Resolved';
    return true;
  });

  // Toggle selection
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

  // Status Update handler
  const handleUpdateStatus = async (newStatus) => {
    if (!currentIssue) return;
    const cleanId = currentIssue.id.replace('#', '');
    try {
      await complaintApi.updateStatus(cleanId, newStatus, `Updated to ${newStatus} by Operations Officer`);
    } catch {
      // Ignored for frontend state sync
    }

    setIssues((prev) =>
      prev.map((i) => (i.id === currentIssue.id ? { ...i, status: newStatus } : i))
    );
    setIsUpdateModalOpen(false);
  };

  // Squad Reassignment handler
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

  // Create Work Order
  const handleCreateWorkOrder = (e) => {
    e.preventDefault();
    const newId = `CS10${Math.floor(100 + Math.random() * 900)}`;
    const newEntry = {
      id: `#${newId}`,
      title: newOrderTitle || 'Pothole Remediation',
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
      extraEvidenceCount: 0
    };

    setIssues([newEntry, ...issues]);
    setSelectedIssueId(newEntry.id);
    setIsNewOrderModalOpen(false);
    setNewOrderTitle('');
    setNewOrderDesc('');
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
      {/* ============================================================ */}
      {/* 1. LEFT SIDEBAR (Operations / Monitoring / Administration) */}
      {/* ============================================================ */}
      <aside className="w-60 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col justify-between py-5 px-3 select-none hidden md:flex">
        <div className="space-y-6">
          {/* Operations Group */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
              Operations
            </span>

            <button
              type="button"
              onClick={() => setActiveNav('triage')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition text-left font-medium ${
                activeNav === 'triage'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ClipboardList className={`w-4 h-4 ${activeNav === 'triage' ? 'text-blue-700' : 'text-slate-500'}`} />
              <span>Triage & Dispatch</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewOrderModalOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Work Orders</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Field Crew</span>
            </button>

            <Link
              to="/authority?tab=DEPARTMENTS"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Departments</span>
            </Link>

            <Link
              to="/map"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Map className="w-4 h-4 text-slate-500" />
              <span>Operations Map</span>
            </Link>

            <Link
              to="/analytics"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span>Reports</span>
            </Link>
          </div>

          {/* Monitoring Group */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
              Monitoring
            </span>

            <Link
              to="/cctv"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Camera className="w-4 h-4 text-slate-500" />
              <span>CCTV & AI Vision</span>
            </Link>

            <Link
              to="/analytics"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span>Analytics</span>
            </Link>
          </div>

          {/* Administration Group */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
              Administration
            </span>

            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <UserCog className="w-4 h-4 text-slate-500" />
              <span>Users & Roles</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition text-left font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-100 px-2 space-y-1">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
            <CivicLogo className="w-4 h-4 text-blue-800" textClassName="text-xs font-semibold text-slate-800" />
            <span className="text-[11px] text-slate-700">Indore Municipal Corporation</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">CivicSeva v1.0.0</p>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. CENTER CONTENT (Breadcrumbs, Filters, Issues Table) */}
      {/* ============================================================ */}
      <main className="flex-1 min-w-0 p-6 lg:p-8 space-y-5 overflow-y-auto">
        {/* Breadcrumb */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Link to="/" className="hover:text-slate-600">Home</Link>
          <span>&rsaquo;</span>
          <span className="hover:text-slate-600">Operations</span>
          <span>&rsaquo;</span>
          <span className="text-slate-600 font-medium">Triage & Dispatch</span>
        </div>

        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Triage & Dispatch
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Review incoming civic issues, assign field crews, and track resolution progress.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Date Card */}
            <div className="hidden sm:flex items-center gap-2.5 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm text-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div className="text-left leading-tight">
                <span className="text-slate-800 font-medium block">Friday, 26 September 2026</span>
                <span className="text-[10px] text-slate-400 font-mono block">07:35 PM</span>
              </div>
            </div>

            {/* + New Work Order Button */}
            <button
              type="button"
              onClick={() => setIsNewOrderModalOpen(true)}
              className="px-4 py-2 rounded-md bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Work Order</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Filter Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pt-2">
          {/* Tabs */}
          <div className="flex items-center space-x-6 text-xs overflow-x-auto">
            {['All Issues', 'Needs Assignment', 'High Priority', 'In Progress', 'Escalated', 'Resolved'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-3 font-medium transition border-b-2 whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-800 text-blue-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Filters Button */}
          <button
            type="button"
            className="self-end sm:self-auto px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-sm mb-2 sm:mb-0"
          >
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filters</span>
          </button>
        </div>

        {/* Issues Table Container */}
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
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Issue & Location</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Created On</th>
                  <th className="px-3 py-3 w-8"></th>
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
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(issue.id)}
                          onChange={() => handleSelectRow(issue.id)}
                          className="rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                        />
                      </td>

                      {/* ID */}
                      <td className="px-4 py-3 font-mono font-semibold text-blue-800">
                        {issue.id.startsWith('#') ? issue.id : `#${issue.id}`}
                      </td>

                      {/* Issue & Location with thumbnail */}
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

                      {/* Priority */}
                      <td className="px-4 py-3">
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

                      {/* Department */}
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {issue.department}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {issue.status === 'Assigned' && (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            Assigned
                          </span>
                        )}
                        {issue.status === 'In Progress' && (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            In Progress
                          </span>
                        )}
                        {issue.status === 'Under Review' && (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Under Review
                          </span>
                        )}
                        {issue.status === 'Escalated' && (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            Escalated
                          </span>
                        )}
                        {issue.status === 'Resolved' && (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Resolved
                          </span>
                        )}
                      </td>

                      {/* Assigned To */}
                      <td className="px-4 py-3">
                        {issue.assignedTo ? (
                          <div className="leading-tight">
                            <span className="font-semibold text-slate-900 block">
                              {issue.assignedTo}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {issue.squad || 'Field Squad'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Created On */}
                      <td className="px-4 py-3 text-slate-500 leading-tight">
                        <span className="block text-slate-700">{issue.createdOnDate}</span>
                        <span className="block text-[10px] text-slate-400">{issue.createdOnTime}</span>
                      </td>

                      {/* Action Menu */}
                      <td className="px-3 py-3 text-slate-400 hover:text-slate-700" onClick={(e) => { e.stopPropagation(); setIsUpdateModalOpen(true); }}>
                        <MoreVertical className="w-4 h-4 cursor-pointer" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="bg-white border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing 1 to {filteredIssues.length} of 39 issues
            </div>

            <div className="flex items-center gap-1">
              <button type="button" className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50">
                &lsaquo;
              </button>
              <button type="button" className="px-2.5 py-1 rounded bg-blue-800 text-white font-semibold">
                1
              </button>
              <button type="button" className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                2
              </button>
              <button type="button" className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                3
              </button>
              <button type="button" className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                4
              </button>
              <button type="button" className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700">
                5
              </button>
              <button type="button" className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">
                &rsaquo;
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select className="border border-slate-200 rounded px-2 py-1 text-slate-700 bg-white">
                <option>8</option>
                <option>15</option>
                <option>25</option>
              </select>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* 3. RIGHT DETAILS DRAWER ("Issue Details") */}
      {/* ============================================================ */}
      {currentIssue && (
        <aside className="w-80 lg:w-96 bg-white border-l border-slate-200 flex-shrink-0 flex flex-col justify-between overflow-y-auto h-[calc(100vh-64px)] sticky top-16">
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Issue Details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedIssueId(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Evidence Photo */}
            <div className="rounded-md overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={currentIssue.image}
                alt={currentIssue.title}
                className="w-full h-44 object-cover"
              />
            </div>

            {/* Title & Priority Badge */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {currentIssue.title}
                </h3>
                <span className="font-mono text-xs text-slate-400 block mt-0.5">
                  {currentIssue.id.startsWith('#') ? currentIssue.id : `#${currentIssue.id}`}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                currentIssue.priority === 'High'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {currentIssue.priority} Priority
              </span>
            </div>

            {/* Drawer Sub-Tabs */}
            <div className="flex items-center space-x-4 border-b border-slate-200 text-xs">
              <button className="pb-2 font-semibold text-blue-800 border-b-2 border-blue-800">
                Overview
              </button>
              <button className="pb-2 text-slate-400 hover:text-slate-700">
                Timeline
              </button>
              <button className="pb-2 text-slate-400 hover:text-slate-700">
                Location
              </button>
              <button className="pb-2 text-slate-400 hover:text-slate-700">
                Work Orders
              </button>
            </div>

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
                  <Link to="/map" className="text-blue-800 text-[11px] hover:underline font-medium mt-0.5 inline-block">
                    View on Map
                  </Link>
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
                  <span className="text-slate-400 block text-[11px]">Assigned To</span>
                  <span className="text-slate-800 font-semibold block">
                    {currentIssue.assignedTo || 'Unassigned'}
                  </span>
                  {currentIssue.squad && (
                    <span className="text-[11px] text-slate-400 block">
                      {currentIssue.squad}
                    </span>
                  )}
                </div>
              </div>

              {/* Current Status */}
              <div className="flex items-center gap-3 pt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ml-1"></span>
                <span className="text-slate-700 text-xs">
                  Current Status <strong className="text-blue-900 ml-1">{currentIssue.status}</strong>
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-slate-100 pt-3 space-y-1 text-xs">
              <span className="font-semibold text-slate-900 block">Description</span>
              <p className="text-slate-600 leading-relaxed">
                {currentIssue.description}
              </p>
            </div>

            {/* Evidence Gallery */}
            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
              <span className="font-semibold text-slate-900 block">Evidence</span>
              <div className="grid grid-cols-4 gap-2">
                {currentIssue.evidenceGallery?.slice(0, 3).map((imgUrl, i) => (
                  <img
                    key={i}
                    src={imgUrl}
                    alt="Evidence thumbnail"
                    className="w-full h-14 object-cover rounded border border-slate-200"
                  />
                ))}
                {currentIssue.extraEvidenceCount > 0 && (
                  <div className="w-full h-14 rounded bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center">
                    +{currentIssue.extraEvidenceCount}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons at bottom of Drawer */}
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

      {/* Update Status Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
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

      {/* Assign Squad Modal */}
      {isAssignModalOpen && (
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
