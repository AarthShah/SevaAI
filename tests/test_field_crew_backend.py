"""Focused unit coverage for field assignment capacity, route fixtures, and evidence uploads."""

import asyncio
from datetime import date
from io import BytesIO
from pathlib import Path, PurePosixPath
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import unquote

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from PIL import Image

from backend.app.database.base import Base
from backend.app.database.seed_field_crew_demo import build_field_crew_cases, seed_field_crew_demo
from backend.app.models.complaint import Complaint
from backend.app.models.department import Department
from backend.app.models.evidence import Evidence
from backend.app.models.officer import Officer
from backend.app.models.resolution_verification import ResolutionEvidence
from backend.app.api.complaints import OfficerAssignRequest, assign_officer_to_complaint, api_submit_resolution_evidence
from backend.app.api.officers import get_officer_tasks
from backend.app.services.autonomous_agent import AutonomousAgentEngine
from backend.app.schemas.complaint import ComplaintSubmitRequest
from backend.app.services.complaint_service import ComplaintService
from backend.app.services.department_routing_service import recommend_department


class FieldCrewBackendTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.db = self.Session()
        departments = [
            (1, "Municipal Road Department", "road_infrastructure"),
            (2, "Waste Management & Sanitation Department", "waste_management"),
            (3, "Electrical & Street Lighting Department", "electrical_street_lighting"),
            (4, "Water Supply & Sewerage Board", "water_supply"),
            (5, "Drainage & Stormwater Department", "drainage_sanitation"),
            (6, "General Civic Administration", "public_safety_other"),
        ]
        self.db.add_all([Department(id=i, name=name, category=category) for i, name, category in departments])
        self.db.flush()
        self.db.add_all([
            Officer(id=1, name="Crew One", role="Road Crew", department_id=1, phone="100", current_lat=18.52, current_lon=73.85, status="ON_DUTY", active_tickets=0),
            Officer(id=2, name="Crew Two", role="Road Crew", department_id=1, phone="101", current_lat=18.53, current_lon=73.86, status="AVAILABLE", active_tickets=0),
            Officer(id=3, name="Waste Crew", role="Sanitation Crew", department_id=2, phone="102", current_lat=18.52, current_lon=73.85, status="AVAILABLE", active_tickets=0),
            Officer(id=4, name="Waste Crew Two", role="Sanitation Crew", department_id=2, phone="103", current_lat=18.52, current_lon=73.85, status="AVAILABLE", active_tickets=0),
            Officer(id=5, name="Electrical Crew", role="Electrical Crew", department_id=3, phone="104", current_lat=18.52, current_lon=73.85, status="AVAILABLE", active_tickets=0),
            Officer(id=6, name="Water Crew", role="Water Crew", department_id=4, phone="105", current_lat=18.52, current_lon=73.85, status="AVAILABLE", active_tickets=0),
            Officer(id=7, name="Drainage Crew", role="Drainage Crew", department_id=5, phone="106", current_lat=18.52, current_lon=73.85, status="AVAILABLE", active_tickets=0),
            Officer(id=8, name="General Crew Two", role="General Crew", department_id=6, phone="107", current_lat=18.52, current_lon=73.85, status="AVAILABLE", active_tickets=0),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def add_complaint(self, complaint_id, status="Submitted", officer_id=None, **kwargs):
        complaint = Complaint(
            id=complaint_id,
            category="road_infrastructure",
            issue_type="Pothole",
            description="Field crew unit fixture",
            status=status,
            department_id=1,
            assigned_officer_id=officer_id,
            assigned_officer_name="Crew One" if officer_id == 1 else None,
            latitude=18.52,
            longitude=73.85,
            **kwargs,
        )
        self.db.add(complaint)
        self.db.commit()
        return complaint

    def test_manual_dispatch_allows_twelfth_nearby_job_then_blocks_thirteenth(self):
        officer = self.db.get(Officer, 1)
        officer.daily_assignment_count = 11
        officer.daily_assignment_date = date.today().isoformat()
        self.add_complaint("FCUT-020")
        result = assign_officer_to_complaint("FCUT-020", OfficerAssignRequest(officer_id=1), self.db, None)
        self.assertEqual(result["assigned_officer"]["id"], 1)
        self.assertEqual(officer.daily_assignment_count, 12)

        self.add_complaint("FCUT-021")
        with self.assertRaises(HTTPException) as caught:
            assign_officer_to_complaint("FCUT-021", OfficerAssignRequest(officer_id=1), self.db, None)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertIsNone(self.db.get(Complaint, "FCUT-021").assigned_officer_id)

    def test_reassigning_same_job_does_not_spend_capacity_twice(self):
        officer = self.db.get(Officer, 1)
        officer.daily_assignment_count = 12
        officer.daily_assignment_date = date.today().isoformat()
        complaint = self.add_complaint("FCUT-SAME", status="Assigned", officer_id=1)
        result = assign_officer_to_complaint(complaint.id, OfficerAssignRequest(officer_id=1), self.db, None)
        self.assertEqual(result["assigned_officer"]["id"], 1)
        self.assertEqual(officer.daily_assignment_count, 12)

    def test_ai_dispatch_skips_offline_or_daily_capped_workers(self):
        first = self.db.get(Officer, 1)
        second = self.db.get(Officer, 2)
        first.daily_assignment_count = 12
        first.daily_assignment_date = date.today().isoformat()
        second.status = "OFFLINE"
        result = AutonomousAgentEngine.find_nearest_available_officer(self.db, 1, 18.52, 73.85)
        self.assertIsNone(result["officer_id"])
        self.assertIn("queued", result["dispatch_message"].lower())

    def test_ai_dispatch_uses_capacity_below_daily_limit(self):
        first = self.db.get(Officer, 1)
        self.db.get(Officer, 2).status = "OFFLINE"
        first.daily_assignment_count = 11
        first.daily_assignment_date = date.today().isoformat()
        result = AutonomousAgentEngine.find_nearest_available_officer(self.db, 1, 18.52, 73.85)
        self.assertEqual(result["officer_id"], 1)
        self.assertEqual(first.daily_assignment_count, 12)

    def test_ai_dispatch_reduces_daily_allowance_for_far_route(self):
        officer = self.db.get(Officer, 1)
        officer.current_lat = 18.52
        officer.current_lon = 73.85
        officer.daily_assignment_date = date.today().isoformat()
        officer.daily_assignment_count = 6
        officer.status = "AVAILABLE"
        self.db.get(Officer, 2).status = "OFFLINE"
        result = AutonomousAgentEngine.find_nearest_available_officer(self.db, 1, 18.62, 73.85)
        self.assertIsNone(result["officer_id"])
        self.assertIn("distance-adjusted", result["dispatch_message"].lower())

    def test_manual_assignment_uses_lower_daily_limit_for_far_work(self):
        officer = self.db.get(Officer, 1)
        officer.current_lat = 18.52
        officer.current_lon = 73.85
        officer.daily_assignment_date = date.today().isoformat()
        officer.daily_assignment_count = 3
        complaint = self.add_complaint("FCUT-FAR")
        complaint.latitude = 18.62
        complaint.longitude = 73.85
        self.db.commit()
        with self.assertRaises(HTTPException) as caught:
            assign_officer_to_complaint(complaint.id, OfficerAssignRequest(officer_id=1), self.db, None)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertIn("maximum 12", caught.exception.detail.lower())

    def test_ai_dispatch_never_uses_a_different_department_as_fallback(self):
        for officer in self.db.query(Officer).filter(Officer.department_id == 1).all():
            officer.status = "OFFLINE"
        result = AutonomousAgentEngine.find_nearest_available_officer(self.db, 1, 18.52, 73.85)
        self.assertIsNone(result["officer_id"])
        self.assertIn("responsible department", result["dispatch_message"].lower())

    def test_manual_assignment_rejects_a_crew_from_the_wrong_department(self):
        complaint = self.add_complaint("FCUT-WRONG-DEPT")
        with self.assertRaises(HTTPException) as caught:
            assign_officer_to_complaint(complaint.id, OfficerAssignRequest(officer_id=3), self.db, None)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertIsNone(self.db.get(Complaint, complaint.id).assigned_officer_id)

    def test_category_wins_over_stale_numeric_or_ai_department_codes(self):
        for department_ref in (1, "DEPT_WATER"):
            result = ComplaintService.submit_complaint(
                self.db,
                ComplaintSubmitRequest(
                    category="water_supply",
                    issue_type="Water leak",
                    department_id=department_ref,
                    latitude=18.52,
                    longitude=73.85,
                ),
            )
            self.assertEqual(result.department_id, 4)

    def test_department_recommendation_honors_water_category_over_road_keywords(self):
        complaint = Complaint(
            id="FCUT-WATER-ROUTE",
            category="water_supply",
            issue_type="Water leak",
            description="Water leak along a road near the bus stop",
            status="Submitted",
            department_id=1,
        )
        self.db.add(complaint)
        self.db.commit()
        result = recommend_department(self.db, complaint)
        self.assertEqual(result["primary_recommendation"]["department_code"], "WATER_DEPT")

    def test_demo_fixture_has_25_cases_with_clusters_gps_gaps_and_priority_edges(self):
        cases = build_field_crew_cases()
        self.assertEqual(len(cases), 25)
        self.assertEqual(len({case["id"] for case in cases}), 25)
        self.assertTrue(any(case["cluster_id"] for case in cases))
        self.assertTrue(any(case["latitude"] is None or case["longitude"] is None for case in cases))
        self.assertTrue(any(case["severity"] == "CRITICAL" for case in cases))
        self.assertTrue(any(case["requires_human_review"] for case in cases))
        crew_department = {1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6}
        for case in cases:
            if case["assigned_officer_id"]:
                self.assertEqual(crew_department[case["assigned_officer_id"]], case["department_id"])
            image_root = Path(__file__).resolve().parents[1] / "frontend" / "image"
            before_path = image_root.joinpath(*PurePosixPath(unquote(case["before_photo_url"].removeprefix("/image/"))).parts)
            after_path = image_root.joinpath(*PurePosixPath(unquote(case["after_photo_url"].removeprefix("/image/"))).parts)
            self.assertTrue(before_path.is_file())
            self.assertTrue(after_path.is_file())
        self.assertEqual(sum(case["assigned_officer_id"] is not None for case in cases), 20)
        self.assertEqual(sum(case["assigned_officer_id"] is None for case in cases), 5)

    def test_demo_seed_is_additive_repeatable_and_increments_capacity_once(self):
        first = seed_field_crew_demo(self.db)
        self.assertEqual(first["inserted"], 25)
        self.assertEqual(self.db.query(Complaint).filter(Complaint.id.like("FC-DEMO-%")).count(), 25)
        self.assertEqual(self.db.get(Officer, 1).daily_assignment_count, 7)
        self.assertEqual(self.db.get(Officer, 2).daily_assignment_count, 0)
        self.assertEqual(self.db.get(Officer, 3).daily_assignment_count, 3)
        self.assertEqual(self.db.get(Officer, 4).daily_assignment_count, 0)
        self.assertEqual(self.db.get(Officer, 5).daily_assignment_count, 3)
        self.assertEqual(self.db.get(Officer, 6).daily_assignment_count, 3)
        self.assertEqual(self.db.get(Officer, 7).daily_assignment_count, 4)

        second = seed_field_crew_demo(self.db)
        self.assertEqual(second["inserted"], 0)
        self.assertEqual(self.db.query(Complaint).filter(Complaint.id.like("FC-DEMO-%")).count(), 25)
        self.assertEqual(self.db.get(Officer, 1).daily_assignment_count, 7)

    def test_officer_tasks_include_report_photo_landmark_and_existing_completion_photo(self):
        self.add_complaint("FCUT-MEDIA", status="Awaiting Verification", officer_id=1)
        self.db.add(Evidence(complaint_id="FCUT-MEDIA", type="image", file_url="/sample_evidence/pothole.jpg", description="Before"))
        from backend.app.models.location_intelligence import LocationIntelligence
        self.db.add(LocationIntelligence(complaint_id="FCUT-MEDIA", latitude=18.52, longitude=73.85, landmark="Central Bus Stop", area="Central Ward"))
        self.db.add(ResolutionEvidence(complaint_id="FCUT-MEDIA", worker_id=1, after_image_url="/sample_evidence/pothole_after.jpg"))
        self.db.commit()

        payload = get_officer_tasks(1, self.db)
        item = next(task for task in payload["tasks"] if task["id"] == "FCUT-MEDIA")
        self.assertEqual(item["image_url"], "/sample_evidence/pothole.jpg")
        self.assertEqual(item["landmark"], "Central Bus Stop")
        self.assertEqual(item["completion_photo_url"], "/sample_evidence/pothole_after.jpg")

    def test_valid_completion_photo_upload_creates_evidence_and_moves_to_review(self):
        self.add_complaint("FCUT-UPLOAD", status="In Progress", officer_id=1)
        self.db.add(Evidence(complaint_id="FCUT-UPLOAD", type="image", file_url="/sample_evidence/pothole.jpg"))
        self.db.commit()
        image_bytes = BytesIO()
        Image.new("RGB", (320, 320), "white").save(image_bytes, format="PNG")
        upload = UploadFile(
            filename="repair.png",
            file=BytesIO(image_bytes.getvalue()),
            headers=Headers({"content-type": "image/png"}),
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            with patch("backend.app.api.complaints.UPLOAD_DIR", temp_path), patch("backend.app.services.resolution_service.UPLOAD_DIR", temp_path):
                result = asyncio.run(api_submit_resolution_evidence("FCUT-UPLOAD", upload, "Repair complete", 1, self.db))
                uploaded = temp_path / result["after_image_url"].rsplit("/", 1)[-1]
                self.assertTrue(uploaded.is_file())
                self.assertEqual(result["status"], "LIKELY_RESOLVED")

        self.assertEqual(self.db.get(Complaint, "FCUT-UPLOAD").status, "Awaiting Verification")
        evidence = self.db.query(ResolutionEvidence).filter_by(complaint_id="FCUT-UPLOAD").one()
        self.assertEqual(evidence.worker_id, 1)

    def test_completion_upload_rejects_non_image_content(self):
        self.add_complaint("FCUT-BADUPLOAD")
        upload = UploadFile(
            filename="repair.exe",
            file=BytesIO(b"not an image"),
            headers=Headers({"content-type": "application/octet-stream"}),
        )
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(api_submit_resolution_evidence("FCUT-BADUPLOAD", upload, None, None, self.db))
        self.assertEqual(caught.exception.status_code, 415)


if __name__ == "__main__":
    unittest.main()
