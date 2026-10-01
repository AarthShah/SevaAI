"""
Officers API Endpoints
Provides real-time fleet telemetry, GPS coordinates, smart proximity matching,
and task assignments for municipal field management officers.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database.session import get_db
from ..models.officer import Officer
from ..models.complaint import Complaint
from ..models.location_intelligence import LocationIntelligence
from ..models.resolution_verification import ResolutionEvidence
from ..schemas.officer import OfficerResponse
from ..services.autonomous_agent import calculate_haversine_distance
from ..services.field_workload import MAX_DAILY_ASSIGNMENTS, daily_assignment_limit_for_distance

router = APIRouter(prefix="/api/officers", tags=["Officers"])

class OfficerStatusUpdate(BaseModel):
    status: str

@router.get("", response_model=List[OfficerResponse])
def get_officers(
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    status: Optional[str] = Query(None, description="Filter by officer status"),
    db: Session = Depends(get_db)
):
    """
    Lists municipal field officers with live GPS coordinates, status, and active workload.
    Used by the Municipal Dispatch Radar and autonomous dispatch engine.
    """
    query = db.query(Officer)
    if department_id:
        query = query.filter(Officer.department_id == department_id)
    if status and status != "ALL":
        query = query.filter(Officer.status == status)

    officers = query.order_by(Officer.department_id.asc(), Officer.id.asc()).all()

    result = []
    for off in officers:
        item = OfficerResponse.model_validate(off)
        if off.department:
            item.department_name = off.department.name
        result.append(item)
    return result

@router.get("/fleet-summary")
def get_fleet_summary(db: Session = Depends(get_db)):
    """
    Returns fleet availability and workload summary for the Municipal Command Center.
    """
    officers = db.query(Officer).all()
    total = len(officers)
    available = sum(1 for o in officers if o.status == "AVAILABLE")
    on_duty = sum(1 for o in officers if o.status == "ON_DUTY")
    busy = sum(1 for o in officers if o.status == "BUSY")
    offline = sum(1 for o in officers if o.status == "OFFLINE")
    total_active_tasks = sum(o.active_tickets for o in officers)

    return {
        "total_officers": total,
        "available": available,
        "on_duty": on_duty,
        "busy": busy,
        "offline": offline,
        "total_active_tasks": total_active_tasks
    }

@router.get("/smart-match")
def smart_match_officer(
    latitude: float = Query(..., description="Incident latitude"),
    longitude: float = Query(..., description="Incident longitude"),
    department_id: Optional[int] = Query(None, description="Department ID"),
    db: Session = Depends(get_db)
):
    """
    Intelligently scores and matches available field management officers
    based on GPS proximity, duty status, and active workload.
    """
    query = db.query(Officer)
    if department_id:
        query = query.filter(Officer.department_id == department_id)

    officers = query.all()
    if not officers:
        # Fallback to all officers if none in specific department
        officers = db.query(Officer).all()

    candidates = []
    for off in officers:
        dist = calculate_haversine_distance(latitude, longitude, off.current_lat, off.current_lon)
        transit_mins = int((dist / 22.0) * 60)
        eta_minutes = max(6, transit_mins + 4)

        # Lower score is better
        # distance (km) + workload penalty (active_tickets * 1.8) - available bonus (-4.0)
        status_penalty = 0.0
        if off.status == "AVAILABLE":
            status_penalty = -4.0
        elif off.status == "ON_DUTY":
            status_penalty = 2.0
        elif off.status == "BUSY":
            status_penalty = 8.0
        elif off.status == "OFFLINE":
            status_penalty = 50.0

        score = dist + (off.active_tickets * 1.8) + status_penalty

        if off.status == "AVAILABLE" and off.active_tickets == 0:
            match_reason = f"⭐ Best Match: Free & closest ({dist:.1f} km, 0 active tasks, ETA ~{eta_minutes}m)"
        elif off.status == "AVAILABLE":
            match_reason = f"Available squad: {dist:.1f} km away with {off.active_tickets} active task (ETA ~{eta_minutes}m)"
        elif off.status == "ON_DUTY":
            match_reason = f"Currently on-duty: {dist:.1f} km away, resolving {off.active_tickets} ticket"
        elif off.status == "BUSY":
            match_reason = f"High workload: {off.active_tickets} tasks in progress ({dist:.1f} km)"
        else:
            match_reason = f"Staff currently off-duty/offline"

        candidates.append({
            "id": off.id,
            "name": off.name,
            "role": off.role,
            "phone": off.phone,
            "department_id": off.department_id,
            "department_name": off.department.name if off.department else "Municipal Squad",
            "current_lat": off.current_lat,
            "current_lon": off.current_lon,
            "current_address": off.current_address,
            "status": off.status,
            "active_tickets": off.active_tickets,
            "rating": off.rating,
            "distance_km": round(dist, 2),
            "eta_minutes": eta_minutes,
            "suitability_score": round(score, 2),
            "match_reason": match_reason
        })

    candidates.sort(key=lambda x: x["suitability_score"])
    best_match = candidates[0] if candidates else None

    return {
        "best_match": best_match,
        "total_evaluated": len(candidates),
        "candidates": candidates
    }

@router.get("/{officer_id}/tasks")
def get_officer_tasks(officer_id: int, db: Session = Depends(get_db)):
    """
    Returns active work orders and dispatch tasks assigned to a specific field officer.
    """
    officer = db.query(Officer).filter(Officer.id == officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail=f"Officer #{officer_id} not found.")

    tasks = (
        db.query(Complaint)
        .filter(Complaint.assigned_officer_id == officer_id)
        .order_by(desc(Complaint.created_at))
        .all()
    )
    task_ids = [task.id for task in tasks]
    landmarks = {
        item.complaint_id: item
        for item in db.query(LocationIntelligence).filter(LocationIntelligence.complaint_id.in_(task_ids)).all()
    } if task_ids else {}
    completion_photos = {}
    if task_ids:
        for item in db.query(ResolutionEvidence).filter(
            ResolutionEvidence.complaint_id.in_(task_ids)
        ).order_by(desc(ResolutionEvidence.created_at)).all():
            completion_photos.setdefault(item.complaint_id, item.after_image_url)

    active_locations = [t for t in tasks if t.latitude is not None and t.longitude is not None and t.status not in {"Resolved", "Rejected", "Dismissed"}]
    average_route_distance = (
        sum(calculate_haversine_distance(officer.current_lat, officer.current_lon, t.latitude, t.longitude) for t in active_locations)
        / len(active_locations)
        if active_locations and officer.current_lat is not None and officer.current_lon is not None else 0
    )

    return {
        "officer": {
            "id": officer.id,
            "name": officer.name,
            "role": officer.role,
            "phone": officer.phone,
            "status": officer.status,
            "current_address": officer.current_address,
            "current_lat": officer.current_lat,
            "current_lon": officer.current_lon,
            "active_tickets": officer.active_tickets,
            "daily_assignment_count": officer.daily_assignment_count or 0,
            "daily_assignment_date": officer.daily_assignment_date,
            "daily_assignment_limit": min(MAX_DAILY_ASSIGNMENTS, daily_assignment_limit_for_distance(average_route_distance)),
            "rating": officer.rating
        },
        "tasks": [
            {
                "id": t.id,
                "title": t.issue_type or t.category,
                "issue_type": t.issue_type,
                "category": t.category,
                "severity": t.severity,
                "severity_reason": t.severity_reason,
                "status": t.status,
                "description": t.description,
                "address": t.address,
                "landmark": landmarks.get(t.id).landmark if landmarks.get(t.id) else None,
                "area": landmarks.get(t.id).area if landmarks.get(t.id) else None,
                "ward": landmarks.get(t.id).ward if landmarks.get(t.id) else None,
                "latitude": t.latitude,
                "longitude": t.longitude,
                "evidence": [
                    {"type": evidence.type, "file_url": evidence.file_url, "description": evidence.description}
                    for evidence in t.evidence_list
                ],
                "image_url": next((e.file_url for e in t.evidence_list if (e.type or "image").lower() == "image"), None),
                "completion_photo_url": completion_photos.get(t.id),
                "distance_km": t.officer_distance_km,
                "eta_minutes": t.officer_eta_minutes,
                "created_at": t.created_at.isoformat()
            }
            for t in tasks
        ]
    }

@router.patch("/{officer_id}/status")
def update_officer_status(
    officer_id: int,
    payload: OfficerStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates field officer duty status (AVAILABLE, ON_DUTY, BUSY, OFFLINE).
    """
    officer = db.query(Officer).filter(Officer.id == officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail=f"Officer #{officer_id} not found.")

    officer.status = payload.status.upper()
    db.commit()
    db.refresh(officer)
    return {
        "officer_id": officer.id,
        "name": officer.name,
        "status": officer.status,
        "message": f"Officer status updated to '{officer.status}'."
    }
