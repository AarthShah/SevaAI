"""
CivicSeva Contextual Assistant - Orchestration Service

Implements the complete request-to-response pipeline:

  AssistantChatRequest
    -> resolve effective role from JWT (get_optional_user result)
    -> validate complaint access (ownership + role check)
    -> build authoritative AssistantContext from DB
    -> build system prompt
    -> call AssistantEngine (LLM or deterministic fallback)
    -> validate output (OutputSafetyLayer)
    -> select contextual quick actions
    -> return AssistantChatResponse

READ-ONLY CONTRACT:
  This service MUST NOT call any mutation endpoint or service method.
  It reads from the DB but never writes.
  It never calls autonomous_engine.run_autonomous_sweep().
  It never calls aiml_client.analyze_complaint().
  It never modifies complaint, officer, notification, or any other model.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Optional, List, Dict

from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.complaint import Complaint
from ..models.complaint_history import ComplaintHistory
from ..models.agent_action import AgentAction
from ..models.escalation import Escalation
from ..models.user import User
from ..services.autonomous_agent import autonomous_engine
from ..schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantContext,
    AuthContextData,
    ComplaintContextData,
    AuthorityOpsContextData,
    HistoryEventSummary,
    QuickAction,
    ConversationMessage,
)
from ..prompts.assistant_prompts import build_system_prompt
from ..services.llm_provider import assistant_engine

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_HISTORY_MESSAGES = 20       # cap conversation context
MAX_HISTORY_CHARS = 8000        # total character budget for history
HISTORY_EXCERPT_CHARS = 120     # remarks truncation for complaint history


# ---------------------------------------------------------------------------
# Role policy resolver
# ---------------------------------------------------------------------------

def _resolve_effective_role(current_user: Optional[User]) -> str:
    """
    Maps the server-validated User object to an effective policy name.
    Returns "public" when current_user is None (unauthenticated or invalid token).
    The frontend NEVER influences this value.
    """
    if current_user is None:
        return "public"
    role = (current_user.role or "").lower()
    if role in ("authority", "admin"):
        return role
    return "citizen"


# ---------------------------------------------------------------------------
# Complaint context builder (server-side, access-gated)
# ---------------------------------------------------------------------------

def _build_complaint_context(
    complaint_id: str,
    effective_role: str,
    current_user: Optional[User],
    db: Session,
) -> Optional[ComplaintContextData]:
    """
    Fetches and validates access to a complaint from the database.
    Returns None (silently) when:
      - Complaint does not exist.
      - Requesting user is a citizen and does not own this complaint.
    Never raises an exception — caller receives None and the assistant gives a safe response.
    """
    if not complaint_id:
        return None

    clean_id = complaint_id.strip().upper().replace("#", "")
    complaint = db.query(Complaint).filter(Complaint.id == clean_id).first()

    if complaint is None:
        return None

    # Access gate
    if effective_role == "citizen":
        if current_user is None:
            return None
        if complaint.citizen_id is None or complaint.citizen_id != current_user.id:
            logger.info(
                "Assistant: citizen %s denied access to complaint %s (owned by citizen_id=%s)",
                current_user.id, clean_id, complaint.citizen_id,
            )
            return None
    elif effective_role == "public":
        # Unauthenticated users cannot see complaint data
        return None
    # authority / admin: access granted for all complaints

    # History (last 5 events, newest first)
    history_records = (
        db.query(ComplaintHistory)
        .filter(ComplaintHistory.complaint_id == clean_id)
        .order_by(ComplaintHistory.timestamp.desc())
        .limit(5)
        .all()
    )
    history_summary = []
    for h in history_records:
        remarks_excerpt = None
        if h.remarks:
            remarks_excerpt = h.remarks[:HISTORY_EXCERPT_CHARS]
            if len(h.remarks) > HISTORY_EXCERPT_CHARS:
                remarks_excerpt += "…"
        ts = h.timestamp.strftime("%d %b %Y %H:%M") if h.timestamp else None
        history_summary.append(HistoryEventSummary(
            new_status=h.new_status,
            changed_by=h.changed_by,
            remarks_excerpt=remarks_excerpt,
            timestamp=ts,
        ))

    # Escalation info
    escalations = (
        db.query(Escalation)
        .filter(Escalation.complaint_id == clean_id)
        .all()
    )
    escalation_count = len(escalations)
    escalation_level = escalations[-1].level if escalations else None

    # Agent action count
    agent_actions_count = (
        db.query(func.count(AgentAction.id))
        .filter(AgentAction.complaint_id == clean_id)
        .scalar() or 0
    )

    # Department name
    dept_name = None
    if complaint.department:
        dept_name = complaint.department.name
    elif complaint.department_id:
        dept_name = f"Department #{complaint.department_id}"

    return ComplaintContextData(
        complaint_id=complaint.id,
        status=complaint.status,
        category=complaint.category,
        issue_type=complaint.issue_type,
        severity=complaint.severity,
        department_name=dept_name,
        # officer phone deliberately excluded — never surfaced to any role
        assigned_officer_name=complaint.assigned_officer_name,
        created_at=complaint.created_at.isoformat() if complaint.created_at else None,
        updated_at=complaint.updated_at.isoformat() if complaint.updated_at else None,
        follow_up_count=complaint.follow_up_count or 0,
        escalation_count=escalation_count,
        escalation_level=escalation_level,
        ai_confidence=complaint.ai_confidence,
        grounded_explanation=complaint.grounded_explanation,
        recommended_action=complaint.recommended_action,
        history_summary=history_summary,
        agent_actions_count=agent_actions_count,
    )


# ---------------------------------------------------------------------------
# Authority ops context builder
# ---------------------------------------------------------------------------

def _build_authority_ops_context(
    active_tab: Optional[str],
    db: Session,
) -> AuthorityOpsContextData:
    """
    Assembles a lightweight operational summary for authority users.
    Uses direct DB queries — never calls complaint mutation services.
    """
    try:
        closed_statuses = ["Resolved", "Rejected"]

        total_open = (
            db.query(func.count(Complaint.id))
            .filter(Complaint.status.notin_(closed_statuses))
            .scalar() or 0
        )
        critical_count = (
            db.query(func.count(Complaint.id))
            .filter(Complaint.severity == "CRITICAL", Complaint.status.notin_(closed_statuses))
            .scalar() or 0
        )
        high_count = (
            db.query(func.count(Complaint.id))
            .filter(Complaint.severity == "HIGH", Complaint.status.notin_(closed_statuses))
            .scalar() or 0
        )
        escalated_count = (
            db.query(func.count(Complaint.id))
            .filter(Complaint.status == "Escalated")
            .scalar() or 0
        )
        unassigned_count = (
            db.query(func.count(Complaint.id))
            .filter(
                Complaint.assigned_officer_id.is_(None),
                Complaint.status.notin_(closed_statuses),
            )
            .scalar() or 0
        )

        # Autonomous agent status (read-only call to existing engine stats)
        stats = autonomous_engine.get_autonomous_stats(db)
        agent_status = stats.get("agent_status", "UNKNOWN")
        recent_actions = stats.get("total_auto_dispatched", 0)

        return AuthorityOpsContextData(
            active_tab=active_tab,
            total_open=total_open,
            critical_count=critical_count,
            high_count=high_count,
            escalated_count=escalated_count,
            unassigned_count=unassigned_count,
            autonomous_agent_status=agent_status,
            recent_agent_actions_count=recent_actions,
        )
    except Exception as exc:
        logger.warning("AssistantService: could not build authority ops context: %s", exc)
        return AuthorityOpsContextData(active_tab=active_tab)


# ---------------------------------------------------------------------------
# Context version computation
# ---------------------------------------------------------------------------

def _compute_context_version(request: AssistantChatRequest, effective_role: str) -> str:
    """
    Deterministic version string used by the frontend to detect when
    conversation history should be cleared (page/complaint/role changed).
    """
    route = (request.page_context.route or "") if request.page_context else ""
    tab = (request.page_context.active_tab or "") if request.page_context else ""
    cid = (request.selected_complaint_id or "")
    return f"{effective_role}:{route}:{tab}:{cid}"


# ---------------------------------------------------------------------------
# Quick action builder
# ---------------------------------------------------------------------------

_QUICK_ACTIONS_MAP: Dict[str, List[QuickAction]] = {
    "landing_public": [
        QuickAction(label="How do I report an issue?", prompt="How do I report a civic issue?"),
        QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
        QuickAction(label="What can I track?", prompt="What types of complaints can I track?"),
    ],
    "landing_citizen": [
        QuickAction(label="Report a new issue", prompt="How do I report a new civic issue?"),
        QuickAction(label="Track my complaint", prompt="How do I track my complaint?"),
        QuickAction(label="What do statuses mean?", prompt="What do the complaint statuses mean?"),
    ],
    "report_step1": [
        QuickAction(label="What types of issues can I report?", prompt="What types of civic issues can I report?"),
        QuickAction(label="How does location work?", prompt="Why is location important when reporting?"),
        QuickAction(label="How does the AI work?", prompt="How does the AI analyze my photo?"),
    ],
    "report_step2": [
        QuickAction(label="How does AI analysis work?", prompt="How does the AI analyze my issue?"),
        QuickAction(label="What is good evidence?", prompt="What makes a good photo for reporting?"),
        QuickAction(label="What happens after I submit?", prompt="What happens after I submit my complaint?"),
    ],
    "report_ai_done": [
        QuickAction(label="Explain this AI result", prompt="Explain the AI analysis result shown."),
        QuickAction(label="Why this department?", prompt="Why was this department suggested?"),
        QuickAction(label="What does this severity mean?", prompt="What does this severity level mean?"),
    ],
    "report_submitted": [
        QuickAction(label="How do I track this?", prompt="How do I track my submitted complaint?"),
        QuickAction(label="What happens next?", prompt="What happens after submitting a complaint?"),
    ],
    "track_no_complaint": [
        QuickAction(label="How do I find my complaint?", prompt="How do I find my complaint ID?"),
        QuickAction(label="What do statuses mean?", prompt="What do the complaint statuses mean?"),
    ],
    "track_with_complaint": [
        QuickAction(label="What does this status mean?", prompt="What does my current status mean?"),
        QuickAction(label="What happens next?", prompt="What happens next for my complaint?"),
        QuickAction(label="How do I follow up?", prompt="How can I follow up on this complaint?"),
    ],
    "track_escalated": [
        QuickAction(label="Why was this escalated?", prompt="Why was my complaint escalated?"),
        QuickAction(label="What happens when escalated?", prompt="What happens when a complaint is escalated?"),
    ],
    "citizen_dashboard": [
        QuickAction(label="Report a new issue", prompt="How do I report a new civic issue?"),
        QuickAction(label="What do statuses mean?", prompt="What do the complaint statuses mean?"),
        QuickAction(label="How do I follow up?", prompt="How can I follow up on a complaint?"),
    ],
    "authority_triage": [
        QuickAction(label="What should I prioritize?", prompt="What complaints should I handle first?"),
        QuickAction(label="How do I assign an officer?", prompt="How do I assign an officer to a complaint?"),
        QuickAction(label="What triggers escalation?", prompt="What triggers automatic escalation?"),
    ],
    "authority_triage_complaint": [
        QuickAction(label="Explain this complaint", prompt="Explain the selected complaint and its current state."),
        QuickAction(label="What should happen next?", prompt="What action should be taken on this complaint?"),
        QuickAction(label="What does this agent action mean?", prompt="What did the autonomous agent do on this complaint?"),
    ],
    "authority_analytics": [
        QuickAction(label="Explain overdue complaints", prompt="What does the overdue complaint count mean?"),
        QuickAction(label="Which department needs attention?", prompt="Which department has the most open complaints?"),
        QuickAction(label="What is the SLA?", prompt="What are the SLA thresholds for each severity level?"),
    ],
    "authority_cctv": [
        QuickAction(label="How does CCTV detection work?", prompt="How does the CCTV vision detection system work?"),
        QuickAction(label="What should I do with a detection?", prompt="What should I do when CCTV detects a civic defect?"),
    ],
    "authority_map": [
        QuickAction(label="What do the map pins mean?", prompt="What do the different map markers represent?"),
        QuickAction(label="How are officers tracked?", prompt="How are field officers shown on the map?"),
    ],
    "authority_agent": [
        QuickAction(label="How does the autonomous sweep work?", prompt="How does the autonomous agent sweep work?"),
        QuickAction(label="What triggers escalation?", prompt="What conditions trigger automatic escalation?"),
        QuickAction(label="What did the agent just do?", prompt="What actions did the autonomous agent take recently?"),
    ],
}


def _select_quick_actions(
    effective_role: str,
    request: AssistantChatRequest,
    ctx: AssistantContext,
) -> List[QuickAction]:
    """
    Selects the most contextually appropriate quick actions (max 3).
    """
    form = request.form_context
    page = request.page_context
    complaint = ctx.complaint

    # Report page
    if form and form.active:
        if form.submission_occurred:
            return _QUICK_ACTIONS_MAP["report_submitted"]
        if form.user_reviewing:
            return _QUICK_ACTIONS_MAP["report_step2"]
        if form.ai_analysis_available:
            return _QUICK_ACTIONS_MAP["report_ai_done"]
        if form.is_analyzing or (form.current_step or 1) >= 2:
            return _QUICK_ACTIONS_MAP["report_step2"]
        return _QUICK_ACTIONS_MAP["report_step1"]

    # Authority dashboard
    if effective_role in ("authority", "admin") and page:
        tab = (page.active_tab or "").lower()
        if "analytic" in tab or "report" in tab:
            return _QUICK_ACTIONS_MAP["authority_analytics"]
        if "cctv" in tab:
            return _QUICK_ACTIONS_MAP["authority_cctv"]
        if "map" in tab:
            return _QUICK_ACTIONS_MAP["authority_map"]
        if "agent" in tab or "ai_review" in tab:
            return _QUICK_ACTIONS_MAP["authority_agent"]
        # triage — with or without complaint
        if complaint:
            return _QUICK_ACTIONS_MAP["authority_triage_complaint"]
        return _QUICK_ACTIONS_MAP["authority_triage"]

    # Track page
    if page and page.route and "/track" in page.route:
        if complaint:
            if complaint.status.lower() in ("escalated",):
                return _QUICK_ACTIONS_MAP["track_escalated"]
            return _QUICK_ACTIONS_MAP["track_with_complaint"]
        return _QUICK_ACTIONS_MAP["track_no_complaint"]

    # Citizen dashboard
    if page and page.page_name == "CitizenDashboard":
        return _QUICK_ACTIONS_MAP["citizen_dashboard"]

    # Landing / default
    if effective_role == "citizen":
        return _QUICK_ACTIONS_MAP["landing_citizen"]
    return _QUICK_ACTIONS_MAP["landing_public"]


# ---------------------------------------------------------------------------
# Output safety layer
# ---------------------------------------------------------------------------

_MUTATION_PATTERNS = [
    r"\bI (will|am going to|have|just|can) (assign|escalate|update|change|resolve|reject|dispatch|submit|send)\b",
    r"\bAssigned (the|this) complaint\b",
    r"\bStatus (has been|was) (changed|updated) to\b",
    r"\bEscalated (the|this) complaint\b",
    r"\bI (have|will have) (done|completed|finished|processed)\b",
    r"\b(Done|Completed|Finished)\. (The|Your) complaint\b",
]

_COMPILED_MUTATION_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in _MUTATION_PATTERNS
]


def _validate_output(reply: str, ctx: AssistantContext) -> Optional[str]:
    """
    Checks the LLM reply for safety violations.
    Returns None if safe, or a safe fallback string if a violation is detected.
    """
    # 1. Check for mutation language (assistant claiming to have done something)
    for pattern in _COMPILED_MUTATION_PATTERNS:
        if pattern.search(reply):
            logger.warning("OutputSafetyLayer: mutation language detected in reply")
            return (
                "That action needs to be performed directly in the CivicSeva interface. "
                "I can guide you to the correct section — use the existing dashboard controls "
                "for assignment, status changes, and escalations."
            )

    # 2. Check for invented complaint IDs not present in context
    # Build allow-list of IDs known to this context
    known_ids = set()
    if ctx.complaint:
        known_ids.add(ctx.complaint.complaint_id.upper())
    if ctx.form and ctx.form.submitted_complaint_id:
        known_ids.add(ctx.form.submitted_complaint_id.upper())
    if ctx.page and ctx.page.selected_complaint_id:
        known_ids.add(ctx.page.selected_complaint_id.upper().replace("#", ""))

    # Find all CS-prefixed IDs in the reply
    found_ids = set(re.findall(r"\bCS\d{4,6}\b", reply.upper()))
    invented = found_ids - known_ids
    if invented and known_ids:
        # Only flag if we have a known context to compare against
        # (If no complaint context exists, IDs might be examples — allow them)
        logger.warning(
            "OutputSafetyLayer: reply contains IDs not in context: %s (known: %s)",
            invented, known_ids,
        )
        return (
            "I can only provide information about the complaint in the current context. "
            "Please check the complaint timeline directly for the latest status and details."
        )

    return None   # output is safe


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------

class AssistantService:
    """
    Top-level orchestration for the assistant endpoint.
    One public method: chat().
    """

    @staticmethod
    def chat(
        request: AssistantChatRequest,
        current_user: Optional[User],
        db: Session,
    ) -> AssistantChatResponse:
        """
        Full pipeline from request to response.
        Never raises — exceptions are caught and surfaced as safe fallback replies.
        """
        try:
            # 1. Resolve effective role (server-side only)
            effective_role = _resolve_effective_role(current_user)

            # 2. Determine complaint ID to look up
            # Use request.selected_complaint_id as the primary signal.
            # The page_context.selected_complaint_id is a secondary hint but we
            # prefer the top-level field for clarity.
            complaint_id = (
                request.selected_complaint_id
                or (request.page_context.selected_complaint_id if request.page_context else None)
            )

            # 3. Build complaint context (access-gated server-side)
            complaint_ctx = None
            if complaint_id:
                complaint_ctx = _build_complaint_context(
                    complaint_id, effective_role, current_user, db
                )

            # 4. Build authority ops context (authority/admin only)
            authority_ops_ctx = None
            if effective_role in ("authority", "admin"):
                active_tab = (
                    request.page_context.active_tab if request.page_context else None
                )
                authority_ops_ctx = _build_authority_ops_context(active_tab, db)

            # 5. Build auth context
            auth_ctx = AuthContextData(
                authenticated=current_user is not None,
                user_id=current_user.id if current_user else None,
                user_name=current_user.name if current_user else None,
                effective_role=effective_role,
            )

            # 6. Assemble full AssistantContext
            # Truncate conversation history to budget
            history = request.conversation_history[-MAX_HISTORY_MESSAGES:]
            total_chars = sum(len(m.content) for m in history)
            if total_chars > MAX_HISTORY_CHARS:
                # Drop oldest messages until under budget
                while history and sum(len(m.content) for m in history) > MAX_HISTORY_CHARS:
                    history = history[1:]

            ctx = AssistantContext(
                auth=auth_ctx,
                page=request.page_context,
                form=request.form_context,
                complaint=complaint_ctx,
                authority_ops=authority_ops_ctx,
                conversation_history=history,
            )

            # 7. Build system prompt
            system_prompt = build_system_prompt(effective_role, ctx)

            # 8. Prepare history for LLM (dicts, not Pydantic objects)
            history_dicts = [
                {"role": m.role, "content": m.content}
                for m in history
            ]

            # 9. Call LLM engine
            reply_text, error_code = assistant_engine.respond(
                message=request.message,
                system_prompt=system_prompt,
                history=history_dicts,
                ctx=ctx,
            )

            # 10. Output safety validation
            if error_code is None:
                # Only validate LLM output — deterministic fallback is pre-validated
                safe_reply = _validate_output(reply_text, ctx)
                if safe_reply is not None:
                    reply_text = safe_reply
                    error_code = "safety_fallback"

            # 11. Select quick actions
            quick_actions = _select_quick_actions(effective_role, request, ctx)

            # 12. Compute context version
            context_version = _compute_context_version(request, effective_role)

            return AssistantChatResponse(
                reply=reply_text,
                quick_actions=quick_actions,
                context_version=context_version,
                error=error_code,
            )

        except Exception as exc:
            logger.error("AssistantService.chat unhandled error: %s", exc, exc_info=True)
            return AssistantChatResponse(
                reply=(
                    "I am unable to process your request right now. "
                    "Please try again or consult the CivicSeva help documentation."
                ),
                quick_actions=[],
                context_version="",
                error="internal_error",
            )
