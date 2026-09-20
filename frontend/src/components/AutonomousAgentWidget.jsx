import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, ShieldCheck, Bell, AlertTriangle, ArrowRight, CheckCircle2, Zap, Radio, Building2 } from 'lucide-react';
import { agentApi } from '../api/agentApi';

export const AutonomousAgentWidget = ({ onSweepComplete }) => {
  const [stats, setStats] = useState(null);
  const [recentActions, setRecentActions] = useState([]);
  const [isRunningSweep, setIsRunningSweep] = useState(false);
  const [sweepResult, setSweepResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatsAndActions = async () => {
    try {
      const [statsData, actionsData] = await Promise.all([
        agentApi.getAutonomousStats(),
        agentApi.getAutonomousActions(8)
      ]);
      setStats(statsData);
      setRecentActions(actionsData);
    } catch (err) {
      // Background poll failure tolerated
    }
  };

  useEffect(() => {
    fetchStatsAndActions();
    const interval = setInterval(fetchStatsAndActions, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRunSweep = async () => {
    setIsRunningSweep(true);
    setSweepResult(null);
    setError(null);
    try {
      const result = await agentApi.runAutonomousSweep(true);
      setSweepResult(result);
      await fetchStatsAndActions();
      if (onSweepComplete) onSweepComplete(result);
    } catch (err) {
      setError(err.message || 'Failed to complete autonomous sweep.');
    } finally {
      setIsRunningSweep(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20 space-y-6">
      {/* Header with Live Pulsing Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Autonomous Intelligence Core Active
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
            <span>CivicSeva Autonomous Operations Center</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Continuously monitors active civic complaints, automatically routes work orders to municipal departments, 
            and autonomously sends formal status update inquiries upon SLA delay.
          </p>
        </div>

        {/* 1-Click Autonomous Sweep Trigger Button */}
        <button
          type="button"
          onClick={handleRunSweep}
          disabled={isRunningSweep}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-60"
        >
          {isRunningSweep ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              <span>Running Autonomous Sweep...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>⚡ Trigger Autonomous Sweep Now</span>
            </>
          )}
        </button>
      </div>

      {/* Sweep Result Banner */}
      {sweepResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 animate-scale-up">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Autonomous Sweep Completed: {sweepResult.tickets_scanned} Tickets Scanned</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-400/80">
              {new Date(sweepResult.sweep_timestamp).toLocaleTimeString()}
            </span>
          </div>
          {sweepResult.actions_taken && sweepResult.actions_taken.length > 0 ? (
            <div className="space-y-1 pl-5 list-disc text-[11px] text-emerald-200">
              {sweepResult.actions_taken.map((act, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="font-semibold text-white">#{act.complaint_id}:</span>
                  <span>{act.summary}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-emerald-200/80 pl-5">
              All active complaints are currently within normal SLA limits. Zero overdue breaches detected.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Real-time Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">Monitored Tickets</span>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {stats?.active_monitored_tickets ?? '—'}
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" /> 24/7 Watchdog
          </span>
        </div>

        <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">Auto-Dispatched</span>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {stats?.total_auto_dispatched ?? '—'}
          </div>
          <span className="text-[10px] text-teal-400">1-Click Zero Human Triage</span>
        </div>

        <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">Dept Auto-Inquiries</span>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {stats?.total_auto_inquiries ?? '—'}
          </div>
          <span className="text-[10px] text-amber-400">Automated Status Checks</span>
        </div>

        <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">Auto-Escalations</span>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {stats?.total_escalations ?? '—'}
          </div>
          <span className="text-[10px] text-rose-400">Level 1 Vigilance Alerts</span>
        </div>
      </div>

      {/* Real-time Autonomous Activity Stream */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
          <span>Live Autonomous Action Stream</span>
          <span className="text-[10px] text-slate-500 font-mono">Real-time DB Telemetry</span>
        </div>

        <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800 max-h-48 overflow-y-auto space-y-2 font-mono text-xs divide-y divide-slate-800/80">
          {recentActions.length === 0 ? (
            <p className="text-slate-500 text-center py-3">No autonomous actions recorded yet.</p>
          ) : (
            recentActions.map((act) => (
              <div key={act.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-[11px]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                      {act.agent_name}
                    </span>
                    <span className="text-slate-300 font-semibold">{act.action}</span>
                    <span className="text-indigo-400 font-bold">#{act.complaint_id}</span>
                  </div>
                  <p className="text-slate-400 font-sans text-[11px]">{act.output_summary}</p>
                </div>
                <span className="text-[10px] text-slate-500 flex-shrink-0">
                  {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
