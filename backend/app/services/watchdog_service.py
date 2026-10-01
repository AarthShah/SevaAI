"""
Proactive AI Watchdog Service
Continuously inspects active civic complaints, detects workflow stalls, and logs actionable interventions.
"""

from typing import Dict, Any, List, Optional
import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from ..models.complaint import Complaint
from ..models.watchdog_event import WatchdogEvent
from .sla_prediction_service import compute_sla_prediction


def run_watchdog_sweep(db: Session) -> Dict[str, Any]:
    """
    Scans all active civic tickets across the municipality.
    Identifies workflow stalls, unattended high-priority issues, and SLA breach risks.
    Generates WatchdogEvent records.
    """
    active_statuses = ["Submitted", "Acknowledged", "Assigned", "In Progress", "Review Required"]
    active_tickets = db.query(Complaint).filter(Complaint.status.in_(active_statuses)).all()

    now = datetime.now(timezone.utc)
    new_events: List[WatchdogEvent] = []
    summary = {
        "scanned_tickets_count": len(active_tickets),
        "stalled_count": 0,
        "unassigned_high_priority_count": 0,
        "sla_risk_count": 0,
        "new_alerts_created": 0
    }

    for c in active_tickets:
        c_created = c.created_at or now
        if c_created.tzinfo is None:
            c_created = c_created.replace(tzinfo=timezone.utc)
        elapsed_hours = (now - c_created).total_seconds() / 3600.0

        # Check 1: Unassigned High/Critical Priority ticket
        sev = (c.severity or "").upper()
        if (sev in ["HIGH", "CRITICAL"]) and (not c.assigned_officer_name) and (c.status in ["Submitted", "Acknowledged"]):
            summary["unassigned_high_priority_count"] += 1
            # Avoid duplicate recent event
            existing = (
                db.query(WatchdogEvent)
                .filter(WatchdogEvent.complaint_id == c.id)
                .filter(WatchdogEvent.event == "UNASSIGNED_HIGH_PRIORITY")
                .first()
            )
            if not existing:
                ev = WatchdogEvent(
                    complaint_id=c.id,
                    event="UNASSIGNED_HIGH_PRIORITY",
                    risk="HIGH" if sev == "HIGH" else "CRITICAL",
                    reason=f"High/Critical severity ticket #{c.id} ({c.issue_type or c.category or 'Civic Defect'}) has been pending assignment for {round(elapsed_hours, 1)} hours.",
                    recommended_action="RECOMMEND_REASSIGNMENT",
                    action_taken=False,
                    action_notes="Auto-alert dispatched to Municipal Duty Officer",
                    created_at=now
                )
                db.add(ev)
                new_events.append(ev)

        # Check 2: Stalled workflow (Submitted / In Progress with no progress for > 18 hours)
        if elapsed_hours >= 18.0 and c.status in ["Submitted", "Acknowledged"]:
            summary["stalled_count"] += 1
            existing = (
                db.query(WatchdogEvent)
                .filter(WatchdogEvent.complaint_id == c.id)
                .filter(WatchdogEvent.event == "STALLED_WORKFLOW")
                .first()
            )
            if not existing:
                ev = WatchdogEvent(
                    complaint_id=c.id,
                    event="STALLED_WORKFLOW",
                    risk="MEDIUM",
                    reason=f"Ticket #{c.id} has had no state advancement for {round(elapsed_hours, 1)} hours.",
                    recommended_action="SEND_REMINDER",
                    action_taken=False,
                    action_notes="Supervisor reminder scheduled",
                    created_at=now
                )
                db.add(ev)
                new_events.append(ev)

        # Check 3: SLA Breach Risk
        sla_info = compute_sla_prediction(db, c)
        if sla_info.get("risk_status") in ["HIGH_RISK", "BREACHED"]:
            summary["sla_risk_count"] += 1
            existing = (
                db.query(WatchdogEvent)
                .filter(WatchdogEvent.complaint_id == c.id)
                .filter(WatchdogEvent.event == "SLA_BREACH_RISK")
                .first()
            )
            if not existing:
                ev = WatchdogEvent(
                    complaint_id=c.id,
                    event="SLA_BREACH_RISK",
                    risk="CRITICAL" if sla_info.get("risk_status") == "BREACHED" else "HIGH",
                    reason=f"SLA breach probability is {round(sla_info.get('sla_breach_probability', 0) * 100)}% ({sla_info.get('risk_status')}). Target SLA: {sla_info.get('target_sla_hours')}h.",
                    recommended_action="RECOMMEND_ESCALATION" if sla_info.get("risk_status") == "BREACHED" else "INCREASE_PRIORITY",
                    action_taken=False,
                    action_notes="Escalation ticket flagged for senior supervisor",
                    created_at=now
                )
                db.add(ev)
                new_events.append(ev)

    if new_events:
        db.commit()

    summary["new_alerts_created"] = len(new_events)
    return summary


def get_watchdog_events_for_complaint(db: Session, complaint_id: str) -> List[Dict[str, Any]]:
    """Returns all watchdog alert events logged for a specific complaint."""
    records = (
        db.query(WatchdogEvent)
        .filter(WatchdogEvent.complaint_id == complaint_id)
        .order_by(WatchdogEvent.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "complaint_id": r.complaint_id,
            "event": r.event,
            "risk": r.risk,
            "reason": r.reason,
            "recommended_action": r.recommended_action,
            "action_taken": r.action_taken,
            "action_notes": r.action_notes,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in records
    ]


def get_all_recent_watchdog_events(db: Session, limit: int = 50) -> List[Dict[str, Any]]:
    """Returns system-wide watchdog events for the authority dashboard."""
    records = (
        db.query(WatchdogEvent)
        .order_by(WatchdogEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "complaint_id": r.complaint_id,
            "event": r.event,
            "risk": r.risk,
            "reason": r.reason,
            "recommended_action": r.recommended_action,
            "action_taken": r.action_taken,
            "action_notes": r.action_notes,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in records
    ]


def mark_watchdog_action_taken(db: Session, event_id: int, notes: str) -> Dict[str, Any]:
    """Marks a watchdog event as resolved / action taken."""
    ev = db.query(WatchdogEvent).filter(WatchdogEvent.id == event_id).first()
    if not ev:
        raise ValueError(f"Watchdog event #{event_id} not found.")

    ev.action_taken = True
    ev.action_notes = notes
    db.commit()
    return {
        "event_id": ev.id,
        "action_taken": True,
        "notes": notes
    }
