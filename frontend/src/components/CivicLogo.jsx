import React from 'react';

export const CivicLogo = ({ className = "h-7 w-7 text-blue-800", textClassName = "text-lg font-bold text-slate-900" }) => {
  return (
    <div className="flex items-center gap-2.5">
      {/* Geometric Civic / Municipal Building Icon */}
      <svg
        className={className}
        viewBox="0 0 32 32"
        fill="currentColor"
        aria-hidden="true"
      >
        {/* Triangular Pediment */}
        <path d="M16 4L3 11H29L16 4Z" />
        {/* Architrave Bar */}
        <rect x="4" y="11.5" width="24" height="2" />
        {/* 4 Classical Columns */}
        <rect x="6" y="14.5" width="3" height="9.5" rx="0.5" />
        <rect x="11.5" y="14.5" width="3" height="9.5" rx="0.5" />
        <rect x="17.5" y="14.5" width="3" height="9.5" rx="0.5" />
        <rect x="23" y="14.5" width="3" height="9.5" rx="0.5" />
        {/* Foundation Steps */}
        <rect x="4" y="24.5" width="24" height="2" />
        <rect x="2" y="27" width="28" height="2.5" rx="0.5" />
      </svg>
      <span className={textClassName}>
        CivicSeva
      </span>
    </div>
  );
};
