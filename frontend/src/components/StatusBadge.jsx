import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    'Draft': 'bg-slate-100 text-slate-700 border-slate-300',
    'Submitted': 'bg-blue-50 text-blue-700 border-blue-200',
    'Acknowledged': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Assigned': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'In Progress': 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse',
    'Awaiting Verification': 'bg-purple-50 text-purple-700 border-purple-200',
    'Resolved': 'bg-emerald-50 text-emerald-700 border-emerald-300',
    'Rejected': 'bg-slate-200 text-slate-600 border-slate-300',
    'Escalated': 'bg-rose-50 text-rose-700 border-rose-300 font-semibold'
  };

  const currentStyle = styles[status] || 'bg-slate-100 text-slate-700 border-slate-300';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStyle}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
};

export const SeverityBadge = ({ severity }) => {
  const styles = {
    'LOW': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'MEDIUM': 'bg-amber-50 text-amber-800 border-amber-200',
    'HIGH': 'bg-orange-50 text-orange-700 border-orange-300',
    'CRITICAL': 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
  };

  const currentStyle = styles[severity?.toUpperCase()] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${currentStyle}`}>
      {severity || 'MEDIUM'}
    </span>
  );
};
