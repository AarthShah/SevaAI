"""
CivicSeva Follow-up and Escalation Agent
Evaluates complaint elapsed age against configurable SLA thresholds.
Issues automated follow-up reminders and determines if escalation is recommended.
"""

from typing import Dict, Any, Optional

DEFAULT_SLA_THRESHOLDS = {
    "CRITICAL": 12,   # hours
    "HIGH": 24,       # hours
    "MEDIUM": 48,     # hours
    "LOW": 72         # hours
}

class FollowupAgent:
    def __init__(self, thresholds: Optional[Dict[str, int]] = None):
        self.name = "FollowupAgent"
        self.thresholds = thresholds or DEFAULT_SLA_THRESHOLDS

    def evaluate_complaint(
        self,
        complaint_id: str,
        severity: str,
        current_status: str,
        elapsed_hours: float,
        escalation_count: int = 0
    ) -> Dict[str, Any]:
        """
        Determines if a complaint is overdue for follow-up or eligible for escalation.
        """
        sev_upper = severity.upper()
        threshold = self.thresholds.get(sev_upper, 48)

        is_terminal = current_status.lower() in ["resolved", "rejected"]
        if is_terminal:
            return {
                "agent": self.name,
                "complaint_id": complaint_id,
                "follow_up_recommended": False,
                "escalation_recommended": False,
                "reason": f"Complaint {complaint_id} is already in terminal state '{current_status}'.",
                "elapsed_hours": elapsed_hours,
                "threshold_hours": threshold
            }

        # Check follow-up condition
        follow_up_needed = elapsed_hours >= threshold
        # Escalation condition: unresolved past 1.5x threshold or severity CRITICAL past threshold
        escalation_threshold = threshold * (1.0 if sev_upper == "CRITICAL" else 1.5)
        escalation_needed = elapsed_hours >= escalation_threshold and escalation_count == 0

        action_summary = []
        if follow_up_needed:
            action_summary.append(
                f"Complaint #{complaint_id} has remained unresolved for {elapsed_hours:.1f} hours, "
                f"exceeding the {sev_upper} priority threshold ({threshold}h). Follow-up is recommended."
            )
        if escalation_needed:
            action_summary.append(
                f"Automated Escalation Rule triggered: Level 1 Ward Vigilance Escalation recommended "
                f"due to non-remediation beyond configured escalation threshold ({escalation_threshold:.0f}h)."
            )

        if not follow_up_needed and not escalation_needed:
            remaining = max(0.0, threshold - elapsed_hours)
            action_summary.append(
                f"Complaint #{complaint_id} is within active SLA limits. {remaining:.1f} hours remaining until follow-up threshold."
            )

        return {
            "agent": self.name,
            "complaint_id": complaint_id,
            "severity": sev_upper,
            "elapsed_hours": round(elapsed_hours, 1),
            "threshold_hours": threshold,
            "follow_up_recommended": follow_up_needed,
            "escalation_recommended": escalation_needed,
            "escalation_level": 1 if escalation_needed else 0,
            "message": " ".join(action_summary)
        }

followup_agent = FollowupAgent()
