"""
CivicSeva Contextual Assistant - LLM Provider Abstraction

Provides a clean provider interface so AssistantService never contains
provider-specific logic. The active provider is selected from environment
configuration at import time and can be overridden per request.

Provider hierarchy:
  1. OpenAICompatibleProvider  - uses LLM_API_KEY + LLM_MODEL (or ASSISTANT_ overrides)
  2. DeterministicFallback     - always available, no external calls, no API key needed

The application MUST function without an LLM key. DeterministicFallback
is used automatically when:
  - LLM_API_KEY is absent or empty
  - The LLM API call times out
  - The LLM API returns a rate-limit or server error
  - The LLM response is malformed or empty
"""

import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv

import httpx

# Load .env from project root
_ROOT = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(_ROOT / ".env")
load_dotenv(_ROOT / "backend" / ".env")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------------------------

# Assistant-specific overrides; fall back to shared AIML pipeline keys
_LLM_API_KEY: str = (
    os.getenv("ASSISTANT_LLM_API_KEY", "").strip()
    or os.getenv("LLM_API_KEY", "").strip()
)
_LLM_MODEL: str = (
    os.getenv("ASSISTANT_LLM_MODEL", "").strip()
    or os.getenv("LLM_MODEL", "gpt-4o-mini").strip()
)
_LLM_BASE_URL: str = (
    os.getenv("ASSISTANT_LLM_BASE_URL", "").strip()
    or os.getenv("LLM_BASE_URL", "").strip()
)

# Auto-detect Groq API key (starts with gsk_)
if _LLM_API_KEY.startswith("gsk_"):
    if not _LLM_BASE_URL:
        _LLM_BASE_URL = "https://api.groq.com/openai/v1"
    if _LLM_MODEL in ("gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo", ""):
        _LLM_MODEL = "qwen/qwen3.8-27b"

if not _LLM_BASE_URL:
    _LLM_BASE_URL = "https://api.openai.com/v1"

_LLM_BASE_URL = _LLM_BASE_URL.rstrip("/")
_TIMEOUT_SECONDS: float = float(os.getenv("ASSISTANT_TIMEOUT_SECONDS", "12"))
_MAX_TOKENS: int = int(os.getenv("ASSISTANT_MAX_TOKENS", "600"))

# Force deterministic mode for testing or when no key is present
_FORCE_DETERMINISTIC: bool = (
    os.getenv("ASSISTANT_LLM_PROVIDER", "").strip().lower() == "deterministic"
    or not _LLM_API_KEY
)


# ---------------------------------------------------------------------------
# Deterministic fallback responses
# ---------------------------------------------------------------------------

# Keyed by (page_name_lower, fallback_scenario)
_FALLBACK_RESPONSES: Dict[str, str] = {
    "default": (
        "Welcome to CivicSeva. I can help you report a civic issue, track an existing "
        "complaint, or understand how the platform works. What would you like to know?"
    ),
    "report_step1": (
        "To report an issue, upload a clear photo of the problem. "
        "The AI will analyze it and suggest the appropriate department and severity. "
        "Make sure your GPS location is enabled for accurate incident mapping."
    ),
    "report_step2": (
        "The AI is analyzing your photo. This takes just a moment. "
        "Once complete, you will see the suggested issue type, department, and severity. "
        "You can review and adjust these before submitting."
    ),
    "report_ai_done": (
        "The AI has analyzed your photo. You can see the suggested issue type, "
        "department, and severity above. Review these details carefully — "
        "you can edit them before submitting. When ready, click Proceed to Review."
    ),
    "report_step3": (
        "Review your complaint details carefully before submitting. "
        "Once submitted, you will receive a complaint ID you can use to track progress. "
        "If anything looks wrong, you can go back and correct it."
    ),
    "report_submitted": (
        "Your complaint has been submitted successfully. "
        "Use the complaint ID shown on screen to track its progress at any time. "
        "You can visit Track Complaint and enter your ID to see real-time updates."
    ),
    "track_general": (
        "Enter your complaint ID (e.g. CS1001) in the search box to view its current status. "
        "The timeline shows each stage your complaint has passed through. "
        "If you need more details, check the complaint history section."
    ),
    "status_submitted": (
        "Submitted means your complaint has been received and is in the queue for review. "
        "You do not need to do anything right now. The system will process it shortly."
    ),
    "status_assigned": (
        "Assigned means a field officer has been designated to handle your complaint. "
        "They will visit the site and work on resolving the issue. "
        "You can check back for updates as the status progresses."
    ),
    "status_inprogress": (
        "In Progress means the assigned officer is actively working on the issue on-site. "
        "You should see a status update to Resolved once the work is verified complete."
    ),
    "status_escalated": (
        "Escalated means your complaint was not resolved within the expected timeframe "
        "and has been elevated to higher authority for review. "
        "You should receive an update as the situation is reviewed."
    ),
    "status_resolved": (
        "Resolved means the reported issue has been addressed and the complaint is closed. "
        "If the issue recurs, you can submit a new complaint at any time."
    ),
    "mutation_request": (
        "That action needs to be performed in the CivicSeva interface directly. "
        "I can guide you to the right section — use the existing dashboard controls "
        "to make changes to complaint status, assignments, or escalations."
    ),
    "unauthorized_complaint": (
        "I can only provide details about complaints associated with your account. "
        "If you believe there is an issue, please check the complaint ID and try again, "
        "or contact municipal support."
    ),
    "no_complaint_selected": (
        "No complaint is currently selected. Please enter a complaint ID in the search "
        "box to view its details, or navigate to Track Complaint from the main menu."
    ),
    "llm_unavailable": (
        "I am currently operating in basic guidance mode. "
        "For specific complaint details, please check the complaint timeline directly. "
        "I can still help with general guidance about CivicSeva."
    ),
    "authority_triage": (
        "Focus on CRITICAL and HIGH severity complaints first as they have the tightest SLA. "
        "Escalated complaints have already exceeded their threshold and require immediate attention. "
        "Use the assignment workflow in the triage panel to designate field officers."
    ),
    "authority_analytics": (
        "The analytics panel shows complaint volume, resolution rates, and department performance. "
        "Overdue complaints are those still open beyond their SLA threshold. "
        "Use these metrics to identify bottlenecks and prioritize resource allocation."
    ),
    "authority_agent": (
        "The autonomous agent continuously monitors open complaints. "
        "It auto-assigns stuck complaints, dispatches follow-up inquiries when SLAs are approached, "
        "and escalates critical or overdue complaints to Level 1 Vigilance automatically."
    ),
    "authority_cctv": (
        "The CCTV Vision system scans camera feeds for civic defects using computer vision. "
        "When a defect is detected above the confidence threshold, a work order is created. "
        "You can also manually upload a camera frame to test detection."
    ),
    "how_to_report": (
        "You can report civic issues like potholes, garbage, or water leaks through the Report Issue form. "
        "Upload a photo of the problem, and our AI will detect the issue and route it to the right department. "
        "When you are ready, you can ask me to 'Open the Report Issue tab' and I will open it for you."
    ),
}


def _pick_deterministic_response(message: str, ctx) -> Tuple[str, str]:
    """
    Selects the most appropriate deterministic response based on context.
    Returns (reply_text, error_code).
    """
    msg_lower = message.lower()

    # Mutation detection (with guard for read-only queries and CCTV queries)
    mutation_keywords = [
        "assign", "escalate", "change status", "update status", "mark as",
        "resolve", "reject", "close", "dispatch", "send", "submit for me"
    ]
    is_read_query = any(k in msg_lower for k in ["show", "list", "what", "which", "view", "how many", "display", "unresolved", "ready for dispatch"])
    is_cctv_inquiry = any(k in msg_lower for k in ["cctv", "camera", "pothole", "defect", "detection"])

    if any(kw in msg_lower for kw in mutation_keywords):
        if not (is_read_query and is_cctv_inquiry) and "unresolved" not in msg_lower:
            return _FALLBACK_RESPONSES["mutation_request"], "llm_unavailable"

    # Informational questions about reporting
    report_inquiry_keywords = [
        "how to report", "how do i report", "how can i report", "how do we report",
        "report a pothole", "reporting process", "steps to report", "how to file"
    ]
    if any(kw in msg_lower for kw in report_inquiry_keywords):
        return _FALLBACK_RESPONSES["how_to_report"], "llm_unavailable"

    # Page-specific routing
    page = ctx.page if ctx else None
    form = ctx.form if ctx else None
    role = (ctx.auth.effective_role.lower() if (ctx and getattr(ctx, "auth", None)) else "public")
    complaint = ctx.complaint if ctx else None

    if form and form.active:
        step = form.current_step or 1
        if form.submission_occurred:
            return _FALLBACK_RESPONSES["report_submitted"], "llm_unavailable"
        if form.user_reviewing:
            return _FALLBACK_RESPONSES["report_step3"], "llm_unavailable"
        if form.ai_analysis_available:
            return _FALLBACK_RESPONSES["report_ai_done"], "llm_unavailable"
        if form.is_analyzing or step == 2:
            return _FALLBACK_RESPONSES["report_step2"], "llm_unavailable"
        return _FALLBACK_RESPONSES["report_step1"], "llm_unavailable"

    if complaint:
        status = complaint.status.lower()
        if "submit" in status:
            return _FALLBACK_RESPONSES["status_submitted"], "llm_unavailable"
        if "assign" in status:
            return _FALLBACK_RESPONSES["status_assigned"], "llm_unavailable"
        if "progress" in status:
            return _FALLBACK_RESPONSES["status_inprogress"], "llm_unavailable"
        if "escalat" in status:
            return _FALLBACK_RESPONSES["status_escalated"], "llm_unavailable"
        if "resolv" in status:
            return _FALLBACK_RESPONSES["status_resolved"], "llm_unavailable"

    # Citizen Isolation for CCTV queries
    if role == "citizen" and any(k in msg_lower for k in ["cctv", "camera feed", "edge ai", "surveillance grid"]):
        return (
            "Municipal CCTV surveillance feeds and edge detection telemetry are restricted to authorized municipal officers. "
            "As a citizen, you can report potholes or road hazards directly through the Report Issue page.",
            "llm_unavailable"
        )

    if role in ("authority", "admin"):
        cctv_keywords = ["pothole", "cctv", "detection", "road issue", "road defect", "camera", "cameras", "evidence", "defect", "unresolved", "pending review"]
        if any(k in msg_lower for k in cctv_keywords):
            a = getattr(ctx, "authority_ops", None) if ctx else None
            if a and (getattr(a, "cctv_pending_count", 0) or getattr(a, "cctv_recent_potholes_count", 0) or getattr(a, "cctv_latest_detections", None)):
                dets = getattr(a, "cctv_latest_detections", []) or []

                # Query: Show evidence
                if "evidence" in msg_lower:
                    lines = ["**CCTV Defect Evidence Verification:**\n"]
                    ev_found = False
                    for d in dets:
                        if d.get("evidence_url") and d.get("evidence_url") != "N/A":
                            ev_found = True
                            lines.append(f"- **Event #{d['event_id']}** ({d['camera_id']}): Severity {d['severity']}, Confidence {d['confidence']} → [View Evidence Frame]({d['evidence_url']})")
                    if not ev_found:
                        lines.append("Evidence snapshots captured on edge camera nodes are being synced.")
                    return "\n".join(lines), "llm_unavailable"

                # Query: Which cameras detected potholes?
                if "which camera" in msg_lower or "which cameras" in msg_lower or "cameras detected" in msg_lower:
                    cams = sorted(list(set(d.get("camera_id") for d in dets if d.get("camera_id"))))
                    if cams:
                        cam_str = ", ".join(f"`{c}`" for c in cams)
                        return (
                            f"**Active Cameras with Confirmed Pothole Detections:**\n"
                            f"Potholes were detected across {len(cams)} camera node(s): {cam_str}.\n"
                            f"Total detections: {a.cctv_recent_potholes_count} ({a.cctv_pending_count} pending review).",
                            "llm_unavailable"
                        )

                # Query: Show me the latest CCTV event
                if "latest cctv event" in msg_lower or "latest event" in msg_lower or "single event" in msg_lower:
                    if dets:
                        latest = dets[0]
                        return (
                            f"**Latest Confirmed CCTV Defect Event:**\n"
                            f"- **Event ID:** `{latest['event_id']}`\n"
                            f"- **Camera:** `{latest['camera_id']}`\n"
                            f"- **Video Timestamp:** {latest['timestamp']}\n"
                            f"- **Confidence:** {latest['confidence']}\n"
                            f"- **Severity:** {latest['severity']}\n"
                            f"- **Review Status:** {latest['status']}\n"
                            f"- **Location:** {latest['address']}\n"
                            f"- **Evidence Frame:** [Inspect Evidence]({latest['evidence_url']})",
                            "llm_unavailable"
                        )

                # Query: Unresolved CCTV events or Pending Review
                if "unresolved" in msg_lower or "pending review" in msg_lower or "pending" in msg_lower:
                    pending_dets = [d for d in dets if d.get("status") == "PENDING_REVIEW"]
                    lines = [
                        f"**Unresolved CCTV Detections Pending Officer Review ({a.cctv_pending_count} active):**",
                    ]
                    if pending_dets:
                        for d in pending_dets:
                            lines.append(f"- **{d['event_id']}**: Camera `{d['camera_id']}` | Conf: {d['confidence']} | Sev: {d['severity']} | Video Time: {d['timestamp']}")
                        lines.append("\nAction required: Open the CCTV Triage section to Verify or Dismiss these events.")
                    else:
                        lines.append("All recent detections have been reviewed or converted to work orders.")
                    return "\n".join(lines), "llm_unavailable"

                # Query: Severe potholes active
                if "severe" in msg_lower or "critical" in msg_lower or "high severity" in msg_lower:
                    high_dets = [d for d in dets if d.get("severity") in ("HIGH", "CRITICAL")]
                    lines = [
                        f"**High & Critical Severity CCTV Pothole Alerts:**",
                        f"- Total Severe Incidents: **{a.cctv_high_severity_count}**",
                    ]
                    for d in high_dets:
                        lines.append(f"- **{d['event_id']}** (`{d['camera_id']}`): Confidence {d['confidence']} | Status: {d['status']}")
                    return "\n".join(lines), "llm_unavailable"

                # General CCTV / Pothole Overview Query
                lines = [
                    "**CCTV Infrastructure Defect Telemetry (Real-Time Database):**",
                    f"- **Pending Officer Review:** {a.cctv_pending_count} events",
                    f"- **Total Potholes Detected:** {a.cctv_recent_potholes_count}",
                    f"- **High Severity Incidents:** {a.cctv_high_severity_count}",
                ]
                if dets:
                    lines.append("\n**Recent Confirmed Detections:**")
                    for d in dets:
                        lines.append(f"- **{d['event_id']}**: Camera `{d['camera_id']}` | Conf: {d['confidence']} | Sev: {d['severity']} | Status: {d['status']} | Video Time: {d['timestamp']}")
                return "\n".join(lines), "llm_unavailable"
            else:
                return (
                    "No pending CCTV pothole detections are currently recorded in the database. "
                    "The CCTV AI edge perception pipeline is actively monitoring surveillance nodes.",
                    "llm_unavailable"
                )

        if page:
            tab = (page.active_tab or "").lower()
            if "analytic" in tab or "report" in tab:
                return _FALLBACK_RESPONSES["authority_analytics"], "llm_unavailable"
            if "cctv" in tab:
                return _FALLBACK_RESPONSES["authority_cctv"], "llm_unavailable"
            if "agent" in msg_lower or "autonomous" in msg_lower or "sweep" in msg_lower:
                return _FALLBACK_RESPONSES["authority_agent"], "llm_unavailable"
            return _FALLBACK_RESPONSES["authority_triage"], "llm_unavailable"

    if "track" in msg_lower or "status" in msg_lower:
        return _FALLBACK_RESPONSES["track_general"], "llm_unavailable"

    return _FALLBACK_RESPONSES["default"], "llm_unavailable"


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------

class DeterministicFallbackProvider:
    """
    Rule-based response provider. No external calls. Always available.
    Used when LLM_API_KEY is absent or LLM is unavailable.
    """

    def respond(
        self,
        message: str,
        system_prompt: str,
        history: List[Dict[str, str]],
        ctx,
    ) -> Tuple[str, Optional[str]]:
        """Returns (reply_text, error_code_or_none)."""
        reply, error = _pick_deterministic_response(message, ctx)
        return reply, error


class OpenAICompatibleProvider:
    """
    Calls an OpenAI-compatible Chat Completions API using httpx.
    Works with OpenAI, Azure OpenAI (with correct base URL), and local models.
    Falls back to DeterministicFallbackProvider on any error.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ):
        self._fallback = DeterministicFallbackProvider()
        self._api_key = api_key if api_key is not None else _LLM_API_KEY
        self._model = model if model is not None else _LLM_MODEL
        self._base_url = (base_url if base_url is not None else _LLM_BASE_URL).rstrip("/")
        self._timeout = timeout if timeout is not None else _TIMEOUT_SECONDS
        self._max_tokens = max_tokens if max_tokens is not None else _MAX_TOKENS

    def respond(
        self,
        message: str,
        system_prompt: str,
        history: List[Dict[str, str]],
        ctx,
    ) -> Tuple[str, Optional[str]]:
        """
        Calls the LLM. Returns (reply_text, error_code_or_none).
        Falls back to deterministic on any failure.
        """
        messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
        # Append conversation history (already validated/truncated upstream)
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        payload = {
            "model": self._model,
            "messages": messages,
            "max_tokens": self._max_tokens,
            "temperature": 0.3,  # Low temperature for factual, grounded responses
        }

        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(
                    f"{self._base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    content=json.dumps(payload),
                )

            if response.status_code == 429:
                logger.warning("Assistant LLM rate limit exceeded; using fallback")
                reply, _ = self._fallback.respond(message, system_prompt, history, ctx)
                return reply, "rate_limited"

            if response.status_code != 200:
                logger.warning(
                    "Assistant LLM returned HTTP %s; using fallback",
                    response.status_code,
                )
                reply, _ = self._fallback.respond(message, system_prompt, history, ctx)
                return reply, "llm_unavailable"

            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                logger.warning("Assistant LLM returned empty choices; using fallback")
                reply, _ = self._fallback.respond(message, system_prompt, history, ctx)
                return reply, "llm_unavailable"

            content = choices[0].get("message", {}).get("content", "").strip()
            if not content:
                logger.warning("Assistant LLM returned empty content; using fallback")
                reply, _ = self._fallback.respond(message, system_prompt, history, ctx)
                return reply, "llm_unavailable"

            return content, None

        except httpx.TimeoutException:
            logger.warning("Assistant LLM timed out after %.1fs; using fallback", self._timeout)
            reply, _ = self._fallback.respond(message, system_prompt, history, ctx)
            return reply, "llm_unavailable"

        except Exception as exc:
            logger.error("Assistant LLM provider error: %s; using fallback", exc)
            reply, _ = self._fallback.respond(message, system_prompt, history, ctx)
            return reply, "llm_unavailable"


# ---------------------------------------------------------------------------
# AssistantEngine — top-level selector
# ---------------------------------------------------------------------------

class AssistantEngine:
    """
    Selects the active provider at construction time and exposes a single
    `respond()` method to AssistantService.
    """

    def __init__(self):
        if _FORCE_DETERMINISTIC:
            self._provider = DeterministicFallbackProvider()
            logger.info(
                "AssistantEngine: using DeterministicFallback "
                "(LLM_API_KEY absent or ASSISTANT_LLM_PROVIDER=deterministic)"
            )
        else:
            self._provider = OpenAICompatibleProvider()
            logger.info(
                "AssistantEngine: using OpenAICompatibleProvider "
                "(model=%s, base_url=%s)",
                _LLM_MODEL, _LLM_BASE_URL,
            )

    def respond(
        self,
        message: str,
        system_prompt: str,
        history: List[Dict[str, str]],
        ctx,
    ) -> Tuple[str, Optional[str]]:
        return self._provider.respond(message, system_prompt, history, ctx)


# Singleton — instantiated once at import time
assistant_engine = AssistantEngine()
