import React from 'react';
import { Bot } from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';

/**
 * AssistantLauncher
 *
 * Single global floating action button for the CivicSeva contextual AI assistant.
 * Positioned in the bottom-right corner, accessible across all application views.
 */
export const AssistantLauncher = () => {
  const { isOpen, toggleAssistant } = useAssistant();

  // Hide the floating launcher when the assistant panel is open to avoid overlapping the chat interface
  if (isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 group">
      {/* Accessible hover tooltip */}
      <div
        role="tooltip"
        id="assistant-launcher-tooltip"
        className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap rounded-md bg-slate-900/95 text-white text-xs font-medium px-2.5 py-1.5 shadow-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 hidden sm:block"
      >
        <span>Open CivicSeva Assistant</span>
        <div className="absolute top-1/2 -translate-y-1/2 -right-1 border-4 border-transparent border-l-slate-900/95" />
      </div>

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={toggleAssistant}
        aria-label="Open CivicSeva Assistant"
        aria-expanded={isOpen}
        aria-controls="civicseva-assistant-panel"
        aria-describedby="assistant-launcher-tooltip"
        title="Open CivicSeva Assistant"
        className="relative w-[52px] h-[52px] sm:w-14 sm:h-14 rounded-full bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      >
        <Bot className="w-6 h-6 text-white" />

        {/* Online / Available status indicator */}
        <span
          className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute top-0.5 right-0.5"
          title="Assistant online"
        />
      </button>
    </div>
  );
};

export default AssistantLauncher;
