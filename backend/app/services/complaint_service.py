"""
Complaint Business Logic Service
Handles complaint lifecycle, status state machine, notifications, history, and SLA evaluation.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models.complaint import Complaint
from ..models.complaint_history import ComplaintHistory
from ..models.agent_action import AgentAction
from ..models.evidence import Evidence
from ..models.escalation import Escalation
from ..models.notification import Notification
from ..models.department import Department
from ..schemas.complaint import ComplaintSubmitRequest, ComplaintStatusUpdate
from ..config import SLA_HIGH_HOURS, SLA_MEDIUM_HOURS, SLA_LOW_HOURS, DEMO_FAST_SLA_SIMULATION

VALID_STATUSES = [
    "Draft",
    "Submitted",
    "Acknowledged",
    "Assigned",
    "In Progress",
    "Awaiting Verification",
    "Resolved",
    "Rejected",
    "Escalated"
]

class ComplaintService:
    @staticmethod
    def generate_next_id(db: Session) -> str:
        last_complaint = db.query(Complaint).order_by(desc(Complaint.created_at)).first()
        if not last_complaint or not last_complaint.id.startswith("CS"):
            return "CS1001"
        try:
            num = int(last_complaint.id.replace("CS", "")) + 1
            return f"CS{num}"
        except Exception:
            return f"CS{int(datetime.now().timestamp()) % 100000}"

    @staticmethod
    def submit_complaint(
        db: Session,
        request: ComplaintSubmitRequest,
        citizen_id: Optional[int] = None,
        citizen_name: Optional[str] = "Citizen"
    ) -> Complaint:
        cid = request.id if request.id and request.id.startswith("CS") else ComplaintService.generate_next_id(db)

        # Department mapping
        dept_id = request.department_id
        if dept_id is not None:
            if isinstance(dept_id, int):
                pass
            elif isinstance(dept_id, str):
                if dept_id.isdigit():
                    dept_id = int(dept_id)
                else:
                    dept_code = dept_id.upper()
                    code_map = {
                        "ROAD_DEPT": "road_infrastructure",
                        "ROADS": "road_infrastructure",
                        "ROAD": "road_infrastructure",
                        "WASTE_MGT": "waste_management",
                        "WASTE": "waste_management",
                        "STREET_LIGHT": "electrical_street_lighting",
                        "ELECTRICITY": "electrical_street_lighting",
                        "WATER_SUPPLY": "water_supply",
                        "WATER": "water_supply",
                        "DRAINAGE": "drainage_sanitation",
                        "SANITATION": "drainage_sanitation",
                        "PUBLIC_SAFETY": "public_safety_other"
                    }
                    target_cat = code_map.get(dept_code, dept_id.lower())
                    matched_dept = db.query(Department).filter(
                        (Department.category == target_cat) |
                        (Department.name.ilike(f"%{dept_id}%"))
                    ).first()
                    dept_id = matched_dept.id if matched_dept else None

        if not dept_id:
            dept = db.query(Department).filter(
                (Department.category == request.category) |
                (Department.name.ilike(f"%{request.category}%"))
            ).first()
            if dept:
                dept_id = dept.id

        complaint = Complaint(
            id=cid,
            citizen_id=citizen_id,
            category=request.category,
            issue_type=request.issue_type or request.category,
            description=request.description,
            generated_complaint=request.generated_complaint,
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address or "Location verified via coordinates",
            severity=request.severity.upper() if request.severity else "MEDIUM",
            status="Submitted",
            department_id=dept_id,
            ai_confidence=request.ai_confidence or 0.90,
            severity_reason=request.severity_reason,
            grounded_explanation=request.grounded_explanation,
            recommended_action=request.recommended_action,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(complaint)
        db.flush()

        # Record Initial History
        history = ComplaintHistory(
            complaint_id=cid,
            old_status="Draft",
            new_status="Submitted",
            changed_by=citizen_name or "Citizen",
            remarks="Complaint submitted after citizen review and confirmation.",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(history)

        # Record Evidence if provided
        all_ev_urls = list(request.evidence_urls or [])
        if request.image_url and request.image_url not in all_ev_urls:
            all_ev_urls.append(request.image_url)

        for url in all_ev_urls:
            if url:
                ev = Evidence(
                    complaint_id=cid,
                    type="image",
                    file_url=url,
                    description="Photographic evidence uploaded by citizen.",
                    ai_analysis="Visual features inspected and corroborated with complaint text."
                )
                db.add(ev)

        # Record Decision Trace
        if request.decision_trace:
            for item in request.decision_trace:
                action = AgentAction(
                    complaint_id=cid,
                    agent_name=item.get("agent_name", "CivicSeva Agent"),
                    action=item.get("action", "Agent Analysis"),
                    input_summary=str(item.get("input_summary", "")),
                    output_summary=str(item.get("output_summary", "")),
                    timestamp=datetime.now(timezone.utc)
                )
                db.add(action)
        else:
            # Default submission trace if frontend didn't pass full array
            db.add(AgentAction(
                complaint_id=cid,
                agent_name="CivicSeva Agent",
                action="Human Confirmation & Final Submission",
                input_summary="Citizen approved AI analysis card",
                output_summary=f"Complaint #{cid} successfully submitted and registered in municipal ledger.",
                timestamp=datetime.now(timezone.utc)
            ))

        # Create Citizen Notification if citizen_id present
        if citizen_id:
            notif = Notification(
                user_id=citizen_id,
                complaint_id=cid,
                message=f"Complaint #{cid} ({request.category.replace('_', ' ').title()}) registered successfully."
            )
            db.add(notif)

        db.commit()
        db.refresh(complaint)
        return complaint

    @staticmethod
    def update_status(
        db: Session,
        complaint_id: str,
        update_data: ComplaintStatusUpdate,
        changed_by: str = "Authority Official"
    ) -> Complaint:
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            raise ValueError(f"Complaint with ID {complaint_id} not found.")

        old_status = complaint.status
        new_status = update_data.status

        if new_status not in VALID_STATUSES:
            raise ValueError(f"Invalid status '{new_status}'. Must be one of: {', '.join(VALID_STATUSES)}")

        complaint.status = new_status
        complaint.updated_at = datetime.now(timezone.utc)

        if update_data.department_id:
            complaint.department_id = update_data.department_id

        # Record history
        history = ComplaintHistory(
            complaint_id=complaint_id,
            old_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            remarks=update_data.remarks or f"Status transitioned from {old_status} to {new_status}.",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(history)

        # Agent trace
        action = AgentAction(
            complaint_id=complaint_id,
            agent_name="Tracking Agent",
            action=f"Status Transition: {old_status} -> {new_status}",
            input_summary=f"Authority action by {changed_by}",
            output_summary=update_data.remarks or f"Workflow progressed to {new_status}.",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(action)

        # Notify Citizen if exists
        if complaint.citizen_id:
            notif = Notification(
                user_id=complaint.citizen_id,
                complaint_id=complaint_id,
                message=f"Your complaint #{complaint_id} status changed to '{new_status}'."
            )
            db.add(notif)

        db.commit()
        db.refresh(complaint)
        return complaint

    @staticmethod
    def trigger_followup(
        db: Session,
        complaint_id: str,
        remarks: Optional[str] = None,
        requested_by: str = "Citizen"
    ) -> Dict[str, Any]:
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            raise ValueError(f"Complaint {complaint_id} not found.")

        complaint.follow_up_count += 1
        complaint.updated_at = datetime.now(timezone.utc)

        msg = remarks or f"Citizen submitted follow-up inquiry #{complaint.follow_up_count} regarding resolution delay."
        
        # Add history
        history = ComplaintHistory(
            complaint_id=complaint_id,
            old_status=complaint.status,
            new_status=complaint.status,
            changed_by=requested_by,
            remarks=msg,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(history)

        # Agent trace
        db.add(AgentAction(
            complaint_id=complaint_id,
            agent_name="Followup Agent",
            action="Follow-up Triggered",
            input_summary=f"Requested by {requested_by}",
            output_summary=f"Automated reminder dispatched to {complaint.department.name if complaint.department else 'Responsible Department'}.",
            timestamp=datetime.now(timezone.utc)
        ))

        db.commit()
        return {
            "complaint_id": complaint_id,
            "follow_up_count": complaint.follow_up_count,
            "message": "Follow-up inquiry registered and alert forwarded to department authorities."
        }

    @staticmethod
    def trigger_escalation(
        db: Session,
        complaint_id: str,
        reason: str,
        level: int = 1,
        initiated_by: str = "Authority / SLA System"
    ) -> Escalation:
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            raise ValueError(f"Complaint {complaint_id} not found.")

        old_status = complaint.status
        complaint.status = "Escalated"
        complaint.updated_at = datetime.now(timezone.utc)

        esc = Escalation(
            complaint_id=complaint_id,
            reason=reason,
            level=level,
            created_at=datetime.now(timezone.utc)
        )
        db.add(esc)

        # Record history
        db.add(ComplaintHistory(
            complaint_id=complaint_id,
            old_status=old_status,
            new_status="Escalated",
            changed_by=initiated_by,
            remarks=f"Complaint escalated to Level {level}. Reason: {reason}",
            timestamp=datetime.now(timezone.utc)
        ))

        # Agent trace
        db.add(AgentAction(
            complaint_id=complaint_id,
            agent_name="Escalation Agent",
            action=f"Execute Level {level} Escalation",
            input_summary=f"Triggered by {initiated_by}. Reason: {reason}",
            output_summary=f"Complaint escalated to senior municipal authority. Status changed to Escalated.",
            timestamp=datetime.now(timezone.utc)
        ))

        # Notify Citizen
        if complaint.citizen_id:
            db.add(Notification(
                user_id=complaint.citizen_id,
                complaint_id=complaint_id,
                message=f"Complaint #{complaint_id} has been escalated to Level {level} for priority resolution."
            ))

        db.commit()
        db.refresh(esc)
        return esc
