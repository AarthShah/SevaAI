import React, { useState, useEffect } from 'react';
import { MapPin, Filter, Layers, RefreshCw, AlertTriangle, Shield, User, Phone, ChevronRight, Plus } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { officerApi } from '../api/officerApi';
import { LeafletMap } from '../components/LeafletMap';
import { StatusBadge, SeverityBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const MapViewPage = ({ isEmbedded = false }) => {
  const { user } = useAuth();
  const isOfficial = user?.role === 'authority' || user?.role === 'admin';

  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [showRadar, setShowRadar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('COMPLAINTS');

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
      setComplaints(cData);
      setOfficers(oData);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedSeverity, isOfficial]);

  return (
    <div className={isEmbedded ? "space-y-6" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-white min-h-[calc(100vh-64px)]"}>
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

      {/* Clean White Header */}
      <div className="rounded-md p-6 border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold mb-1 bg-blue-50 text-blue-800 border border-blue-200">
            <MapPin className="w-3.5 h-3.5 text-blue-800" />
            <span>Geospatial Operations Radar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Operations Map & Field Squad Radar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Geospatial visualization of active civic defects and nearest municipal field squads for proximity dispatch.
          </p>
        </div>

        {/* Stats Pill in Clean Light Theme */}
        <div className="flex items-center gap-4 bg-slate-50 text-slate-800 p-3 rounded border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Active Fleet</span>
            <strong className="text-blue-900 text-sm">{officers.length || 6} Squads</strong>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Open Issues</span>
            <strong className="text-slate-900 text-sm">{complaints.length || 8} Active</strong>
          </div>
        </div>
      </div>

      {/* Main Map + Sidebar Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Viewport (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-md p-3 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-slate-800">
              Interactive Municipal Map &bull; Indore Urban Sector
            </span>
            <button
              onClick={loadData}
              className="text-blue-800 hover:underline flex items-center gap-1 text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Map</span>
            </button>
          </div>

          <div className="h-[520px] rounded border border-slate-200 overflow-hidden">
            <LeafletMap complaints={complaints} officers={officers} showRadar={showRadar} />
          </div>
        </div>

        {/* Sidebar Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Filter Card */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-3 text-xs">
            <h2 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Map Layer Filters
            </h2>

            <div>
              <label className="text-slate-500 block mb-1">Issue Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-slate-800 text-xs"
              >
                <option value="All">All Categories</option>
                <option value="pothole">Road Infrastructure</option>
                <option value="garbage">Waste Management</option>
                <option value="streetlight">Street Lighting</option>
                <option value="water_leak">Water Supply</option>
              </select>
            </div>

            <div>
              <label className="text-slate-500 block mb-1">Severity</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-slate-800 text-xs"
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
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-3 text-xs">
            <h2 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Active Map Pins
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {complaints.slice(0, 5).map((c) => (
                <div key={c.id} className="p-2 border border-slate-100 rounded hover:bg-slate-50 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900 block capitalize">{c.issue_type?.replace(/_/g, ' ') || 'Pothole'}</strong>
                    <span className="text-[11px] text-slate-400 block line-clamp-1">{c.address}</span>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
