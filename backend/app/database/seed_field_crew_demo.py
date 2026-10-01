"""Add a repeatable set of 25 field-crew route test cases to the configured database."""

from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

from sqlalchemy.orm import Session

from ..models.complaint import Complaint
from ..models.department import Department
from ..models.evidence import Evidence
from ..models.location_intelligence import LocationIntelligence
from ..models.officer import Officer
from ..models.resolution_verification import ResolutionEvidence


PHOTO_FOLDER_BY_CATEGORY = {
    "road_infrastructure": "pathole",
    "waste_management": "garbage",
    "electrical_street_lighting": "Strretlight",
    "water_supply": "water_leak",
    "drainage_sanitation": "Storm drainage",
}
IMAGE_ROOT = Path(__file__).resolve().parents[3] / "frontend" / "image"


def image_pairs_by_category() -> dict[str, list[tuple[str, str]]]:
    """Return stable before/after URLs from the provided, category-organized image set."""
    pairs: dict[str, list[tuple[str, str]]] = {}
    for category, folder in PHOTO_FOLDER_BY_CATEGORY.items():
        category_dir = IMAGE_ROOT / folder
        before = sorted((category_dir / "before").glob("*"))
        after = sorted((category_dir / "after").glob("*"))
        before = [path for path in before if path.is_file()]
        after = [path for path in after if path.is_file()]
        if not before or not after:
            raise RuntimeError(f"Expected before and after photos under {category_dir}")
        image_pairs = []
        for index in range(max(len(before), len(after))):
            before_path = before[index % len(before)]
            after_path = after[index % len(after)]
            before_url = "/image/" + quote(before_path.relative_to(IMAGE_ROOT).as_posix(), safe="/")
            after_url = "/image/" + quote(after_path.relative_to(IMAGE_ROOT).as_posix(), safe="/")
            image_pairs.append((before_url, after_url))
        pairs[category] = image_pairs
    return pairs
OFFICER_BY_CATEGORY = {
    "road_infrastructure": 1,
    "waste_management": 3,
    "electrical_street_lighting": 5,
    "water_supply": 6,
    "drainage_sanitation": 7,
    "public_safety_other": 8,
}
DEMO_CREW_OFFICER_IDS = sorted(set(OFFICER_BY_CATEGORY.values()))


def build_field_crew_cases() -> list[dict[str, Any]]:
    """Return 25 deterministic cases spanning clusters, route legs, and data gaps."""
    cases = [
        ("Pothole at MG Road crossing", "road_infrastructure", 1, "HIGH", 18.5208, 73.8572, "MG Road", "Rajwada Palace", "In Progress"),
        ("Broken pavers near bus stop", "road_infrastructure", 1, "MEDIUM", 18.5211, 73.8570, "MG Road", "Rajwada Palace", "Assigned"),
        ("Road crater outside market", "road_infrastructure", 1, "CRITICAL", 18.5205, 73.8574, "MG Road", "Rajwada Palace", "Assigned"),
        ("Overflowing public bin", "waste_management", 2, "HIGH", 18.5207, 73.8571, "MG Road Market", "Rajwada Palace", "Assigned"),
        ("Loose manhole cover", "drainage_sanitation", 5, "CRITICAL", 18.5209, 73.8573, "MG Road Crossing", "Rajwada Palace", "Assigned"),
        ("Water leak at junction valve", "water_supply", 4, "HIGH", 18.5181, 73.8533, "Deccan Gymkhana Road", "Deccan Gymkhana Bus Stop", "Awaiting Verification"),
        ("Blocked storm drain", "drainage_sanitation", 5, "MEDIUM", 18.5183, 73.8535, "Deccan Gymkhana Road", "Deccan Gymkhana Bus Stop", "Assigned"),
        ("Streetlight out at junction", "electrical_street_lighting", 3, "HIGH", 18.5180, 73.8536, "Deccan Gymkhana Road", "Deccan Gymkhana Bus Stop", "Assigned"),
        ("Road surface depression", "road_infrastructure", 1, "MEDIUM", 18.5334, 73.8464, "JM Road", "Sambhaji Park Main Gate", "Assigned"),
        ("Market waste left on sidewalk", "waste_management", 2, "MEDIUM", 18.5338, 73.8461, "JM Road", "Sambhaji Park Main Gate", "Assigned"),
        ("Leaking public water standpipe", "water_supply", 4, "LOW", 18.5340, 73.8460, "JM Road", "Sambhaji Park Main Gate", "Assigned"),
        ("Cracked roadway near college gate", "road_infrastructure", 1, "HIGH", 18.5298, 73.8510, "Shivajinagar Road", "COEP Main Gate", "Awaiting Verification"),
        ("Damaged stormwater grate", "drainage_sanitation", 5, "HIGH", 18.5295, 73.8512, "Shivajinagar Road", "COEP Main Gate", "In Progress"),
        ("Streetlight pole inspection", "electrical_street_lighting", 3, "MEDIUM", None, None, "University Road near library", "Pune University Main Gate", "Assigned"),
        ("Road edge damage, GPS missing", "road_infrastructure", 1, "MEDIUM", None, None, "Fergusson College Road, Ward 7", "Fergusson College Main Gate", "Assigned"),
        ("Burst water pipe by clinic", "water_supply", 4, "CRITICAL", 18.5140, 73.8610, "Swargate Road", "Swargate Bus Depot", "In Progress"),
        ("Overflowing collection point", "waste_management", 2, "HIGH", 18.5144, 73.8607, "Swargate Road", "Swargate Bus Depot", "Assigned"),
        ("Pothole on approach road", "road_infrastructure", 1, "LOW", 18.5034, 73.8364, "Kothrud Depot Road", "Kothrud Bus Depot", "Assigned"),
        ("Blocked drain near school", "drainage_sanitation", 5, "HIGH", 18.5028, 73.8370, "Kothrud Depot Road", "Kothrud Bus Depot", "Assigned"),
        ("Streetlight flickering at park", "electrical_street_lighting", 3, "MEDIUM", 18.5442, 73.8860, "Viman Nagar Link Road", "Phoenix Marketcity Main Entrance", "Assigned"),
        ("Duplicate pothole report for QA", "road_infrastructure", 1, "HIGH", 18.52081, 73.85721, "MG Road crossing", "Rajwada Palace", "Submitted"),
        ("Unassigned waste pickup request", "waste_management", 2, "MEDIUM", 18.5185, 73.8531, "Deccan Gymkhana Road", "Deccan Gymkhana Bus Stop", "Submitted"),
        ("Critical open manhole, unassigned", "drainage_sanitation", 5, "CRITICAL", 18.5206, 73.8576, "MG Road Crossing", "Rajwada Palace", "Submitted"),
        ("Report with no GPS or address", "water_supply", 4, "LOW", None, None, None, None, "Submitted"),
        ("Authenticity review edge case", "electrical_street_lighting", 3, "HIGH", 18.5321, 73.8469, "JM Road", "Sambhaji Park Main Gate", "Submitted"),
    ]

    now = datetime.now(timezone.utc)
    result = []
    image_pairs = image_pairs_by_category()
    category_photo_index: dict[str, int] = {}
    for index, (issue, category, department_id, severity, lat, lon, address, landmark, status) in enumerate(cases, 1):
        assigned_officer_id = OFFICER_BY_CATEGORY[category] if index <= 20 else None
        photo_index = category_photo_index.get(category, 0)
        category_photo_index[category] = photo_index + 1
        before_photo_url, after_photo_url = image_pairs[category][photo_index % len(image_pairs[category])]
        cluster_id = "FC-DEMO-MG-ROAD" if index in {1, 2, 3, 4, 5, 21, 23} else (
            "FC-DEMO-DECCAN" if index in {6, 7, 8, 22} else None
        )
        result.append({
            "id": f"FC-DEMO-{index:03d}",
            "issue_type": issue,
            "category": category,
            "department_id": department_id,
            "severity": severity,
            "latitude": lat,
            "longitude": lon,
            "address": address,
            "landmark": landmark,
            "status": status,
            "assigned_officer_id": assigned_officer_id,
            "cluster_id": cluster_id,
            "is_duplicate": 1 if index == 21 else 0,
            "requires_human_review": 1 if index == 25 else 0,
            "before_photo_url": before_photo_url,
            "after_photo_url": after_photo_url,
            "created_at": now - timedelta(hours=index * 2),
        })
    return result


def seed_field_crew_demo(db: Session) -> dict[str, Any]:
    """Insert missing demo cases and sidecar evidence without clearing user data."""
    departments = {department.id: department for department in db.query(Department).all()}
    officers = {officer.id: officer for officer in db.query(Officer).filter(Officer.id.in_(DEMO_CREW_OFFICER_IDS)).all()}
    if not departments or set(DEMO_CREW_OFFICER_IDS) - officers.keys():
        raise RuntimeError("Initialize departments and a field officer in each demo department before adding crew cases.")

    case_ids = [case["id"] for case in build_field_crew_cases()]
    existing_cases = db.query(Complaint).filter(Complaint.id.in_(case_ids)).all()
    prior_demo_assignments: dict[int, int] = {}
    for complaint in existing_cases:
        if complaint.assigned_officer_id:
            prior_demo_assignments[complaint.assigned_officer_id] = prior_demo_assignments.get(complaint.assigned_officer_id, 0) + 1

    added = 0
    for case in build_field_crew_cases():
        complaint = db.query(Complaint).filter(Complaint.id == case["id"]).first()
        officer = officers.get(case["assigned_officer_id"])
        if complaint is None:
            department = departments[case["department_id"]]
            complaint = Complaint(
                id=case["id"],
                category=case["category"],
                issue_type=case["issue_type"],
                description=f"Field crew demo case: {case['issue_type']}. Use this synthetic report to validate route ordering, landmark display, image evidence, and completion review.",
                generated_complaint=f"TRAINING CASE · {case['issue_type']} · {department.name}",
                latitude=case["latitude"],
                longitude=case["longitude"],
                address=case["address"],
                landmark=case["landmark"],
                severity=case["severity"],
                status=case["status"],
                department_id=case["department_id"],
                assigned_officer_id=case["assigned_officer_id"],
                assigned_officer_name=officer.name if officer else None,
                assigned_officer_phone=officer.phone if officer else None,
                officer_eta_minutes=10 + (added % 25) if officer else None,
                cluster_id=case["cluster_id"],
                is_duplicate=case["is_duplicate"],
                requires_human_review=case["requires_human_review"],
                severity_reason="Synthetic route QA scenario: verify priority handling and crew workload." if case["severity"] in {"HIGH", "CRITICAL"} else "Synthetic demonstration case.",
                grounded_explanation=f"Training location near {case['landmark'] or case['address'] or 'an unpinned location'}.",
                recommended_action=f"Follow the field workflow for {case['issue_type'].lower()} and attach completion proof.",
                ai_confidence=0.92,
                created_at=case["created_at"],
                updated_at=case["created_at"],
            )
            db.add(complaint)
            added += 1
        else:
            # Repair older demo fixtures that put every category onto the road crews.
            complaint.department_id = case["department_id"]
            complaint.assigned_officer_id = case["assigned_officer_id"]
            complaint.assigned_officer_name = officer.name if officer else None
            complaint.assigned_officer_phone = officer.phone if officer else None
        db.flush()

        if case["latitude"] is not None and case["longitude"] is not None:
            location = db.query(LocationIntelligence).filter_by(complaint_id=case["id"]).first()
            if location is None:
                db.add(LocationIntelligence(
                    complaint_id=case["id"],
                    latitude=case["latitude"],
                    longitude=case["longitude"],
                    street=case["address"],
                    area=(case["address"].split(",")[0] if case["address"] else None),
                    ward=f"Ward {(int(case['id'][-3:]) % 12) + 1}",
                    zone="Central Route Test Zone" if case["cluster_id"] else "Multi-stop Route Test Zone",
                    landmark=case["landmark"],
                    municipal_jurisdiction="Pune Municipal Corporation · Synthetic test data",
                    gps_source="FIELD_CREW_DEMO_FIXTURE",
                ))

        photo_url = case["before_photo_url"]
        evidence = db.query(Evidence).filter_by(complaint_id=case["id"]).first()
        if evidence is None:
            db.add(Evidence(
                complaint_id=case["id"],
                type="image",
                file_url=photo_url,
                description=f"Before-work report photo for {case['issue_type']}.",
                ai_analysis="Photo selected from the provided field-report image set.",
            ))
        else:
            evidence.file_url = photo_url
            evidence.description = f"Before-work report photo for {case['issue_type']}."
            evidence.ai_analysis = "Photo selected from the provided field-report image set."

        resolution = db.query(ResolutionEvidence).filter_by(complaint_id=case["id"]).first()
        if case["status"] == "Awaiting Verification" and resolution is None:
            db.add(ResolutionEvidence(
                complaint_id=case["id"],
                worker_id=case["assigned_officer_id"],
                worker_name=officers[case["assigned_officer_id"]].name,
                before_image_url=photo_url,
                after_image_url=case["after_photo_url"],
                resolution_notes="Field completion photo selected from the provided before/after image set.",
                completion_lat=case["latitude"],
                completion_lon=case["longitude"],
                completion_address=case["address"],
            ))
        elif resolution is not None:
            resolution.before_image_url = photo_url
            resolution.after_image_url = case["after_photo_url"]
            resolution.resolution_notes = "Field completion photo selected from the provided before/after image set."

    today = date.today().isoformat()
    target_demo_assignments: dict[int, int] = {}
    for case in build_field_crew_cases():
        officer_id = case["assigned_officer_id"]
        if officer_id:
            target_demo_assignments[officer_id] = target_demo_assignments.get(officer_id, 0) + 1

    for officer_id, officer in officers.items():
        prior_count = prior_demo_assignments.get(officer_id, 0)
        target_count = target_demo_assignments.get(officer_id, 0)
        if officer.daily_assignment_date != today:
            officer.daily_assignment_date = today
            officer.daily_assignment_count = target_count
        else:
            officer.daily_assignment_count = max(
                0,
                (officer.daily_assignment_count or 0) + target_count - prior_count,
            )

    db.commit()
    return {
        "inserted": added,
        "total_cases": len(build_field_crew_cases()),
        "already_present": len(build_field_crew_cases()) - added,
        "assigned_to_road": target_demo_assignments.get(1, 0),
        "assigned_to_waste": target_demo_assignments.get(3, 0),
        "assigned_to_electrical": target_demo_assignments.get(5, 0),
        "assigned_to_water": target_demo_assignments.get(6, 0),
        "assigned_to_drainage": target_demo_assignments.get(7, 0),
        "queued_unassigned": 5,
    }


if __name__ == "__main__":
    from .session import SessionLocal, ensure_db_initialized

    ensure_db_initialized()
    session = SessionLocal()
    try:
        print(seed_field_crew_demo(session))
    finally:
        session.close()
