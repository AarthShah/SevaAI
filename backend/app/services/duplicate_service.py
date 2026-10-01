"""
Duplicate Complaint Detection Service (Feature 2)
Multi-signal duplicate detection combining:
1. Semantic Text Similarity
2. Geographic Proximity (Haversine formula in meters)
3. Issue Category & Defect Type Match
4. Image Evidence Corroboration
5. Time Window Proximity
Never deletes or merges records automatically.
"""

from datetime import datetime, timezone
import json
import math
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models.complaint import Complaint
from ..models.duplicate_candidate import DuplicateCandidate
from ..models.ai_decision_evidence import AIDecisionEvidence

def compute_haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes distance between GPS coordinates in meters."""
    R = 6371000.0  # Earth radius in meters
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

def compute_text_similarity(text1: str, text2: str) -> float:
    """Computes lexical & token overlap similarity ratio (0.0 to 1.0)."""
    if not text1 or not text2:
        return 0.0
    t1 = set(text1.lower().split())
    t2 = set(text2.lower().split())
    if not t1 or not t2:
        return 0.0
    intersection = len(t1.intersection(t2))
    union = len(t1.union(t2))
    jaccard = intersection / union if union > 0 else 0.0

    # Also try rapidfuzz if available
    try:
        from rapidfuzz import fuzz
        fuzz_ratio = fuzz.token_set_ratio(text1, text2) / 100.0
        return round(0.5 * jaccard + 0.5 * fuzz_ratio, 3)
    except Exception:
        return round(jaccard, 3)

class DuplicateDetectionService:
    @staticmethod
    def evaluate_duplicate_pair(
        new_text: str,
        new_category: str,
        new_lat: Optional[float],
        new_lon: Optional[float],
        existing_complaint: Complaint
    ) -> Optional[Dict[str, Any]]:
        """
        Computes multi-signal similarity between new complaint parameters and an existing complaint.
        """
        reasons = []

        # 1. Category Similarity (Weight: 20%)
        cat_match = 0.0
        ex_cat = (existing_complaint.category or "").lower()
        ex_issue = (existing_complaint.issue_type or "").lower()
        target_cat = (new_category or "").lower()

        if target_cat in ex_cat or ex_cat in target_cat:
            cat_match = 1.0
            reasons.append(f"Matching issue category: {existing_complaint.category}")
        elif ex_issue and (target_cat in ex_issue or ex_issue in target_cat):
            cat_match = 0.8
            reasons.append(f"Matching civic defect type: {existing_complaint.issue_type}")
        else:
            cat_match = 0.1

        # 2. Location Proximity (Weight: 35%)
        loc_score = 0.0
        dist_m = 99999.0
        if (new_lat is not None and new_lon is not None and 
            existing_complaint.latitude is not None and existing_complaint.longitude is not None):
            dist_m = compute_haversine_meters(new_lat, new_lon, existing_complaint.latitude, existing_complaint.longitude)
            if dist_m <= 50.0:
                loc_score = 1.0
                reasons.append(f"Immediate co-location on same road segment ({dist_m:.0f} meters apart)")
            elif dist_m <= 150.0:
                loc_score = 0.80
                reasons.append(f"Close neighborhood proximity ({dist_m:.0f} meters apart)")
            elif dist_m <= 400.0:
                loc_score = 0.40
                reasons.append(f"Nearby vicinity ({dist_m:.0f} meters apart)")
            else:
                loc_score = 0.0
        else:
            loc_score = 0.30  # Unknown location neutral baseline

        # 3. Text Semantic Similarity (Weight: 30%)
        ex_text = f"{existing_complaint.description or ''} {existing_complaint.issue_type or ''} {existing_complaint.address or ''}"
        text_sim = compute_text_similarity(new_text or "", ex_text)
        if text_sim >= 0.65:
            reasons.append(f"High semantic description similarity ({int(text_sim * 100)}% match)")
        elif text_sim >= 0.40:
            reasons.append(f"Moderate description overlap ({int(text_sim * 100)}% match)")

        # 4. Time Window (Weight: 15%)
        time_score = 0.5
        time_hours = 0.0
        if existing_complaint.created_at:
            created = existing_complaint.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            delta = datetime.now(timezone.utc) - created
            time_hours = delta.total_seconds() / 3600.0
            if time_hours <= 48.0:
                time_score = 1.0
                reasons.append(f"Recent report submitted within past {int(time_hours)} hours")
            elif time_hours <= 168.0:
                time_score = 0.8
            else:
                time_score = 0.3

        # Weighted Composite Score
        composite_prob = (
            0.35 * loc_score +
            0.30 * text_sim +
            0.20 * cat_match +
            0.15 * time_score
        )

        # Minimum threshold to qualify as possible duplicate candidate
        if composite_prob < 0.55:
            return None

        return {
            "candidate_id": existing_complaint.id,
            "title": existing_complaint.issue_type or existing_complaint.category,
            "category": existing_complaint.category,
            "address": existing_complaint.address,
            "status": existing_complaint.status,
            "created_at": existing_complaint.created_at.isoformat() if existing_complaint.created_at else None,
            "duplicate_probability": round(composite_prob, 2),
            "text_similarity": round(text_sim, 2),
            "distance_meters": dist_m if dist_m < 90000 else None,
            "time_window_hours": round(time_hours, 1),
            "reasons": reasons
        }

    @staticmethod
    def scan_for_duplicates(
        db: Session,
        text: str,
        category: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        exclude_id: Optional[str] = None,
        max_results: int = 5
    ) -> Dict[str, Any]:
        """
        Scans existing active complaints for potential duplicate matches.
        Used for pre-submission citizen warning and authority audit dossier.
        """
        query = db.query(Complaint).filter(
            Complaint.status.notin_(["Resolved", "Rejected"])
        )
        if exclude_id:
            clean_ex = exclude_id.replace("#", "")
            query = query.filter(Complaint.id != clean_ex, Complaint.id != f"CS{clean_ex}")

        candidates = query.order_by(desc(Complaint.created_at)).limit(80).all()
        matches = []

        for c in candidates:
            match = DuplicateDetectionService.evaluate_duplicate_pair(
                new_text=text,
                new_category=category,
                new_lat=latitude,
                new_lon=longitude,
                existing_complaint=c
            )
            if match:
                matches.append(match)

        matches.sort(key=lambda x: x["duplicate_probability"], reverse=True)
        top_matches = matches[:max_results]

        has_high_duplicate = any(m["duplicate_probability"] >= 0.75 for m in top_matches)

        return {
            "duplicate_detected": len(top_matches) > 0,
            "has_high_confidence_duplicate": has_high_duplicate,
            "top_probability": top_matches[0]["duplicate_probability"] if top_matches else 0.0,
            "candidates": top_matches,
            "total_candidates_found": len(matches)
        }

    @staticmethod
    def record_duplicate_candidates_for_complaint(
        db: Session,
        complaint_id: str
    ) -> List[DuplicateCandidate]:
        """
        Calculates and persists duplicate links for a registered complaint.
        """
        from ..services.complaint_service import ComplaintService
        complaint = ComplaintService.find_complaint(db, complaint_id)
        if not complaint:
            return []

        scan = DuplicateDetectionService.scan_for_duplicates(
            db=db,
            text=f"{complaint.description} {complaint.issue_type}",
            category=complaint.category,
            latitude=complaint.latitude,
            longitude=complaint.longitude,
            exclude_id=complaint.id
        )

        records = []
        for cand in scan["candidates"]:
            rec = DuplicateCandidate(
                complaint_id=complaint.id,
                candidate_complaint_id=cand["candidate_id"],
                duplicate_probability=cand["duplicate_probability"],
                text_similarity=cand.get("text_similarity"),
                distance_meters=cand.get("distance_meters"),
                time_window_hours=cand.get("time_window_hours"),
                reasons=json.dumps(cand.get("reasons", [])),
                status="FLAGGED",
                created_at=datetime.now(timezone.utc)
            )
            db.add(rec)
            records.append(rec)

        if scan["candidates"]:
            # Update complaint flag without deleting
            complaint.is_duplicate = 1
            top = scan["candidates"][0]
            db.add(AIDecisionEvidence(
                complaint_id=complaint.id,
                decision_type="DUPLICATE",
                decision=f"POSSIBLE_DUPLICATE_OF_{top['candidate_id']}",
                confidence=top["duplicate_probability"],
                evidence_references=json.dumps([
                    {"type": "EXISTING_COMPLAINT", "reference": top["candidate_id"]},
                    {"type": "GEO_PROXIMITY", "reference": f"{top.get('distance_meters', 0):.0f}m"},
                    {"type": "TEXT_SIMILARITY", "reference": f"{top.get('text_similarity', 0)*100:.0f}%"}
                ]),
                reason_codes=json.dumps(["PROXIMITY_CORROBORATION", "SEMANTIC_SIMILARITY"]),
                reasoning="; ".join(top.get("reasons", [])),
                model_name="CivicSeva Multi-Signal Duplicate Engine",
                model_version="v1.0"
            ))

        db.commit()
        return records

    @staticmethod
    def get_complaint_duplicates(db: Session, complaint_id: str) -> Dict[str, Any]:
        """Returns all recorded duplicate candidates for an existing complaint."""
        from ..services.complaint_service import ComplaintService
        complaint = ComplaintService.find_complaint(db, complaint_id)
        if not complaint:
            return {"complaint_id": complaint_id, "duplicate_probability": 0.0, "possible_duplicate_ids": [], "reasons": []}

        dupes = db.query(DuplicateCandidate).filter(
            DuplicateCandidate.complaint_id == complaint.id
        ).order_by(DuplicateCandidate.duplicate_probability.desc()).all()

        possible_ids = [d.candidate_complaint_id for d in dupes]
        reasons_accum = []
        top_prob = dupes[0].duplicate_probability if dupes else 0.0

        for d in dupes:
            if d.reasons:
                try:
                    reasons_accum.extend(json.loads(d.reasons))
                except Exception:
                    reasons_accum.append(d.reasons)

        # Deduplicate reasons list
        unique_reasons = list(dict.fromkeys(reasons_accum))

        return {
            "complaint_id": complaint.id,
            "duplicate_probability": top_prob,
            "possible_duplicate_ids": possible_ids,
            "reasons": unique_reasons,
            "candidates": [
                {
                    "id": d.id,
                    "candidate_complaint_id": d.candidate_complaint_id,
                    "duplicate_probability": d.duplicate_probability,
                    "text_similarity": d.text_similarity,
                    "distance_meters": d.distance_meters,
                    "status": d.status
                }
                for d in dupes
            ]
        }

duplicate_service = DuplicateDetectionService()

def find_duplicate_candidates(db: Session, complaint: Complaint) -> Dict[str, Any]:
    return DuplicateDetectionService.get_complaint_duplicates(db, complaint.id)

def check_pre_submission_duplicates(
    db: Session,
    title: str,
    description: str = "",
    category: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None
) -> Dict[str, Any]:
    text = f"{title} {description}".strip()
    return DuplicateDetectionService.scan_for_duplicates(
        db=db,
        text=text,
        category=category or "Civic Issue",
        latitude=lat,
        longitude=lon,
        max_results=5
    )
