import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, X, Send, AlertCircle, RefreshCw, Sparkles, HelpCircle } from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';

/**
 * Derives a human-friendly context subtitle from live UI context.
 */
const getContextSubtitle = (pageContext, selectedComplaintId) => {
  const page = pageContext?.pageName;
  const tab = pageContext?.activeTab;

  if (page === 'ReportIssuePage') {
    return 'Reporting guidance';
  }
  if (page === 'TrackComplaintPage') {
    return selectedComplaintId ? `Docket #${selectedComplaintId}` : 'Tracking guidance';
  }
  if (page === 'AuthorityDashboard') {
    return tab ? `Operations · ${tab}` : 'Command center guidance';
  }
  if (page === 'CitizenDashboard') {
    return 'Citizen portal guidance';
  }
  return 'Context-aware guidance';
};

/**
 * Dynamic contextual prompt hint for empty state.
 */
const getEmptyStateHint = (pageContext) => {
  const page = pageContext?.pageName;
  if (page === 'ReportIssuePage') {
    return 'Need help with this report? Ask about photo analysis, department routing, or review steps.';
  }
  if (page === 'TrackComplaintPage') {
    return 'Need help understanding this complaint? Ask about status timelines, SLA resolution, or escalation.';
  }
  if (page === 'AuthorityDashboard') {
    return 'Need help with this dashboard? Ask about triage priority, officer dispatch, or autonomous sweeps.';
  }
  return 'Ask a question or select a suggested prompt below to get started.';
};

export const AssistantPanel = () => {
  const {
    isOpen,
    closeAssistant,
    messages,
    loading,
    error,
    quickActions,
    pageContext,
    selectedComplaintId,
    sendMessage
  } = useAssistant();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const subtitle = useMemo(
    () => getContextSubtitle(pageContext, selectedComplaintId),
    [pageContext, selectedComplaintId]
  );

  const emptyHint = useMemo(
    () => getEmptyStateHint(pageContext),
    [pageContext]
  );

  // Auto-scroll toward newest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || loading) return;

    setInputMessage('');
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      id="civicseva-assistant-panel"
      role="dialog"
      aria-labelledby="assistant-panel-title"
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:right-4 sm:left-auto z-50 w-full sm:w-96 max-h-[85vh] sm:max-h-[600px] h-[520px] sm:h-[580px] bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-900"
    >
      {/* ============================================================ */}
      {/* 1. HEADER */}
      {/* ============================================================ */}
      <header className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between flex-shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 flex-shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 id="assistant-panel-title" className="text-xs font-bold text-white tracking-tight truncate">
                Seva AI Assistant
              </h2>
              {selectedComplaintId && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-purple-950 text-purple-300 border border-purple-800/60 flex-shrink-0">
                  #{selectedComplaintId.replace('#', '')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate leading-none mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={closeAssistant}
          aria-label="Close Seva AI Assistant"
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* ============================================================ */}
      {/* 2. CONVERSATION AREA */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center px-4 py-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Hi! I'm the Seva AI Assistant.
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                I can guide you through reporting civic issues, tracking complaints, understanding municipal statuses, and navigating Seva AI.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-left w-full">
              <p className="text-[11px] text-blue-900 font-medium">
                {emptyHint}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={`msg-${index}`}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`px-3 py-2 rounded-xl text-xs leading-relaxed max-w-[85%] break-words whitespace-pre-wrap ${
                    isUser
                      ? 'bg-blue-800 text-white rounded-tr-xs shadow-xs font-normal'
                      : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/80 shadow-xs'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                  {isUser ? 'You' : 'Assistant'}
                </span>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
            <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center animate-pulse">
              <Bot className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-medium text-slate-500">Thinking...</span>
          </div>
        )}

        {/* Non-blocking error notification */}
        {error && (
          <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
            <span>Assistant service notice: standard offline guidance active.</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ============================================================ */}
      {/* 3. QUICK ACTIONS CHIPS */}
      {/* ============================================================ */}
      {quickActions && quickActions.length > 0 && (
        <div className="px-3 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 flex-shrink-0 max-h-24 overflow-y-auto">
          {quickActions.map((qa, idx) => (
            <button
              key={`qa-${idx}`}
              type="button"
              disabled={loading}
              onClick={() => sendMessage(qa.prompt)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300 border border-slate-200 transition text-left truncate max-w-full disabled:opacity-50"
              title={qa.prompt}
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MESSAGE INPUT */}
      {/* ============================================================ */}
      <footer className="p-2.5 bg-white border-t border-slate-200 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            maxLength={600}
            placeholder="Ask about this complaint or page..."
            aria-label="Type message for Seva AI Assistant"
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            aria-label="Send question to Assistant"
            className="p-2 rounded-lg bg-blue-800 hover:bg-blue-900 disabled:bg-slate-200 text-white disabled:text-slate-400 transition flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-700 flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default AssistantPanel;
