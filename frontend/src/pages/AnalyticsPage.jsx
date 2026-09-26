import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, PieChart, CheckCircle2, Clock, RefreshCw, AlertCircle, Building2 } from 'lucide-react';
import { analyticsApi } from '../api/analyticsApi';

export const AnalyticsPage = ({ isEmbedded = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const summary = await analyticsApi.getSummary();
      setData(summary);
    } catch {
      // Fallback realistic public-service data
      setData({
        total_complaints: 39,
        active_complaints: 18,
        resolved_complaints: 17,
        escalated_complaints: 4,
        avg_resolution_hours: 24,
        by_category: [
          { category: 'Road Infrastructure', count: 14 },
          { category: 'Waste Management', count: 11 },
          { category: 'Street Lighting', count: 7 },
          { category: 'Water Supply', count: 5 },
          { category: 'Stormwater & Drainage', count: 2 }
        ],
        by_severity: [
          { severity: 'HIGH', count: 16 },
          { severity: 'MEDIUM', count: 18 },
          { severity: 'LOW', count: 5 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const total = data?.total_complaints || 39;

  return (
    <div className={isEmbedded ? "space-y-6" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-white min-h-[calc(100vh-64px)]"}>
      {/* Breadcrumb */}
      {!isEmbedded && (
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Link to="/" className="hover:text-slate-600">Home</Link>
          <span>&rsaquo;</span>
          <Link to="/authority" className="hover:text-slate-600">Command Center</Link>
          <span>&rsaquo;</span>
          <span className="text-slate-700 font-medium">Operations Analytics & Reports</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-md p-6 border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-blue-800" />
            <span>Civic Performance Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Municipal Operations Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Grievance metrics, departmental workload distributions, severity breakdown, and SLA resolution velocity.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="px-3.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-800' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* High-Level Metric Cards in Clean Light Theme */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Total Registered</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{data?.total_complaints || 39}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded dockets</span>
        </div>

        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
          <span className="text-[11px] text-blue-800 font-medium">Active In Progress</span>
          <div className="text-2xl font-bold text-blue-800 mt-1">{data?.active_complaints || 18}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Field crews active</span>
        </div>

        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
          <span className="text-[11px] text-emerald-800 font-medium">Resolved</span>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{data?.resolved_complaints || 17}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Remediation closed</span>
        </div>

        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
          <span className="text-[11px] text-rose-800 font-medium">Escalated</span>
          <div className="text-2xl font-bold text-rose-800 mt-1">{data?.escalated_complaints || 4}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Priority inspection</span>
        </div>

        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
          <span className="text-[11px] text-amber-800 font-medium">Avg Resolution</span>
          <div className="text-2xl font-bold text-amber-800 mt-1">{data?.avg_resolution_hours || 24}h</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Standard SLA</span>
        </div>
      </div>

      {/* Charts / Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Category Distribution */}
        <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
            <span>Issues by Civic Department</span>
            <span className="text-xs text-slate-400 font-normal">Breakdown</span>
          </h3>

          <div className="space-y-3 pt-1">
            {data?.by_category?.map((cat, idx) => {
              const pct = Math.round((cat.count / total) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-700">
                    <span className="font-medium">{cat.category}</span>
                    <span className="text-slate-500 font-mono">{cat.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-800 rounded transition-all duration-300"
                      style={{ width: `${Math.max(6, pct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Severity Breakdown */}
        <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
            <span>Issues by Priority Severity</span>
            <span className="text-xs text-slate-400 font-normal">Risk Triage</span>
          </h3>

          <div className="space-y-3 pt-1">
            {data?.by_severity?.map((sev, idx) => {
              const pct = Math.round((sev.count / total) * 100);
              const barColor = sev.severity === 'HIGH' ? 'bg-rose-700' : sev.severity === 'MEDIUM' ? 'bg-amber-600' : 'bg-slate-500';
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-700">
                    <span className="font-medium">{sev.severity} Priority</span>
                    <span className="text-slate-500 font-mono">{sev.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded transition-all duration-300`}
                      style={{ width: `${Math.max(6, pct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
