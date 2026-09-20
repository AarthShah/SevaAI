"""
Complaints API Endpoints
"""

from typing import List, Optional
import shutil
from pydantic import BaseModel
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..config import UPLOAD_DIR
from ..database.session import get_db
from ..models.complaint import Complaint
from ..models.complaint_history import ComplaintHistory
from ..models.agent_action import AgentAction
from ..models.officer import Officer
from ..models.user import User
from ..schemas.complaint import (
    ComplaintAnalyzeRequest, ComplaintSubmitRequest, ComplaintStatusUpdate,
    ComplaintFollowupRequest, ComplaintEscalateRequest,
    ComplaintResponse, ComplaintDetailResponse
)
from ..services.complaint_service import ComplaintService
from ..services.autonomous_agent import autonomous_engine, calculate_haversine_distance
from ..services.aiml_client import aiml_client
from ..middleware.auth_middleware import get_current_user, get_optional_user, require_roles

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

@router.post("/photo-instant-dispatch", status_code=status.HTTP_201_CREATED)
async def photo_instant_dispatch(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    address: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Zero-Click Photo-Only Ingestion:
    Citizen drops or uploads a photo. The system auto-extracts GPS, runs Vision AI,
    auto-resolves department, finds closest unencumbered field officer,
    and commits the municipal docket in 1 step!
    """
    filename = f"dispatch_{int(datetime.now().timestamp())}_{file.filename}"
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    file_url = f"/uploads/{filename}"

    citizen_id = current_user.id if current_user else None
    citizen_name = current_user.name if current_user else "Citizen"

    result = await autonomous_engine.auto_dispatch_complaint(
        db=db,
        text=None,
        voice_transcription=None,
        image_path=file_url,
        address=address or "GPS Coordinates Verified (Auto-Detected)",
        latitude=latitude or 18.5204,
        longitude=longitude or 73.8567,
        citizen_id=citizen_id,
        citizen_name=citizen_name
    )
    return result

@router.post("/auto-dispatch", status_code=status.HTTP_201_CREATED)
async def auto_dispatch_complaint(
    payload: ComplaintAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    1-Click Fully Autonomous Complaint Ingestion and Municipal Work Order Dispatch.
    LLM and vision agents automatically infer category, issue type, severity, and responsible
    department, then immediately assign the ticket to the municipal queue with 0 manual steps.
    """
    citizen_id = current_user.id if current_user else None
    citizen_name = current_user.name if current_user else "Citizen"

    result = await autonomous_engine.auto_dispatch_complaint(
        db=db,
        text=payload.text,
        voice_transcription=payload.voice_transcription,
        image_path=payload.image_url,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        citizen_id=citizen_id,
        citizen_name=citizen_name
    )
    return result

@router.post("/analyze")
async def analyze_complaint(
    payload: ComplaintAnalyzeRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Executes the multi-agent AI analysis on complaint inputs without committing.
    Provides the citizen with an analysis card and preview before final submission.
    """
    user_info = None
    if current_user:
        user_info = {"id": current_user.id, "name": current_user.name, "role": current_user.role}

    location_data = {
        "address": payload.address or "Location verified via GPS / Map selection",
        "latitude": payload.latitude,
        "longitude": payload.longitude
    }

    result = await aiml_client.analyze_complaint(
        text=payload.text,
        voice_transcription=payload.voice_transcription,
        image_path=payload.image_url,
        image_filename=payload.image_url.split("/")[-1] if payload.image_url else None,
        location=location_data,
        user_info=user_info
    )
    return result

@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def submit_complaint(
    payload: ComplaintSubmitRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Registers a confirmed complaint into the municipal database with audit traces and notifications.
    """
    citizen_id = current_user.id if current_user else None
    citizen_name = current_user.name if current_user else "Citizen"

    complaint = ComplaintService.submit_complaint(
        db=db,
        request=payload,
        citizen_id=citizen_id,
        citizen_name=citizen_name
    )

    # Attach department name for response
    resp = ComplaintResponse.model_validate(complaint)
    if complaint.department:
        resp.department_name = complaint.department.name
    return resp

@router.get("", response_model=List[ComplaintResponse])
def get_complaints(
    status: Optional[str] = Query(None, description="Filter by complaint status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    citizen_id: Optional[int] = Query(None, description="Filter by citizen ID"),
    search: Optional[str] = Query(None, description="Search keyword in description or ID"),
    db: Session = Depends(get_db)
):
    """
    Lists complaints with optional filtering by status, category, severity, or citizen.
    """
    query = db.query(Complaint)

    if status and status != "All":
        query = query.filter(Complaint.status == status)
    if category and category != "All":
        query = query.filter(Complaint.category == category)
    if severity and severity != "All":
        query = query.filter(Complaint.severity == severity.upper())
    if department_id:
        query = query.filter(Complaint.department_id == department_id)
    if citizen_id:
        query = query.filter(Complaint.citizen_id == citizen_id)
    if search:
        s = f"%{search}%"
        query = query.filter((Complaint.description.ilike(s)) | (Complaint.id.ilike(s)) | (Complaint.address.ilike(s)))

    complaints = query.order_by(desc(Complaint.created_at)).all()

    result = []
    for c in complaints:
        item = ComplaintResponse.model_validate(c)
        if c.department:
            item.department_name = c.department.name
        result.append(item)
    return result

@router.get("/{complaint_id}", response_model=ComplaintDetailResponse)
def get_complaint_detail(complaint_id: str, db: Session = Depends(get_db)):
    """
    Returns full complaint dossier including attached evidence, status transitions,
    agent action trace, and escalations.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' does not exist."
        )

    resp = ComplaintDetailResponse.model_validate(complaint)
    if complaint.department:
        resp.department_name = complaint.department.name
    return resp

@router.patch("/{complaint_id}/status", response_model=ComplaintDetailResponse)
def update_complaint_status(
    complaint_id: str,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Transitions complaint status (Authority/Admin action) with remarks and audit history.
    """
    changed_by = current_user.name if current_user else "Authorized Officer"
    try:
        updated = ComplaintService.update_status(
            db=db,
            complaint_id=complaint_id,
            update_data=payload,
            changed_by=changed_by
        )
        resp = ComplaintDetailResponse.model_validate(updated)
        if updated.department:
            resp.department_name = updated.department.name
        return resp
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{complaint_id}/follow-up")
def follow_up_complaint(
    complaint_id: str,
    payload: ComplaintFollowupRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Citizen/User triggered follow-up on delayed complaint resolution.
    """
    requested_by = current_user.name if current_user else "Citizen"
    try:
        result = ComplaintService.trigger_followup(
            db=db,
            complaint_id=complaint_id,
            remarks=payload.remarks,
            requested_by=requested_by
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/{complaint_id}/escalate")
def escalate_complaint(
    complaint_id: str,
    payload: ComplaintEscalateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Escalates an unresolved complaint to higher authority according to predefined rules.
    """
    initiated_by = current_user.name if current_user else "Civic Vigilance Officer"
    try:
        esc = ComplaintService.trigger_escalation(
            db=db,
            complaint_id=complaint_id,
            reason=payload.reason,
            level=payload.level or 1,
            initiated_by=initiated_by
        )
        return {
            "complaint_id": complaint_id,
            "escalation_id": esc.id,
            "level": esc.level,
            "reason": esc.reason,
            "status": "Escalated",
            "message": f"Complaint #{complaint_id} successfully escalated to Level {esc.level} authority."
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/{complaint_id}/auto-inquiry")
def auto_inquire_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Autonomous Status Inquest: The AI agent autonomously composes an official status inquiry
    to the responsible municipal department, logs the inquiry into the audit trace,
    and updates the docket with telemetry acknowledgment.
    """
    requested_by = current_user.name if current_user else "Citizen (Autonomous Watchdog)"
    try:
        result = autonomous_engine.auto_inquire_complaint(
            db=db,
            complaint_id=complaint_id,
            requested_by=requested_by
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

class OfficerAssignRequest(BaseModel):
    officer_id: int
    remarks: Optional[str] = None

@router.post("/{complaint_id}/assign-officer")
def assign_officer_to_complaint(
    complaint_id: str,
    payload: OfficerAssignRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Assigns or re-assigns a specific municipal field officer to a complaint.
    Recalculates proximity distance and ETA, updates ticket status,
    and logs agent decision trace.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")

    officer = db.query(Officer).filter(Officer.id == payload.officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail=f"Officer #{payload.officer_id} not found.")

    c_lat = complaint.latitude or 18.5204
    c_lon = complaint.longitude or 73.8567
    dist_km = calculate_haversine_distance(c_lat, c_lon, officer.current_lat, officer.current_lon)
    transit_mins = int((dist_km / 22.0) * 60)
    eta_mins = max(6, transit_mins + 4)

    old_officer_name = complaint.assigned_officer_name or "Unassigned"
    complaint.assigned_officer_id = officer.id
    complaint.assigned_officer_name = officer.name
    complaint.assigned_officer_phone = officer.phone
    complaint.officer_distance_km = round(dist_km, 2)
    complaint.officer_eta_minutes = eta_mins

    if complaint.status in ["Submitted", "Draft"]:
        complaint.status = "Assigned"

    officer.active_tickets += 1
    if officer.active_tickets >= 3:
        officer.status = "BUSY"
    elif officer.status == "AVAILABLE":
        officer.status = "ON_DUTY"

    assigned_by = current_user.name if current_user else "Municipal Operations Dispatcher"
    remarks = payload.remarks or f"Field assignment assigned to {officer.name} ({dist_km:.1f} km away, ETA {eta_mins}m)."

    db.add(ComplaintHistory(
        complaint_id=complaint_id,
        old_status=complaint.status,
        new_status="Assigned",
        changed_by=assigned_by,
        remarks=remarks,
        timestamp=datetime.now(timezone.utc)
    ))

    db.add(AgentAction(
        complaint_id=complaint_id,
        agent_name="Smart Proximity Dispatch Assistant",
        action=f"Assign Squad: {officer.name}",
        input_summary=f"Reassigned from {old_officer_name} to {officer.name} ({officer.role})",
        output_summary=f"Proximity: {dist_km:.1f} km | ETA: {eta_mins} mins | Phone: {officer.phone}",
        timestamp=datetime.now(timezone.utc)
    ))

    db.commit()
    db.refresh(complaint)

    return {
        "complaint_id": complaint_id,
        "status": complaint.status,
        "assigned_officer": {
            "id": officer.id,
            "name": officer.name,
            "role": officer.role,
            "phone": officer.phone,
            "distance_km": round(dist_km, 2),
            "eta_minutes": eta_mins
        },
        "message": f"Successfully assigned Docket #{complaint_id} to {officer.name}."
    }


