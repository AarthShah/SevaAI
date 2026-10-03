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
from typing import Optional, List, Dict, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.complaint import Complaint
from ..models.cctv_event import CctvEvent
from ..models.complaint_history import ComplaintHistory
from ..models.agent_action import AgentAction
from ..models.escalation import Escalation
from ..models.user import User
from ..services.autonomous_agent import autonomous_engine
from ..services.complaint_service import ComplaintService
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
    FormContextInput,
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
    escalation_reason = escalations[-1].reason if (escalations and escalations[-1].reason) else None

    # Fallback to ComplaintHistory remarks if escalation record not in Escalation table
    if not escalation_reason:
        for h in history_records:
            if (h.new_status or "").lower() == "escalated" and h.remarks:
                escalation_reason = h.remarks
                break

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
        escalation_reason=escalation_reason,
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

        # Real CCTV detection queries
        cctv_pending = (
            db.query(func.count(CctvEvent.id))
            .filter(CctvEvent.status == "PENDING_REVIEW")
            .scalar() or 0
        )
        cctv_potholes = (
            db.query(func.count(CctvEvent.id))
            .filter(CctvEvent.event_type.ilike("%pothole%"))
            .scalar() or 0
        )
        cctv_high = (
            db.query(func.count(CctvEvent.id))
            .filter(CctvEvent.severity.in_(["HIGH", "CRITICAL"]))
            .scalar() or 0
        )
        recent_cctv = (
            db.query(CctvEvent)
            .order_by(CctvEvent.created_at.desc())
            .limit(5)
            .all()
        )
        latest_cctv_list = [
            {
                "event_id": ev.event_id,
                "camera_id": ev.camera_id,
                "confidence": f"{int(ev.confidence * 100)}%",
                "severity": ev.severity,
                "status": ev.status,
                "timestamp": ev.timestamp_video or "N/A",
                "evidence_url": ev.evidence_image_url or "N/A",
                "address": ev.address or ev.camera_id
            }
            for ev in recent_cctv
        ]

        return AuthorityOpsContextData(
            active_tab=active_tab,
            total_open=total_open,
            critical_count=critical_count,
            high_count=high_count,
            escalated_count=escalated_count,
            unassigned_count=unassigned_count,
            autonomous_agent_status=agent_status,
            recent_agent_actions_count=recent_actions,
            cctv_pending_count=cctv_pending,
            cctv_recent_potholes_count=cctv_potholes,
            cctv_high_severity_count=cctv_high,
            cctv_latest_detections=latest_cctv_list,
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
# Controlled Citizen Action Intent Detection (C1 Navigation)
# ---------------------------------------------------------------------------

def _detect_citizen_action(message: str, effective_role: str) -> Optional[Tuple[str, str]]:
    """
    Detects if a citizen's message is an explicit action/navigation request.
    Only active for citizen/public roles (officer mode excluded).
    Returns (action_name, confirmation_reply) or None.
    """
    if effective_role not in ("citizen", "public"):
        return None

    raw = message.strip()
    clean = re.sub(r'[^\w\s]', '', raw).lower().strip()

    # Guard: Tracking, status check, complaint retrieval, or CCTV surveillance language must NEVER navigate to report page
    retrieval_guard_patterns = [
        r'\b(track|tracking|status|check|progress|history|timeline)\b',
        r'\b(my|previous|past|submitted|existing)\s+(complaint|complaints|issue|issues|grievance|grievances)\b',
        r'\bcs\d{3,6}\b',
        r'\b(cctv|surveillance|camera|cameras|detections?)\b',
    ]
    for pat in retrieval_guard_patterns:
        if re.search(pat, clean):
            return None

    # 1. Informational question check - do NOT navigate on questions
    informational_patterns = [
        r'^(how\b|what\b|where\b|why\b|who\b|when\b|which\b)',
        r'\bhow (do|can|to|does|would|should|we)\b',
        r'\b(can you explain|explain to me|tell me about|tell me how)\b',
        r'\b(is it possible|steps to)\b'
    ]
    for pat in informational_patterns:
        if re.search(pat, clean):
            return None

    # 2. Explicit action / navigation patterns
    action_patterns = [
        # Direct navigation commands
        r'\b(open|launch|show|go to|take me to|navigate to|switch to|load|display)\b.*?\b(report|complaint|issue|grievance|pothole)\b.*?\b(page|tab|form|screen|section)?\b',
        r'\b(open|launch|show)\b.*?\b(report issue|complaint form|reporting form|report form)\b',
        r'\b(take me to|go to|navigate to)\b.*?\b(complaint form|report form|reporting page|report page|report issue)\b',

        # Direct desire/need statements to report/file
        r'\b(i want to|i need to|i would like to|id like to|i wish to|let me|help me)\b.*?\b(report|file|lodge|register|submit|create)\b.*?\b(a|an|the|my)?\s*(complaint|issue|grievance|pothole|leak|garbage|problem|damage|hazard|report)?\b',
        r'\b(i want to|i need to|i would like to|id like to)\b.*?\b(file a complaint|report an issue|report a pothole|file complaint|report issue)\b',

        # Natural-language 'complain about' / 'complaint about' patterns
        r'\b(i want to|i need to|i would like to|id like to|i wish to|let me|help me|i have a|have a)\b.*?\b(complain about|complaint about)\b'
    ]

    for pat in action_patterns:
        if re.search(pat, clean):
            return ("OPEN_REPORT_PAGE", "I'll open the Report Issue page for you.")

    return None


# ---------------------------------------------------------------------------
# Controlled Citizen Convenience Navigation (C4.1)
# ---------------------------------------------------------------------------

OPEN_SPECIFIC_COMPLAINT_PATTERNS = [
    r'\b(open|go\s+to|take\s+me\s+to|navigate\s+to|switch\s+to|load|display|view)\b.*?\b(complaint|ticket|grievance|report)?\s*#?(cs\d{3,6})\b',
    r'\b(open|go\s+to|take\s+me\s+to|navigate\s+to)\s+#?(cs\d{3,6})\b',
]

OPEN_LATEST_COMPLAINT_PATTERNS = [
    r'\b(open|go\s+to|take\s+me\s+to|navigate\s+to|switch\s+to|load|display)\b.*?\b(my|the)?\s*(latest|most\s+recent|last)\s+(complaint|grievance|ticket|issue|report)\b',
    r'\b(open|go\s+to|take\s+me\s+to|navigate\s+to)\s+my\s+latest\b',
]

OPEN_DASHBOARD_PATTERNS = [
    r'\b(open|go\s+to|take\s+me\s+to|navigate\s+to|switch\s+to|load|display)\b.*?\b(the\s+)?(citizen\s+)?dashboard\b',
    r'\b(dashboard\s+page)\b',
]

OPEN_MY_COMPLAINTS_PATTERNS = [
    r'\b(open|go\s+to|take\s+me\s+to|navigate\s+to|switch\s+to)\b.*?\b(my|all\s+my|submitted)\s+(complaints|grievances|tickets|issues|reports)\b',
]

OPEN_TRACK_PAGE_PATTERNS = [
    r'\b(open|go\s+to|take\s+me\s+to|navigate\s+to|switch\s+to)\b.*?\b(track\s+complaint|track\s+page|tracking\s+page|complaint\s+tracking)\b',
    r'\b(open|go\s+to|take\s+me\s+to|navigate\s+to)\b.*?\b(the\s+)?(track|tracking)\s+(page|tab|screen)\b',
    r'^(take\s+me\s+to\s+track\s+complaint|go\s+to\s+track\s+complaint|open\s+track\s+complaint)$',
]

OPEN_REPORT_PAGE_PATTERNS = [
    r'\b(open|launch|show|go\s+to|take\s+me\s+to|navigate\s+to|switch\s+to|load|display)\b.*?\b(report\s+issue|report\s+page|reporting\s+page|complaint\s+form|reporting\s+form|report\s+form)\b',
    r'\b(open|launch|go\s+to|take\s+me\s+to|navigate\s+to)\s+(the\s+)?report\s+issue\b',
    r'\b(open\s+the\s+report\s+issue\s+page)\b',
]


def _detect_convenience_navigation(message: str) -> Optional[Tuple[str, Optional[str]]]:
    """
    Detects if a citizen's message is an explicit request to open a specific page or complaint.
    Returns (nav_intent, target_id) or None.
    Intents:
      - SPECIFIC_COMPLAINT (with target_id)
      - LATEST_COMPLAINT
      - DASHBOARD
      - MY_COMPLAINTS
      - TRACK_PAGE
      - REPORT
    """
    raw = message.strip()
    clean = re.sub(r'[^\w\s]', '', raw).lower().strip()

    # Informational questions check
    informational_patterns = [
        r'^(how\b|what\b|where\b|why\b|who\b|when\b|which\b)',
        r'\bhow (do|can|to|does|would|should|we)\b',
        r'\b(can you explain|explain to me|tell me about|tell me how)\b',
    ]
    for pat in informational_patterns:
        if re.search(pat, clean):
            return None

    # 1. Specific complaint navigation (e.g. "Open complaint CS1001")
    for pat in OPEN_SPECIFIC_COMPLAINT_PATTERNS:
        m = re.search(pat, clean)
        if m:
            id_m = SPECIFIC_ID_PATTERN.search(raw)
            cid = id_m.group(0).upper() if id_m else None
            return ("SPECIFIC_COMPLAINT", cid)

    # 2. Latest complaint navigation (e.g. "Open my latest complaint")
    for pat in OPEN_LATEST_COMPLAINT_PATTERNS:
        if re.search(pat, clean):
            return ("LATEST_COMPLAINT", None)

    # 3. Track page navigation (e.g. "Take me to Track Complaint")
    for pat in OPEN_TRACK_PAGE_PATTERNS:
        if re.search(pat, clean):
            return ("TRACK_PAGE", None)

    # 4. My complaints navigation (e.g. "Open my complaints")
    for pat in OPEN_MY_COMPLAINTS_PATTERNS:
        if re.search(pat, clean):
            return ("MY_COMPLAINTS", None)

    # 5. Dashboard navigation (e.g. "Take me to the dashboard")
    for pat in OPEN_DASHBOARD_PATTERNS:
        if re.search(pat, clean):
            return ("DASHBOARD", None)

    # 6. Report page navigation (e.g. "Open the Report Issue page")
    for pat in OPEN_REPORT_PAGE_PATTERNS:
        if re.search(pat, clean):
            return ("REPORT", None)

    return None


def _handle_convenience_navigation(
    nav_intent: str,
    target_id: Optional[str],
    effective_role: str,
    current_user: Optional[User],
    db: Session,
) -> Tuple[Optional[str], str, List[QuickAction]]:
    """
    Executes C4.1 Convenience Navigation with strict backend ownership verification.
    Returns (action, reply_text, quick_actions).
    """
    # 1. Report page
    if nav_intent == "REPORT":
        action = "OPEN_REPORT_PAGE"
        reply = "I'll open the Report Issue page for you."
        actions = [
            QuickAction(label="How does reporting work?", prompt="How do I submit this report?"),
            QuickAction(label="Photo requirements", prompt="What kind of photo is needed?"),
        ]
        return action, reply, actions

    # 2. General Track page
    if nav_intent == "TRACK_PAGE":
        action = "OPEN_TRACK_PAGE"
        reply = "Opening the Track Complaint page for you."
        actions = [
            QuickAction(label="Show my complaints", prompt="Show my complaints"),
            QuickAction(label="What is my latest complaint?", prompt="What is my latest complaint?"),
        ]
        return action, reply, actions

    # 3. Dashboard / My Complaints
    if nav_intent in ("DASHBOARD", "MY_COMPLAINTS"):
        if effective_role == "public" or current_user is None:
            if nav_intent == "MY_COMPLAINTS":
                reply = "Please log in to your CivicSeva account to view your submitted complaints."
            else:
                reply = "Please log in to your CivicSeva account to view your citizen dashboard."
            actions = [
                QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
                QuickAction(label="Report an issue", prompt="I want to report an issue"),
            ]
            return None, reply, actions

        action = "OPEN_DASHBOARD_PAGE"
        if nav_intent == "MY_COMPLAINTS":
            reply = "Opening your complaints on the Citizen Dashboard."
        else:
            reply = "Opening your Citizen Dashboard."
        actions = [
            QuickAction(label="What is my latest complaint?", prompt="What is my latest complaint?"),
            QuickAction(label="Report a new issue", prompt="I want to report an issue"),
        ]
        return action, reply, actions

    # 4. Latest complaint
    if nav_intent == "LATEST_COMPLAINT":
        if effective_role == "public" or current_user is None:
            reply = "Please log in to your CivicSeva account to open or track your complaints."
            actions = [
                QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
            ]
            return None, reply, actions

        latest_complaint = (
            db.query(Complaint)
            .filter(Complaint.citizen_id == current_user.id)
            .order_by(Complaint.created_at.desc())
            .first()
        )
        if not latest_complaint:
            reply = "You have not submitted any complaints yet."
            actions = [
                QuickAction(label="Report an issue", prompt="I want to report an issue"),
            ]
            return None, reply, actions

        cid = latest_complaint.id
        action = f"OPEN_TRACK_COMPLAINT:{cid}"
        label = latest_complaint.issue_type or latest_complaint.category or "Civic Issue"
        reply = f"Opening your latest complaint #{cid} ({label})."
        actions = [
            QuickAction(label="What does this status mean?", prompt="What does this status mean?"),
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
            QuickAction(label="Which department is handling it?", prompt="Which department is handling it?"),
        ]
        return action, reply, actions

    # 5. Specific complaint
    if nav_intent == "SPECIFIC_COMPLAINT":
        if not target_id:
            reply = "Please specify a complaint ID to open, such as CS1001."
            return None, reply, []

        if effective_role == "public" or current_user is None:
            reply = "Please log in to your CivicSeva account to open or track your complaints."
            actions = [
                QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
            ]
            return None, reply, actions

        complaint = (
            db.query(Complaint)
            .filter(Complaint.id == target_id)
            .first()
        )
        # Strict ownership verification:
        if complaint is None or complaint.citizen_id != current_user.id:
            reply = (
                "I couldn't find that complaint in your account. "
                "Please verify the complaint ID or ask 'Show my complaints' to view your submitted complaints."
            )
            actions = [
                QuickAction(label="Show my complaints", prompt="Show my complaints"),
                QuickAction(label="Report an issue", prompt="I want to report an issue"),
            ]
            return None, reply, actions

        action = f"OPEN_TRACK_COMPLAINT:{target_id}"
        reply = f"Opening complaint #{target_id} for you."
        actions = [
            QuickAction(label="What does this status mean?", prompt="What does this status mean?"),
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
            QuickAction(label="Which department is handling it?", prompt="Which department is handling it?"),
        ]
        return action, reply, actions

    return None, "I'm ready to help with your civic queries.", []


# ---------------------------------------------------------------------------
# Controlled Citizen Complaint-Focused Convenience Navigation (C4.2)
# ---------------------------------------------------------------------------

C4_2_NAV_PREFIX = r'\b(open|take\s+me\s+to|go\s+to|navigate\s+to|switch\s+to|load|display|view|show\s+me|show)\b'
C4_2_COMPLAINT_NOUN = r'\b(complaint|complaints|issue|issues|grievance|grievances|ticket|tickets|report|reports)\b'

C4_2_STATUS_MAP = {
    'in progress': 'In Progress',
    'in-progress': 'In Progress',
    'under progress': 'In Progress',
    'ongoing': 'In Progress',
    'escalated': 'Escalated',
    'escalation': 'Escalated',
    'resolved': 'Resolved',
    'submitted': 'Submitted',
    'acknowledged': 'Acknowledged',
}

C4_2_CATEGORY_MAP = {
    'pothole': 'pothole',
    'potholes': 'pothole',
    'road damage': 'pothole',
    'road': 'pothole',
    'drainage': 'drainage',
    'drain': 'drainage',
    'sewer': 'drainage',
    'sewerage': 'drainage',
    'garbage': 'garbage',
    'waste': 'garbage',
    'trash': 'garbage',
    'sanitation': 'garbage',
    'streetlight': 'streetlight',
    'street light': 'streetlight',
    'street lighting': 'streetlight',
    'lighting': 'streetlight',
    'water': 'water',
    'water leak': 'water',
    'water leakage': 'water',
    'pipeline': 'water',
    'public safety': 'public_safety',
    'safety': 'public_safety',
}


def _detect_complaint_filter_navigation(message: str) -> Optional[Dict[str, str]]:
    """
    Detects if the citizen is asking to find and open a complaint by status, category, or issue type (C4.2).
    Returns dict with keys: 'filter_type', 'filter_value', 'display_name' or None.
    """
    raw = message.strip()
    clean = re.sub(r'[^\w\s]', ' ', raw).lower()
    clean = re.sub(r'\s+', ' ', clean).strip()

    # Guard action / reporting desires (C1)
    if re.search(r'\b(i want to|i need to|i would like to|id like to|help me|let me)\b.*?\b(report|file|lodge|register|submit|create)\b', clean):
        return None

    # Guard explicit page navigation targets (C4.1 / C1)
    if re.search(r'\b(report\s+page|reporting\s+page|complaint\s+form|reporting\s+form|report\s+form|report\s+issue)\b', clean):
        return None

    # Guard specific complaint ID (handled by C4.1)
    if re.search(r'\bcs\d{3,6}\b', clean):
        return None

    # Guard latest complaint (handled by C4.1)
    if re.search(r'\b(latest|most recent|last)\s+(complaint|grievance|issue|ticket|report)\b', clean):
        return None

    # Guard generic "open my complaints" / "show my complaints" (no filter term)
    if clean in ("show my complaints", "open my complaints", "my complaints", "show complaints", "list my complaints"):
        return None

    # Must contain navigation intent
    if not re.search(C4_2_NAV_PREFIX, clean):
        return None

    # Must mention complaint/issue noun
    if not re.search(C4_2_COMPLAINT_NOUN, clean):
        return None

    # 1. Check relative clause status: e.g. "open my complaint that's in progress"
    rel_match = re.search(
        r'\b(?:complaint|issue|grievance|ticket)\s+(?:that\s+s|thats|that\s+is|which\s+is)\s+(in\s+progress|escalated|resolved|submitted|acknowledged)\b',
        clean
    )
    if rel_match:
        st_term = rel_match.group(1).strip()
        norm_status = C4_2_STATUS_MAP.get(st_term, st_term.title())
        return {'filter_type': 'status', 'filter_value': norm_status, 'display_name': norm_status}

    # 2. Check status filter terms (e.g. "open my escalated complaint", "take me to my resolved complaint")
    for term, norm in sorted(C4_2_STATUS_MAP.items(), key=lambda x: -len(x[0])):
        pattern = rf'{C4_2_NAV_PREFIX}.*?\b{re.escape(term)}\b.*?{C4_2_COMPLAINT_NOUN}'
        if re.search(pattern, clean):
            return {'filter_type': 'status', 'filter_value': norm, 'display_name': norm}

    # 3. Check category / issue filter terms (e.g. "show me my pothole complaint", "open my drainage complaint")
    for term, norm in sorted(C4_2_CATEGORY_MAP.items(), key=lambda x: -len(x[0])):
        pattern = rf'{C4_2_NAV_PREFIX}.*?\b{re.escape(term)}\b.*?{C4_2_COMPLAINT_NOUN}'
        if re.search(pattern, clean):
            return {'filter_type': 'issue', 'filter_value': norm, 'display_name': term}

    return None


def _format_c4_2_issue_label(complaint: Complaint) -> str:
    raw = complaint.issue_type or (complaint.category.replace('_', ' ').title() if complaint.category else "Civic Issue")
    cleaned = raw.replace('_', ' ').strip()
    if cleaned.isupper() or '_' in raw:
        return cleaned.title()
    return cleaned


def _handle_complaint_filter_navigation(
    filter_data: Dict[str, str],
    effective_role: str,
    current_user: Optional[User],
    db: Session,
) -> Tuple[Optional[str], str, List[QuickAction]]:
    """
    Executes C4.2 Complaint-Focused Convenience Navigation.
    Queries ONLY authenticated citizen's complaints, filters by status/issue,
    and returns (action, reply, quick_actions).
    """
    filter_type = filter_data['filter_type']
    filter_value = filter_data['filter_value']
    display_name = filter_data['display_name']

    # 1. Public user gate
    if effective_role == "public" or current_user is None:
        reply = "Please log in to your CivicSeva account to open or track your complaints."
        actions = [
            QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
            QuickAction(label="Report an issue", prompt="I want to report an issue"),
        ]
        return None, reply, actions

    # 2. Retrieve ONLY authenticated citizen's complaints
    user_complaints = (
        db.query(Complaint)
        .filter(Complaint.citizen_id == current_user.id)
        .order_by(Complaint.created_at.desc())
        .all()
    )

    if not user_complaints:
        reply = "You have not submitted any complaints yet."
        actions = [
            QuickAction(label="Report an issue", prompt="I want to report an issue"),
        ]
        return None, reply, actions

    # 3. Apply filter
    matches: List[Complaint] = []
    if filter_type == 'status':
        matches = [c for c in user_complaints if (c.status or '').lower() == filter_value.lower()]
    elif filter_type == 'issue':
        for c in user_complaints:
            issue = (c.issue_type or '').lower()
            cat = (c.category or '').lower()
            desc = (c.description or '').lower()
            if filter_value == 'pothole':
                if 'pothole' in issue or 'pothole' in desc or 'road' in cat or 'road' in issue:
                    matches.append(c)
            elif filter_value == 'drainage':
                if 'drain' in issue or 'sewer' in issue or 'manhole' in issue or 'manhole' in desc or cat.startswith('drainage'):
                    matches.append(c)
            elif filter_value == 'garbage':
                if 'garbage' in issue or 'waste' in issue or 'trash' in issue or 'garbage' in desc or cat in ('waste_management', 'solid_waste'):
                    matches.append(c)
            elif filter_value == 'streetlight':
                if 'streetlight' in issue or 'street light' in issue or 'lighting' in cat or 'street_lighting' in cat or 'streetlight' in desc:
                    matches.append(c)
            elif filter_value == 'water':
                if 'water' in issue or 'leak' in issue or cat == 'water_supply' or 'water' in desc:
                    matches.append(c)
            elif filter_value == 'public_safety':
                if 'safety' in issue or 'traffic' in issue or cat == 'public_safety_other' or 'safety' in desc:
                    matches.append(c)

    # 4. Handle matches
    # Case A: Exactly 1 match -> Navigate directly using OPEN_TRACK_COMPLAINT:{id}
    if len(matches) == 1:
        c = matches[0]
        issue_label = _format_c4_2_issue_label(c)
        action = f"OPEN_TRACK_COMPLAINT:{c.id}"
        reply = f"Opening your {display_name} complaint #{c.id} ({issue_label})."
        actions = [
            QuickAction(label="What does this status mean?", prompt="What does this status mean?"),
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
            QuickAction(label="Which department is handling it?", prompt="Which department is handling it?"),
        ]
        return action, reply, actions

    # Case B: Multiple matches -> Do NOT arbitrarily choose; list options without navigating
    if len(matches) > 1:
        if filter_type == 'status':
            lines = [f"I found {len(matches)} complaints that are {display_name}:"]
        else:
            lines = [f"I found {len(matches)} {display_name} complaints:"]

        for i, m in enumerate(matches, 1):
            lbl = _format_c4_2_issue_label(m)
            lines.append(f"{i}. {m.id} — {lbl}")

        lines.append("\nWhich one would you like to open?")
        reply = "\n".join(lines)

        actions = [
            QuickAction(label=f"Open {m.id}", prompt=f"Open complaint {m.id}")
            for m in matches[:3]
        ]
        actions.append(QuickAction(label="Show all my complaints", prompt="Show my complaints"))
        return None, reply, actions

    # Case C: No match
    article = "an" if display_name[0].lower() in "aeiou" else "a"
    reply = f"I couldn't find {article} {display_name} complaint in your account."
    actions = [
        QuickAction(label="Show my complaints", prompt="Show my complaints"),
        QuickAction(label="Report a new issue", prompt="I want to report an issue"),
    ]
    return None, reply, actions


# ---------------------------------------------------------------------------
# Controlled Citizen Complaint Follow-Up (C4.3.1)
# ---------------------------------------------------------------------------

CONFIRMATION_REQUEST_PATTERN = re.compile(
    r'I can submit a follow-up request for complaint\s+#?([A-Za-z0-9]+)\.\s+Would you like me to proceed\?',
    re.IGNORECASE
)

FOLLOWUP_TRIGGER_PATTERN = re.compile(
    r'\b(follow\s*up|follow-up|followup)\b',
    re.IGNORECASE
)

HOWTO_FOLLOWUP_PATTERN = re.compile(
    r'^\s*how\s+(do|can)\s+i\s+follow\s*up\s*(on\s+(a|any)\s+complaint)?\??$',
    re.IGNORECASE
)


def _detect_pending_followup_confirmation(history: List[ConversationMessage]) -> Optional[str]:
    """
    Inspects conversation history to see if the immediate previous assistant message
    was an explicit confirmation request for a complaint follow-up.
    Returns the pending complaint_id (e.g. 'CS1001') or None.
    """
    if not history:
        return None
    for msg in reversed(history):
        if msg.role == "assistant":
            m = CONFIRMATION_REQUEST_PATTERN.search(msg.content)
            if m:
                return m.group(1).upper()
            return None
    return None


def _is_explicit_confirmation(message: str) -> bool:
    clean = re.sub(r'[^\w\s]', '', message.lower()).strip()
    AFFIRMATIVE_EXACT = {
        "yes", "confirm", "proceed", "do it", "go ahead", "yes please",
        "yes proceed", "please proceed", "yes do it", "sure proceed",
        "confirm follow up", "confirm followup", "submit follow up",
        "submit followup", "yes submit", "yes confirm"
    }
    if clean in AFFIRMATIVE_EXACT:
        return True
    if re.match(r'^(yes|confirm|proceed)\s+(please|proceed|do it|go ahead|submit)$', clean):
        return True
    return False


def _is_explicit_rejection(message: str) -> bool:
    clean = re.sub(r'[^\w\s]', '', message.lower()).strip()
    REJECTION_EXACT = {
        "no", "cancel", "dont do it", "dont", "stop", "abort", "nevermind",
        "no thanks", "no cancel", "no dont", "cancel follow up", "cancel followup",
        "dont proceed", "do not proceed", "no stop", "please cancel"
    }
    if clean in REJECTION_EXACT:
        return True
    if re.match(r'^(no|cancel|dont|do not|stop)\s+(please|cancel|stop|abort|do it|thanks|proceed)$', clean):
        return True
    return False


def _is_ambiguous_affirmation(message: str) -> bool:
    clean = re.sub(r'[^\w\s]', '', message.lower()).strip()
    return clean in {"okay", "ok", "k", "sure", "thanks", "thank you", "alright", "fine"}


def _handle_pending_followup_response(
    message: str,
    pending_cid: str,
    effective_role: str,
    current_user: Optional[User],
    db: Session,
) -> Optional[Tuple[str, List[QuickAction]]]:
    """
    Handles user response when a follow-up confirmation is pending.
    Returns:
      - (reply_text, quick_actions) if user confirmed, rejected, or asked ambiguous clarification
      - None if user changed topic (allows fallback to other intent handlers)
    """
    if _is_explicit_confirmation(message):
        # 1. Verification: public user
        if effective_role == "public" or current_user is None:
            reply_text = "Please log in to your CivicSeva account to submit a follow-up for your complaint."
            quick_actions = [
                QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
            ]
            return reply_text, quick_actions

        # 2. Verification: ownership
        complaint = (
            db.query(Complaint)
            .filter(Complaint.id == pending_cid)
            .first()
        )
        if complaint is None or complaint.citizen_id != current_user.id:
            reply_text = (
                "I couldn't find that complaint in your account. "
                "Please verify the complaint ID or ask 'Show my complaints' to view your submitted complaints."
            )
            quick_actions = [
                QuickAction(label="Show my complaints", prompt="Show my complaints"),
                QuickAction(label="Report an issue", prompt="I want to report an issue"),
            ]
            return reply_text, quick_actions

        # 3. Execution: call existing API
        requested_by = current_user.name if current_user and current_user.name else "Citizen"
        try:
            result = ComplaintService.trigger_followup(
                db=db,
                complaint_id=pending_cid,
                remarks="Citizen submitted follow-up via CivicSeva Assistant.",
                requested_by=requested_by,
            )
            count = result.get("follow_up_count", 1)
            cid = result.get("complaint_id", pending_cid)
            reply_text = (
                f"I've submitted a follow-up inquiry for complaint #{cid}. "
                f"The follow-up count is now {count}, and an alert has been forwarded to the department authorities."
            )
            quick_actions = [
                QuickAction(label=f"View complaint #{cid}", prompt=f"Open complaint {cid}"),
                QuickAction(label="Show my complaints", prompt="Show my complaints"),
            ]
            return reply_text, quick_actions
        except Exception as e:
            logger.error("Failed to trigger followup for %s: %s", pending_cid, e)
            reply_text = f"An error occurred while submitting the follow-up for complaint #{pending_cid}. Please try again later."
            return reply_text, []

    elif _is_explicit_rejection(message):
        reply_text = f"Understood. I have cancelled the follow-up request for complaint #{pending_cid}. No changes were made."
        quick_actions = [
            QuickAction(label="Show my complaints", prompt="Show my complaints"),
            QuickAction(label="Report an issue", prompt="I want to report an issue"),
        ]
        return reply_text, quick_actions

    elif _is_ambiguous_affirmation(message):
        reply_text = f"Please reply 'Yes' or 'Confirm' to proceed with submitting the follow-up request for complaint #{pending_cid}, or 'Cancel' to abort."
        quick_actions = [
            QuickAction(label="Yes, proceed", prompt="Yes, proceed"),
            QuickAction(label="No, cancel", prompt="Cancel"),
        ]
        return reply_text, quick_actions

    # User changed topic: return None to let normal intent pipeline handle it
    return None


def _detect_followup_intent(message: str) -> Optional[Tuple[str, Optional[str]]]:
    """
    Detects if the citizen is asking to follow up on a complaint.
    Returns (intent_type, target_id) or None.
    intent_type: 'HOWTO_FOLLOWUP' or 'FOLLOWUP_REQUEST'
    target_id: 'CS1001', 'LATEST', or None
    """
    raw = message.strip()
    clean = re.sub(r'[^\w\s]', '', raw).lower().strip()

    if not FOLLOWUP_TRIGGER_PATTERN.search(raw):
        return None

    if HOWTO_FOLLOWUP_PATTERN.search(clean):
        return ("HOWTO_FOLLOWUP", None)

    # Check for specific complaint ID
    id_match = SPECIFIC_ID_PATTERN.search(raw)
    if id_match:
        return ("FOLLOWUP_REQUEST", id_match.group(0).upper())

    # Check for latest complaint
    if re.search(r'\b(latest|most recent|last)\b', clean):
        return ("FOLLOWUP_REQUEST", "LATEST")

    return ("FOLLOWUP_REQUEST", None)


def _handle_followup_request(
    message: str,
    target_id: Optional[str],
    effective_role: str,
    current_user: Optional[User],
    selected_complaint_id: Optional[str],
    page_name: Optional[str],
    db: Session,
) -> Tuple[str, List[QuickAction]]:
    """
    Handles initial follow-up request.
    Verifies user and complaint, then asks for confirmation WITHOUT mutating DB.
    """
    # 1. Verification: public user
    if effective_role == "public" or current_user is None:
        reply_text = "Please log in to your CivicSeva account to submit a follow-up for your complaint."
        quick_actions = [
            QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
        ]
        return reply_text, quick_actions

    # 2. Identify target complaint
    resolved_id = None
    if target_id == "LATEST":
        latest = (
            db.query(Complaint)
            .filter(Complaint.citizen_id == current_user.id)
            .order_by(Complaint.created_at.desc())
            .first()
        )
        if not latest:
            reply_text = "You have not submitted any complaints yet."
            quick_actions = [
                QuickAction(label="Report an issue", prompt="I want to report an issue"),
            ]
            return reply_text, quick_actions
        resolved_id = latest.id
    elif target_id:
        resolved_id = target_id
    elif selected_complaint_id:
        resolved_id = selected_complaint_id
    else:
        # User said "Can I follow up on my complaint?" without an ID
        user_complaints = (
            db.query(Complaint)
            .filter(Complaint.citizen_id == current_user.id)
            .order_by(Complaint.created_at.desc())
            .all()
        )
        if not user_complaints:
            reply_text = "You have not submitted any complaints yet."
            quick_actions = [
                QuickAction(label="Report an issue", prompt="I want to report an issue"),
            ]
            return reply_text, quick_actions
        elif len(user_complaints) == 1:
            resolved_id = user_complaints[0].id
        else:
            lines = []
            for idx, c in enumerate(user_complaints[:3], 1):
                desc = c.issue_type or c.category or "Issue"
                lines.append(f"{idx}. {c.id} — {desc} ({c.status})")
            comp_list = "\n".join(lines)
            reply_text = (
                f"You have multiple complaints. Which one would you like to follow up on?\n"
                f"{comp_list}\n\n"
                f"Please specify the complaint ID (e.g. 'Follow up on {user_complaints[0].id}')."
            )
            quick_actions = [
                QuickAction(label=f"Follow up on {c.id}", prompt=f"Follow up on {c.id}")
                for c in user_complaints[:3]
            ]
            return reply_text, quick_actions

    # 3. Strict ownership verification
    complaint = (
        db.query(Complaint)
        .filter(Complaint.id == resolved_id)
        .first()
    )
    if complaint is None or complaint.citizen_id != current_user.id:
        reply_text = (
            "I couldn't find that complaint in your account. "
            "Please verify the complaint ID or ask 'Show my complaints' to view your submitted complaints."
        )
        quick_actions = [
            QuickAction(label="Show my complaints", prompt="Show my complaints"),
            QuickAction(label="Report an issue", prompt="I want to report an issue"),
        ]
        return reply_text, quick_actions

    # 4. Confirmation request (WITHOUT executing mutation)
    reply_text = f"I can submit a follow-up request for complaint {resolved_id}. Would you like me to proceed?"
    quick_actions = [
        QuickAction(label="Yes, proceed", prompt="Yes, proceed"),
        QuickAction(label="No, cancel", prompt="No"),
    ]
    return reply_text, quick_actions


# ---------------------------------------------------------------------------
# Controlled Citizen Complaint Retrieval Intent Detection & Handlers (C2)
# ---------------------------------------------------------------------------

SPECIFIC_ID_PATTERN = re.compile(r'\bCS\d{3,6}\b', re.IGNORECASE)

LATEST_COMPLAINT_PATTERNS = [
    r'\b(latest|most recent|last)\s+(complaint|grievance|issue|ticket|report)\b',
    r'\b(complaint|grievance|issue|ticket|report)\s+(i\s+)?(last|most recently)\s+(submitted|filed|reported)\b',
    r'\bstatus of my latest\b',
    r'\bstatus of latest complaint\b',
    r'\bwhat happened to my latest\b',
]

LIST_COMPLAINTS_PATTERNS = [
    r'\b(show|list|view|display|see|give me|get|check)\b.*?\b(my|all my|previous|past|submitted|filed)\b.*?\b(complaints|issues|grievances|tickets|reports)\b',
    r'\b(what|which)\s+(complaints|issues|grievances|tickets)\b.*?\b(have i|did i|i have)\s+(submitted|filed|reported|raised|lodged)\b',
    r'\bwhat\s+issues\s+have\s+i\s+reported\b',
    r'^(my\s+complaints|show\s+my\s+complaints|list\s+my\s+complaints|my\s+issues|show\s+complaints)\b',
    r'\b(my|previous|past|submitted)\s+complaints\b',
]

TRACK_COMPLAINT_PATTERNS = [
    r'\b(track|check|follow up|status of|progress of|happening with)\b.*?\b(my\s+complaint|my\s+issue|my\s+grievance|my\s+ticket)\b',
    r'\b(i want to|i need to|can you|help me|id like to|could you)\b.*?\b(track|check|find|look up)\b.*?\b(my\s+complaint|my\s+issue|the\s+complaint)\b',
    r'\b(what is|whats|how is)\b.*?\b(the\s+status|status|progress|happening)\b.*?\b(of\s+my\s+complaint|with\s+my\s+complaint|of\s+my\s+issue)\b',
    r'\bcan you tell me the progress of my complaint\b',
    r'^(track\s+my\s+complaint|check\s+my\s+complaint|track\s+complaint)\b',
]


def _detect_citizen_retrieval_intent(message: str) -> Optional[Tuple[str, Optional[str]]]:
    """
    Detects if the citizen is asking to retrieve or track complaints.
    Returns (intent_name, target_id) or None.
    Intents:
      - SPECIFIC_COMPLAINT (with target_id)
      - LATEST_COMPLAINT
      - LIST_MY_COMPLAINTS
      - TRACK_COMPLAINT
    """
    raw = message.strip()
    clean = re.sub(r'[^\w\s]', '', raw).lower().strip()

    # 1. Specific complaint ID mentioned in text
    id_match = SPECIFIC_ID_PATTERN.search(raw)
    if id_match:
        return ("SPECIFIC_COMPLAINT", id_match.group(0).upper())

    # 2. Latest complaint query
    for pat in LATEST_COMPLAINT_PATTERNS:
        if re.search(pat, clean):
            return ("LATEST_COMPLAINT", None)

    # 3. List my complaints query
    for pat in LIST_COMPLAINTS_PATTERNS:
        if re.search(pat, clean):
            return ("LIST_MY_COMPLAINTS", None)

    # 4. General track my complaint query
    for pat in TRACK_COMPLAINT_PATTERNS:
        if re.search(pat, clean):
            return ("TRACK_COMPLAINT", None)

    return None


def _handle_citizen_retrieval(
    intent: str,
    target_id: Optional[str],
    effective_role: str,
    current_user: Optional[User],
    complaint_ctx: Optional[ComplaintContextData],
    db: Session,
) -> Tuple[str, List[QuickAction]]:
    """
    Executes read-only complaint retrieval for authorized citizen requests.
    Enforces server-side ownership validation and sanitizes all output.
    Never exposes officer phone numbers, database internals, or other citizens' data.
    """
    # 1. Unauthenticated / Public user protection
    if effective_role == "public" or current_user is None:
        reply = (
            "Please log in to your CivicSeva account to view or track your complaints. "
            "Once logged in, I can look up your active grievances, recent status updates, and timeline history."
        )
        actions = [
            QuickAction(label="How does tracking work?", prompt="How do I track my complaint?"),
            QuickAction(label="How to report an issue", prompt="How do I report a civic issue?"),
            QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
        ]
        return reply, actions

    # 2. SPECIFIC_COMPLAINT
    if intent == "SPECIFIC_COMPLAINT" and target_id:
        # Re-use existing _build_complaint_context which strictly validates:
        # complaint.citizen_id == current_user.id
        ctx = _build_complaint_context(target_id, effective_role, current_user, db)
        if ctx is None:
            # Does not exist or belongs to another citizen
            reply = (
                f"I couldn't find that complaint in your complaints. "
                "Please verify the complaint ID or ask 'Show my complaints' to view your submitted complaints."
            )
            actions = [
                QuickAction(label="Show my complaints", prompt="Show my complaints"),
                QuickAction(label="Report a new issue", prompt="I want to report an issue"),
            ]
            return reply, actions

        # Authorized complaint formatting
        issue = ctx.issue_type or (ctx.category.replace("_", " ").title() if ctx.category else "Civic Issue")
        if issue.isupper():
            issue = issue.capitalize()
        dept = ctx.department_name or "Municipal Operations Division"

        try:
            created_dt = datetime.fromisoformat(ctx.created_at) if ctx.created_at else None
            created_str = created_dt.strftime("%d %b %Y, %I:%M %p") if created_dt else "Recently"
        except Exception:
            created_str = ctx.created_at or "Recently"

        try:
            updated_dt = datetime.fromisoformat(ctx.updated_at) if ctx.updated_at else None
            updated_str = updated_dt.strftime("%d %b %Y, %I:%M %p") if updated_dt else created_str
        except Exception:
            updated_str = ctx.updated_at or created_str

        lines = [
            f"Complaint #{ctx.complaint_id}: {issue}",
            f"• Status: {ctx.status}",
            f"• Severity: {ctx.severity}",
            f"• Department: {dept}",
            f"• Submitted: {created_str}",
            f"• Last Updated: {updated_str}",
        ]
        if ctx.assigned_officer_name:
            lines.append(f"• Assigned Officer: {ctx.assigned_officer_name}")

        if ctx.history_summary:
            lines.append("\nRecent Timeline:")
            for h in ctx.history_summary[:3]:
                ts = f" [{h.timestamp}]" if h.timestamp else ""
                rem = f" — {h.remarks_excerpt}" if h.remarks_excerpt else ""
                lines.append(f"  - {h.new_status}{ts}{rem}")

        lines.append(f"\nAsk 'What does {ctx.status} mean?' if you'd like more details on this stage.")
        reply = "\n".join(lines)
        actions = [
            QuickAction(label="What does this status mean?", prompt=f"What does {ctx.status} mean?"),
            QuickAction(label="Show all my complaints", prompt="Show my complaints"),
            QuickAction(label="Report a new issue", prompt="I want to report an issue"),
        ]
        return reply, actions

    # 3. LATEST_COMPLAINT
    if intent == "LATEST_COMPLAINT":
        latest = (
            db.query(Complaint)
            .filter(Complaint.citizen_id == current_user.id)
            .order_by(Complaint.created_at.desc())
            .first()
        )
        if not latest:
            reply = "I couldn't find any complaints submitted from your account yet."
            actions = [
                QuickAction(label="Report a new issue", prompt="I want to report an issue"),
                QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
            ]
            return reply, actions

        issue = latest.issue_type or (latest.category.replace("_", " ").title() if latest.category else "Civic Issue")
        if issue.isupper():
            issue = issue.capitalize()
        dept = latest.department.name if latest.department else "Municipal Operations Division"
        submitted_date = latest.created_at.strftime("%d %b %Y") if latest.created_at else "Recently"

        reply = (
            f"Your latest complaint is #{latest.id} ({issue}).\n"
            f"• Status: {latest.status}\n"
            f"• Department: {dept}\n"
            f"• Severity: {latest.severity}\n"
            f"• Submitted: {submitted_date}\n\n"
            f"You can ask 'Track complaint {latest.id}' to view complete timeline details."
        )
        actions = [
            QuickAction(label=f"Track {latest.id}", prompt=f"Track complaint {latest.id}"),
            QuickAction(label="Show all my complaints", prompt="Show my complaints"),
            QuickAction(label="Report a new issue", prompt="I want to report an issue"),
        ]
        return reply, actions

    # 4. LIST_MY_COMPLAINTS
    if intent == "LIST_MY_COMPLAINTS":
        complaints = (
            db.query(Complaint)
            .filter(Complaint.citizen_id == current_user.id)
            .order_by(Complaint.created_at.desc())
            .limit(5)
            .all()
        )
        if not complaints:
            reply = "I couldn't find any complaints submitted from your account yet."
            actions = [
                QuickAction(label="Report a new issue", prompt="I want to report an issue"),
                QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
            ]
            return reply, actions

        lines = ["Here are your submitted complaints:"]
        for i, c in enumerate(complaints, 1):
            issue = c.issue_type or (c.category.replace("_", " ").title() if c.category else "Civic Issue")
            if issue.isupper():
                issue = issue.capitalize()
            lines.append(f"{i}. {c.id} — {issue} — {c.status}")

        first_id = complaints[0].id
        lines.append(f"\nYou can ask for details on any of these, e.g., 'What is the status of {first_id}?'.")
        reply = "\n".join(lines)
        actions = [
            QuickAction(label=f"Track {first_id}", prompt=f"Track complaint {first_id}"),
            QuickAction(label="Report a new issue", prompt="I want to report an issue"),
        ]
        if len(complaints) > 1:
            actions.append(QuickAction(label=f"Track {complaints[1].id}", prompt=f"Track complaint {complaints[1].id}"))
        return reply, actions

    # 5. TRACK_COMPLAINT (General / ambiguous like "I want to track my complaint")
    if intent == "TRACK_COMPLAINT":
        # If an authorized complaint is actively selected on the page
        if complaint_ctx and complaint_ctx.complaint_id:
            issue = complaint_ctx.issue_type or (complaint_ctx.category.replace("_", " ").title() if complaint_ctx.category else "Civic Issue")
            if issue.isupper():
                issue = issue.capitalize()
            dept = complaint_ctx.department_name or "Municipal Operations Division"
            reply = (
                f"You are currently viewing complaint #{complaint_ctx.complaint_id} ({issue}).\n"
                f"• Current Status: {complaint_ctx.status}\n"
                f"• Department: {dept}\n"
                f"• Severity: {complaint_ctx.severity}\n\n"
                f"Ask 'Track complaint {complaint_ctx.complaint_id}' for full timeline details."
            )
            actions = [
                QuickAction(label=f"Track {complaint_ctx.complaint_id}", prompt=f"Track complaint {complaint_ctx.complaint_id}"),
                QuickAction(label="Show all my complaints", prompt="Show my complaints"),
            ]
            return reply, actions

        # Look up citizen's complaints in DB
        complaints = (
            db.query(Complaint)
            .filter(Complaint.citizen_id == current_user.id)
            .order_by(Complaint.created_at.desc())
            .limit(5)
            .all()
        )
        if not complaints:
            reply = (
                "I couldn't find any complaints submitted from your account yet. "
                "If you would like to file a new issue, let me know or say 'I want to report an issue'."
            )
            actions = [
                QuickAction(label="Report a new issue", prompt="I want to report an issue"),
                QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
            ]
            return reply, actions

        if len(complaints) == 1:
            c = complaints[0]
            issue = c.issue_type or (c.category.replace("_", " ").title() if c.category else "Civic Issue")
            if issue.isupper():
                issue = issue.capitalize()
            dept = c.department.name if c.department else "Municipal Operations Division"
            reply = (
                f"Sure. I can check your complaints. Your complaint is {c.id} ({issue}), "
                f"currently {c.status} and assigned to {dept}.\n\n"
                f"Ask 'Track complaint {c.id}' for full timeline details."
            )
            actions = [
                QuickAction(label=f"Track {c.id}", prompt=f"Track complaint {c.id}"),
                QuickAction(label="What do statuses mean?", prompt="What do the complaint statuses mean?"),
            ]
            return reply, actions

        # Multiple complaints
        latest = complaints[0]
        latest_issue = latest.issue_type or (latest.category.replace("_", " ").title() if latest.category else "Civic Issue")
        if latest_issue.isupper():
            latest_issue = latest_issue.capitalize()
        latest_dept = latest.department.name if latest.department else "Municipal Operations Division"

        lines = [
            f"Sure. I can check your complaints. Your latest complaint is {latest.id}, "
            f"currently {latest.status} and assigned to {latest_dept}.\n",
            "Here are your recent complaints:"
        ]
        for i, c in enumerate(complaints, 1):
            issue = c.issue_type or (c.category.replace("_", " ").title() if c.category else "Civic Issue")
            if issue.isupper():
                issue = issue.capitalize()
            lines.append(f"{i}. {c.id} — {issue} — {c.status}")

        lines.append(f"\nAsk 'Track complaint <ID>' (e.g. 'Track complaint {latest.id}') for full timeline details.")
        reply = "\n".join(lines)
        actions = [
            QuickAction(label=f"Track {latest.id}", prompt=f"Track complaint {latest.id}"),
            QuickAction(label=f"Track {complaints[1].id}", prompt=f"Track complaint {complaints[1].id}"),
            QuickAction(label="Report a new issue", prompt="I want to report an issue"),
        ]
        return reply, actions

    # Fallback default
    return ("I can help you track and view your submitted complaints. What would you like to check?", [])


# ---------------------------------------------------------------------------
# Controlled Citizen Page Awareness Intent Detection & Handlers (C3.1)
# ---------------------------------------------------------------------------

PAGE_HELP_PATTERNS = [
    r'\bwhat\s+(do|can|should|am\s+i\s+supposed\s+to)\s+(i|we)\s+(do|see|find)?\s*(here|on this page|in this section)?\b',
    r'\bwhat\s+can\s+i\s+do\s+(here|on this page|with this)?\b',
    r'\bwhat\s+do\s+i\s+do\s*(here|now|on this page)?\b',
    r'\bwhat\s+should\s+i\s+do\s*(here|now|on this page)?\b',
    r'\bwhat\s+is\s+this\s+(page|screen|section|tab|website|platform)\s*(for|about|showing)?\b',
    r'\bhow\s+does\s+this\s+(page|screen|section|form|site|website)\s+work\b',
    r'\bhow\s+(do\s+i|to)\s+use\s+this\s+(page|screen|section|site|website)\b',
    r'\bhelp\s+me\s+with\s+this\s+(page|screen|form|section|site)\b',
    r'\b(explain|tell me about)\s+this\s+(page|screen|section|website)\b',
    r'\b(im|i am)\s+confused\b',
    r'\bguide\s+me\s+(on\s+this\s+page|here|through\s+this)\b',
    r'\bwhat\s+is\s+this\s+page\s+showing\b',
]


def _resolve_page_name(request: AssistantChatRequest) -> Optional[str]:
    """
    Resolves the normalized page name from request page_context or route.
    """
    if not request.page_context:
        return None

    raw = request.page_context.page_name
    if raw:
        normalized = raw.strip()
        if normalized in ("LandingPage", "ReportIssuePage", "TrackComplaintPage", "CitizenDashboard"):
            return normalized

    # Fallback to route
    route = (request.page_context.route or "").lower().strip()
    if "/report" in route:
        return "ReportIssuePage"
    elif "/track" in route:
        return "TrackComplaintPage"
    elif "/dashboard" in route:
        return "CitizenDashboard"
    elif route in ("/", "/#", ""):
        return "LandingPage"

    return None


def _detect_page_help_intent(message: str) -> bool:
    """
    Detects if the user is asking for contextual help about the current page.
    """
    raw = message.strip()
    clean = re.sub(r'[^\w\s]', '', raw).lower().strip()

    # Reject trivial greetings or acknowledgements
    if clean in ("hello", "hi", "hey", "thanks", "thank you", "okay", "ok", "bye", "goodbye"):
        return False

    for pat in PAGE_HELP_PATTERNS:
        if re.search(pat, clean):
            return True
    return False


def _handle_page_help(
    page_name: str,
    message: str,
    complaint_ctx: Optional[ComplaintContextData],
    effective_role: str,
    selected_complaint_id: Optional[str] = None,
) -> Tuple[str, List[QuickAction]]:
    """
    Generates tailored contextual guidance for the citizen based on the active page.
    """
    clean = re.sub(r'[^\w\s]', '', message.strip()).lower().strip()

    # 1. LandingPage
    if page_name == "LandingPage":
        reply = (
            "You're on the CivicSeva Home page. CivicSeva is an AI-powered municipal grievance platform for Indore. "
            "Here you can learn about the platform, report new civic issues like potholes or garbage, "
            "track existing grievances, or log in to view your citizen dashboard."
        )
        actions = [
            QuickAction(label="Report an issue", prompt="I want to report an issue"),
            QuickAction(label="Track a complaint", prompt="I want to track my complaint"),
            QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
        ]
        return reply, actions

    # 2. ReportIssuePage
    if page_name == "ReportIssuePage":
        reply = (
            "You're on the Report Issue page. Here is how it works:\n"
            "1. Upload a clear photo of the civic problem.\n"
            "2. The AI automatically analyzes the issue type, category, severity, and responsible department.\n"
            "3. Review the AI suggestions and verify the GPS/incident location.\n"
            "4. Submit your complaint to receive a tracking ID and initiate municipal dispatch."
        )
        actions = [
            QuickAction(label="Photo requirements", prompt="What makes a good photo for reporting?"),
            QuickAction(label="How does AI work?", prompt="How does the AI analyze my photo?"),
            QuickAction(label="Track my complaints", prompt="Show my complaints"),
        ]
        return reply, actions

    # 3. TrackComplaintPage
    if page_name == "TrackComplaintPage":
        is_status_question = bool(
            re.search(r'\b(status|stage)\s+(mean|means|definition|significance)\b', clean)
            or re.search(r'\bwhat\s+does\s+this\s+status\s+mean\b', clean)
        )

        if complaint_ctx and complaint_ctx.complaint_id:
            issue = complaint_ctx.issue_type or (complaint_ctx.category.replace("_", " ").title() if complaint_ctx.category else "Civic Issue")
            if issue.isupper():
                issue = issue.capitalize()
            dept = complaint_ctx.department_name or "Municipal Operations Division"

            if is_status_question:
                status_descriptions = {
                    "Submitted": "Submitted means your complaint has been received and is in the queue for municipal triage.",
                    "Acknowledged": "Acknowledged means the municipal operations center has verified the ticket and is coordinating squad dispatch.",
                    "Assigned": "Assigned means a designated field squad has been dispatched to handle the issue.",
                    "In Progress": "In Progress means field technicians are actively working on-site to resolve the issue.",
                    "Awaiting Verification": "Awaiting Verification means work is complete and awaiting municipal quality verification.",
                    "Resolved": "Resolved means the issue has been verified fixed and the complaint is closed.",
                    "Rejected": "Rejected means the complaint was found to be a duplicate or outside municipal jurisdiction.",
                    "Escalated": "Escalated means the issue exceeded standard resolution SLA and has been elevated to supervisory vigilance.",
                }
                status_desc = status_descriptions.get(complaint_ctx.status, f"The complaint is currently in the '{complaint_ctx.status}' stage.")
                reply = (
                    f"Complaint #{complaint_ctx.complaint_id} ({issue}) is currently '{complaint_ctx.status}'.\n\n"
                    f"{status_desc}\n\n"
                    f"Responsible Department: {dept} (Severity: {complaint_ctx.severity})."
                )
            else:
                reply = (
                    f"You're on the complaint tracking page, currently viewing complaint #{complaint_ctx.complaint_id} ({issue}).\n"
                    f"• Status: {complaint_ctx.status}\n"
                    f"• Department: {dept}\n"
                    f"• Severity: {complaint_ctx.severity}\n\n"
                    f"You can review the progress stepper and timeline history below to see updates from the field squad."
                )

            actions = [
                QuickAction(label="What does this status mean?", prompt="What does this status mean?"),
                QuickAction(label="Show all my complaints", prompt="Show my complaints"),
                QuickAction(label="Report a new issue", prompt="I want to report an issue"),
            ]
            return reply, actions

        # If a specific complaint was requested/selected but unauthorized or non-existent
        if selected_complaint_id and not complaint_ctx:
            reply = (
                "You're on the complaint tracking page. "
                "The specified complaint could not be found in your account. You can enter another complaint ID in the search box to view its progress."
            )
            actions = [
                QuickAction(label="Show my complaints", prompt="Show my complaints"),
                QuickAction(label="What do statuses mean?", prompt="What do the complaint statuses mean?"),
                QuickAction(label="Report a new issue", prompt="I want to report an issue"),
            ]
            return reply, actions

        # No authorized complaint context currently loaded
        reply = (
            "You're on the complaint tracking page. "
            "Enter your complaint ID (such as CS1001) in the search box above to view its live status, assigned department, and timeline updates."
        )
        actions = [
            QuickAction(label="Show my complaints", prompt="Show my complaints"),
            QuickAction(label="What do statuses mean?", prompt="What do the complaint statuses mean?"),
            QuickAction(label="Report a new issue", prompt="I want to report an issue"),
        ]
        return reply, actions

    # 4. CitizenDashboard
    if page_name == "CitizenDashboard":
        reply = (
            "You're on your Citizen Dashboard. Here you can view all the civic grievances you've submitted, "
            "filter them by status or search keyword, track their progress, or click 'Report New Issue' to submit a new complaint."
        )
        actions = [
            QuickAction(label="Show my complaints", prompt="Show my complaints"),
            QuickAction(label="What is my latest complaint?", prompt="What is my latest complaint?"),
            QuickAction(label="Report a new issue", prompt="I want to report an issue"),
        ]
        return reply, actions

    # Fallback
    return ("I can help guide you through CivicSeva. What would you like assistance with?", [])


# ---------------------------------------------------------------------------
# Controlled Citizen Contextual Complaint Explanation (C3.2)
# ---------------------------------------------------------------------------

EXPLANATION_ESCALATION_WHY_PATTERNS = [
    r'\bwhy\s+(was|is|did)\s+(my\s+complaint|this\s+complaint|it|the\s+complaint|cs\d{3,6})\s+(get\s+)?escalated\b',
    r'\bwhy\s+(was|is)\s+it\s+escalated\b',
    r'\bwhy\s+(was|is)\s+escalated\b',
    r'\breason\s+for\s+(the\s+|this\s+)?escalation\b',
]

EXPLANATION_ESCALATION_MEANING_PATTERNS = [
    r'\bwhat\s+does\s+escalated\s+mean\b',
    r'\bwhat\s+does\s+escalation\s+mean\b',
    r'\bwhat\s+is\s+escalation\b',
    r'\bexplain\s+escalat(ed|ion)\b',
]

EXPLANATION_PROGRESS_WHY_PATTERNS = [
    r'\bwhy\s+is\s+(my\s+complaint|this\s+complaint|it|the\s+complaint|cs\d{3,6})\s+(still\s+)?in\s+progress\b',
    r'\bwhy\s+is\s+it\s+(still\s+)?in\s+progress\b',
    r'\bwhy\s+(is\s+it\s+)?still\s+in\s+progress\b',
    r'\bwhy\s+in\s+progress\b',
]

EXPLANATION_STATUS_PATTERNS = [
    r'\bwhat\s+does\s+(this|the|my|current)\s+status\s+mean\b',
    r'\bwhat\s+does\s+status\s+mean\b',
    r'\bwhat\s+does\s+(submitted|acknowledged|assigned|in\s+progress|awaiting\s+verification|resolved|rejected|escalated)\s+mean\b',
    r'\bexplain\s+(this\s+|the\s+|my\s+)?status\b',
    r'\bwhat\s+is\s+the\s+current\s+status\b',
    r'\bcurrent\s+status\s+of\s+(this|my|the)\s+complaint\b',
    r'\bmeaning\s+of\s+(this\s+|the\s+)?status\b',
]

EXPLANATION_DEPARTMENT_PATTERNS = [
    r'\bwhich\s+department\s+(is\s+)?(handling|assigned|managing|in\s+charge)\b',
    r'\bwhat\s+department\s+(is\s+)?(handling|assigned|managing)\b',
    r'\bwho\s+is\s+handling\s+(it|this|my\s+complaint|the\s+complaint|cs\d{3,6})\b',
    r'\bwhich\s+department\b',
    r'\bwho\s+is\s+handling\s+it\b',
    r'\bwhat\s+department\s+is\s+this\s+assigned\s+to\b',
    r'\bis\s+it\s+assigned\s+to\s+a\s+department\b',
]

EXPLANATION_ASSIGNMENT_DATE_PATTERNS = [
    r'\bwhen\s+was\s+(it|this|my\s+complaint|the\s+complaint|cs\d{3,6})\s+assigned\b',
    r'\bwhat\s+date\s+was\s+(it|this|my\s+complaint|cs\d{3,6})\s+assigned\b',
    r'\bwhen\s+did\s+(it|assignment)\s+get\s+assigned\b',
    r'\bwhen\s+was\s+it\s+assigned\b',
    r'\bassignment\s+date\b',
]

EXPLANATION_SUBMISSION_DATE_PATTERNS = [
    r'\bwhen\s+was\s+(it|this|my\s+complaint|the\s+complaint|cs\d{3,6})\s+submitted\b',
    r'\bwhat\s+date\s+was\s+(it|this|my\s+complaint|cs\d{3,6})\s+submitted\b',
    r'\bwhen\s+did\s+i\s+submit\b',
    r'\bwhen\s+was\s+it\s+submitted\b',
    r'\bsubmission\s+date\b',
]

EXPLANATION_TIMELINE_PATTERNS = [
    r'\b(explain|show|view|tell\s+me\s+about)\s+(the|this|my)?\s*timeline\b',
    r'\btimeline\s+of\s+(this|my|the)\s+complaint\b',
    r'\bwhat\s+is\s+the\s+timeline\b',
    r'\bexplain\s+timeline\b',
]

EXPLANATION_SUMMARY_PATTERNS = [
    r'\bwhat\s+happened\s+to\s+(my|this|the)?\s*complaint\b',
    r'\bwhat(\'s|s|\s+is)\s+happening\s+(with|to)\s+(my|this|the)?\s*complaint\b',
    r'\bwhat\s+has\s+happened\s+so\s+far\b',
    r'\b(can\s+you\s+)?summarize\s+(my\s+complaint|this\s+complaint|the\s+progress|my\s+progress|the\s+complaint|progress)\b',
    r'\bexplain\s+(this|my)\s+complaint\b',
    r'\btell\s+me\s+about\s+(this|my)\s+complaint\b',
    r'\bprogress\s+so\s+far\b',
]


def _detect_complaint_explanation_intent(message: str) -> Optional[str]:
    """
    Detects if the citizen is asking a contextual explanation question about a complaint.
    Returns sub-intent identifier or None.
    Sub-intents:
      - ESCALATION_WHY
      - ESCALATION_MEANING
      - PROGRESS_WHY
      - STATUS_EXPLANATION
      - DEPARTMENT
      - ASSIGNMENT_DATE
      - SUBMISSION_DATE
      - TIMELINE
      - SUMMARY
    """
    raw = message.strip()
    clean = re.sub(r'[^\w\s]', '', raw).lower().strip()

    # Reject trivial greetings or general acknowledgements
    if clean in ("hello", "hi", "hey", "thanks", "thank you", "ok", "okay", "bye", "goodbye"):
        return None

    # Check intents in order of specificity
    for pat in EXPLANATION_ESCALATION_WHY_PATTERNS:
        if re.search(pat, clean):
            return "ESCALATION_WHY"

    for pat in EXPLANATION_ESCALATION_MEANING_PATTERNS:
        if re.search(pat, clean):
            return "ESCALATION_MEANING"

    for pat in EXPLANATION_PROGRESS_WHY_PATTERNS:
        if re.search(pat, clean):
            return "PROGRESS_WHY"

    for pat in EXPLANATION_STATUS_PATTERNS:
        if re.search(pat, clean):
            return "STATUS_EXPLANATION"

    for pat in EXPLANATION_DEPARTMENT_PATTERNS:
        if re.search(pat, clean):
            return "DEPARTMENT"

    for pat in EXPLANATION_ASSIGNMENT_DATE_PATTERNS:
        if re.search(pat, clean):
            return "ASSIGNMENT_DATE"

    for pat in EXPLANATION_SUBMISSION_DATE_PATTERNS:
        if re.search(pat, clean):
            return "SUBMISSION_DATE"

    for pat in EXPLANATION_TIMELINE_PATTERNS:
        if re.search(pat, clean):
            return "TIMELINE"

    for pat in EXPLANATION_SUMMARY_PATTERNS:
        if re.search(pat, clean):
            return "SUMMARY"

    return None


def _handle_complaint_explanation(
    sub_intent: str,
    target_id: Optional[str],
    effective_role: str,
    current_user: Optional[User],
    complaint_ctx: Optional[ComplaintContextData],
    page_name: Optional[str],
    db: Session,
) -> Tuple[str, List[QuickAction]]:
    """
    Handles C3.2 Contextual Complaint Explanation queries grounded in real database data.
    Enforces strict ownership authorization and never invents ETAs, future completion dates,
    officer actions, or reasons for status changes.
    """
    # 1. Unauthenticated / Public user protection
    if effective_role == "public" or current_user is None:
        reply = (
            "Please log in to your CivicSeva account to view or explain your complaint details. "
            "Once logged in, I can look up your active grievances, explain the current status, and summarize timeline updates."
        )
        actions = [
            QuickAction(label="How does tracking work?", prompt="How do I track my complaint?"),
            QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
        ]
        return reply, actions

    # 2. Attempt to resolve complaint context if target_id is given but complaint_ctx is None
    ctx = complaint_ctx
    if ctx is None and target_id:
        ctx = _build_complaint_context(target_id, effective_role, current_user, db)

    # 3. If target_id was specified (or selected on page) but ctx is still None:
    # Safe denial / not found (never reveal existence or foreign ownership)
    if target_id and ctx is None:
        reply = (
            "I couldn't find that complaint in your account. "
            "Please verify the complaint ID or ask 'Show my complaints' to view your submitted complaints."
        )
        actions = [
            QuickAction(label="Show my complaints", prompt="Show my complaints"),
            QuickAction(label="Report an issue", prompt="I want to report an issue"),
        ]
        return reply, actions

    # 4. If no complaint is selected or identified at all
    if ctx is None:
        reply = (
            "You don't have a complaint selected right now. "
            "Please enter your complaint ID (such as CS1001) in the search box above or ask 'Show my complaints' to choose one."
        )
        actions = [
            QuickAction(label="Show my complaints", prompt="Show my complaints"),
            QuickAction(label="What is my latest complaint?", prompt="What is my latest complaint?"),
        ]
        return reply, actions

    # 5. Complaint context is verified, authorized, and available
    cid = ctx.complaint_id
    status = ctx.status
    issue = ctx.issue_type or (ctx.category.replace("_", " ").title() if ctx.category else "Civic Issue")
    if issue.isupper():
        issue = issue.capitalize()
    dept = ctx.department_name or "Municipal Operations Division"
    severity = ctx.severity or "Normal"

    # Format created date
    created_str = "an unrecorded date"
    if ctx.created_at:
        try:
            created_dt = datetime.fromisoformat(ctx.created_at)
            created_str = created_dt.strftime("%d %B %Y")
        except Exception:
            created_str = ctx.created_at

    # Format updated date
    updated_str = created_str
    if ctx.updated_at:
        try:
            updated_dt = datetime.fromisoformat(ctx.updated_at)
            updated_str = updated_dt.strftime("%d %B %Y")
        except Exception:
            updated_str = ctx.updated_at

    status_descriptions = {
        "Submitted": "Submitted means your complaint has been received and registered in CivicSeva and is in queue for municipal triage.",
        "Acknowledged": "Acknowledged means the municipal operations center has verified your ticket and is coordinating squad assignment.",
        "Assigned": "Assigned means a designated municipal department or field squad has been dispatched to address the issue.",
        "In Progress": "In Progress means field technicians are actively working on-site to resolve the issue. The complaint has moved beyond submission and is currently being handled through the municipal workflow.",
        "Awaiting Verification": "Awaiting Verification means remediation work has been completed and is awaiting municipal quality verification.",
        "Resolved": "Resolved means the remediation work has been verified and the complaint is officially closed.",
        "Rejected": "Rejected means the complaint was found to be a duplicate or outside municipal jurisdiction.",
        "Escalated": "Escalated means the issue exceeded standard resolution SLA or required supervisory intervention, elevating it to senior municipal authority vigilance.",
    }

    # A. STATUS_EXPLANATION ("What does this status mean?")
    if sub_intent == "STATUS_EXPLANATION":
        desc = status_descriptions.get(status, f"The complaint is currently in the '{status}' stage.")
        reply = (
            f"Complaint #{cid} ({issue}) is currently marked as '{status}'.\n\n"
            f"{desc}\n\n"
            f"The available complaint record does not provide an estimated completion date."
        )
        actions = [
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
            QuickAction(label="Which department is handling it?", prompt="Which department is handling it?"),
            QuickAction(label="Show all my complaints", prompt="Show my complaints"),
        ]
        return reply, actions

    # B. PROGRESS_WHY ("Why is my complaint still in progress?")
    if sub_intent == "PROGRESS_WHY":
        if status == "In Progress":
            reply = (
                f"Your complaint #{cid} is currently marked as In Progress. "
                f"This means the complaint has moved beyond submission and is currently being handled through the municipal workflow. "
                f"Field technicians are actively working on-site to resolve the issue. "
                f"The available record does not provide an estimated completion date or timeline."
            )
        else:
            desc = status_descriptions.get(status, f"The complaint is currently in the '{status}' stage.")
            reply = (
                f"Your complaint #{cid} is currently marked as {status}, not In Progress. "
                f"{desc} The available record does not provide an estimated completion date."
            )
        actions = [
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
            QuickAction(label="Which department is handling it?", prompt="Which department is handling it?"),
            QuickAction(label="Show all my complaints", prompt="Show my complaints"),
        ]
        return reply, actions

    # C. ESCALATION_WHY ("Why was my complaint escalated?")
    if sub_intent == "ESCALATION_WHY":
        if status == "Escalated":
            if ctx.escalation_reason:
                reply = (
                    f"Complaint #{cid} is marked as Escalated. "
                    f"The recorded reason is: {ctx.escalation_reason}."
                )
            else:
                reply = (
                    f"The complaint #{cid} is marked as Escalated, but the available record does not include a reason for the escalation."
                )
        else:
            reply = (
                f"Complaint #{cid} is currently marked as {status}, not Escalated. "
                f"It has not been escalated in the municipal system."
            )
        actions = [
            QuickAction(label="What does this status mean?", prompt="What does this status mean?"),
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
            QuickAction(label="Show all my complaints", prompt="Show my complaints"),
        ]
        return reply, actions

    # D. ESCALATION_MEANING ("What does escalated mean?")
    if sub_intent == "ESCALATION_MEANING":
        reply = (
            "In CivicSeva, 'Escalated' means a complaint has exceeded standard resolution timeframes (SLA) "
            "or required supervisory intervention, elevating it to senior municipal authority review for prioritized action."
        )
        actions = [
            QuickAction(label="Why was my complaint escalated?", prompt="Why was my complaint escalated?"),
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
        ]
        return reply, actions

    # E. DEPARTMENT ("Which department is handling it?")
    if sub_intent == "DEPARTMENT":
        if ctx.department_name:
            reply = f"Complaint #{cid} is currently assigned to the {ctx.department_name}."
            if ctx.assigned_officer_name:
                reply += f" Assigned Officer: {ctx.assigned_officer_name}."
        else:
            reply = f"The complaint record for #{cid} does not currently show an assigned department."
        actions = [
            QuickAction(label="When was it assigned?", prompt="When was it assigned?"),
            QuickAction(label="What does this status mean?", prompt="What does this status mean?"),
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
        ]
        return reply, actions

    # F. ASSIGNMENT_DATE ("When was it assigned?")
    if sub_intent == "ASSIGNMENT_DATE":
        assign_event = None
        for h in ctx.history_summary:
            if (h.new_status or "").lower() == "assigned" or "assigned" in (h.remarks_excerpt or "").lower():
                assign_event = h
                break

        if assign_event and assign_event.timestamp:
            dept_part = f" to the {ctx.department_name}" if ctx.department_name else ""
            reply = f"Complaint #{cid} was assigned on {assign_event.timestamp}{dept_part}."
        elif status in ("Assigned", "In Progress", "Resolved", "Awaiting Verification", "Escalated") and ctx.department_name:
            reply = f"The complaint is assigned to {ctx.department_name}, but the available record does not show an exact assignment date."
        else:
            reply = f"The complaint record for #{cid} does not currently show a recorded assignment date."
        actions = [
            QuickAction(label="Which department is handling it?", prompt="Which department is handling it?"),
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
        ]
        return reply, actions

    # G. SUBMISSION_DATE ("When was my complaint submitted?")
    if sub_intent == "SUBMISSION_DATE":
        if ctx.created_at:
            reply = f"Complaint #{cid} was submitted on {created_str}."
        else:
            reply = f"The complaint record for #{cid} does not show a recorded submission date."
        actions = [
            QuickAction(label="What happened to my complaint?", prompt="What happened to my complaint?"),
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
        ]
        return reply, actions

    # H. TIMELINE ("Explain the timeline.")
    if sub_intent == "TIMELINE":
        if not ctx.history_summary:
            reply = f"The complaint record for #{cid} does not contain additional timeline events yet."
        else:
            chrono_history = list(reversed(ctx.history_summary))
            events_text = []
            if ctx.created_at:
                events_text.append(f"• Submitted on {created_str}")
            for h in chrono_history:
                ts_part = f" on {h.timestamp}" if h.timestamp else ""
                rem_part = f" ({h.remarks_excerpt})" if h.remarks_excerpt else ""
                events_text.append(f"• {h.new_status}{ts_part}{rem_part}")

            events_joined = "\n".join(events_text)
            reply = (
                f"Timeline for complaint #{cid}:\n\n"
                f"{events_joined}\n\n"
                f"Current Status: {status}.\n"
                f"There is no completion date recorded in the available information."
            )
        actions = [
            QuickAction(label="What does this status mean?", prompt="What does this status mean?"),
            QuickAction(label="Which department is handling it?", prompt="Which department is handling it?"),
            QuickAction(label="Show all my complaints", prompt="Show my complaints"),
        ]
        return reply, actions

    # I. SUMMARY ("What happened to my complaint?", "Summarize my complaint", etc.)
    if sub_intent == "SUMMARY":
        lines = [
            f"Complaint #{cid} is a {issue} complaint and is currently {status}.\n",
            f"Department: {dept}",
            f"Severity: {severity}",
            f"Submitted: {created_str}",
            f"Last updated: {updated_str}",
        ]

        if ctx.history_summary:
            lines.append("\nRecent progress:")
            for h in ctx.history_summary[:3]:
                ts_part = f" [{h.timestamp}]" if h.timestamp else ""
                rem_part = f" — {h.remarks_excerpt}" if h.remarks_excerpt else ""
                lines.append(f"• {h.new_status}{ts_part}{rem_part}")

        lines.append("\nThere is no completion date recorded in the available information.")
        reply = "\n".join(lines)
        actions = [
            QuickAction(label="What does this status mean?", prompt="What does this status mean?"),
            QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
            QuickAction(label="Which department is handling it?", prompt="Which department is handling it?"),
        ]
        return reply, actions

    # Fallback
    return ("I can explain the status, timeline, department, or progress of this complaint. What would you like to know?", [])


# ---------------------------------------------------------------------------
# Controlled Citizen Proactive Contextual Assistance (C3.3)
# ---------------------------------------------------------------------------

PROACTIVE_PATTERNS = [
    r'^(proactive|proactive_assistance|proactive\s+assistance|proactive\s+update|__proactive__)$',
    r'\b(any\s+updates?|any\s+news)\b',
    r'\bwhat\s+should\s+i\s+know\b',
    r'\bwhat(\'s|s|\s+is)\s+new\b',
    r'\b(give\s+me\s+an?\s+update|give\s+an?\s+update|give\s+me\s+updates?)\b',
    r'\bwhere\s+do\s+things\s+stand\b',
    r'\b(brief\s+me|give\s+me\s+a\s+briefing)\b',
    r'\bwhat(\'s|s|\s+is)\s+the\s+situation\b',
    r'\btell\s+me\s+what(\'s|s|\s+is)\s+going\s+on\b',
    r'\bwhat(\'s|s|\s+is)\s+going\s+on\b',
    r'\bstatus\s+update\b',
]


def _detect_proactive_intent(message: str) -> bool:
    """
    Detects if the user or frontend is requesting proactive contextual assistance.
    """
    raw = message.strip()
    clean = re.sub(r'[^\w\s]', '', raw).lower().strip()

    # Reject trivial greetings or general acknowledgements
    if clean in ("hello", "hi", "hey", "thanks", "thank you", "ok", "okay", "bye", "goodbye"):
        return False

    for pat in PROACTIVE_PATTERNS:
        if re.search(pat, clean):
            return True
    return False


def _handle_proactive_assistance(
    page_name: Optional[str],
    target_id: Optional[str],
    effective_role: str,
    current_user: Optional[User],
    complaint_ctx: Optional[ComplaintContextData],
    db: Session,
) -> Tuple[str, List[QuickAction]]:
    """
    Provides proactive, context-aware assistance based on current page and authenticated data.
    Strictly read-only, never hallucinates ETAs or private details, and respects ownership.
    """
    # 1. Public user handling
    if effective_role == "public" or current_user is None:
        if page_name == "TrackComplaintPage" and target_id:
            reply = (
                "Please log in to your CivicSeva account to view private complaint updates. "
                "Public users can report new issues or learn how CivicSeva works."
            )
            actions = [
                QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
                QuickAction(label="Report an issue", prompt="I want to report an issue"),
            ]
            return reply, actions

        if page_name == "CitizenDashboard":
            reply = "Please log in to your CivicSeva account to view your citizen complaint dashboard."
            actions = [
                QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
            ]
            return reply, actions

        reply = (
            "Welcome to CivicSeva, Indore's municipal grievance platform. "
            "You can report civic issues with photo evidence, track complaints by ID, or log in to access your citizen dashboard."
        )
        actions = [
            QuickAction(label="Report an issue", prompt="I want to report an issue"),
            QuickAction(label="Track a complaint", prompt="I want to track my complaint"),
            QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
        ]
        return reply, actions

    # 2. TrackComplaintPage
    if page_name == "TrackComplaintPage":
        ctx = complaint_ctx
        if ctx is None and target_id:
            ctx = _build_complaint_context(target_id, effective_role, current_user, db)

        # If a complaint was requested/selected but unauthorized or non-existent
        if target_id and ctx is None:
            reply = (
                "I couldn't find that complaint in your account. "
                "Please verify the complaint ID or ask 'Show my complaints' to view your submitted complaints."
            )
            actions = [
                QuickAction(label="Show my complaints", prompt="Show my complaints"),
                QuickAction(label="Report an issue", prompt="I want to report an issue"),
            ]
            return reply, actions

        # If an authorized complaint is selected
        if ctx:
            cid = ctx.complaint_id
            status = ctx.status

            # Extract latest update date
            latest_date = "recently"
            if ctx.updated_at:
                try:
                    latest_dt = datetime.fromisoformat(ctx.updated_at)
                    latest_date = latest_dt.strftime("%d %B %Y")
                except Exception:
                    latest_date = ctx.updated_at
            elif ctx.created_at:
                try:
                    latest_dt = datetime.fromisoformat(ctx.created_at)
                    latest_date = latest_dt.strftime("%d %B %Y")
                except Exception:
                    latest_date = ctx.created_at

            # Summarize latest timeline event if exists
            latest_event_str = ""
            if ctx.history_summary:
                h0 = ctx.history_summary[0]
                if h0.remarks_excerpt:
                    latest_event_str = f" Latest update: {h0.remarks_excerpt}."

            reply = (
                f"Complaint #{cid} is currently {status}. "
                f"The latest recorded update was {latest_date}.{latest_event_str} "
                f"No completion date is recorded."
            )
            actions = [
                QuickAction(label="What does this status mean?", prompt="What does this status mean?"),
                QuickAction(label="Explain the timeline", prompt="Explain the timeline"),
                QuickAction(label="Which department is handling it?", prompt="Which department is handling it?"),
            ]
            return reply, actions

        # No complaint selected on Track page
        reply = (
            "You're on the Track Complaint page. "
            "Enter your complaint ID (such as CS1001) in the search box above to view its live status and timeline updates."
        )
        actions = [
            QuickAction(label="Show my complaints", prompt="Show my complaints"),
            QuickAction(label="What is my latest complaint?", prompt="What is my latest complaint?"),
        ]
        return reply, actions

    # 3. CitizenDashboard
    if page_name == "CitizenDashboard":
        complaints = (
            db.query(Complaint)
            .filter(Complaint.citizen_id == current_user.id)
            .all()
        )
        if not complaints:
            reply = (
                "You have not submitted any complaints yet. "
                "If you notice a civic issue like a pothole, garbage dump, or broken streetlight, you can report it anytime."
            )
            actions = [
                QuickAction(label="Report an issue", prompt="I want to report an issue"),
                QuickAction(label="How does CivicSeva work?", prompt="How does CivicSeva work?"),
            ]
            return reply, actions

        # Status count breakdown
        from collections import Counter
        counts = Counter(c.status for c in complaints)
        status_order = ["In Progress", "Escalated", "Acknowledged", "Assigned", "Submitted", "Resolved", "Rejected"]
        items = []
        for st in status_order:
            if counts.get(st, 0) > 0:
                items.append(f"{counts[st]} {st}")
        for st, cnt in counts.items():
            if st not in status_order and cnt > 0:
                items.append(f"{cnt} {st}")

        if len(items) == 1:
            breakdown = items[0]
        elif len(items) == 2:
            breakdown = f"{items[0]} and {items[1]}"
        else:
            breakdown = ", ".join(items[:-1]) + f" and {items[-1]}"

        total = len(complaints)
        complaint_word = "complaint" if total == 1 else "complaints"
        reply = f"You currently have {total} {complaint_word}: {breakdown}."
        actions = [
            QuickAction(label="What is my latest complaint?", prompt="What is my latest complaint?"),
            QuickAction(label="Show my complaints", prompt="Show my complaints"),
            QuickAction(label="Report a new issue", prompt="I want to report an issue"),
        ]
        return reply, actions

    # 4. LandingPage
    if page_name == "LandingPage":
        reply = (
            "Welcome to CivicSeva, Indore's municipal grievance platform. "
            "You can report civic issues with photo evidence, track existing complaint timelines, or check your citizen dashboard."
        )
        actions = [
            QuickAction(label="Report an issue", prompt="I want to report an issue"),
            QuickAction(label="Track a complaint", prompt="I want to track my complaint"),
            QuickAction(label="Show my complaints", prompt="Show my complaints"),
        ]
        return reply, actions

    # 5. ReportIssuePage
    if page_name == "ReportIssuePage":
        reply = (
            "You're on the Report Issue page. "
            "Upload a photo of the civic problem, and our AI will automatically suggest the category, severity, and responsible municipal department."
        )
        actions = [
            QuickAction(label="Photo requirements", prompt="What makes a good photo for reporting?"),
            QuickAction(label="How does AI work?", prompt="How does the AI analyze my photo?"),
        ]
        return reply, actions

    # 6. Default fallback
    reply = (
        "I'm your CivicSeva Assistant. "
        "I can help you report civic issues, track your submitted complaints, or understand municipal workflows."
    )
    return reply, []


# ---------------------------------------------------------------------------
# Controlled Citizen Report Guidance (C3.4)
# ---------------------------------------------------------------------------

REPORT_PHOTO_PATTERNS = [
    r'\bwhat\s+(kind|type|sort)\s+of\s+(photo|photos|image|images|picture|pictures)\s+(is|are)?\s*(needed|required|recommended|best|expected)\b',
    r'\bwhat\s+(photo|photos|image|images|picture|pictures)\s+(is|are)?\s*(needed|required)\b',
    r'\b(photo|image|picture)\s+(requirements|guidelines|specs|specifications|criteria)\b',
    r'\bwhat\s+makes\s+a\s+(good|useful|clear|valid)\s+(photo|image|picture)\b',
    r'\bwhat\s+(photo|image|picture)\s+should\s+i\s+(upload|take|submit|provide)\b',
    r'\bhow\s+should\s+i\s+take\s+(the|a)\s+(photo|picture)\b',
    r'\bguidelines\s+for\s+(uploading|taking)\s+(photo|photos|image|images)\b',
]

REPORT_CATEGORIES_PATTERNS = [
    r'\bwhat\s+(types?|kinds?)\s+of\s+(civic\s+)?(issues?|problems?|grievances?|defects?)\s+(can|may)\s+(i|we|citizens?)\s+report\b',
    r'\bwhat\s+(civic\s+)?(issues?|problems?|grievances?)\s+(can|may)\s+(i|we|citizens?)\s+report\b',
    r'\bwhat\s+(categories|issue\s+categories)\s+(can\s+i\s+report|are\s+supported|are\s+available)\b',
    r'\bwhat\s+can\s+i\s+report\s+(here|on\s+this\s+page|in\s+civicseva|to\s+the\s+municipality)\b',
    r'\bsupported\s+(civic\s+)?(issue\s+categories|categories|issues)\b',
    r'\bwhich\s+(civic\s+)?issues\s+are\s+supported\b',
    r'\bwhat\s+issues\s+can\s+be\s+reported\b',
    r'\bwhat\s+issues\s+can\s+i\s+report\b',
]

REPORT_LOCATION_PATTERNS = [
    r'\bwhy\s+is\s+(location|gps|address|incident\s+location)\s+(important|needed|necessary|required|used)\b',
    r'\bwhy\s+do\s+(you|we|civicseva|the\s+municipality)\s+need\s+(my|the|a)?\s*(location|gps|address)\b',
    r'\bwhy\s+is\s+location\s+important\s+when\s+reporting\b',
    r'\bwhy\s+does\s+location\s+matter\b',
    r'\bwhy\s+do\s+i\s+need\s+to\s+provide\s+location\b',
    r'\bpurpose\s+of\s+(location|gps|address)\b',
    r'\bwhat\s+is\s+(the\s+)?(location|gps)\s+used\s+for\b',
]

REPORT_AI_ANALYSIS_PATTERNS = [
    r'\bhow\s+does\s+(the\s+)?ai\s+analyze\s+(my|the|a)?\s*(photo|photos|image|images|picture|pictures|evidence)\b',
    r'\bhow\s+does\s+(the\s+)?(photo|image)\s+analysis\s+work\b',
    r'\bhow\s+does\s+ai\s+analysis\s+work\b',
    r'\bhow\s+does\s+the\s+ai\s+work\b',
    r'\bhow\s+does\s+ai\s+work\b',
    r'\bwhat\s+does\s+the\s+ai\s+analyze\b',
    r'\bhow\s+is\s+(the|my)\s+(photo|image)\s+analyzed\b',
    r'\bwhat\s+does\s+ai\s+do\s+with\s+(my|the)?\s*(photo|image)\b',
]


def _detect_report_guidance_intent(message: str) -> Optional[str]:
    """
    Detects if the user is asking specific report guidance questions:
      - REPORT_PHOTO_GUIDANCE: 'What kind of photo is needed?'
      - REPORT_CATEGORIES_GUIDANCE: 'What types of civic issues can I report?'
      - REPORT_LOCATION_GUIDANCE: 'Why is location important when reporting?'
      - REPORT_AI_ANALYSIS_GUIDANCE: 'How does the AI analyze my photo?'
    """
    raw = message.strip()
    clean = re.sub(r'[^\w\s]', '', raw).lower().strip()

    # Reject trivial greetings or general acknowledgements
    if clean in ("hello", "hi", "hey", "thanks", "thank you", "ok", "okay", "bye", "goodbye"):
        return None

    # Guard: Action commands or desire to report must be handled by C1 or C4.1 navigation
    if re.search(r'\b(i want to|i need to|i would like to|id like to|help me|let me)\b.*?\b(report|file|lodge|register|submit|create)\b', clean):
        return None
    if re.search(r'\b(open|launch|take me to|go to|navigate to)\b', clean):
        return None

    # Guard: General page help (C3.1) must not be intercepted
    if re.search(r'\bwhat\s+(do|can|should|am\s+i\s+supposed\s+to)\s+(i|we)\s+(do|see|find)?\s*(here|now|on this page)?\b', clean):
        # Unless it specifically mentions photo, categories, location, or ai
        if not re.search(r'\b(photo|picture|image|categories|category|location|gps|ai)\b', clean):
            return None

    # 1. Photo guidance
    for pat in REPORT_PHOTO_PATTERNS:
        if re.search(pat, clean):
            return "REPORT_PHOTO_GUIDANCE"

    # 2. Categories guidance
    for pat in REPORT_CATEGORIES_PATTERNS:
        if re.search(pat, clean):
            return "REPORT_CATEGORIES_GUIDANCE"

    # 3. Location guidance
    for pat in REPORT_LOCATION_PATTERNS:
        if re.search(pat, clean):
            return "REPORT_LOCATION_GUIDANCE"

    # 4. AI analysis workflow guidance
    for pat in REPORT_AI_ANALYSIS_PATTERNS:
        if re.search(pat, clean):
            return "REPORT_AI_ANALYSIS_GUIDANCE"

    return None


def _handle_report_guidance(
    guidance_sub_intent: str,
    page_name: Optional[str] = None,
    form_ctx: Optional[FormContextInput] = None,
) -> Tuple[str, List[QuickAction]]:
    """
    Generates concise, useful report guidance based strictly on CivicSeva's existing workflow.
    """
    if guidance_sub_intent == "REPORT_PHOTO_GUIDANCE":
        reply = (
            "For reporting an issue in CivicSeva, the photo should meet these criteria:\n"
            "• Format & Size: JPG or PNG format, up to 10MB in size.\n"
            "• Useful & Clear Subject: A clear, well-lit, direct photo showing the civic defect "
            "(such as a road pothole, uncollected garbage accumulation, broken/dark streetlight fixture, or water pipe leak).\n"
            "• Framing: Keep the defect centered and in focus. Avoid blurry, distant, or obstructed shots.\n\n"
            "A clear photo allows CivicSeva's AI to analyze the visual evidence, estimate severity, "
            "and suggest the correct municipal department for squad dispatch."
        )
        if form_ctx and form_ctx.current_step == 1:
            reply += "\n\nYou are currently on Step 1 (Upload). You can drag and drop your photo above or choose a sample issue to test."

        actions = [
            QuickAction(label="What issues can I report?", prompt="What types of civic issues can I report?"),
            QuickAction(label="Why is location needed?", prompt="Why is location important when reporting?"),
            QuickAction(label="How does AI analyze photos?", prompt="How does the AI analyze my photo?"),
        ]
        return reply, actions

    if guidance_sub_intent == "REPORT_CATEGORIES_GUIDANCE":
        reply = (
            "CivicSeva supports reporting for the following civic issue categories:\n"
            "1. Road Infrastructure: Potholes, road surface damage, cratering, and pavement defects (routed to Road Department).\n"
            "2. Waste Management: Uncollected domestic or commercial garbage and overflowing waste bins (routed to Sanitation Department).\n"
            "3. Street Lighting: Broken, dark, or malfunctioning streetlights and exposed wiring (routed to Electricity Department).\n"
            "4. Water Supply: Drinking water pipeline leaks, burst distribution lines, and street ponding (routed to Water Supply Department).\n"
            "5. Stormwater & Drainage: Drainage overflow, open manholes, and waterlogging (routed to Drainage & Sewerage Board).\n\n"
            "Only civic infrastructure and municipal maintenance issues within municipal jurisdiction are supported."
        )
        actions = [
            QuickAction(label="Photo requirements", prompt="What kind of photo is needed?"),
            QuickAction(label="Why is location needed?", prompt="Why is location important when reporting?"),
            QuickAction(label="How does AI analyze photos?", prompt="How does the AI analyze my photo?"),
        ]
        return reply, actions

    if guidance_sub_intent == "REPORT_LOCATION_GUIDANCE":
        reply = (
            "Location is important when reporting an issue for the following reasons:\n"
            "• Precise Field Dispatch: Accurate GPS coordinates and street addresses guide municipal field squads directly to the defect site without guesswork.\n"
            "• Ward & Department Routing: Municipal operations are organized by ward; location determines which local zonal team is responsible.\n"
            "• Duplicate Detection: It helps the system identify if the same defect has already been reported nearby.\n\n"
            "In CivicSeva, the platform attempts to automatically detect your live device GPS location. "
            "You can also manually review or adjust the street address and landmarks during Step 3 (Review) before submitting."
        )
        if form_ctx and form_ctx.gps_locked:
            reply += "\n\nYour device GPS is currently locked and verified for this report."

        actions = [
            QuickAction(label="Photo requirements", prompt="What kind of photo is needed?"),
            QuickAction(label="What issues can I report?", prompt="What types of civic issues can I report?"),
            QuickAction(label="How does AI analyze photos?", prompt="How does the AI analyze my photo?"),
        ]
        return reply, actions

    if guidance_sub_intent == "REPORT_AI_ANALYSIS_GUIDANCE":
        reply = (
            "When you upload a photo on the Report Issue page, CivicSeva's AI processes it through this workflow:\n"
            "1. Visual Analysis: The AI examines the uploaded photo to identify the civic defect.\n"
            "2. Automated Suggestions: It predicts the issue type, civic category, estimated severity (Low, Medium, High, or Critical), and suggested municipal department along with a confidence score.\n"
            "3. Citizen Review (Step 3): The AI does not finalize the complaint automatically. You are presented with an editable review card where you can verify, edit the title, description, category, department, or adjust the location.\n"
            "4. Human Resolution: The AI assists with triage and department routing; actual physical inspection and repair work are verified and closed by municipal field officers."
        )
        if form_ctx and form_ctx.ai_analysis_available and form_ctx.ai_analysis_summary and form_ctx.ai_analysis_summary.issue:
            summary = form_ctx.ai_analysis_summary
            reply += f"\n\nFor your current upload, the AI detected '{summary.issue}' ({summary.category or 'Civic Issue'}) with {summary.confidence or 'high'} confidence."

        actions = [
            QuickAction(label="Photo requirements", prompt="What kind of photo is needed?"),
            QuickAction(label="What issues can I report?", prompt="What types of civic issues can I report?"),
            QuickAction(label="Why is location needed?", prompt="Why is location important when reporting?"),
        ]
        return reply, actions

    return ("I can answer questions about reporting civic issues, photo guidelines, supported categories, and location tracking.", [])


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

            # 2. Extract explicit complaint ID from user message if present
            msg_id_match = SPECIFIC_ID_PATTERN.search(request.message)
            explicit_complaint_id = msg_id_match.group(0).upper() if msg_id_match else None

            # Determine complaint ID to look up
            # Prioritize explicit ID in message, followed by request/page context
            complaint_id = (
                explicit_complaint_id
                or request.selected_complaint_id
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

            # 6. Check for Controlled Citizen Intent:
            active_page_name = _resolve_page_name(request)

            # C4.3.1 Check Pending Follow-Up Confirmation
            if effective_role in ("citizen", "public"):
                pending_followup_cid = _detect_pending_followup_confirmation(request.conversation_history)
                if pending_followup_cid:
                    followup_resp = _handle_pending_followup_response(
                        message=request.message,
                        pending_cid=pending_followup_cid,
                        effective_role=effective_role,
                        current_user=current_user,
                        db=db,
                    )
                    if followup_resp is not None:
                        reply_text, quick_actions = followup_resp
                        context_version = _compute_context_version(request, effective_role)
                        return AssistantChatResponse(
                            reply=reply_text,
                            quick_actions=quick_actions,
                            context_version=context_version,
                            error=None,
                            action=None,
                        )
                    # If followup_resp is None, the user changed topic! Proceed to next intent handlers.

            # C4.3.1 Check Controlled Citizen Complaint Follow-Up Intent
            if effective_role in ("citizen", "public"):
                followup_intent_data = _detect_followup_intent(request.message)
                if followup_intent_data:
                    intent_type, followup_target_id = followup_intent_data
                    if intent_type == "HOWTO_FOLLOWUP":
                        reply_text = (
                            "To follow up on an active complaint, you can ask me directly with your complaint ID "
                            "(e.g., 'Follow up on CS1001' or 'Follow up on my latest complaint'). "
                            "Would you like to submit a follow-up for one of your complaints?"
                        )
                        quick_actions = [
                            QuickAction(label="Follow up on latest complaint", prompt="Submit a follow-up for my latest complaint"),
                            QuickAction(label="Show my complaints", prompt="Show my complaints"),
                        ]
                    else:
                        reply_text, quick_actions = _handle_followup_request(
                            message=request.message,
                            target_id=followup_target_id or explicit_complaint_id,
                            effective_role=effective_role,
                            current_user=current_user,
                            selected_complaint_id=complaint_id,
                            page_name=active_page_name,
                            db=db,
                        )
                    context_version = _compute_context_version(request, effective_role)
                    return AssistantChatResponse(
                        reply=reply_text,
                        quick_actions=quick_actions,
                        context_version=context_version,
                        error=None,
                        action=None,
                    )

            # A. Check C3.3 Proactive Contextual Assistance Intent
            if effective_role in ("citizen", "public") and _detect_proactive_intent(request.message):
                reply_text, quick_actions = _handle_proactive_assistance(
                    page_name=active_page_name,
                    target_id=explicit_complaint_id or complaint_id,
                    effective_role=effective_role,
                    current_user=current_user,
                    complaint_ctx=complaint_ctx,
                    db=db,
                )
                context_version = _compute_context_version(request, effective_role)
                return AssistantChatResponse(
                    reply=reply_text,
                    quick_actions=quick_actions,
                    context_version=context_version,
                    error=None,
                    action=None,
                )

            # B. Check C3.2 Contextual Complaint Explanation Intent
            explanation_sub_intent = _detect_complaint_explanation_intent(request.message)
            if explanation_sub_intent and effective_role in ("citizen", "public"):
                is_c3_2_context = (
                    active_page_name == "TrackComplaintPage"
                    or explicit_complaint_id is not None
                    or complaint_id is not None
                )
                if is_c3_2_context:
                    reply_text, quick_actions = _handle_complaint_explanation(
                        sub_intent=explanation_sub_intent,
                        target_id=explicit_complaint_id or complaint_id,
                        effective_role=effective_role,
                        current_user=current_user,
                        complaint_ctx=complaint_ctx,
                        page_name=active_page_name,
                        db=db,
                    )
                    context_version = _compute_context_version(request, effective_role)
                    return AssistantChatResponse(
                        reply=reply_text,
                        quick_actions=quick_actions,
                        context_version=context_version,
                        error=None,
                        action=None,
                    )

            # C4.1 Check Controlled Citizen Convenience Navigation
            if effective_role in ("citizen", "public"):
                convenience_nav = _detect_convenience_navigation(request.message)
                if convenience_nav:
                    nav_intent, nav_target_id = convenience_nav
                    action, reply_text, quick_actions = _handle_convenience_navigation(
                        nav_intent=nav_intent,
                        target_id=nav_target_id,
                        effective_role=effective_role,
                        current_user=current_user,
                        db=db,
                    )
                    context_version = _compute_context_version(request, effective_role)
                    return AssistantChatResponse(
                        reply=reply_text,
                        quick_actions=quick_actions,
                        context_version=context_version,
                        error=None,
                        action=action,
                    )

            # C4.2 Check Controlled Citizen Complaint-Focused Convenience Navigation
            if effective_role in ("citizen", "public"):
                complaint_filter = _detect_complaint_filter_navigation(request.message)
                if complaint_filter:
                    action, reply_text, quick_actions = _handle_complaint_filter_navigation(
                        filter_data=complaint_filter,
                        effective_role=effective_role,
                        current_user=current_user,
                        db=db,
                    )
                    context_version = _compute_context_version(request, effective_role)
                    return AssistantChatResponse(
                        reply=reply_text,
                        quick_actions=quick_actions,
                        context_version=context_version,
                        error=None,
                        action=action,
                    )

            # C3.4 Check Controlled Citizen Report Guidance Intent
            report_guidance_sub_intent = _detect_report_guidance_intent(request.message)
            if report_guidance_sub_intent and effective_role in ("citizen", "public"):
                reply_text, quick_actions = _handle_report_guidance(
                    guidance_sub_intent=report_guidance_sub_intent,
                    page_name=active_page_name,
                    form_ctx=request.form_context,
                )
                context_version = _compute_context_version(request, effective_role)
                return AssistantChatResponse(
                    reply=reply_text,
                    quick_actions=quick_actions,
                    context_version=context_version,
                    error=None,
                    action=None,
                )

            # B. Check C2 Retrieval Intent (read-only citizen complaints)
            retrieval_intent = _detect_citizen_retrieval_intent(request.message)
            if retrieval_intent and effective_role in ("citizen", "public"):
                intent_name, target_id = retrieval_intent
                final_target_id = target_id or explicit_complaint_id or complaint_id
                reply_text, quick_actions = _handle_citizen_retrieval(
                    intent=intent_name,
                    target_id=final_target_id,
                    effective_role=effective_role,
                    current_user=current_user,
                    complaint_ctx=complaint_ctx,
                    db=db,
                )
                context_version = _compute_context_version(request, effective_role)
                return AssistantChatResponse(
                    reply=reply_text,
                    quick_actions=quick_actions,
                    context_version=context_version,
                    error=None,
                    action=None,
                )

            # C. Check C1 Action Intent (controlled navigation, e.g. OPEN_REPORT_PAGE)
            detected_action = _detect_citizen_action(request.message, effective_role)
            if detected_action:
                action, reply_text = detected_action
                context_version = _compute_context_version(request, effective_role)
                quick_actions = [
                    QuickAction(label="How does reporting work?", prompt="How do I submit this report?"),
                    QuickAction(label="Photo requirements", prompt="What kind of photo is needed?"),
                    QuickAction(label="Track my complaints", prompt="Where can I track my existing complaints?"),
                ]
                return AssistantChatResponse(
                    reply=reply_text,
                    quick_actions=quick_actions,
                    context_version=context_version,
                    error=None,
                    action=action,
                )

            # D. Check C3.1 Page Awareness Intent (PAGE_HELP)
            if active_page_name and effective_role in ("citizen", "public") and _detect_page_help_intent(request.message):
                reply_text, quick_actions = _handle_page_help(
                    page_name=active_page_name,
                    message=request.message,
                    complaint_ctx=complaint_ctx,
                    effective_role=effective_role,
                    selected_complaint_id=complaint_id,
                )
                context_version = _compute_context_version(request, effective_role)
                return AssistantChatResponse(
                    reply=reply_text,
                    quick_actions=quick_actions,
                    context_version=context_version,
                    error=None,
                    action=None,
                )

            # 7. Assemble full AssistantContext for conversational LLM / fallback
            # Truncate conversation history to budget
            history = request.conversation_history[-MAX_HISTORY_MESSAGES:]
            total_chars = sum(len(m.content) for m in history)
            if total_chars > MAX_HISTORY_CHARS:
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

            # 8. Build system prompt
            system_prompt = build_system_prompt(effective_role, ctx)

            # 9. Prepare history for LLM (dicts, not Pydantic objects)
            history_dicts = [
                {"role": m.role, "content": m.content}
                for m in history
            ]

            # 10. Call Assistant Engine (LLM or deterministic fallback)
            reply_text, error_code = assistant_engine.respond(
                message=request.message,
                system_prompt=system_prompt,
                history=history_dicts,
                ctx=ctx,
            )

            # 11. Output safety validation
            if error_code is None:
                safe_reply = _validate_output(reply_text, ctx)
                if safe_reply is not None:
                    reply_text = safe_reply
                    error_code = "safety_fallback"

            # 12. Select quick actions
            quick_actions = _select_quick_actions(effective_role, request, ctx)

            # 13. Compute context version
            context_version = _compute_context_version(request, effective_role)

            return AssistantChatResponse(
                reply=reply_text,
                quick_actions=quick_actions,
                context_version=context_version,
                error=error_code,
                action=None,
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
                action=None,
            )
