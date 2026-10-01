"""
Complaints API Endpoints
"""

from typing import List, Optional
import io
import shutil
import secrets
from pathlib import Path
from pydantic import BaseModel
from datetime import date, datetime, timezone
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
from ..models.location_intelligence import LocationIntelligence
from ..schemas.complaint import (
    ComplaintAnalyzeRequest, ComplaintSubmitRequest, ComplaintStatusUpdate,
    ComplaintFollowupRequest, ComplaintEscalateRequest,
    ComplaintResponse, ComplaintDetailResponse
)
from ..services.complaint_service import ComplaintService
from ..services.field_workload import daily_assignment_limit_for_distance
from ..services.autonomous_agent import autonomous_engine, calculate_haversine_distance, AutonomousAgentEngine
from ..services.aiml_client import aiml_client
from ..middleware.auth_middleware import get_current_user, get_optional_user, require_roles
from ..services.resolution_service import (
    process_resolution_submission,
    get_resolution_verification,
    confirm_resolution,
    reopen_resolution
)
from ..services.duplicate_service import (
    find_duplicate_candidates,
    check_pre_submission_duplicates
)
from ..services.clustering_service import (
    get_complaint_cluster_info,
    get_all_active_clusters,
    cluster_unassigned_complaints
)
from ..services.location_service import (
    extract_and_enrich_location,
    get_location_intelligence
)
from ..services.department_routing_service import (
    recommend_department,
    apply_supervisor_routing_override,
    get_department_workload_metrics
)
from ..services.evidence_grounding_service import (
    compile_full_audit_trace,
    get_complaint_decision_evidence
)
from ..services.sla_prediction_service import (
    compute_sla_prediction,
    get_complaint_sla_prediction
)
from ..services.watchdog_service import (
    run_watchdog_sweep,
    get_watchdog_events_for_complaint,
    get_all_recent_watchdog_events,
    mark_watchdog_action_taken
)

# Request Models for New Civic AI Features
class CheckDuplicatesRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class DepartmentOverrideRequest(BaseModel):
    department_code: str
    supervisor_notes: Optional[str] = None

class ResolutionConfirmRequest(BaseModel):
    remarks: Optional[str] = None

class ResolutionReopenRequest(BaseModel):
    reason: str

class WatchdogActionRequest(BaseModel):
    notes: str

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
    _attach_master_summary(db, complaint, resp)
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
    complaint_ids = [complaint.id for complaint in complaints]
    location_records = {
        item.complaint_id: item
        for item in db.query(LocationIntelligence).filter(LocationIntelligence.complaint_id.in_(complaint_ids)).all()
    } if complaint_ids else {}

    result = []
    for c in complaints:
        item = ComplaintResponse.model_validate(c)
        if c.department:
            item.department_name = c.department.name
        _attach_master_summary(db, c, item)
        location = location_records.get(c.id)
        if location:
            item.landmark = location.landmark
            item.area = location.area
            item.ward = location.ward
        result.append(item)
    return result

def _attach_master_summary(db: Session, complaint: Complaint, response: ComplaintResponse) -> None:
    if not complaint.cluster_id:
        response.master_grievance_id = complaint.id
        return
    from ..services.clustering_service import ClusteringService
    master = ClusteringService.get_cluster_details(db, complaint.cluster_id)
    if master:
        response.master_grievance_id = master["master_grievance_id"]
        response.report_count = master["report_count"]
        response.reporter_count = master["reporter_count"]
        response.show_report_count = master["show_report_count"]
        response.master_category = master["category"]
        response.master_issue_type = master["issue_type"]
        response.master_department_id = master.get("department_id")
        response.master_department_name = master.get("department_name")
        response.master_status = master.get("status")
        response.master_severity = master.get("severity")
        response.master_reports = master.get("members", [])
        response.grouping_reasons = master.get("grouping_reasons", [])
    else:
        # Historical/demo cluster_id values were sometimes routing labels, not
        # parent records. Treat those reports independently until validated.
        response.master_grievance_id = complaint.id

# =========================================================================
# FEATURE 2: PRE-SUBMISSION DUPLICATE DETECTION
# =========================================================================
@router.post("/check-duplicates")
def api_check_pre_submission_duplicates(payload: CheckDuplicatesRequest, db: Session = Depends(get_db)):
    """Pre-submission check to warn citizens of potential nearby duplicate complaints."""
    return check_pre_submission_duplicates(
        db=db,
        title=payload.title,
        description=payload.description or "",
        category=payload.category,
        lat=payload.latitude,
        lon=payload.longitude
    )

# =========================================================================
# FEATURE 3: COMPLAINT CLUSTERING (COLLECTION-LEVEL)
# =========================================================================
@router.get("/clusters")
def api_get_all_clusters(db: Session = Depends(get_db)):
    """Returns all active geographic/topical complaint clusters."""
    return get_all_active_clusters(db)

@router.post("/clusters/sweep")
def api_run_cluster_sweep(db: Session = Depends(get_db)):
    """Runs a clustering sweep across active complaints."""
    return cluster_unassigned_complaints(db)

@router.get("/clusters/hotspot/{complaint_id}")
def api_get_hierarchical_hotspot(complaint_id: str, db: Session = Depends(get_db)):
    """
    Returns hierarchical hotspot data for a complaint:
    location → category → issue type → cluster → report count + priority impact.
    """
    from ..services.location_service import get_location_intelligence
    from ..services.duplicate_service import compute_haversine_meters

    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")

    # Get location intelligence
    loc = get_location_intelligence(db, complaint.id)
    ward = (loc or {}).get("ward", "Unknown")
    zone = (loc or {}).get("zone", "Unknown")
    area = (loc or {}).get("area", "")
    landmark = (loc or {}).get("landmark", "")
    street = (loc or {}).get("street", "")
    lat = complaint.latitude
    lon = complaint.longitude

    # Find all complaints strictly within 150m radius of this complaint
    nearby_complaints = []
    all_complaints = db.query(Complaint).filter(
        Complaint.status.notin_(["Rejected"])
    ).all()

    for c in all_complaints:
        if c.id == complaint.id:
            nearby_complaints.append((c, 0.0))
        elif lat and lon and c.latitude and c.longitude:
            dist = compute_haversine_meters(lat, lon, c.latitude, c.longitude)
            if dist <= 150.0:
                nearby_complaints.append((c, round(dist, 1)))

    # Sort nearby complaints by distance ascending (closest first)
    nearby_complaints.sort(key=lambda x: x[1])

    # Group into folders (categories)
    # Only categories that have at least 1 complaint are included!
    folder_dict = {}
    for c, d in nearby_complaints:
        cat = (c.category or "other").lower()
        if any(k in cat for k in ["road", "pothole"]):
            folder_name = "Roads & Potholes"
        elif any(k in cat for k in ["sanitat", "waste", "garbage"]):
            folder_name = "Sanitation & Waste"
        elif any(k in cat for k in ["drain", "water", "sewer"]):
            folder_name = "Water & Drainage"
        elif any(k in cat for k in ["electr", "light"]):
            folder_name = "Electrical & Lighting"
        elif any(k in cat for k in ["horticult", "tree", "garden"]):
            folder_name = "Horticulture & Trees"
        else:
            folder_name = "Other Civic Defects"

        if folder_name not in folder_dict:
            folder_dict[folder_name] = []

        raw_issue = (c.issue_type or c.category or "Defect").replace("_", " ").title()
        short_desc = (c.description or "").strip()
        if len(short_desc) > 65:
            short_desc = short_desc[:62] + "..."

        folder_dict[folder_name].append({
            "id": c.id,
            "category": c.category,
            "issue_type": raw_issue,
            "description": short_desc,
            "severity": c.severity,
            "status": c.status,
            "cluster_id": c.cluster_id,
            "distance_meters": d,
            "is_current": c.id == complaint.id,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })

    folders = []
    for fname, items in folder_dict.items():
        folders.append({
            "folder_name": fname,
            "complaint_count": len(items),
            "complaints": items
        })

    # Sort folders by count descending
    folders.sort(key=lambda x: x["complaint_count"], reverse=True)

    # Priority boost calculation based on 150m radius density
    report_count = len(nearby_complaints)
    if report_count >= 10:
        priority_label = "CRITICAL"
        priority_boost = "+Critical (mass cluster within 150m)"
    elif report_count >= 5:
        priority_label = "VERY_HIGH"
        priority_boost = "+Very High (dense cluster within 150m)"
    elif report_count >= 3:
        priority_label = "HIGH"
        priority_boost = "+High (multiple reports within 150m)"
    elif report_count >= 2:
        priority_label = "MODERATE"
        priority_boost = "+Moderate (cluster within 150m)"
    else:
        priority_label = "NORMAL"
        priority_boost = "Normal (isolated report)"

    priority_factors = [
        f"{report_count} incident reports within 150m radius",
        f"Location hotspot: {street or landmark or ward}"
    ]
    if complaint.severity in ["HIGH", "CRITICAL"]:
        priority_factors.append(f"Base severity is {complaint.severity}")

    # Check SLA
    from ..models.sla_prediction import SLAPrediction
    sla_rec = db.query(SLAPrediction).filter(SLAPrediction.complaint_id == complaint.id).first()
    if sla_rec and sla_rec.risk_status in ["BREACHED", "HIGH_RISK"]:
        priority_factors.append(f"SLA status: {sla_rec.risk_status}")

    # Current cluster for this complaint
    this_cluster = None
    if complaint.cluster_id:
        from ..models.complaint_cluster import ComplaintCluster
        cl = db.query(ComplaintCluster).filter(ComplaintCluster.id == complaint.cluster_id).first()
        if cl:
            this_cluster = {
                "cluster_id": cl.id,
                "complaint_count": cl.complaint_count,
                "category": cl.category,
                "severity": cl.severity
            }

    return {
        "complaint_id": complaint.id,
        "radius_meters": 150,
        "total_nearby_count": report_count,
        "ward": ward,
        "zone": zone,
        "area": area,
        "landmark": landmark,
        "street": street,
        "latitude": lat,
        "longitude": lon,
        "address": complaint.address,
        "folders": folders,
        "categories": folders,  # backwards compatibility
        "this_cluster": this_cluster,
        "priority_boost": {
            "label": priority_label,
            "description": priority_boost,
            "report_count": report_count,
            "factors": priority_factors
        }
    }

# =========================================================================
# FEATURE 5: DEPARTMENT WORKLOAD METRICS
# =========================================================================
@router.get("/departments/workload")
def api_get_department_workloads(db: Session = Depends(get_db)):
    """Returns real-time capacity and active ticket backlog for all departments."""
    return get_department_workload_metrics(db)

# =========================================================================
# FEATURE 8: PROACTIVE AI WATCHDOG (COLLECTION-LEVEL)
# =========================================================================
@router.get("/watchdog/sweep")
@router.post("/watchdog/sweep")
def api_run_watchdog_sweep(db: Session = Depends(get_db)):
    """Executes a proactive watchdog sweep across all active municipal tickets."""
    return run_watchdog_sweep(db)

@router.get("/watchdog/events")
def api_get_all_watchdog_events(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieves system-wide watchdog events and stall alerts."""
    return get_all_recent_watchdog_events(db, limit=limit)

@router.post("/watchdog/events/{event_id}/action")
def api_mark_watchdog_action(event_id: int, payload: WatchdogActionRequest, db: Session = Depends(get_db)):
    """Marks intervention action taken on a watchdog event."""
    try:
        return mark_watchdog_action_taken(db, event_id, payload.notes)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{complaint_id}", response_model=ComplaintDetailResponse)
def get_complaint_detail(complaint_id: str, db: Session = Depends(get_db)):
    """
    Returns full complaint dossier including attached evidence, status transitions,
    agent action trace, and escalations.
    """
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' does not exist."
        )

    resp = ComplaintDetailResponse.model_validate(complaint)
    if complaint.department:
        resp.department_name = complaint.department.name
    _attach_master_summary(db, complaint, resp)
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
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")

    officer = db.query(Officer).filter(Officer.id == payload.officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail=f"Officer #{payload.officer_id} not found.")
    if complaint.department_id is not None and officer.department_id != complaint.department_id:
        responsible_department = complaint.department.name if complaint.department else f"department #{complaint.department_id}"
        raise HTTPException(
            status_code=409,
            detail=f"{officer.name} belongs to {officer.department.name if officer.department else 'a different department'}; this work order belongs to {responsible_department}. Assign it to a crew in the responsible department."
        )

    today = date.today().isoformat()
    if officer.daily_assignment_date != today:
        officer.daily_assignment_date = today
        officer.daily_assignment_count = 0
    is_new_assignment = complaint.assigned_officer_id != officer.id
    c_lat = complaint.latitude or 18.5204
    c_lon = complaint.longitude or 73.8567
    dist_km = calculate_haversine_distance(c_lat, c_lon, officer.current_lat, officer.current_lon)
    daily_limit = daily_assignment_limit_for_distance(dist_km)
    if is_new_assignment and officer.daily_assignment_count >= daily_limit:
        raise HTTPException(
            status_code=409,
            detail=f"{officer.name} has reached today's distance-adjusted limit of {daily_limit} work orders for a {dist_km:.1f} km route (maximum 12). This report remains queued for tomorrow or another available crew."
        )

    transit_mins = int((dist_km / 22.0) * 60)
    eta_mins = max(6, transit_mins + 4)

    old_officer_name = complaint.assigned_officer_name or "Unassigned"
    if is_new_assignment and complaint.assigned_officer_id:
        previous_officer = db.query(Officer).filter(Officer.id == complaint.assigned_officer_id).first()
        if previous_officer:
            previous_officer.active_tickets = max(0, (previous_officer.active_tickets or 0) - 1)
    complaint.assigned_officer_id = officer.id
    complaint.assigned_officer_name = officer.name
    complaint.assigned_officer_phone = officer.phone
    complaint.officer_distance_km = round(dist_km, 2)
    complaint.officer_eta_minutes = eta_mins

    if complaint.status in ["Submitted", "Draft"]:
        complaint.status = "Assigned"

    if is_new_assignment:
        officer.daily_assignment_count = (officer.daily_assignment_count or 0) + 1
        officer.daily_assignment_date = today
        officer.active_tickets = (officer.active_tickets or 0) + 1
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
    complaint = ComplaintService.find_complaint(db, complaint_id)
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

        # Notify citizen who submitted the report that it was detected as fake
        target_uids = set()
        if complaint.citizen_id:
            target_uids.add(complaint.citizen_id)
        # Always include user 1 (the primary demo citizen account) to ensure notification bell reflects it
        target_uids.add(1)

        notification_msg = (
            f"Your report for Docket #{complaint_id} was rejected by the Municipal Authority: "
            f"Submitted photographic evidence failed digital authenticity checks and was detected as fake or synthetic media."
        )

        for uid in target_uids:
            user_exists = db.query(User).filter(User.id == uid).first()
            if user_exists:
                db.add(Notification(
                    user_id=uid,
                    complaint_id=complaint_id,
                    message=notification_msg
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

# =========================================================================
# FEATURE 1: RESOLUTION VERIFICATION
# =========================================================================
@router.post("/{complaint_id}/resolution-evidence")
async def api_submit_resolution_evidence(
    complaint_id: str,
    file: UploadFile = File(...),
    remarks: Optional[str] = Form(None),
    officer_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """Submits on-site completion proof photo and triggers automated before/after AI verification."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")

    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    file_ext = Path(file.filename or "").suffix.lower()
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"} or file_ext not in allowed_extensions:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, or WebP completion photo.")

    photo_bytes = await file.read()
    if not photo_bytes:
        raise HTTPException(status_code=400, detail="The completion photo is empty.")
    if len(photo_bytes) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Completion photos must be 12 MB or smaller.")
    try:
        from PIL import Image
        with Image.open(io.BytesIO(photo_bytes)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("unsupported image format")
            image.verify()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid JPG, PNG, or WebP image.") from exc

    # Use a server-generated name so uploaded filenames cannot escape the evidence directory.
    unique_name = f"resolution_{complaint.id}_{secrets.token_hex(8)}{file_ext}"
    dest_path = UPLOAD_DIR / unique_name
    with open(dest_path, "wb") as buffer:
        buffer.write(photo_bytes)

    file_url = f"/uploads/{unique_name}"
    try:
        return await process_resolution_submission(
            db=db,
            complaint=complaint,
            after_file_path=str(dest_path),
            after_file_url=file_url,
            officer_id=officer_id,
            officer_notes=remarks
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resolution verification failed: {str(e)}")

@router.get("/{complaint_id}/resolution-verification")
def api_get_resolution_verification(complaint_id: str, db: Session = Depends(get_db)):
    """Retrieves verification record, confidence score, and before/after comparison."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")
    return get_resolution_verification(db, complaint.id)

@router.post("/{complaint_id}/resolution/confirm")
def api_confirm_resolution(
    complaint_id: str,
    payload: Optional[ResolutionConfirmRequest] = None,
    db: Session = Depends(get_db)
):
    """Supervisor manual confirmation accepting resolution verification."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")
    remarks = payload.remarks if payload else None
    return confirm_resolution(db, complaint.id, remarks=remarks)

@router.post("/{complaint_id}/resolution/reopen")
def api_reopen_resolution(
    complaint_id: str,
    payload: ResolutionReopenRequest,
    db: Session = Depends(get_db)
):
    """Reopens ticket if resolution proof is rejected."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")
    return reopen_resolution(db, complaint.id, reason=payload.reason)

# =========================================================================
# FEATURE 2: DUPLICATE COMPLAINT DETECTION (PER COMPLAINT)
# =========================================================================
@router.get("/{complaint_id}/duplicates")
def api_get_duplicates(complaint_id: str, db: Session = Depends(get_db)):
    """Evaluates multi-signal duplicate candidates for this complaint."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")
    return find_duplicate_candidates(db, complaint)

# =========================================================================
# FEATURE 3: COMPLAINT CLUSTERING (PER COMPLAINT)
# =========================================================================
@router.get("/{complaint_id}/cluster")
def api_get_complaint_cluster(complaint_id: str, db: Session = Depends(get_db)):
    """Returns cluster membership and master cluster ID (e.g. CL-0001) for this complaint."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")
    return get_complaint_cluster_info(db, complaint.id)

# =========================================================================
# FEATURE 4: LOCATION INTELLIGENCE
# =========================================================================
@router.get("/{complaint_id}/location-intelligence")
def api_get_location_intelligence(complaint_id: str, db: Session = Depends(get_db)):
    """Retrieves enriched Ward, Zone, landmark, and GPS consistency data."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")
    
    loc = get_location_intelligence(db, complaint.id)
    if not loc:
        # Generate on the fly
        loc = extract_and_enrich_location(
            db=db,
            complaint=complaint,
            address=complaint.address,
            lat=complaint.latitude,
            lon=complaint.longitude
        )
    return loc

# =========================================================================
# FEATURE 5: DEPARTMENT RECOMMENDATION & OVERRIDE
# =========================================================================
@router.get("/{complaint_id}/department-recommendation")
def api_get_department_recommendation(complaint_id: str, db: Session = Depends(get_db)):
    """Recommends optimal department based on category, keywords, workload, and jurisdiction."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")
    return recommend_department(db, complaint)

@router.post("/{complaint_id}/department-override")
def api_apply_department_override(
    complaint_id: str,
    payload: DepartmentOverrideRequest,
    db: Session = Depends(get_db)
):
    """Allows municipal supervisor to override department assignment."""
    try:
        return apply_supervisor_routing_override(
            db=db,
            complaint_id=complaint_id,
            new_department_code=payload.department_code,
            supervisor_notes=payload.supervisor_notes
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# =========================================================================
# FEATURE 6: EVIDENCE-GROUNDED AI DECISIONS
# =========================================================================
@router.get("/{complaint_id}/ai-evidence")
def api_get_ai_evidence(complaint_id: str, db: Session = Depends(get_db)):
    """Returns auditable decision trace linking AI conclusions to input evidence."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")
    return compile_full_audit_trace(db, complaint)

# =========================================================================
# FEATURE 7: SLA PREDICTION
# =========================================================================
@router.get("/{complaint_id}/sla-prediction")
def api_get_sla_prediction(complaint_id: str, db: Session = Depends(get_db)):
    """Returns empirical SLA breach probability and expected resolution hours."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")
    return get_complaint_sla_prediction(db, complaint.id)

# =========================================================================
# FEATURE 8: WATCHDOG STATUS (PER COMPLAINT)
# =========================================================================
@router.get("/{complaint_id}/watchdog-status")
def api_get_complaint_watchdog(complaint_id: str, db: Session = Depends(get_db)):
    """Returns watchdog events and active alerts for this specific complaint."""
    complaint = ComplaintService.find_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint #{complaint_id} not found.")
    return get_watchdog_events_for_complaint(db, complaint.id)
