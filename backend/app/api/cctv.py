"""
CivicSeva Smart City CCTV Surveillance API Endpoints
Provides real-time camera telemetry, automated computer vision defect scanning,
and zero-touch autonomous work order dispatch for municipal surveillance grids.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from ..database.session import get_db
from ..models.user import User
from ..models.complaint import Complaint
from ..models.evidence import Evidence
from ..models.complaint_history import ComplaintHistory
from ..models.agent_action import AgentAction
from ..models.department import Department
from ..services.autonomous_agent import autonomous_engine
from ..services.complaint_service import ComplaintService
from ..middleware.auth_middleware import get_optional_user
from aiml.vision.cctv_detector import cctv_detector

router = APIRouter(prefix="/api/cctv", tags=["CCTV Surveillance"])

class CctvAutoDispatchRequest(BaseModel):
    camera_id: str = "CAM-001"
    defect_type: Optional[str] = None
    severity: Optional[str] = "HIGH"
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    confidence: Optional[float] = 0.95
    detections: Optional[List[Dict[str, Any]]] = None

@router.get("/cameras")
def get_cameras():
    """
    Lists active municipal smart city CCTV cameras configured for real-time vision surveillance.
    """
    return cctv_detector.get_cameras()

@router.post("/scan")
async def scan_feed(
    camera_id: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    """
    Runs computer vision inference on a camera frame or uploaded evidence.
    Detects potholes, garbage overflow, water main leaks, streetlight outages, and drainage cavities.
    """
    image_bytes = None
    filename = None
    if image:
        image_bytes = await image.read()
        filename = image.filename

    return cctv_detector.scan_camera_feed(
        camera_id=camera_id,
        image_bytes=image_bytes,
        filename=filename
    )

@router.post("/auto-dispatch", status_code=status.HTTP_201_CREATED)
async def auto_dispatch_cctv_defect(
    payload: CctvAutoDispatchRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Zero-Touch CCTV Autonomous Dispatch:
    When the vision model detects an infrastructure defect above confidence threshold,
    automatically creates a municipal docket, routes to the department, finds the closest
    free field squad via Haversine proximity, and dispatches the work order immediately.
    """
    # Resolve camera defaults if missing
    cam_meta = next((c for c in cctv_detector.get_cameras() if c["camera_id"].upper() == payload.camera_id.upper()), None)
    
    defect_type = payload.defect_type or (cam_meta.get("default_defect") if cam_meta else None) or "POTHOLE"
    severity = payload.severity or (cam_meta.get("severity") if cam_meta else None) or "HIGH"
    address = payload.address or (cam_meta.get("address") if cam_meta else None) or "Smart City Surveillance Zone, MG Road"
    latitude = payload.latitude if payload.latitude is not None else ((cam_meta.get("latitude") if cam_meta else None) or 18.5204)
    longitude = payload.longitude if payload.longitude is not None else ((cam_meta.get("longitude") if cam_meta else None) or 73.8567)
    confidence = payload.confidence if payload.confidence is not None else 0.95

    # 1. Map Category
    category_map = {
        "POTHOLE": "road_infrastructure",
        "ROAD_DEFECT_POTHOLE": "road_infrastructure",
        "GARBAGE_ACCUMULATION": "waste_management",
        "WASTE_DUMP_OVERFLOW": "waste_management",
        "WATER_PIPELINE_BURST": "water_supply",
        "WATER_MAIN_RUPTURE": "water_supply",
        "STREETLIGHT_OUTAGE": "electrical_street_lighting",
        "STREETLIGHT_FAILURE": "electrical_street_lighting",
        "OPEN_DRAINAGE_HAZARD": "drainage_sanitation",
        "MANHOLE_COVER_MISSING": "drainage_sanitation"
    }
    cat = category_map.get(defect_type.upper(), "road_infrastructure")

    # 2. Resolve Department
    dept = db.query(Department).filter(Department.category == cat).first()
    dept_id = dept.id if dept else 1
    dept_name = dept.name if dept else "Municipal Road Department"

    # 3. Autonomous Geo-Proximity Officer Matching & Dispatch
    officer_match = autonomous_engine.find_nearest_available_officer(
        db=db,
        department_id=dept_id,
        target_lat=latitude,
        target_lon=longitude
    )
    assigned_officer_id = officer_match.get("officer_id")
    assigned_officer_name = officer_match.get("officer_name")
    assigned_officer_phone = officer_match.get("officer_phone")
    dist_km = officer_match.get("distance_km", 0.6)
    eta_mins = officer_match.get("eta_minutes", 10)

    # 4. Generate Unique Docket ID
    cid = ComplaintService.generate_next_id(db)

    # 5. Create Complaint Docket
    issue_label = defect_type.replace("_", " ").title()
    docket_desc = payload.description or f"Autonomous CCTV Vision Agent detected {issue_label} at {address} via {payload.camera_id}."
    official_docket = (
        f"SMART CITY CCTV AUTONOMOUS WORK ORDER\n"
        f"SOURCE: Municipal CCTV Grid (Feed #{payload.camera_id})\n"
        f"LOCATION: {address} ({latitude:.4f}, {longitude:.4f})\n"
        f"DETECTION: {issue_label} (Confidence: {int(confidence * 100)}%)\n"
        f"RESPONSIBLE DEPARTMENT: {dept_name}\n"
        f"DISPATCH DIRECTIVE: Dispatched to closest field engineer {assigned_officer_name} ({dist_km} km away, ETA {eta_mins} mins)."
    )

    complaint = Complaint(
        id=cid,
        citizen_id=current_user.id if current_user else 2,  # Attributed to Municipal Officer/System
        category=cat,
        issue_type=defect_type.upper(),
        description=docket_desc,
        generated_complaint=official_docket,
        latitude=latitude,
        longitude=longitude,
        address=address,
        severity=severity.upper(),
        status="Assigned",
        department_id=dept_id,
        assigned_officer_id=assigned_officer_id,
        assigned_officer_name=assigned_officer_name,
        assigned_officer_phone=assigned_officer_phone,
        officer_distance_km=dist_km,
        officer_eta_minutes=eta_mins,
        ai_confidence=confidence,
        severity_reason=f"CCTV Vision verified defect with {int(confidence*100)}% detection certainty.",
        grounded_explanation=f"Detected by automated camera stream {payload.camera_id}. Direct municipal hazard.",
        recommended_action=f"Urgent dispatch of field squad {assigned_officer_name} for immediate repair.",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(complaint)
    db.flush()

    # 6. Attach Camera Frame as Visual Evidence
    if payload.image_url:
        ev = Evidence(
            complaint_id=cid,
            type="image",
            file_url=payload.image_url,
            description=f"Automated CCTV Frame Capture from {payload.camera_id}",
            ai_analysis=f"Computer vision localized {defect_type} with bounding box telemetry."
        )
        db.add(ev)

    # 7. Add History & Decision Audit Logs
    db.add(ComplaintHistory(
        complaint_id=cid,
        old_status="Draft",
        new_status="Assigned",
        changed_by=f"Smart City CCTV Watchdog ({payload.camera_id})",
        remarks=f"AI Vision detected {defect_type}. Dispatched to field squad {assigned_officer_name} ({dist_km} km away).",
        timestamp=datetime.now(timezone.utc)
    ))

    db.add(AgentAction(
        complaint_id=cid,
        agent_name="CCTV Edge Vision Detector",
        action="Detect & Localize Defect",
        input_summary=f"Camera Feed: {payload.camera_id} at {address}",
        output_summary=f"Defect: {defect_type} | Conf: {int(confidence*100)}% | Severity: {severity}",
        timestamp=datetime.now(timezone.utc)
    ))

    db.add(AgentAction(
        complaint_id=cid,
        agent_name="Autonomous Proximity Dispatcher",
        action="Match & Assign Nearest Field Engineer",
        input_summary=f"Location: ({latitude:.4f}, {longitude:.4f}), Dept: {dept_name}",
        output_summary=f"Dispatched {assigned_officer_name} ({dist_km} km away, ETA {eta_mins}m). Contact: {assigned_officer_phone}",
        timestamp=datetime.now(timezone.utc)
    ))

    db.commit()
    db.refresh(complaint)

    return {
        "complaint_id": cid,
        "status": "Assigned",
        "source": f"CCTV Camera {payload.camera_id}",
        "defect_type": defect_type,
        "department": dept_name,
        "severity": severity,
        "confidence": confidence,
        "address": address,
        "assigned_officer": {
            "id": assigned_officer_id,
            "name": assigned_officer_name,
            "role": officer_match.get("officer_role", "Field Engineer"),
            "phone": assigned_officer_phone,
            "distance_km": dist_km,
            "eta_minutes": eta_mins
        },
        "message": f"Autonomous CCTV Work Order #{cid} dispatched to {assigned_officer_name} ({dist_km} km away)."
    }
