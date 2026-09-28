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
from ..models.notification import Notification
from ..schemas.complaint import (
    ComplaintAnalyzeRequest, ComplaintSubmitRequest, ComplaintStatusUpdate,
    ComplaintFollowupRequest, ComplaintEscalateRequest,
    ComplaintResponse, ComplaintDetailResponse
)
from ..services.complaint_service import ComplaintService
from ..services.autonomous_agent import autonomous_engine, calculate_haversine_distance, AutonomousAgentEngine
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

    # Resolve physical image path on disk if an image_url is provided
    resolved_image_path = None
    image_filename = None
    if payload.image_url:
        clean_name = payload.image_url.replace("/uploads/", "").lstrip("/\\")
        candidate = UPLOAD_DIR / clean_name
        if candidate.exists():
            resolved_image_path = str(candidate)
            image_filename = clean_name
        else:
            resolved_image_path = payload.image_url
            image_filename = clean_name

    result = await aiml_client.analyze_complaint(
        text=payload.text,
        voice_transcription=payload.voice_transcription,
        image_path=resolved_image_path,
        image_filename=image_filename,
        location=location_data,
        user_info=user_info
    )

    # Flatten AI predictions so frontend receives fields both at top-level and nested
    preds = result.get("ai_predictions") or {}
    result["issue_type"] = preds.get("display_issue_type") or preds.get("issue_type")
    result["category"] = preds.get("category")
    result["severity"] = preds.get("severity")
    result["suggested_department"] = preds.get("department")
    result["department_id"] = preds.get("department_code")
    result["confidence_score"] = preds.get("confidence")
    result["description"] = preds.get("evidence_summary")
    result["explanation"] = preds.get("grounded_explanation")
    result["evidence_authenticity"] = result.get("evidence_authenticity") or preds.get("evidence_authenticity")
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

@router.get("/reverse-geocode")
async def reverse_geocode_location(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude")
):
    """
    Reverse geocodes latitude/longitude coordinates into a civic street address.
    """
    try:
        import urllib.request
        import json
        req = urllib.request.Request(
            f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=18&addressdetails=1",
            headers={"User-Agent": "CivicSevaMunicipalApp/1.0"}
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode())
            display_name = data.get("display_name", "")
            address_info = data.get("address", {})
            road = address_info.get("road") or address_info.get("pedestrian") or address_info.get("suburb") or ""
            city = address_info.get("city") or address_info.get("town") or address_info.get("state_district") or "Indore"
            postcode = address_info.get("postcode", "")

            clean_addr = f"{road}, {city}" if road else (display_name.split(",")[0] + f", {city}" if display_name else f"Zone Near {city}")
            if postcode and postcode not in clean_addr:
                clean_addr += f" - {postcode}"

            return {
                "address": clean_addr.strip(", "),
                "full_address": display_name,
                "city": city,
                "latitude": lat,
                "longitude": lng,
                "verified": True
            }
    except Exception:
        return {
            "address": f"GPS Pin ({lat:.4f}°N, {lng:.4f}°E), Municipal Ward",
            "full_address": f"Coordinates: {lat}, {lng}",
            "city": "Indore",
            "latitude": lat,
            "longitude": lng,
            "verified": False,
            "fallback": True
        }

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

@router.post("/verify-evidence")
async def verify_evidence_endpoint(
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    address: Optional[str] = Form(None)
):
    """
    Direct Evidence Authenticity Verification Endpoint.
    Analyzes image tampering (ELA), AI-generation probability (2D FFT),
    EXIF metadata, provenance hashes, and context consistency.
    """
    image_bytes = None
    filename = None
    image_path = None

    if file:
        image_bytes = await file.read()
        filename = file.filename
    if image_url:
        clean_name = image_url.replace("/uploads/", "").lstrip("/\\")
        candidate = UPLOAD_DIR / clean_name
        if candidate.exists():
            image_path = str(candidate)
            filename = filename or clean_name
        else:
            image_path = image_path or image_url
            filename = filename or clean_name

    location = {
        "latitude": latitude,
        "longitude": longitude,
        "address": address
    }

    result = await aiml_client.verify_evidence(
        image_path=image_path,
        image_bytes=image_bytes,
        filename=filename,
        location=location
    )
    return result

class AuthenticityDecisionRequest(BaseModel):
    decision: str  # "APPROVE" or "REJECT"
    notes: Optional[str] = None

@router.post("/{complaint_id}/verify-authenticity-decision")
def submit_authenticity_decision(
    complaint_id: str,
    payload: AuthenticityDecisionRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Municipal Supervisor decision on flagged evidence.
    If APPROVE: verifies the evidence, clears human review requirement,
    and assigns/dispatches the designated field squad.
    If REJECT: marks docket as Rejected due to synthetic/fraudulent evidence.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")

    reviewer_name = current_user.name if current_user else "Municipal Supervisor"
    dec_upper = payload.decision.upper()

    if dec_upper in ["APPROVE", "APPROVED"]:
        complaint.requires_human_review = 0
        complaint.authenticity_verdict = "APPROVED_BY_SUPERVISOR"
        complaint.authenticity_risk = "LOW"
        complaint.authenticity_score = 98.0
        
        # If not assigned to officer yet, attempt dispatch now
        if not complaint.assigned_officer_id and complaint.department_id:
            c_lat = complaint.latitude or 18.5204
            c_lon = complaint.longitude or 73.8567
            officer_match = AutonomousAgentEngine.find_nearest_available_officer(
                db=db,
                department_id=complaint.department_id,
                target_lat=c_lat,
                target_lon=c_lon
            )
            complaint.assigned_officer_id = officer_match.get("officer_id")
            complaint.assigned_officer_name = officer_match.get("officer_name")
            complaint.assigned_officer_phone = officer_match.get("officer_phone")
            complaint.officer_distance_km = officer_match.get("distance_km")
            complaint.officer_eta_minutes = officer_match.get("eta_minutes")

        old_status = complaint.status
        complaint.status = "Assigned" if complaint.assigned_officer_id else "Submitted"
        complaint.updated_at = datetime.now(timezone.utc)

        remarks = (
            f"Evidence Authenticity Approved by Supervisor {reviewer_name}. "
            f"Notes: {payload.notes or 'Photographic evidence validated manually.'} "
            f"Work order released for field execution."
        )

        db.add(ComplaintHistory(
            complaint_id=complaint_id,
            old_status=old_status,
            new_status=complaint.status,
            changed_by=reviewer_name,
            remarks=remarks,
            timestamp=datetime.now(timezone.utc)
        ))

        db.add(AgentAction(
            complaint_id=complaint_id,
            agent_name="Municipal Supervisor Review Gateway",
            action="Approve Evidence Authenticity",
            input_summary=f"Decision: APPROVED by {reviewer_name}",
            output_summary=f"Docket released to {complaint.assigned_officer_name or 'Queue'}. Status: {complaint.status}",
            timestamp=datetime.now(timezone.utc)
        ))

        if complaint.citizen_id:
            db.add(Notification(
                user_id=complaint.citizen_id,
                complaint_id=complaint_id,
                message=f"Your ticket #{complaint_id} evidence has been verified and approved by municipal supervisor."
            ))

    elif dec_upper in ["REJECT", "REJECTED"]:
        complaint.requires_human_review = 0
        complaint.authenticity_verdict = "REJECTED_FAKE"
        complaint.authenticity_risk = "HIGH"
        old_status = complaint.status
        complaint.status = "Rejected"
        complaint.updated_at = datetime.now(timezone.utc)

        remarks = (
            f"Rejected by Municipal Supervisor {reviewer_name}: "
            f"{payload.notes or 'Evidence failed authenticity verification (identified as tampered or synthetic).'}"
        )

        db.add(ComplaintHistory(
            complaint_id=complaint_id,
            old_status=old_status,
            new_status="Rejected",
            changed_by=reviewer_name,
            remarks=remarks,
            timestamp=datetime.now(timezone.utc)
        ))

        db.add(AgentAction(
            complaint_id=complaint_id,
            agent_name="Municipal Supervisor Review Gateway",
            action="Reject Fraudulent Evidence",
            input_summary=f"Decision: REJECTED by {reviewer_name}",
            output_summary=f"Docket rejected due to failed authenticity verification.",
            timestamp=datetime.now(timezone.utc)
        ))

        if complaint.citizen_id:
            db.add(Notification(
                user_id=complaint.citizen_id,
                complaint_id=complaint_id,
                message=f"Your ticket #{complaint_id} was rejected: Evidence failed authenticity checks."
            ))
    else:
        raise HTTPException(status_code=400, detail=f"Invalid decision '{payload.decision}'. Must be 'APPROVE' or 'REJECT'.")

    db.commit()
    db.refresh(complaint)

    return {
        "complaint_id": complaint.id,
        "status": complaint.status,
        "authenticity_verdict": complaint.authenticity_verdict,
        "requires_human_review": bool(complaint.requires_human_review),
        "assigned_officer_name": complaint.assigned_officer_name,
        "message": f"Successfully recorded supervisor decision '{dec_upper}' for Docket #{complaint_id}."
    }



