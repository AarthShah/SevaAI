# CivicSeva Contextual Assistant: Judge Q&A

Concise, accurate answers to anticipated technical, product, and architecture questions from hackathon judges and evaluators.

---

### 1. What makes this different from ChatGPT?
ChatGPT is a detached conversational model with zero awareness of your live application state. The CivicSeva Assistant is deeply integrated into the client-side state machine: it knows what page you are on (`/report`, `/track`, `/authority`), what form step you are viewing, and what complaint you have opened. Furthermore, every response is grounded in real database records gated by strict backend authorization policies.

### 2. How does the assistant know which page the user is on?
Whenever a page or workflow mounts in the React frontend, it calls the `useAssistantContext` hook with its route metadata (e.g. `pageName: 'ReportIssuePage'`, `activeTab: 'triage'`). The singleton `AssistantContext` automatically captures this and bundles it into the `page_context` payload of each request sent to `/api/assistant/chat`.

### 3. How does it know whether the user is a citizen or authority?
Through cryptographically verified JSON Web Tokens (JWT). When an assistant query is dispatched, the frontend attaches the active session token in the `Authorization: Bearer <token>` HTTP header. The backend decodes the token, loads the user record from the database, and authoritatively resolves the role (`public`, `citizen`, `authority`, or `admin`). Any client-claimed role is explicitly discarded.

### 4. Can a citizen access another citizen's complaint?
No. When a citizen requests information regarding a specific complaint ID, the backend `AssistantService` queries the database and verifies that `complaint.citizen_id == current_user.id`. If a mismatch is detected, the complaint data is excluded from the LLM prompt and a polite access-denial message is returned.

### 5. Can the AI change complaint status?
No. The assistant is architected strictly as a read-only advisory copilot. It contains no database mutation tools, SQL write operations, or update endpoints. If a user asks the assistant to "resolve this issue" or "assign an officer", it politely declines and directs them to the authenticated controls (e.g., the *Assign* or *Update Status* modal buttons) in the dashboard.

### 6. What happens if the LLM API fails?
The application never crashes or displays error dialogs. The backend incorporates a deterministic CivicSeva rule-based fallback engine (`llm_provider.py`). If the LLM provider times out, returns an HTTP error, or has no API key configured, the system catches the exception and immediately generates structured, context-appropriate guidance offline.

### 7. What prevents prompt injection?
Three distinct security layers:
1. **System Prompt Hardening**: System instructions explicitly enforce read-only role boundaries and forbid disclosing database dumps or internal instructions.
2. **Context Sanitization**: Sensitive database fields (such as officer cell phone numbers and password hashes) are stripped before context is assembled.
3. **Output Safety Layer**: Post-generation regex filters scan responses for unauthorized complaint IDs and sensitive patterns, replacing contaminated text with safe fallback guidance.

### 8. Why use one assistant instead of two separate chatbots?
A unified assistant engine ensures a single consistent API contract (`POST /api/assistant/chat`), centralized security auditing, and zero duplicated state logic. By dynamically swapping role policies and prompts on the server, the single assistant serves citizens, field officers, and administrators with shared reliability.

### 9. How does the assistant understand the current complaint?
When viewing `/track/:id` or clicking a ticket row in the authority triage table, the complaint ID is registered in `AssistantContext`. On the backend, `AssistantService` fetches the verified record from the database—extracting the defect description, severity, status, department, and SLA countdown—and injects it directly into the prompt context.

### 10. How does the system prevent hallucinated complaint information?
1. The assistant prompt strictly commands the model to use only the structured complaint data supplied in the context block.
2. If no complaint is loaded in context, the model is forbidden from inventing ticket numbers or statuses.
3. The Output Safety Layer scans the assistant's output; if it mentions a complaint ID not present in the authorized input context, the response is discarded and replaced with safe fallback text.

### 11. Where is authorization enforced?
Authorization is enforced **exclusively on the backend** in `backend/app/services/assistant_service.py` and `backend/app/api/assistant.py`. The frontend's state is treated as advisory UI hints. The backend verifies the user's identity, role permissions, and ticket ownership directly against the database before any context is built or sent to the LLM.

### 12. What happens when the user switches roles?
Session isolation is guaranteed. In `AssistantContext.jsx`, a reactive `useEffect` monitors changes to `user.id` and `user.role`. The moment a role switch occurs (such as switching from Citizen to Municipal Portal), the entire conversation history, quick actions, and selected complaint references are wiped clean immediately, preventing cross-role data leaks.

### 13. How does the assistant help municipal authorities?
In the Command Center, the assistant helps officers:
- Prioritize high-severity and overdue complaints in the triage queue.
- Understand AI vision categorization confidence scores and recommended departments.
- Navigate complex multi-tab operational modules (AI Review, GIS Map, Analytics, and CCTV detection feeds).
- Summarize recent actions logged by the autonomous triage agent on specific tickets.

### 14. What data is sent to the LLM?
Only the minimal, sanitized operational context required to answer the query:
- Active page name and form step.
- Anonymized issue description, department, priority, and status.
- Recent SLA timeline timestamps.
- The user's query and recent conversation history (max 10 exchanges).
Private credentials, citizen passwords, internal system connection strings, and private officer phone numbers are never included in prompts.

### 15. Can this architecture scale to more municipal workflows?
Yes. The context protocol uses extensible Pydantic schemas (`PageContextData`, `FormContextData`, `ComplaintContextData`). Integrating a new municipal service (such as Property Tax, Water Billing, or Transit) simply requires adding the page route to `useAssistantContext` and defining corresponding prompt templates in the backend service.
