import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Bot, ArrowDown } from 'lucide-react';

export const AgentTraceTimeline = ({ trace = [] }) => {
  if (!trace || trace.length === 0) {
    return (
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
        No agent decision traces available yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-slate-900 text-sm">AI Agent Decision Trace</h3>
            <p className="text-xs text-slate-500">Autonomous workflow execution & verification audit trail</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          {trace.length} Trace Steps
        </span>
      </div>

      <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {trace.map((step, idx) => {
          const isPending = step.status === 'pending_citizen' || step.status === 'pending';
          const isCompleted = !isPending;

          return (
            <div key={idx} className="relative pl-8 text-xs group">
              {/* Step indicator dot */}
              <div
                className={`absolute left-1.5 top-0.5 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center ${
                  isPending
                    ? 'bg-amber-100 text-amber-600 ring-4 ring-white'
                    : 'bg-emerald-100 text-emerald-600 ring-4 ring-white'
                }`}
              >
                {isPending ? (
                  <Clock className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
              </div>

              {/* Step body card */}
              <div className="bg-slate-50 hover:bg-slate-100/80 transition p-3 rounded-lg border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="text-purple-700 font-mono text-[10px] uppercase bg-purple-100/70 px-1.5 py-0.5 rounded">
                      {step.agent_name || 'CivicSeva Agent'}
                    </span>
                    <span>{step.action}</span>
                  </span>
                  {step.timestamp && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </div>

                {step.input_summary && (
                  <p className="text-slate-600 mt-0.5">
                    <strong className="text-slate-500 font-medium">Input:</strong> {step.input_summary}
                  </p>
                )}

                {step.output_summary && (
                  <p className="text-slate-800 font-medium mt-1 text-[11px] bg-white p-1.5 rounded border border-slate-100">
                    <span className="text-emerald-600 font-bold mr-1">✓</span>
                    {step.output_summary}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
