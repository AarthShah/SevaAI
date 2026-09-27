"""
CivicSeva Contextual Assistant - Pydantic Schemas

Request/response contracts for POST /api/assistant/chat.

Design rules enforced here:
- Frontend may supply page/form/conversation state for UX routing.
- Frontend may NOT supply role, user_id, or authoritative complaint data.
- confidence is accepted as a raw string (e.g. "92%") matching ReportIssuePage output.
- report_mode / has_text / has_voice are intentionally absent - they do not exist
  in the current ReportIssuePage implementation.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Sub-schemas for the request body
# ---------------------------------------------------------------------------

class AiAnalysisSummary(BaseModel):
    """
    AI analysis result fields as displayed to the user on the report page.
    Confidence is kept as a string because ReportIssuePage formats it as "92%".
    """
    issue: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    department: Optional[str] = None
    confidence: Optional[str] = None        # e.g. "92%" - NOT a float
    explanation: Optional[str] = None


class FormContextInput(BaseModel):
    """
    Report page form state provided by the frontend for context-aware guidance.
    Only fields that actually exist in ReportIssuePage are included.
    report_mode, has_text, has_voice are intentionally omitted - they do not exist.
    """
    active: bool = True
    current_step: Optional[int] = None      # 1=Upload, 2=Analysis, 3=Review, 4=Confirmed
    has_image: bool = False                 # imageFile or imagePreview is set
    is_analyzing: bool = False              # AI analysis API call in flight
    gps_locked: bool = False                # isGpsLocked
    ai_analysis_available: bool = False     # analysis object is non-null and not analyzing
    ai_analysis_summary: Optional[AiAnalysisSummary] = None
    user_reviewing: bool = False            # step === 3
    submission_occurred: bool = False       # step === 4 and submissionResult is non-null
    submitted_complaint_id: Optional[str] = None


class PageContextInput(BaseModel):
    """
    Current UI state from the frontend, used for UX routing and quick-action selection.
    NEVER used to determine authorization or effective role.
    """
    route: Optional[str] = None
    page_name: Optional[str] = None
    active_tab: Optional[str] = None        # activeNav in AuthorityDashboard
    active_sub_tab: Optional[str] = None    # activeTab sub-filter within triage
    ui_section: Optional[str] = None
    selected_complaint_id: Optional[str] = None


class ConversationMessage(BaseModel):
    """Single message in the conversation history."""
    role: str                               # "user" or "assistant"
    content: str


# ---------------------------------------------------------------------------
# Top-level request
# ---------------------------------------------------------------------------

class AssistantChatRequest(BaseModel):
    """
    Full request body for POST /api/assistant/chat.
    effective_role is always resolved server-side from the JWT -> DB user.
    """
    message: str = Field(..., min_length=1, max_length=600)
    page_context: Optional[PageContextInput] = None
    form_context: Optional[FormContextInput] = None
    selected_complaint_id: Optional[str] = None
    conversation_history: List[ConversationMessage] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Internal assembled context (backend only - not a request/response schema)
# ---------------------------------------------------------------------------

class AuthContextData(BaseModel):
    """Server-side resolved authentication state. Never from the request body."""
    authenticated: bool
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    effective_role: str                     # "public" | "citizen" | "authority" | "admin"


class HistoryEventSummary(BaseModel):
    """Condensed complaint history entry for assistant context."""
    new_status: str
    changed_by: Optional[str] = None
    remarks_excerpt: Optional[str] = None   # first 120 chars only
    timestamp: Optional[str] = None


class ComplaintContextData(BaseModel):
    """
    Authoritative complaint data fetched from the database and access-checked.
    Officer phone is deliberately excluded even if the underlying model exposes it.
    """
    complaint_id: str
    status: str
    category: Optional[str] = None
    issue_type: Optional[str] = None
    severity: str
    department_name: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    follow_up_count: int = 0
    escalation_count: int = 0
    escalation_level: Optional[int] = None
    ai_confidence: Optional[float] = None
    grounded_explanation: Optional[str] = None
    recommended_action: Optional[str] = None
    history_summary: List[HistoryEventSummary] = Field(default_factory=list)
    agent_actions_count: int = 0


class AuthorityOpsContextData(BaseModel):
    """
    Operational context for authority/admin users.
    Never populated for citizen or public policy.
    """
    active_tab: Optional[str] = None
    total_open: int = 0
    critical_count: int = 0
    high_count: int = 0
    escalated_count: int = 0
    unassigned_count: int = 0
    autonomous_agent_status: str = "UNKNOWN"
    recent_agent_actions_count: int = 0


class AssistantContext(BaseModel):
    """Complete assembled context passed to the prompt builder and LLM provider."""
    auth: AuthContextData
    page: Optional[PageContextInput] = None
    form: Optional[FormContextInput] = None
    complaint: Optional[ComplaintContextData] = None
    authority_ops: Optional[AuthorityOpsContextData] = None
    conversation_history: List[ConversationMessage] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class QuickAction(BaseModel):
    """A suggested follow-up question or action chip."""
    label: str
    prompt: str


class AssistantChatResponse(BaseModel):
    """
    Response from POST /api/assistant/chat.
    HTTP status is always 200 for recoverable errors so the frontend can render
    the fallback reply. error field is informational only.
    """
    reply: str
    quick_actions: List[QuickAction] = Field(default_factory=list)
    context_version: str = ""
    error: Optional[str] = None             # "llm_unavailable" | "rate_limited" | None
