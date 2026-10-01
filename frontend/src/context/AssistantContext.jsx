import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { assistantApi } from '../api/assistantApi';

const AssistantContext = createContext(null);

const MAX_EXCHANGES = 10; // Max 10 exchanges = 20 messages (user + assistant)

/**
 * Generates a stable context version string based on significant UI dimensions.
 */
const computeContextVersion = ({ route, pageName, activeTab, selectedComplaintId }) => {
  const parts = [
    route || '/',
    pageName || 'unknown',
    activeTab || 'default',
    selectedComplaintId ? `id:${selectedComplaintId}` : 'no-id'
  ];
  return parts.join('|');
};

export const AssistantProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Safe location extraction if inside a Router
  let locationPath = '';
  try {
    const loc = useLocation();
    locationPath = loc?.pathname || '';
  } catch {
    locationPath = typeof window !== 'undefined' ? window.location.pathname : '';
  }

  // Active page & form context registered by mounted pages
  const [pageContext, setPageContextState] = useState({
    pageName: null,
    activeTab: null,
    activeSubTab: null,
    uiSection: null,
    selectedComplaintId: null
  });

  const [formContext, setFormContextState] = useState(null);

  // Chat conversation state
  const [messages, setMessages] = useState([]); // [{ role: 'user' | 'assistant', content: string }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quickActions, setQuickActions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [contextVersion, setContextVersion] = useState(() => 
    computeContextVersion({ route: locationPath, pageName: null, activeTab: null, selectedComplaintId: null })
  );

  // Track user identity (id & role) to detect auth/role changes (e.g. switchDemoRole, logout, login)
  const prevUserRef = useRef({ id: user?.id, role: user?.role });

  useEffect(() => {
    const prev = prevUserRef.current;
    const currentId = user?.id;
    const currentRole = user?.role;

    if (prev.id !== currentId || prev.role !== currentRole) {
      // User identity or role has changed: clear all stale context & history immediately
      setMessages([]);
      setError(null);
      setQuickActions([]);
      setFormContextState(null);
      setPageContextState((prev) => ({
        ...prev,
        selectedComplaintId: null
      }));
      setContextVersion(computeContextVersion({
        route: locationPath,
        pageName: pageContext.pageName,
        activeTab: pageContext.activeTab,
        selectedComplaintId: null
      }));
      prevUserRef.current = { id: currentId, role: currentRole };
    }
  }, [user?.id, user?.role, locationPath, pageContext.pageName, pageContext.activeTab]);

  // Update context version whenever significant dimensions change
  useEffect(() => {
    const newVersion = computeContextVersion({
      route: locationPath,
      pageName: pageContext.pageName,
      activeTab: pageContext.activeTab,
      selectedComplaintId: pageContext.selectedComplaintId
    });
    setContextVersion(newVersion);
  }, [locationPath, pageContext.pageName, pageContext.activeTab, pageContext.selectedComplaintId]);

  // Method called by useAssistantContext() hook
  const registerContext = useCallback((incoming) => {
    if (!incoming) return;

    setPageContextState((prev) => {
      const next = {
        pageName: incoming.pageName !== undefined ? incoming.pageName : prev.pageName,
        activeTab: incoming.activeTab !== undefined ? incoming.activeTab : prev.activeTab,
        activeSubTab: incoming.activeSubTab !== undefined ? incoming.activeSubTab : prev.activeSubTab,
        uiSection: incoming.uiSection !== undefined ? incoming.uiSection : prev.uiSection,
        selectedComplaintId: incoming.selectedComplaintId !== undefined ? incoming.selectedComplaintId : prev.selectedComplaintId
      };
      // Only trigger state update if at least one value changed
      if (
        prev.pageName === next.pageName &&
        prev.activeTab === next.activeTab &&
        prev.activeSubTab === next.activeSubTab &&
        prev.uiSection === next.uiSection &&
        prev.selectedComplaintId === next.selectedComplaintId
      ) {
        return prev;
      }
      return next;
    });

    if (incoming.formContext !== undefined) {
      setFormContextState(incoming.formContext);
    }
  }, []);

  const unregisterContext = useCallback((pageName) => {
    setPageContextState((prev) => {
      if (prev.pageName === pageName) {
        return {
          pageName: null,
          activeTab: null,
          activeSubTab: null,
          uiSection: null,
          selectedComplaintId: null
        };
      }
      return prev;
    });
    setFormContextState(null);
  }, []);

  // Send message to assistant
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || loading) return null;

    setLoading(true);
    setError(null);

    // Optimistically append user message (bounded to MAX_EXCHANGES)
    const userMsg = { role: 'user', content: trimmed };
    const nextHistory = [...messages, userMsg].slice(-(MAX_EXCHANGES * 2));
    setMessages(nextHistory);

    // Assemble payload for POST /api/assistant/chat
    const payload = {
      message: trimmed,
      page_context: {
        route: locationPath || '/',
        page_name: pageContext.pageName || null,
        active_tab: pageContext.activeTab || null,
        active_sub_tab: pageContext.activeSubTab || null,
        ui_section: pageContext.uiSection || null,
        selected_complaint_id: pageContext.selectedComplaintId || null
      },
      form_context: formContext || null,
      selected_complaint_id: pageContext.selectedComplaintId || null,
      conversation_history: messages.slice(-10) // previous history up to last 10 messages
    };

    try {
      const data = await assistantApi.sendAssistantMessage(payload);

      const assistantReply = data.reply || 'I am ready to help with your civic queries.';
      const assistantMsg = { role: 'assistant', content: assistantReply };

      setMessages((prev) => [...prev, assistantMsg].slice(-(MAX_EXCHANGES * 2)));
      setQuickActions(data.quick_actions || []);
      if (data.context_version) {
        setContextVersion(data.context_version);
      }
      if (data.error) {
        setError(data.error);
      }
      return data;
    } catch (err) {
      const errorMsg = err.message || 'Unable to connect to Seva AI Assistant';
      setError(errorMsg);
      // Even if network fails, add a friendly offline message so user isn't stuck
      const fallbackMsg = {
        role: 'assistant',
        content: 'I am temporarily unable to reach the assistant service. You can still use all standard Seva AI reporting and tracking features directly on this page.'
      };
      setMessages((prev) => [...prev, fallbackMsg].slice(-(MAX_EXCHANGES * 2)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading, messages, locationPath, pageContext, formContext]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setQuickActions([]);
  }, []);

  const toggleAssistant = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openAssistant = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = {
    // State
    messages,
    loading,
    error,
    quickActions,
    contextVersion,
    pageContext,
    formContext,
    selectedComplaintId: pageContext.selectedComplaintId,
    isOpen,

    // Actions
    sendMessage,
    clearConversation,
    registerContext,
    unregisterContext,
    toggleAssistant,
    openAssistant,
    closeAssistant,
    setIsOpen
  };

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
};

/**
 * Hook to consume assistant conversation & actions.
 * Safe to call even if AssistantProvider is not yet in the tree.
 */
export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    // Return safe inert defaults if invoked before AssistantProvider is mounted
    return {
      messages: [],
      loading: false,
      error: null,
      quickActions: [],
      contextVersion: '',
      pageContext: {},
      formContext: null,
      selectedComplaintId: null,
      isOpen: false,
      sendMessage: async () => null,
      clearConversation: () => {},
      registerContext: () => {},
      unregisterContext: () => {},
      toggleAssistant: () => {},
      openAssistant: () => {},
      closeAssistant: () => {},
      setIsOpen: () => {}
    };
  }
  return context;
};

/**
 * Hook used unconditionally by individual pages to register their live UI context.
 *
 * Example:
 *   useAssistantContext({
 *     pageName: 'TrackComplaintPage',
 *     selectedComplaintId: complaint?.id || null
 *   });
 */
export const useAssistantContext = (incomingContext) => {
  const { registerContext, unregisterContext } = useAssistant();
  const pageName = incomingContext?.pageName;

  // Track serialized values to avoid unnecessary re-registrations
  const serialized = JSON.stringify(incomingContext || {});

  useEffect(() => {
    if (incomingContext) {
      registerContext(incomingContext);
    }
    return () => {
      if (pageName) {
        unregisterContext(pageName);
      }
    };
  }, [serialized, registerContext, unregisterContext, pageName]);
};

export default AssistantContext;
