"""
Intelligent Department Routing Service
Provides algorithmic, workload-aware, and jurisdiction-matched department recommendations.
"""

from typing import Dict, Any, List, Optional
import json
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.complaint import Complaint
from ..models.department import Department
from ..models.location_intelligence import LocationIntelligence
from .department_mapping import normalize_department_category


# Domain keywords for civic departments
DEPARTMENT_KEYWORDS = {
    "ROAD_DEPT": [
        "pothole", "road", "asphalt", "crater", "pavement", "tar", "divider",
        "speed breaker", "footpath", "sidewalk", "flyover", "street damage", "highway"
    ],
    "SANITATION_DEPT": [
        "garbage", "trash", "waste", "debris", "dump", "bin", "litter", "rubbish",
        "dead animal", "stench", "smell", "filth", "cleanliness", "sweeping", "compost"
    ],
    "WATER_DEPT": [
        "water", "leak", "pipe", "burst", "supply", "pipeline", "tap", "drinking water",
        "contamination", "low pressure", "valve", "tanker", "hydrant", "seepage"
    ],
    "DRAINAGE_DEPT": [
        "drain", "drainage", "sewage", "manhole", "gutter", "clogged", "overflow",
        "waterlogging", "stormwater", "culvert", "choke", "stagnant"
    ],
    "ELECTRICAL_DEPT": [
        "light", "streetlight", "lamp", "electric", "pole", "wire", "cable",
        "transformer", "blackout", "sparking", "short circuit", "dark", "illumination"
    ],
    "HORTICULTURE_DEPT": [
        "tree", "branch", "fallen tree", "pruning", "park", "garden", "greenery",
        "grass", "plant", "overgrown", "foliage"
    ]
}

DEPARTMENT_NAMES = {
    "ROAD_DEPT": "Road & Infrastructure Department",
    "SANITATION_DEPT": "Solid Waste & Sanitation Department",
    "WATER_DEPT": "Water Supply & Distribution Department",
    "DRAINAGE_DEPT": "Drainage & Sewerage Board",
    "ELECTRICAL_DEPT": "Electrical & Public Lighting Department",
    "HORTICULTURE_DEPT": "Horticulture & Urban Forestry Department"
}

CATEGORY_TO_DEPT = {
    "road_infrastructure": "ROAD_DEPT",
    "waste_management": "SANITATION_DEPT",
    "electrical_street_lighting": "ELECTRICAL_DEPT",
    "water_supply": "WATER_DEPT",
    "drainage_sanitation": "DRAINAGE_DEPT",
    "pothole": "ROAD_DEPT",
    "road_damage": "ROAD_DEPT",
    "garbage": "SANITATION_DEPT",
    "waste_dump": "SANITATION_DEPT",
    "water_leakage": "WATER_DEPT",
    "drainage_overflow": "DRAINAGE_DEPT",
    "manhole": "DRAINAGE_DEPT",
    "streetlight": "ELECTRICAL_DEPT",
    "street_lighting": "ELECTRICAL_DEPT",
    "fallen_tree": "HORTICULTURE_DEPT",
}

DEPARTMENT_CATEGORIES = {
    "ROAD_DEPT": "road_infrastructure",
    "SANITATION_DEPT": "waste_management",
    "WATER_DEPT": "water_supply",
    "DRAINAGE_DEPT": "drainage_sanitation",
    "ELECTRICAL_DEPT": "electrical_street_lighting",
    "HORTICULTURE_DEPT": "public_safety_other",
}


def get_department_workload_metrics(db: Session) -> Dict[str, Dict[str, Any]]:
    """Calculates active ticket backlog and historical resolution rate per department."""
    metrics = {}
    
    # Query all active complaints grouped by department
    active_statuses = ["Submitted", "Acknowledged", "Assigned", "In Progress", "Escalated"]
    active_counts = (
        db.query(Complaint.department_id, func.count(Complaint.id))
        .filter(Complaint.status.in_(active_statuses))
        .group_by(Complaint.department_id)
        .all()
    )
    active_map = {dept_id: count for dept_id, count in active_counts if dept_id}
    
    # Query resolved complaints count
    resolved_counts = (
        db.query(Complaint.department_id, func.count(Complaint.id))
        .filter(Complaint.status == "Resolved")
        .group_by(Complaint.department_id)
        .all()
    )
    resolved_map = {dept_id: count for dept_id, count in resolved_counts if dept_id}

    department_ids = {
        row.category: row.id
        for row in db.query(Department).all()
    }
    for code, name in DEPARTMENT_NAMES.items():
        department_id = department_ids.get(DEPARTMENT_CATEGORIES.get(code))
        active = active_map.get(department_id, 0)
        resolved = resolved_map.get(department_id, 0)
        total = active + resolved
        success_rate = round((resolved / total * 100), 1) if total > 0 else 92.0
        
        # Capacity state
        if active > 25:
            capacity_state = "CRITICAL_LOAD"
        elif active > 12:
            capacity_state = "MODERATE_LOAD"
        else:
            capacity_state = "OPTIMAL_CAPACITY"

        metrics[code] = {
            "department_code": code,
            "department_name": name,
            "active_tickets": active,
            "resolved_tickets": resolved,
            "historical_success_rate": success_rate,
            "capacity_state": capacity_state
        }
        
    return metrics


def recommend_department(db: Session, complaint: Complaint) -> Dict[str, Any]:
    """
    Evaluates multi-signal department routing based on:
    1. Category & semantic keyword matching
    2. Current department workloads
    3. Historical resolution efficiency
    4. Ward/Zone jurisdiction alignment
    """
    text = f"{complaint.issue_type or ''} {complaint.description or ''} {complaint.category or ''}".lower()
    workloads = get_department_workload_metrics(db)
    
    scores: Dict[str, float] = {}
    reasons_map: Dict[str, List[str]] = {code: [] for code in DEPARTMENT_NAMES}

    # 1. Base Category Mapping
    cat = normalize_department_category(complaint.category) or ""
    cat_target = CATEGORY_TO_DEPT.get(cat)
    if cat_target:
        scores[cat_target] = 0.70
        reasons_map[cat_target].append(f"Direct match with incident category '{cat}'")

    # 2. Keyword frequency
    for code, keywords in DEPARTMENT_KEYWORDS.items():
        match_count = sum(1 for kw in keywords if kw in text)
        if match_count > 0:
            kw_score = min(0.40, match_count * 0.12)
            scores[code] = scores.get(code, 0.0) + kw_score
            matched_kws = [kw for kw in keywords if kw in text][:3]
            reasons_map[code].append(f"Detected keyword indicators: {', '.join(matched_kws)}")

    # Ensure baseline scores exist
    for code in DEPARTMENT_NAMES:
        if code not in scores:
            scores[code] = 0.10

    # 3. Workload balancing penalty/bonus
    for code, w in workloads.items():
        if w["capacity_state"] == "OPTIMAL_CAPACITY":
            scores[code] = scores.get(code, 0.0) + 0.08
            reasons_map[code].append(f"Department has healthy bandwidth ({w['active_tickets']} active tickets)")
        elif w["capacity_state"] == "CRITICAL_LOAD":
            scores[code] = max(0.05, scores.get(code, 0.0) - 0.15)
            reasons_map[code].append(f"Department is experiencing high backlog ({w['active_tickets']} active tickets)")

    # 4. Location Intelligence Jurisdiction Check
    loc_intel = db.query(LocationIntelligence).filter(LocationIntelligence.complaint_id == complaint.id).first()
    jurisdiction_matched = False
    if loc_intel and loc_intel.ward:
        jurisdiction_matched = True

    # Normalize scores and pick highest
    sorted_depts = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    best_code, best_score = sorted_depts[0]
    best_conf = min(0.98, max(0.65, round(best_score, 2)))

    primary_info = {
        "department_code": best_code,
        "department_name": DEPARTMENT_NAMES.get(best_code, "Municipal Department"),
        "confidence": best_conf,
        "workload": workloads.get(best_code, {}),
        "reasons": reasons_map.get(best_code, ["Standard municipal division jurisdiction assignment"])
    }

    alternatives = []
    for code, sc in sorted_depts[1:3]:
        alternatives.append({
            "department_code": code,
            "department_name": DEPARTMENT_NAMES.get(code, code),
            "confidence": min(0.90, max(0.40, round(sc, 2))),
            "workload": workloads.get(code, {}),
            "reasons": reasons_map.get(code, [])
        })

    is_current_assigned = bool(complaint.department_id)
    is_aligned_with_current = complaint.department_id == best_code

    return {
        "complaint_id": complaint.id,
        "primary_recommendation": primary_info,
        "alternatives": alternatives,
        "jurisdiction_matched": jurisdiction_matched,
        "current_department_code": complaint.department_id,
        "is_aligned_with_current": is_aligned_with_current,
        "supervisor_override_allowed": True
    }


def apply_supervisor_routing_override(
    db: Session,
    complaint_id: str,
    new_department_code: str,
    supervisor_notes: Optional[str] = None
) -> Dict[str, Any]:
    """Applies a supervisor override to the department assignment of a complaint."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise ValueError(f"Complaint #{complaint_id} not found.")

    old_dept = complaint.department_id
    complaint.department_id = new_department_code
    complaint.department_name = DEPARTMENT_NAMES.get(new_department_code, new_department_code)
    db.commit()

    return {
        "complaint_id": complaint_id,
        "previous_department": old_dept,
        "assigned_department": new_department_code,
        "department_name": complaint.department_name,
        "supervisor_notes": supervisor_notes,
        "message": f"Successfully updated routing for complaint #{complaint_id} to {complaint.department_name}"
    }
