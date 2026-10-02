import React from 'react';
import { Landmark } from 'lucide-react';

export const CivicLogo = ({ className = "h-7 w-7 text-blue-800", textClassName = "text-lg font-bold text-slate-900" }) => {
  return (
    <div className="flex items-center gap-2.5">
      <Landmark className={className} aria-hidden="true" strokeWidth={2.1} />
      <span className={textClassName}>
        Seva AI
      </span>
    </div>
  );
};
