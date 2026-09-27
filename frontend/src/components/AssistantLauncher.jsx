import React from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';

/**
 * AssistantLauncher
 *
 * Compact launcher button embedded in the CivicSeva Navbar.
 * Matches the existing rectangular utility button style (Citizen View / Municipal Portal).
 *
 * @param {Object} props
 * @param {'authority' | 'citizen'} [props.variant='citizen'] - Navbar color theme
 * @param {string} [props.className] - Optional extra class overrides
 */
export const AssistantLauncher = ({ variant = 'citizen', className = '' }) => {
  const { isOpen, toggleAssistant } = useAssistant();

  const isAuthority = variant === 'authority';

  const baseClasses = isAuthority
    ? 'border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white'
    : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50';

  const activeClasses = isOpen
    ? isAuthority
      ? 'ring-2 ring-purple-500/60 bg-slate-700 text-white'
      : 'ring-2 ring-purple-500/40 bg-purple-50 text-purple-900 border-purple-300'
    : '';

  return (
    <button
      type="button"
      onClick={toggleAssistant}
      aria-label={isOpen ? 'Close CivicSeva Assistant' : 'Open CivicSeva Assistant'}
      aria-expanded={isOpen}
      aria-controls="civicseva-assistant-panel"
      className={`px-2.5 py-1 text-xs font-medium border rounded transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${baseClasses} ${activeClasses} ${className}`}
      title="Open Contextual CivicSeva Assistant"
    >
      <Bot className={`w-3.5 h-3.5 ${isOpen ? 'text-purple-400' : isAuthority ? 'text-purple-300' : 'text-purple-600'}`} />
      <span className="font-medium">Assistant</span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Assistant ready" />
    </button>
  );
};

export default AssistantLauncher;
