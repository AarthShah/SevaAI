import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart, ShieldAlert, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { analyticsApi } from '../api/analyticsApi';

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const summary = await analyticsApi.getSummary();
      setData(summary);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
        <span>Loading municipal analytics engine...</span>
      </div>
    );
  }

  const total = data.total_complaints || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Civic Performance Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
            Municipal Operations Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Aggregated grievance metrics, category distributions, severity ratios, and SLA resolution performance.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Top High-Level Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Registered</span>
          <div className="text-3xl font-extrabold font-heading text-slate-900 mt-1">{data.total_complaints}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Lifetime volume</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-blue-600 font-medium">Active In Progress</span>
          <div className="text-3xl font-extrabold font-heading text-blue-600 mt-1">{data.active_complaints}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Under remedial works</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-emerald-600 font-medium">Resolved</span>
          <div className="text-3xl font-extrabold font-heading text-emerald-600 mt-1">{data.resolved_complaints}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Successfully verified</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-rose-600 font-medium">Escalated</span>
          <div className="text-3xl font-extrabold font-heading text-rose-600 mt-1">{data.escalated_complaints}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">High-vigilance review</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-amber-600 font-medium">Avg Resolution</span>
          <div className="text-3xl font-extrabold font-heading text-amber-600 mt-1">{data.avg_resolution_hours}h</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Civic SLA benchmark</span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Complaints by Category */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center justify-between">
            <span>Complaints by Civic Category</span>
            <span className="text-xs text-slate-400">Distribution</span>
          </h3>

          <div className="space-y-3 pt-2">
            {data.by_category.map((cat, idx) => {
              const pct = Math.round((cat.count / total) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{cat.category}</span>
                    <span>{cat.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(8, pct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Complaints by Severity */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center justify-between">
            <span>Complaints by AI-Estimated Severity</span>
            <span className="text-xs text-slate-400">Risk Assessment</span>
          </h3>

          <div className="space-y-3 pt-2">
            {data.by_severity.map((sev, idx) => {
              const pct = Math.round((sev.count / total) * 100);
              const colors = {
                CRITICAL: 'bg-rose-700',
                HIGH: 'bg-rose-500',
                MEDIUM: 'bg-amber-500',
                LOW: 'bg-emerald-500'
              };
              const barColor = colors[sev.severity.toUpperCase()] || 'bg-slate-500';

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span className="uppercase tracking-wider">{sev.severity}</span>
                    <span>{sev.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(8, pct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Department Workload */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center justify-between">
            <span>Department Routing Volume</span>
            <span className="text-xs text-slate-400">Jurisdiction</span>
          </h3>

          <div className="space-y-3 pt-2">
            {data.by_department.map((dept, idx) => {
              const pct = Math.round((dept.count / total) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span className="truncate max-w-[220px]">{dept.department}</span>
                    <span>{dept.count} cases</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(6, pct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. 7-Day Trend */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center justify-between">
            <span>7-Day Resolution Volume</span>
            <span className="text-xs text-slate-400">Trendline</span>
          </h3>

          <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2">
            {data.recent_trend.map((day, idx) => {
              const heightPct = Math.min(100, Math.max(15, day.complaints * 30));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-bold text-slate-700">{day.complaints}</span>
                  <div
                    className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-all duration-300"
                    style={{ height: `${heightPct}%` }}
                  ></div>
                  <span className="text-[10px] text-slate-400 font-mono">{day.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
