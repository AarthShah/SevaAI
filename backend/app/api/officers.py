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
from ..schemas.officer import OfficerResponse
from ..services.autonomous_agent import calculate_haversine_distance

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

    return {
        "officer": {
            "id": officer.id,
            "name": officer.name,
            "role": officer.role,
            "phone": officer.phone,
            "status": officer.status,
            "current_address": officer.current_address,
            "active_tickets": officer.active_tickets,
            "rating": officer.rating
        },
        "tasks": [
            {
                "id": t.id,
                "issue_type": t.issue_type,
                "category": t.category,
                "severity": t.severity,
                "status": t.status,
                "address": t.address,
                "latitude": t.latitude,
                "longitude": t.longitude,
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
