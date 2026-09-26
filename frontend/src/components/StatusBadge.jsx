import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    'Draft': 'bg-slate-100 text-slate-700 border-slate-300',
    'Submitted': 'bg-blue-50 text-blue-800 border-blue-200',
    'Acknowledged': 'bg-slate-100 text-slate-800 border-slate-300',
    'Under Review': 'bg-amber-50 text-amber-800 border-amber-200',
    'Assigned': 'bg-sky-50 text-sky-800 border-sky-200',
    'In Progress': 'bg-blue-50 text-blue-800 border-blue-200',
    'Awaiting Verification': 'bg-slate-100 text-slate-800 border-slate-200',
    'Resolved': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    'Rejected': 'bg-slate-100 text-slate-600 border-slate-200',
    'Escalated': 'bg-rose-50 text-rose-800 border-rose-200'
  };

  const currentStyle = styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${currentStyle}`}>
      {status}
    </span>
  );
};

export const SeverityBadge = ({ severity }) => {
  const styles = {
    'LOW': 'bg-slate-100 text-slate-700 border-slate-200',
    'MEDIUM': 'bg-amber-50 text-amber-800 border-amber-200',
    'HIGH': 'bg-rose-50 text-rose-800 border-rose-200',
    'CRITICAL': 'bg-rose-100 text-rose-900 border-rose-300'
  };

  const currentStyle = styles[severity?.toUpperCase()] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${currentStyle}`}>
      {severity || 'MEDIUM'}
    </span>
  );
};
