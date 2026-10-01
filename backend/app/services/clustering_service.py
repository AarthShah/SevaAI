"""Business rules for master grievances and their preserved citizen reports."""

from datetime import datetime, timezone
import json
import math
import re
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..models.ai_decision_evidence import AIDecisionEvidence
from ..models.complaint import Complaint
from ..models.complaint_cluster import ComplaintCluster, ComplaintClusterMember
from ..models.complaint_history import ComplaintHistory
from ..models.evidence import Evidence
from ..services.department_mapping import resolve_department_id

PROXIMITY_METERS = 50.0
_ISSUE_FAMILIES = (
    ("pothole", ("pothole", "road crater", "road surface hole")),
    ("streetlight", ("streetlight", "street light", "street lamp", "luminaire")),
    ("garbage", ("garbage", "waste", "rubbish", "trash", "refuse", "dumped debris")),
    ("water_leak", ("water leak", "pipeline leak", "pipe leak", "leaking pipe", "water leakage")),
    ("storm_drain", ("storm drain", "blocked drain", "drain blockage", "drain overflow")),
    ("manhole", ("manhole", "missing manhole", "open manhole")),
    ("water_shortage", ("water shortage", "no water supply", "low water supply")),
    ("tree_hazard", ("fallen tree", "dangerous tree", "tree hazard")),
)
_GENERIC = {"issue", "problem", "civic", "defect", "road", "roads", "municipal", "complaint", "report", "works", "work", "unclassified", "other", "general"}

_MASTER_LABELS = {
    "garbage": ("Garbage Accumulation", "waste_management"),
    "pothole": ("Road Pothole", "road_infrastructure"),
    "streetlight": ("Broken Streetlight", "electrical_street_lighting"),
    "water_leak": ("Water Leak", "water_supply"),
    "storm_drain": ("Blocked Storm Drain", "drainage_sanitation"),
    "manhole": ("Manhole Defect", "drainage_sanitation"),
    "water_shortage": ("Water Supply Issue", "water_supply"),
    "tree_hazard": ("Tree Hazard", "public_safety_other"),
}

def _evidence_hashes(report: Complaint) -> set[str]:
    hashes: set[str] = set()
    for item in (report.evidence_list or []):
        try:
            data = json.loads(item.forensic_details or "{}")
        except (TypeError, ValueError):
            continue
        stack = [data]
        while stack:
            value = stack.pop()
            if isinstance(value, dict):
                for key, child in value.items():
                    if key.lower() in {"sha256", "image_sha256", "content_hash"} and isinstance(child, str):
                        hashes.add(child.strip().lower())
                    elif key.lower() in {"perceptual_hash", "phash", "image_phash"} and isinstance(child, str):
                        hashes.add("phash:" + child.strip().lower().replace("0x", ""))
                    if isinstance(child, (dict, list)):
                        stack.append(child)
            elif isinstance(value, list):
                stack.extend(value)
    return hashes

def _same_evidence(a: Complaint, b: Complaint) -> bool:
    left, right = _evidence_hashes(a), _evidence_hashes(b)
    if left & right:
        return True
    lp = [h[6:] for h in left if h.startswith("phash:")]
    rp = [h[6:] for h in right if h.startswith("phash:")]
    for x in lp:
        for y in rp:
            try:
                if len(x) == len(y) and sum((int(cx, 16) ^ int(cy, 16)).bit_count() for cx, cy in zip(x, y)) <= 6:
                    return True
            except ValueError:
                pass
    return False


def compute_haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    rad = math.pi / 180
    dlat = (lat2 - lat1) * rad
    dlon = (lon2 - lon1) * rad
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1 * rad) * math.cos(lat2 * rad) * math.sin(dlon / 2) ** 2
    return 6371000 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _canonical_issue(complaint: Complaint) -> str:
    text = " ".join(filter(None, (complaint.issue_type, complaint.category, complaint.description))).lower()
    text = re.sub(r"[_-]+", " ", text)
    for family, phrases in _ISSUE_FAMILIES:
        if any(phrase in text for phrase in phrases):
            return family
    issue = re.sub(r"[^a-z0-9 ]", " ", (complaint.issue_type or "").lower())
    issue_tokens = {word for word in issue.split() if word not in _GENERIC}
    if issue_tokens:
        return "custom:" + " ".join(sorted(issue_tokens))
    description_tokens = {word for word in re.findall(r"[a-z0-9]+", text) if word not in _GENERIC and len(word) > 2}
    return "custom:" + " ".join(sorted(description_tokens))


def _same_issue(left: Complaint, right: Complaint) -> bool:
    a, b = _canonical_issue(left), _canonical_issue(right)
    # Strongly identified, conflicting civic problems are never merged, even when
    # an image or point coordinate happens to be shared.
    if not a.startswith("custom:") and not b.startswith("custom:"):
        return a == b
    if a == b:
        return True
    # Exact/perceptually matching evidence can overcome one report's uncertain
    # classification, but cannot collapse two confidently different issue types.
    if _same_evidence(left, right):
        return True
    if a.startswith("custom:") and b.startswith("custom:"):
        at, bt = set(a[7:].split()), set(b[7:].split())
        overlap = len(at & bt) / max(1, len(at | bt))
        return overlap >= 0.45 or SequenceMatcher(None, a, b).ratio() >= 0.68
    return False


class ClusteringService:
    @staticmethod
    def generate_next_cluster_id(db: Session) -> str:
        last = db.query(ComplaintCluster).order_by(desc(ComplaintCluster.created_at)).first()
        try:
            return f"MG-{(int(last.id.split('-')[-1]) + 1 if last else 1):06d}"
        except (ValueError, AttributeError):
            return f"MG-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"

    @staticmethod
    def _members(db: Session, cluster_id: str) -> List[Complaint]:
        return [m.complaint for m in db.query(ComplaintClusterMember).filter_by(cluster_id=cluster_id).all() if m.complaint]

    @staticmethod
    def _distinct_reporters(reports: List[Complaint]) -> int:
        # Anonymous submissions count as separate reports; authenticated repeat reports
        # from the same resident count once toward independent corroboration.
        return len({f"user:{r.citizen_id}" if r.citizen_id is not None else f"anonymous:{r.id}" for r in reports})

    @staticmethod
    def _inherit_master_decision(master_report: Complaint, child_report: Complaint) -> None:
        child_report.status = master_report.status
        child_report.assigned_officer_id = master_report.assigned_officer_id
        child_report.assigned_officer_name = master_report.assigned_officer_name
        child_report.assigned_officer_phone = master_report.assigned_officer_phone
        child_report.officer_distance_km = master_report.officer_distance_km
        child_report.officer_eta_minutes = master_report.officer_eta_minutes

    @staticmethod
    def attach_to_master(db: Session, complaint: Complaint, proximity_threshold_m: float = PROXIMITY_METERS) -> Optional[ComplaintCluster]:
        if complaint.latitude is None or complaint.longitude is None:
            return None
        if complaint.cluster_id:
            linked_master = db.query(ComplaintCluster).filter_by(id=complaint.cluster_id, status="ACTIVE").first()
            if linked_master:
                existing_member = db.query(ComplaintClusterMember).filter_by(
                    cluster_id=linked_master.id, complaint_id=complaint.id
                ).first()
                if existing_member:
                    return linked_master
            # Older sample data used cluster_id as a broad display/routing tag.
            # It is not a relationship unless a master and membership row exist.
            complaint.cluster_id = None

        clusters = db.query(ComplaintCluster).filter(ComplaintCluster.status == "ACTIVE").all()
        matches: List[Tuple[float, ComplaintCluster]] = []
        for cluster in clusters:
            if cluster.center_lat is None or cluster.center_lon is None:
                continue
            distance = compute_haversine_meters(complaint.latitude, complaint.longitude, cluster.center_lat, cluster.center_lon)
            if distance <= min(proximity_threshold_m, cluster.radius_meters or proximity_threshold_m):
                if any(_same_issue(complaint, member) for member in ClusteringService._members(db, cluster.id)):
                    matches.append((distance, cluster))

        # Anchor against the original master location; reports cannot chain a cluster
        # outward beyond 50 m as the center moves.
        if matches:
            _, cluster = min(matches, key=lambda item: item[0])
            master_reports = ClusteringService._members(db, cluster.id)
            if any(report.id == complaint.id for report in master_reports):
                complaint.cluster_id = cluster.id
                return cluster
            db.add(ComplaintClusterMember(cluster_id=cluster.id, complaint_id=complaint.id, similarity_score=1.0))
            complaint.cluster_id = cluster.id
            if master_reports:
                master_report = min(master_reports, key=lambda report: report.created_at or datetime.min.replace(tzinfo=timezone.utc))
                ClusteringService._inherit_master_decision(master_report, complaint)
            cluster.complaint_count = len(master_reports) + 1
            cluster.last_reported = datetime.now(timezone.utc)
            if complaint.severity in {"HIGH", "CRITICAL"}:
                cluster.severity = "HIGH" if complaint.severity == "HIGH" else "CRITICAL"
            ClusteringService._refresh_canonical_master(db, cluster)
            return cluster

        # A cluster only exists for a true multi-report master. Find a compatible,
        # unclustered parent report at the fixed 50 m threshold.
        neighbors = db.query(Complaint).filter(
            Complaint.id != complaint.id,
            Complaint.cluster_id.is_(None),
            Complaint.status.notin_(["Resolved", "Rejected"]),
            Complaint.latitude.isnot(None), Complaint.longitude.isnot(None)
        ).all()
        candidates = [n for n in neighbors if _same_issue(complaint, n)
                      and compute_haversine_meters(complaint.latitude, complaint.longitude, n.latitude, n.longitude) <= proximity_threshold_m]
        if not candidates:
            return None
        neighbor = min(candidates, key=lambda n: compute_haversine_meters(complaint.latitude, complaint.longitude, n.latitude, n.longitude))
        master_id = ClusteringService.generate_next_cluster_id(db)
        cluster = ComplaintCluster(
            id=master_id, issue_type=complaint.issue_type or complaint.category,
            category=complaint.category, department_id=complaint.department_id, complaint_count=2,
            center_lat=neighbor.latitude, center_lon=neighbor.longitude,
            location_summary=neighbor.address or complaint.address or "Reported location",
            radius_meters=proximity_threshold_m,
            severity="CRITICAL" if "CRITICAL" in {neighbor.severity, complaint.severity} else ("HIGH" if "HIGH" in {neighbor.severity, complaint.severity} else "MEDIUM"),
            status="ACTIVE", first_reported=neighbor.created_at or datetime.now(timezone.utc), last_reported=datetime.now(timezone.utc)
        )
        db.add(cluster)
        db.flush()
        for report in (neighbor, complaint):
            report.cluster_id = master_id
            db.add(ComplaintClusterMember(cluster_id=master_id, complaint_id=report.id, similarity_score=1.0))
        ClusteringService._inherit_master_decision(neighbor, complaint)
        ClusteringService._refresh_canonical_master(db, cluster)
        db.add(AIDecisionEvidence(
            complaint_id=complaint.id, decision_type="MASTER_GRIEVANCE_LINK",
            decision=f"LINKED_TO_{master_id}", confidence=0.95,
            evidence_references=json.dumps([{"type": "MASTER_GRIEVANCE", "reference": master_id}, {"type": "REPORT", "reference": neighbor.id}]),
            reason_codes=json.dumps(["SAME_ISSUE", "WITHIN_50_METERS"]),
            reasoning=f"Preserved report #{complaint.id} under master grievance {master_id}; same issue within {proximity_threshold_m:g} m.",
            model_name="Municipal Grievance Rules", model_version="v2"
        ))
        return cluster

    @staticmethod
    def _refresh_canonical_master(db: Session, cluster: ComplaintCluster) -> None:
        reports = ClusteringService._members(db, cluster.id)
        # A recognized, specific civic issue beats uncertain/placeholder labels.
        ranked = sorted(reports, key=lambda report: (
            0 if _canonical_issue(report) in _MASTER_LABELS else 1,
            -(report.ai_confidence or 0),
            report.created_at or datetime.min.replace(tzinfo=timezone.utc),
        ))
        if not ranked:
            return
        chosen = ranked[0]
        family = _canonical_issue(chosen)
        if family in _MASTER_LABELS:
            label, category = _MASTER_LABELS[family]
            cluster.issue_type = label
            cluster.category = category
            cluster.department_id = resolve_department_id(db, category) or chosen.department_id
        else:
            cluster.issue_type = chosen.issue_type or chosen.category
            cluster.category = chosen.category
            cluster.department_id = chosen.department_id
        cluster.complaint_count = len(reports)

    @staticmethod
    def find_or_create_cluster_for_complaint(db: Session, complaint: Complaint, proximity_threshold_m: float = PROXIMITY_METERS) -> Optional[ComplaintCluster]:
        return ClusteringService.attach_to_master(db, complaint, proximity_threshold_m)

    @staticmethod
    def get_cluster_details(db: Session, cluster_id: str) -> Optional[Dict[str, Any]]:
        cluster = db.query(ComplaintCluster).filter_by(id=cluster_id).first()
        if not cluster:
            return None
        reports = ClusteringService._members(db, cluster_id)
        reporters = ClusteringService._distinct_reporters(reports)
        from ..models.department import Department
        department = db.query(Department).filter_by(id=cluster.department_id).first() if cluster.department_id else None
        evidence_hashes = [_evidence_hashes(r) for r in reports]
        same_evidence = any(evidence_hashes[i] & evidence_hashes[j] for i in range(len(evidence_hashes)) for j in range(i + 1, len(evidence_hashes)))
        return {
            "cluster_id": cluster.id, "master_grievance_id": cluster.id,
            "issue_type": cluster.issue_type, "category": cluster.category,
            "department_id": cluster.department_id, "department_name": department.name if department else None,
            "complaint_count": len(reports), "report_count": len(reports), "reporter_count": reporters,
            "show_report_count": reporters > 1,
            "location": {"lat": cluster.center_lat, "lng": cluster.center_lon, "summary": cluster.location_summary},
            "severity": cluster.severity, "status": cluster.status,
            "grouping_reasons": ["Reports are within 50 meters", "Reports describe the same civic issue"] + (["Matching evidence hash or perceptual image"] if same_evidence else []),
            "first_reported": cluster.first_reported.isoformat() if cluster.first_reported else None,
            "last_reported": cluster.last_reported.isoformat() if cluster.last_reported else None,
            "members": [{"complaint_id": r.id, "citizen_id": r.citizen_id,
                         "issue_type": r.issue_type or r.category, "category": r.category,
                         "department_id": r.department_id, "department_name": r.department.name if r.department else None,
                         "description": r.description, "address": r.address, "landmark": r.landmark,
                         "status": r.status, "severity": r.severity,
                         "evidence": [{"file_url": e.file_url, "type": e.type, "description": e.description} for e in (r.evidence_list or [])],
                         "created_at": r.created_at.isoformat() if r.created_at else None} for r in reports]
        }

    @staticmethod
    def list_active_clusters(db: Session) -> List[Dict[str, Any]]:
        clusters = db.query(ComplaintCluster).filter_by(status="ACTIVE").order_by(desc(ComplaintCluster.complaint_count)).all()
        return [details for cluster in clusters if (details := ClusteringService.get_cluster_details(db, cluster.id))]


def get_complaint_cluster_info(db: Session, complaint_id: str) -> Optional[Dict[str, Any]]:
    clean_id = str(complaint_id).replace("#", "")
    complaint = db.query(Complaint).filter_by(id=clean_id).first()
    if not complaint or not complaint.cluster_id:
        return None
    return ClusteringService.get_cluster_details(db, complaint.cluster_id)


def get_all_active_clusters(db: Session) -> List[Dict[str, Any]]:
    return ClusteringService.list_active_clusters(db)


def cluster_unassigned_complaints(db: Session) -> Dict[str, Any]:
    # Repair legacy broad clusters before exposing them as master grievances.
    clusters = db.query(ComplaintCluster).filter_by(status="ACTIVE").order_by(ComplaintCluster.id.asc()).all()
    # Previous sweeps could create overlapping masters for the very same report
    # set. Consolidate those parent records before validating and repairing links.
    retained: List[ComplaintCluster] = []
    for candidate in clusters:
        candidate_reports = ClusteringService._members(db, candidate.id)
        candidate_ids = {report.id for report in candidate_reports}
        merged = False
        for master in retained:
            master_reports = ClusteringService._members(db, master.id)
            master_ids = {report.id for report in master_reports}
            if not (candidate_ids & master_ids):
                continue
            if not all(any(_same_issue(report, existing) for existing in master_reports)
                       for report in candidate_reports):
                continue
            for member in db.query(ComplaintClusterMember).filter_by(cluster_id=candidate.id).all():
                if member.complaint_id in master_ids:
                    db.delete(member)
                else:
                    member.cluster_id = master.id
                    if member.complaint:
                        member.complaint.cluster_id = master.id
            db.delete(candidate)
            db.flush()
            ClusteringService._refresh_canonical_master(db, master)
            merged = True
            break
        if not merged:
            retained.append(candidate)

    clusters = db.query(ComplaintCluster).filter_by(status="ACTIVE").all()
    for cluster in clusters:
        cluster_members = db.query(ComplaintClusterMember).filter_by(cluster_id=cluster.id).all()
        cluster_reports = [member.complaint for member in cluster_members if member.complaint]
        valid_members = []
        for member in cluster_members:
            report = member.complaint
            valid = bool(report and report.latitude is not None and report.longitude is not None
                         and any(other.id != report.id and _same_issue(report, other) for other in cluster_reports)
                         and compute_haversine_meters(cluster.center_lat, cluster.center_lon,
                                                      report.latitude, report.longitude) <= PROXIMITY_METERS)
            if valid:
                valid_members.append(member)
            else:
                if report and report.cluster_id == cluster.id:
                    report.cluster_id = None
                db.delete(member)
        if len(valid_members) < 2:
            for member in valid_members:
                if member.complaint:
                    member.complaint.cluster_id = None
                db.delete(member)
            db.delete(cluster)
        else:
            cluster.complaint_count = len(valid_members)

    reports = db.query(Complaint).filter(
        Complaint.status.notin_(["Resolved", "Rejected"]),
        Complaint.latitude.isnot(None), Complaint.longitude.isnot(None)
    ).order_by(Complaint.created_at.asc()).all()
    linked = 0
    try:
        for report in reports:
            if ClusteringService.attach_to_master(db, report):
                linked += 1
        # Bring migrated legacy members onto the single recorded official workflow
        # decision while keeping a per-report audit entry for citizen tracking.
        for cluster in db.query(ComplaintCluster).filter_by(status="ACTIVE").all():
            members = ClusteringService._members(db, cluster.id)
            open_members = [member for member in members if member.status not in {"Resolved", "Rejected"}]
            if len(open_members) < 2:
                continue
            master_report = min(open_members, key=lambda report: report.created_at or datetime.min.replace(tzinfo=timezone.utc))
            now = datetime.now(timezone.utc)
            for child in open_members:
                if child.id == master_report.id or child.requires_human_review:
                    continue
                before = (child.status, child.department_id, child.assigned_officer_id, child.assigned_officer_name)
                ClusteringService._inherit_master_decision(master_report, child)
                after = (child.status, child.department_id, child.assigned_officer_id, child.assigned_officer_name)
                if before != after:
                    db.add(ComplaintHistory(
                        complaint_id=child.id, old_status=before[0], new_status=after[0],
                        changed_by="Master Grievance Reconciliation",
                        remarks=f"Report linked to master grievance {cluster.id}; its official department and workflow decision now apply.",
                        timestamp=now
                    ))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"status": "SUCCESS", "processed_count": len(reports), "reports_linked_or_joined": linked,
            "active_master_grievances": len(ClusteringService.list_active_clusters(db)), "proximity_meters": PROXIMITY_METERS}
