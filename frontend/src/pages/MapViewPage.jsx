import React, { useState, useEffect } from 'react';
import { MapPin, Filter, Layers, RefreshCw, AlertTriangle, Shield, Radio, User, Phone, Zap, ChevronRight, PlusCircle } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { officerApi } from '../api/officerApi';
import { LeafletMap } from '../components/LeafletMap';
import { StatusBadge, SeverityBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const MapViewPage = () => {
  const { user } = useAuth();
  const isOfficial = user?.role === 'authority' || user?.role === 'admin';

  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [showRadar, setShowRadar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('COMPLAINTS'); // 'COMPLAINTS' or 'OFFICERS'

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, oData] = await Promise.all([
        complaintApi.getComplaints({
          category: selectedCategory,
          severity: selectedSeverity
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
        isOfficial
          ? 'bg-slate-900 text-white border-slate-800'
          : 'bg-white text-slate-900 border-slate-200'
      }`}>
        <div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-1 border ${
            isOfficial
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            <Radio className={`w-3.5 h-3.5 ${isOfficial ? 'text-indigo-400' : 'text-emerald-600'} animate-pulse`} />
            <span>{isOfficial ? 'Autonomous Geospatial Intelligence & Fleet Radar' : 'Live Neighborhood Civic Map'}</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold font-heading mt-1 ${isOfficial ? 'text-white' : 'text-slate-900'}`}>
            {isOfficial ? 'Municipal Dispatch Radar & Grievance Map' : 'Neighborhood Community Grievance Map'}
          </h1>
          <p className={`text-xs sm:text-sm mt-0.5 ${isOfficial ? 'text-slate-400' : 'text-slate-600'}`}>
            {isOfficial
              ? 'Real-time geospatial visualization of active neighborhood dockets and closest available field engineers for autonomous task assignment.'
              : 'Explore public civic repairs happening around your area. Check ongoing work orders for potholes, garbage, water leaks, and streetlights.'}
          </p>
        </div>

        {/* Right side item */}
        {isOfficial ? (
          <div className="flex items-center gap-3 bg-slate-950 text-slate-100 p-3.5 rounded-2xl border border-slate-800 self-start sm:self-auto text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Active Fleet</span>
              <strong className="text-emerald-400 text-sm">{officers.length} Squads</strong>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Available</span>
              <strong className="text-teal-400 text-sm">
                {officers.filter(o => o.status === 'AVAILABLE').length} Free
              </strong>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Open Dockets</span>
              <strong className="text-amber-400 text-sm">{complaints.length} Active</strong>
            </div>
          </div>
        ) : (
          <Link
            to="/report"
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Defect Here</span>
          </Link>
        )}
      </div>

      {/* Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Full Interactive Map */}
        <div className="lg:col-span-8 bg-white p-3 rounded-3xl border border-slate-200 shadow-sm min-h-[580px] space-y-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-700">Severity Pins:</span>
              <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> High / Critical
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Medium
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Low
              </span>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="text-xs text-slate-500 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Map</span>
            </button>
          </div>

          <div className="h-[520px] rounded-2xl overflow-hidden border border-slate-100">
            <LeafletMap
              center={[18.5204, 73.8567]}
              zoom={13}
              complaints={complaints}
              officers={isOfficial ? officers : []}
              height="100%"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Filters Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span>Geospatial Filters</span>
              </h4>
              <span className="text-[11px] text-slate-400">{complaints.length} Dockets Mapped</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Issue Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs bg-slate-50"
                >
                  <option value="All">All Categories</option>
                  <option value="road_infrastructure">Roads & Potholes</option>
                  <option value="waste_management">Waste & Garbage</option>
                  <option value="electrical_street_lighting">Streetlights & Power</option>
                  <option value="water_supply">Water Supply & Leakage</option>
                  <option value="drainage_sanitation">Drainage & Sewerage</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Urgency Priority</label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs bg-slate-50"
                >
                  <option value="All">All Severity Levels</option>
                  <option value="CRITICAL">Critical Only</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sidebar Tabs (Only if official; otherwise simple complaints list) */}
          {isOfficial ? (
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSidebarTab('COMPLAINTS')}
                className={`flex-1 py-2 rounded-xl transition ${
                  sidebarTab === 'COMPLAINTS'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dockets ({complaints.length})
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('OFFICERS')}
                className={`flex-1 py-2 rounded-xl transition ${
                  sidebarTab === 'OFFICERS'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Field Squads ({officers.length})
              </button>
            </div>
          ) : (
            <div className="px-2 font-bold text-xs text-slate-700">
              <span>Neighborhood Reports ({complaints.length})</span>
            </div>
          )}

          {/* Dockets List */}
          {(sidebarTab === 'COMPLAINTS' || !isOfficial) && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 max-h-96 overflow-y-auto">
              <div className="divide-y divide-slate-100 text-xs space-y-2">
                {complaints.map((c) => (
                  <div key={c.id} className="pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-slate-900">#{c.id}</span>
                      <SeverityBadge severity={c.severity} />
                    </div>
                    <h5 className="font-semibold text-slate-800 mt-0.5">
                      {c.issue_type?.replace('_', ' ') || c.category?.replace('_', ' ')}
                    </h5>
                    <p className="text-[11px] text-slate-500 line-clamp-1">📍 {c.address}</p>

                    {c.assigned_officer_name && (
                      <div className="mt-1 p-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-900 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-emerald-600" />
                          <span>{c.assigned_officer_name}</span>
                        </span>
                        <span className="font-mono text-[10px] text-emerald-700">
                          {c.officer_distance_km ? `${c.officer_distance_km}km` : '0.8km'} &bull; ETA {c.officer_eta_minutes || 15}m
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 text-[11px]">
                      <StatusBadge status={c.status} />
                      <Link to={`/track/${c.id}`} className="text-emerald-700 font-bold hover:underline">
                        Track Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Field Squads List (Official only) */}
          {isOfficial && sidebarTab === 'OFFICERS' && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 max-h-96 overflow-y-auto">
              <div className="divide-y divide-slate-100 text-xs space-y-2.5">
                {officers.map((off) => (
                  <div key={off.id} className="pt-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-bold block">{off.name}</strong>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        off.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : off.status === 'ON_DUTY'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {off.status}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500 block">
                      {off.role} &bull; {off.department_name}
                    </span>

                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-slate-400 font-mono text-[10px]">
                        📍 {off.current_address?.split(',')[0]}
                      </span>
                      <a
                        href={`tel:${off.phone}`}
                        className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{off.phone}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
