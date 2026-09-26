import React, { useState, useEffect } from 'react';
import { MapPin, Filter, Layers, RefreshCw, AlertTriangle, Shield, User, Phone, ChevronRight, Plus } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { officerApi } from '../api/officerApi';
import { LeafletMap } from '../components/LeafletMap';
import { StatusBadge, SeverityBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEFAULT_MAP_COMPLAINTS = [
  { id: 'CS1039', issue_type: 'Pothole Defect', category: 'pothole', address: 'Shivajinagar Junction, Indore', latitude: 22.7196, longitude: 75.8577, severity: 'HIGH', status: 'Assigned', department_name: 'Road Department', description: 'Deep asphalt cavitation creating severe vehicle hazard.' },
  { id: 'CS1038', issue_type: 'Garbage Accumulation', category: 'garbage', address: 'Scheme 54 Commercial Market, Indore', latitude: 22.7533, longitude: 75.8937, severity: 'MEDIUM', status: 'In Progress', department_name: 'Sanitation Department', description: 'Domestic and commercial waste accumulating on pedestrian sidewalk.' },
  { id: 'CS1037', issue_type: 'Streetlight Outage', category: 'streetlight', address: 'MG Road Main Corridor, Indore', latitude: 22.7180, longitude: 75.8650, severity: 'HIGH', status: 'Assigned', department_name: 'Electricity Department', description: 'Dark road stretch with exposed wire hanging from luminaire pole.' },
  { id: 'CS1036', issue_type: 'Water Main Leakage', category: 'water_leak', address: 'Vijay Nagar Square, Indore', latitude: 22.7530, longitude: 75.8850, severity: 'CRITICAL', status: 'Under Review', department_name: 'Water Supply Department', description: 'High-pressure distribution pipeline burst causing street flooding.' },
  { id: 'CS1035', issue_type: 'Missing Manhole Cover', category: 'pothole', address: 'Bhawarkua Bus Terminal, Indore', latitude: 22.6920, longitude: 75.8670, severity: 'CRITICAL', status: 'Assigned', department_name: 'Drainage Department', description: 'Open storm sewer cavity dangerous to pedestrians and two-wheelers.' },
  { id: 'CS1034', issue_type: 'Stormwater Drain Clog', category: 'water_leak', address: 'Rajwada Palace Chowk, Indore', latitude: 22.7190, longitude: 75.8560, severity: 'MEDIUM', status: 'In Progress', department_name: 'Drainage Department', description: 'Monsoon silt blocking stormwater outflow channel.' }
];

const DEFAULT_MAP_OFFICERS = [
  { id: 'OFF-1', name: 'Er. Rajesh Patil', squad: 'Field Squad A (Road)', latitude: 22.7210, longitude: 75.8590, status: 'AVAILABLE', phone: '+91 731 254 8101' },
  { id: 'OFF-2', name: 'Dr. Priya Deshmukh', squad: 'Field Squad B (Sanitation)', latitude: 22.7510, longitude: 75.8910, status: 'DISPATCHED', phone: '+91 731 254 8102' },
  { id: 'OFF-3', name: 'Er. Vikram Shinde', squad: 'Field Squad A (Electrical)', latitude: 22.7190, longitude: 75.8680, status: 'AVAILABLE', phone: '+91 731 254 8103' }
];

export const MapViewPage = ({ isEmbedded = false }) => {
  const { user } = useAuth();
  const isOfficial = user?.role === 'authority' || user?.role === 'admin';

  const [complaints, setComplaints] = useState(DEFAULT_MAP_COMPLAINTS);
  const [officers, setOfficers] = useState(DEFAULT_MAP_OFFICERS);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [showRadar, setShowRadar] = useState(true);
  const [activePin, setActivePin] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, oData] = await Promise.all([
        complaintApi.getComplaints({
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          severity: selectedSeverity !== 'All' ? selectedSeverity : undefined
        }),
        isOfficial ? officerApi.getOfficers() : Promise.resolve([])
      ]);
      if (cData && cData.length > 0) {
        setComplaints(cData);
      } else {
        // Filter fallback complaints
        let filtered = DEFAULT_MAP_COMPLAINTS;
        if (selectedCategory !== 'All') {
          filtered = filtered.filter(c => c.category === selectedCategory);
        }
        if (selectedSeverity !== 'All') {
          filtered = filtered.filter(c => c.severity === selectedSeverity);
        }
        setComplaints(filtered);
      }
      if (oData && oData.length > 0) {
        setOfficers(oData);
      } else {
        setOfficers(DEFAULT_MAP_OFFICERS);
      }
    } catch {
      let filtered = DEFAULT_MAP_COMPLAINTS;
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(c => c.category === selectedCategory);
      }
      if (selectedSeverity !== 'All') {
        filtered = filtered.filter(c => c.severity === selectedSeverity);
      }
      setComplaints(filtered);
      setOfficers(DEFAULT_MAP_OFFICERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedSeverity, isOfficial]);

  return (
    <div className={isEmbedded ? "space-y-6" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-white min-h-[calc(100vh-64px)]"}>
      {/* Breadcrumb */}
      {!isEmbedded && (
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Link to="/" className="hover:text-slate-600">Home</Link>
          <span>&rsaquo;</span>
          <Link to="/authority" className="hover:text-slate-600">Command Center</Link>
          <span>&rsaquo;</span>
          <span className="text-slate-700 font-medium">Operations Map</span>
        </div>
      )}

      {/* Header */}
      <div className="rounded-md p-5 border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold mb-1 bg-blue-50 text-blue-800 border border-blue-200">
            <MapPin className="w-3.5 h-3.5 text-blue-800" />
            <span>Geospatial Operations Radar &bull; Indore Urban Grid</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Operations Map & Field Squad Radar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Geospatial visualization of active civic defects and nearest municipal field squads for proximity dispatch.
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-4 bg-slate-50 text-slate-800 p-3 rounded border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Active Fleet</span>
            <strong className="text-blue-900 text-sm font-bold">{officers.length} Squads</strong>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Open Issues</span>
            <strong className="text-slate-900 text-sm font-bold">{complaints.length} Active</strong>
          </div>
        </div>
      </div>

      {/* Main Map + Sidebar Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Viewport (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-md p-3 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-slate-800">
              Interactive Municipal Map &bull; Indore Urban Sector (OpenStreetMap)
            </span>
            <button
              onClick={loadData}
              disabled={loading}
              className="text-blue-800 hover:underline flex items-center gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh Map'}</span>
            </button>
          </div>

          <div className="h-[520px] rounded border border-slate-200 overflow-hidden">
            <LeafletMap 
              center={activePin ? [activePin.latitude, activePin.longitude] : [22.7196, 75.8577]}
              zoom={activePin ? 15 : 13}
              complaints={complaints} 
              officers={officers} 
              showRadar={showRadar} 
            />
          </div>
        </div>

        {/* Sidebar Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Filter Card */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-3 text-xs">
            <h2 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">
              Map Layer Filters
            </h2>

            <div>
              <label className="text-slate-600 font-medium block mb-1">Issue Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-800"
              >
                <option value="All">All Categories</option>
                <option value="pothole">Road Infrastructure</option>
                <option value="garbage">Waste Management</option>
                <option value="streetlight">Street Lighting</option>
                <option value="water_leak">Water Supply</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 font-medium block mb-1">Severity Rating</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-800"
              >
                <option value="All">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* List of Active Locations */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Active Map Pins ({complaints.length})
              </h2>
              <span className="text-[10px] text-slate-400">Click to focus</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {complaints.map((c) => {
                const isSelected = activePin?.id === c.id;
                return (
                  <div 
                    key={c.id} 
                    onClick={() => setActivePin(c)}
                    className={`p-2.5 border rounded cursor-pointer transition flex items-center justify-between gap-2 ${
                      isSelected 
                        ? 'border-blue-700 bg-blue-50/70' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue-800 text-[11px]">#{c.id}</span>
                        <strong className="text-slate-900 block truncate text-xs">
                          {c.issue_type?.replace(/_/g, ' ') || 'Civic Issue'}
                        </strong>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate mt-0.5">{c.address}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                      c.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      c.severity === 'HIGH' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {c.severity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
