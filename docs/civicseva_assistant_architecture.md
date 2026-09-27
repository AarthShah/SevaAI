# CivicSeva Contextual Assistant: Architecture Specifications

A detailed technical specification of the CivicSeva Contextual Assistant system architecture, request lifecycles, and security boundaries.

---

## 1. High-Level System Architecture

```text
===================================================================================
                               FRONTEND CLIENT (React)
===================================================================================

 [Pages & Workflows]                 [Assistant UI Components]
  • ReportIssuePage                   • AssistantLauncher (Citizen / Authority)
  • TrackComplaintPage                • AssistantPanel (Modal / Bottom-Sheet)
  • CitizenDashboard                            |
  • AuthorityDashboard                          v
        |                            [AssistantContext (State Singleton)]
        +----------------------------> • Reactive Page & Form State Binding
                                       • Bounded Conversation State (10 turns)
                                       • Cross-Role Session Isolation Hook
                                                |
                                                v
                                     [assistantApi.js (HTTP Client)]
                                                |
                                                | POST /api/assistant/chat
                                                | (Bearer JWT in Header)
================================================|==================================
                               BACKEND ENGINE   v   (FastAPI)
===================================================================================

 [FastAPI Endpoint: backend/app/api/assistant.py]
  • Receives AssistantChatRequest
  • Extracts Bearer Token from HTTP Authorization Header
  • Passes request to AssistantService
        |
        v
 [Authorization & Role Enforcement: backend/app/services/assistant_service.py]
  • Decodes JWT & queries User table -> Establishes authoritative effective_role
  • Ignores client-claimed role field
        |
        v
 [Complaint Authorization Gate]
  • If selected_complaint_id provided:
    - Citizen: Must satisfy complaint.citizen_id == current_user.id
    - Public: Access unconditionally denied
    - Authority: Access granted to all tickets
  • Assembles sanitized ComplaintContextData (status, priority, SLA timers, history)
        |
        v
 [Prompt Synthesis Engine: backend/app/prompts/assistant_prompts.py]
  • Role-specific system instructions (Citizen vs. Authority)
  • Page context, form progress, and operational queue data injection
        |
        v
 [Dual-Engine Execution: backend/app/services/llm_provider.py]
   +---------------------------------------+---------------------------------------+
   | Primary Engine: LLM Provider          | Fallback Engine: Deterministic Rules  |
   | • Online LLM invocation               | • Instant offline rule synthesis      |
   | • Grounded system prompt              | • Engages on timeout, 5xx, or no key  |
   +---------------------------------------+---------------------------------------+
        |
        v
 [Output Safety Filter]
  • Validates reply does not mention unverified complaint IDs
  • Prevents state mutation claims or private officer disclosures
        |
        v
 [AssistantChatResponse returned to client]
```

---

## 2. Request Lifecycle

The lifecycle of an assistant chat query from user submission to response rendering:

```text
User Types Message & Clicks Send
       |
       v
[AssistantPanel.jsx]
  • Validates inputMessage.trim().length > 0
  • Clears input field, appends user message to UI state, sets loading=true
  • Calls AssistantContext.sendMessage(text)
       |
       v
[AssistantContext.jsx]
  • Bundles text, conversation_history (last 10 turns), and active pageContext
  • Calls assistantApi.sendChatMessage(payload, token)
       |
       v
[HTTP Request over Network]
  • POST http://127.0.0.1:8000/api/assistant/chat
  • Headers: Authorization: Bearer <jwt_token>, Content-Type: application/json
       |
       v
[backend/app/api/assistant.py]
  • FastAPI dependency injects db session and resolves current_user via JWT
  • Calls AssistantService.handle_chat(request, current_user, db)
       |
       v
[backend/app/services/assistant_service.py]
  • Resolves effective_role: "admin" | "authority" | "citizen" | "public"
  • Resolves authorized complaint context (if valid & authorized)
  • Computes deterministic context_version
  • Calls generate_assistant_response(request, effective_role, complaint_context)
       |
       v
[backend/app/services/llm_provider.py]
  • Attempts LLM call with prompt; on failure or missing key, triggers fallback
  • Passes text through OutputSafetyLayer
       |
       v
[JSON Response returned to Browser]
  • Body: { reply: "...", quick_actions: [...], context_version: "..." }
       |
       v
[AssistantContext.jsx updates React State]
  • Appends assistant reply to messages array
  • Updates quickActions array
  • Sets loading=false
       |
       v
[AssistantPanel.jsx re-renders]
  • Smoothly scrolls message into view, ready for next interaction
```

---

## 3. Security Boundary & Guardrails

```text
                           UNTRUSTED CLIENT SPACE
 +-------------------------------------------------------------------------+
 | Browser UI / Client-Side State:                                         |
 | • Client can modify localStorage, active tab state, or send spoofed payload|
 +-------------------------------------------------------------------------+
                                      |
                                      | HTTP POST /api/assistant/chat
                                      | (Untrusted body + JWT Header)
 =====================================|=====================================
                          TRUSTED BACKEND PERIMETER
 =====================================|=====================================
                                      v
              +-----------------------------------------------+
              | 1. Cryptographic Authentication Gate          |
              |    • Decodes JWT using server SECRET_KEY      |
              |    • Fetches User record from database        |
              |    • Assigns authoritative role               |
              +-----------------------------------------------+
                                      |
                                      v
              +-----------------------------------------------+
              | 2. Complaint Ownership Gate                   |
              |    • Verifies: citizen_id == user.id          |
              |    • Strips unauthorized complaint context    |
              +-----------------------------------------------+
                                      |
                                      v
              +-----------------------------------------------+
              | 3. Sanitization & Context Stripping           |
              |    • Removes phone numbers, emails, passwords |
              |    • Limits history to 10 exchanges           |
              +-----------------------------------------------+
                                      |
                                      v
              +-----------------------------------------------+
              | 4. System Prompt Boundary                     |
              |    • Read-only directive                      |
              |    • Instruction-override resistance          |
              +-----------------------------------------------+
                                      |
                                      v
              +-----------------------------------------------+
              | 5. Output Safety Layer                        |
              |    • Regex scanner checks for hallucinated IDs|
              |    • Verifies no raw server errors leaked     |
              +-----------------------------------------------+
                                      |
                                      v
                             SANITIZED ADVISORY
```

---

## 4. Citizen Workflow State Progression

```text
[Step 1: Evidence Capture]
  • Form State: { step: 1, hasPhoto: false }
  • Assistant Advice: "Upload or capture a clear photo of the issue to begin."
  • Quick Actions: ["What types of issues can I report?", "How does AI analyze my photo?"]
             |
             | User uploads image -> AI models execute
             v
[Step 2: AI Triage Review]
  • Form State: { step: 2, department: "Road Department", severity: "High" }
  • Assistant Advice: "AI detected a road hazard. Verify the suggested department and urgency."
  • Quick Actions: ["Why this department?", "What does High severity mean?"]
             |
             | User verifies location pin & description
             v
[Step 3: Pre-Submission Review]
  • Form State: { step: 3, isReviewed: true }
  • Assistant Advice: "Review the title, location, and description before final submission."
  • Quick Actions: ["What happens after I submit?"]
             |
             | User clicks Submit -> Ticket generated
             v
[Step 4: Ticket Tracking]
  • Page: /track/CS1001
  • Complaint Context: { id: "CS1001", status: "In Progress", department: "Road Dept" }
  • Assistant Advice: "Your complaint is currently In Progress. Field Squad A has been assigned."
  • Quick Actions: ["What does this status mean?", "What happens next?"]
```

---

## 5. Authority Workflow State Progression

```text
[Dashboard Entry (Triage - Unselected)]
  • State: { activeNav: "triage", selectedComplaintId: null }
  • Header Subtitle: "Operations · triage" (No ticket badge)
  • Assistant Advice: "Focus on High and Critical priority queues requiring assignment."
  • Quick Actions: ["What should I prioritize?", "How do I assign an officer?"]
             |
             | Officer clicks row #CS1039 in Triage table
             v
[Explicit Complaint Selected (Triage - Drawer Open)]
  • State: { activeNav: "triage", selectedComplaintId: "CS1039" }
  • Header Subtitle: "Operations · triage", Header Badge: "#CS1039"
  • Assistant Advice: "High priority road settlement on Bridge Approach. Recommend assigning Field Squad A."
  • Quick Actions: ["Explain this complaint", "What should happen next?"]
             |
             | Officer switches to another operations tab
             v
[Operations Tab Switch (AI Review / Map / Analytics)]
  • State: { activeNav: "ai_review", selectedComplaintId: null }
  • Header Subtitle: "Operations · AI_REVIEW"
  • Assistant Advice: "Review AI categorization confidence ratings and autonomous dispatch audit logs."
  • Quick Actions: ["How does the autonomous sweep work?", "What did the agent do?"]
```
