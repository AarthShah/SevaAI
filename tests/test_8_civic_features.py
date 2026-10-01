"""
End-to-End Test Suite for CivicSeva 8 AI Features
Verifies:
1. Resolution Verification
2. Duplicate Complaint Detection
3. Complaint Clustering
4. Location Intelligence
5. Intelligent Department Routing
6. Evidence-Grounded AI Decisions
7. SLA Prediction & Breach Probability
8. Proactive AI Watchdog
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from sqlalchemy.orm import Session
from backend.app.database.session import SessionLocal
from backend.app.models.complaint import Complaint
from backend.app.services.resolution_service import (
    process_resolution_submission,
    get_resolution_verification,
    confirm_resolution,
    reopen_resolution
)
from backend.app.services.duplicate_service import (
    find_duplicate_candidates,
    check_pre_submission_duplicates
)
from backend.app.services.clustering_service import (
    get_complaint_cluster_info,
    get_all_active_clusters,
    cluster_unassigned_complaints
)
from backend.app.services.location_service import (
    extract_and_enrich_location,
    get_location_intelligence
)
from backend.app.services.department_routing_service import (
    recommend_department,
    apply_supervisor_routing_override,
    get_department_workload_metrics
)
from backend.app.services.evidence_grounding_service import (
    compile_full_audit_trace,
    get_complaint_decision_evidence
)
from backend.app.services.sla_prediction_service import (
    compute_sla_prediction,
    get_complaint_sla_prediction
)
from backend.app.services.watchdog_service import (
    run_watchdog_sweep,
    get_watchdog_events_for_complaint,
    get_all_recent_watchdog_events
)


def test_feature_1_resolution_verification(db_session: Session):
    complaint = db_session.query(Complaint).first()
    assert complaint is not None, "At least one test complaint must exist."

    # Test retrieval (initially None or existing)
    verif = get_resolution_verification(db_session, complaint.id)
    # Confirm action
    res = confirm_resolution(db_session, complaint.id, remarks="Supervisor verified in test")
    assert res["complaint_id"] == complaint.id
    assert res["status"] == "Resolved"

    # Reopen action
    reopen = reopen_resolution(db_session, complaint.id, reason="Test reopen request")
    assert reopen["status"] == "In Progress"
    print("\n[PASS] Feature 1: Resolution Verification (Confirm & Reopen verified)")


def test_feature_2_duplicate_detection(db_session: Session):
    # Pre-submission duplicate check
    dupe_scan = check_pre_submission_duplicates(
        db=db_session,
        title="Severe Pothole on MG Road",
        description="Deep crater damaging vehicles near Rajwada",
        category="pothole",
        lat=22.7196,
        lon=75.8577
    )
    assert "duplicate_detected" in dupe_scan
    assert "candidates" in dupe_scan
    print(f"\n[PASS] Feature 2: Duplicate Detection (Detected: {dupe_scan['duplicate_detected']}, Top prob: {dupe_scan.get('top_probability', 0)})")


def test_feature_3_complaint_clustering(db_session: Session):
    sweep = cluster_unassigned_complaints(db_session)
    assert sweep["status"] == "SUCCESS"
    clusters = get_all_active_clusters(db_session)
    assert isinstance(clusters, list)
    print(f"\n[PASS] Feature 3: Complaint Clustering (Active clusters: {len(clusters)})")


def test_feature_4_location_intelligence(db_session: Session):
    complaint = db_session.query(Complaint).first()
    assert complaint is not None

    loc = get_location_intelligence(db_session, complaint.id)
    if not loc:
        loc = extract_and_enrich_location(db_session, complaint)
    
    assert loc is not None
    assert "ward" in loc
    assert "zone" in loc
    assert "consistency_flag" in loc
    print(f"\n[PASS] Feature 4: Location Intelligence (Ward: {loc.get('ward')}, Zone: {loc.get('zone')})")


def test_feature_5_department_routing(db_session: Session):
    complaint = db_session.query(Complaint).first()
    assert complaint is not None

    routing = recommend_department(db_session, complaint)
    assert "primary_recommendation" in routing
    assert "department_code" in routing["primary_recommendation"]

    # Workload metrics
    workloads = get_department_workload_metrics(db_session)
    assert "ROAD_DEPT" in workloads
    assert "active_tickets" in workloads["ROAD_DEPT"]
    print(f"\n[PASS] Feature 5: Department Routing (Primary: {routing['primary_recommendation']['department_name']})")


def test_feature_6_evidence_grounded_decisions(db_session: Session):
    complaint = db_session.query(Complaint).first()
    assert complaint is not None

    trace = compile_full_audit_trace(db_session, complaint)
    assert "grounded_decisions" in trace
    assert len(trace["grounded_decisions"]) >= 4
    facets = [d["facet"] for d in trace["grounded_decisions"]]
    assert "AUTHENTICITY_VERIFICATION" in facets
    assert "SEVERITY_CLASSIFICATION" in facets
    print(f"\n[PASS] Feature 6: Evidence Grounding (Facets grounded: {', '.join(facets)})")


def test_feature_7_sla_prediction(db_session: Session):
    complaint = db_session.query(Complaint).first()
    assert complaint is not None

    sla = get_complaint_sla_prediction(db_session, complaint.id)
    assert sla is not None
    assert "target_sla_hours" in sla
    assert "sla_breach_probability" in sla
    assert "risk_status" in sla
    print(f"\n[PASS] Feature 7: SLA Prediction (Target: {sla['target_sla_hours']}h, Breach Risk: {sla['risk_status']} / {int(sla['sla_breach_probability']*100)}%)")


def test_feature_8_proactive_watchdog(db_session: Session):
    sweep = run_watchdog_sweep(db_session)
    assert "scanned_tickets_count" in sweep
    assert sweep["scanned_tickets_count"] > 0
    all_events = get_all_recent_watchdog_events(db_session, limit=10)
    assert isinstance(all_events, list)
    print(f"\n[PASS] Feature 8: Proactive Watchdog (Tickets scanned: {sweep['scanned_tickets_count']}, Stalled: {sweep['stalled_count']})")


if __name__ == "__main__":
    db = SessionLocal()
    tests = [
        ("Feature 1: Resolution Verification", test_feature_1_resolution_verification),
        ("Feature 2: Duplicate Detection", test_feature_2_duplicate_detection),
        ("Feature 3: Complaint Clustering", test_feature_3_complaint_clustering),
        ("Feature 4: Location Intelligence", test_feature_4_location_intelligence),
        ("Feature 5: Department Routing", test_feature_5_department_routing),
        ("Feature 6: Evidence Grounding", test_feature_6_evidence_grounded_decisions),
        ("Feature 7: SLA Prediction", test_feature_7_sla_prediction),
        ("Feature 8: Proactive Watchdog", test_feature_8_proactive_watchdog),
    ]

    print("\n" + "=" * 65)
    print("CIVICSEVA 8 AI FEATURES - AUTOMATED VERIFICATION SUITE")
    print("=" * 65)
    passed = 0
    failed = 0
    for name, func in tests:
        try:
            func(db)
            passed += 1
        except Exception as e:
            failed += 1
            print(f"\n[FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()

    db.close()
    print("\n" + "=" * 65)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED (TOTAL: {len(tests)})")
    print("=" * 65 + "\n")
    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)
