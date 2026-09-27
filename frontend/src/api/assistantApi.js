import api from './client';

/**
 * CivicSeva Contextual Assistant API Client
 *
 * Sends user message and serialized frontend context to the backend.
 * Uses the standard authenticated Axios client (JWT injected via interceptor).
 */
export const assistantApi = {
  /**
   * Send a chat message with current UI/page context.
   *
   * @param {Object} payload
   * @param {string} payload.message - User prompt (1-600 chars)
   * @param {Object} [payload.page_context] - Current route, tab, sub-tab, ui-section
   * @param {Object} [payload.form_context] - Report issue form state (if active)
   * @param {string|null} [payload.selected_complaint_id] - Explicitly selected complaint ID
   * @param {Array<{role: string, content: string}>} [payload.conversation_history] - Bounded history
   * @returns {Promise<{reply: string, quick_actions: Array, context_version: string, error?: string}>}
   */
  sendAssistantMessage: async (payload) => {
    const res = await api.post('/assistant/chat', payload);
    return res.data;
  }
};

export default assistantApi;
