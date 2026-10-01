"""
SLA Prediction Service
Calculates empirical resolution time estimates and SLA breach risk probabilities.
"""

from typing import Dict, Any, List, Optional
import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from ..models.complaint import Complaint
from ..models.sla_prediction import SLAPrediction
from ..models.department import Department


# Standard category target SLA baselines (hours)
CATEGORY_BASE_SLA_HOURS = {
    "pothole": 48.0,
    "road_damage": 48.0,
    "road": 48.0,
    "water_leakage": 24.0,
    "water_supply": 24.0,
    "water": 24.0,
    "garbage": 24.0,
    "waste_dump": 24.0,
    "sanitation": 24.0,
    "drainage_overflow": 36.0,
    "manhole": 36.0,
    "drainage": 36.0,
    "streetlight": 72.0,
    "electrical": 72.0,
    "fallen_tree": 24.0,
    "default": 48.0
}


def compute_sla_prediction(db: Session, complaint: Complaint) -> Dict[str, Any]:
    """
    Computes empirical SLA target hours, predicted completion time, and breach probability.
    Upserts result into SLAPrediction table.
    """
    cat_key = (complaint.category or "default").lower().replace(" ", "_")
    base_sla = CATEGORY_BASE_SLA_HOURS.get(cat_key, CATEGORY_BASE_SLA_HOURS["default"])

    # Severity factor
    sev = (complaint.severity or "MEDIUM").upper()
    sev_multiplier = 1.0
    sev_risk_add = 0.0
    factors = []

    if sev == "CRITICAL":
        base_sla = base_sla * 0.50  # Urgent priority demands fast resolution
        sev_multiplier = 0.70
        sev_risk_add = 0.25
        factors.append("Critical severity requires expedited remediation window")
    elif sev == "HIGH":
        base_sla = base_sla * 0.75
        sev_multiplier = 0.85
        sev_risk_add = 0.15
        factors.append("High severity escalates operational priority (+15% risk)")
    elif sev == "LOW":
        base_sla = base_sla * 1.25
        sev_multiplier = 1.20
        sev_risk_add = -0.05
        factors.append("Low severity allows flexible remediation window")

    # Time elapsed
    created_at = complaint.created_at or datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    elapsed_hours = max(0.0, (now - created_at).total_seconds() / 3600.0)

    # Department active backlog factor
    dept_code = complaint.department_id or "ROAD_DEPT"
    active_backlog = (
        db.query(Complaint)
        .filter(Complaint.department_id == dept_code)
        .filter(Complaint.status.in_(["Submitted", "Acknowledged", "Assigned", "In Progress"]))
        .count()
    )

    backlog_delay_hours = min(20.0, active_backlog * 0.5)
    if active_backlog > 15:
        factors.append(f"Department backlog ({active_backlog} active tickets) increases turnaround queue")
    else:
        factors.append(f"Department capacity optimal ({active_backlog} active tickets in queue)")

    # Status factor
    if complaint.status == "In Progress":
        status_speedup = 0.60
        factors.append("Field crew actively deployed on-site reduces time to resolution")
    elif complaint.status == "Assigned":
        status_speedup = 0.85
        factors.append("Squad assigned, dispatch pending")
    else:
        status_speedup = 1.05
        factors.append("Ticket awaiting supervisor triage/assignment")

    predicted_hours = max(1.0, round((base_sla * sev_multiplier * status_speedup) + backlog_delay_hours, 1))

    # Calculate Breach Probability
    remaining_target = max(0.0, base_sla - elapsed_hours)
    if elapsed_hours >= base_sla:
        breach_prob = 1.0
        risk_status = "BREACHED"
        factors.append("Ticket has exceeded statutory SLA deadline")
    else:
        ratio = elapsed_hours / base_sla
        base_prob = (ratio ** 1.6) * 0.70
        breach_prob = min(0.99, max(0.05, round(base_prob + sev_risk_add + (active_backlog * 0.01), 2)))
        
        if breach_prob >= 0.70:
            risk_status = "HIGH_RISK"
        elif breach_prob >= 0.35:
            risk_status = "MEDIUM_RISK"
        else:
            risk_status = "LOW_RISK"

    # Upsert to database
    record = db.query(SLAPrediction).filter(SLAPrediction.complaint_id == complaint.id).first()
    if not record:
        record = SLAPrediction(
            complaint_id=complaint.id,
            target_sla_hours=base_sla,
            predicted_resolution_hours=predicted_hours,
            sla_breach_probability=breach_prob,
            risk_status=risk_status,
            influencing_factors=json.dumps(factors),
            predicted_at=now,
            updated_at=now
        )
        db.add(record)
    else:
        record.target_sla_hours = base_sla
        record.predicted_resolution_hours = predicted_hours
        record.sla_breach_probability = breach_prob
        record.risk_status = risk_status
        record.influencing_factors = json.dumps(factors)
        record.updated_at = now

    db.commit()
    db.refresh(record)

    expected_completion = now + timedelta(hours=predicted_hours)

    return {
        "complaint_id": complaint.id,
        "target_sla_hours": base_sla,
        "elapsed_hours": round(elapsed_hours, 1),
        "predicted_resolution_hours": predicted_hours,
        "expected_completion_iso": expected_completion.isoformat(),
        "sla_breach_probability": breach_prob,
        "risk_status": risk_status,
        "influencing_factors": factors,
        "status": complaint.status,
        "updated_at": now.isoformat()
    }


def get_complaint_sla_prediction(db: Session, complaint_id: str) -> Optional[Dict[str, Any]]:
    """Returns the latest SLA prediction for a complaint, computing one if not yet stored."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        return None

    record = db.query(SLAPrediction).filter(SLAPrediction.complaint_id == complaint_id).first()
    if record:
        try:
            factors = json.loads(record.influencing_factors) if record.influencing_factors else []
        except Exception:
            factors = []

        return {
            "complaint_id": record.complaint_id,
            "target_sla_hours": record.target_sla_hours,
            "predicted_resolution_hours": record.predicted_resolution_hours,
            "sla_breach_probability": record.sla_breach_probability,
            "risk_status": record.risk_status,
            "influencing_factors": factors,
            "predicted_at": record.predicted_at.isoformat() if record.predicted_at else None,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None
        }

    return compute_sla_prediction(db, complaint)
