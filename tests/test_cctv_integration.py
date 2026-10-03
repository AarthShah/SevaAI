"""
Phase 10 CCTV AI -> SevaAI Integration Test Suite

Verifies:
1. Valid CCTV event submission (POST /api/cctv/events with service key)
2. Invalid payload rejection (invalid confidence or missing camera_id)
3. Unauthorized request rejection (missing/invalid service key -> 401)
4. Duplicate event_id replay protection (409 Conflict)
5. Event retrieval for authorized officer (GET /api/cctv/events -> 200)
6. Event filtering (by status, severity, camera_id)
7. Evidence retrieval (GET /api/cctv/events/{id}/evidence -> 200 image/jpeg)
8. Officer-only access (authority role allowed to access and review)
9. Citizen access denied (citizen role gets 403 Forbidden)
10. CCTV -> SevaAI end-to-end flow (Edge Ingest -> Officer View -> Officer Review -> Explicit Convert -> Complaint Created)
11. Officer Assistant CCTV Queries (Show recent pothole detections, Show evidence)
"""

import base64
import os
import sys
import unittest
from pathlib import Path

# Guarantee root directory is in sys.path
_ROOT_DIR = Path(__file__).resolve().parent.parent
if str(_ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(_ROOT_DIR))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import CCTV_SERVICE_KEY
from backend.app.database.session import SessionLocal, ensure_db_initialized
from backend.app.models.user import User
from backend.app.models.cctv_event import CctvEvent
from backend.app.models.complaint import Complaint
from backend.app.utils.security import create_access_token


class TestCctvIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_db_initialized()
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Users
        cls.citizen = cls.db.query(User).filter(User.role == "citizen").first()
        if not cls.citizen:
            cls.citizen = User(
                username="test_citizen_cctv",
                email="citizen_cctv@test.org",
                role="citizen",
                hashed_password="hash",
                full_name="Test Citizen"
            )
            cls.db.add(cls.citizen)
            cls.db.commit()
            cls.db.refresh(cls.citizen)

        cls.authority = cls.db.query(User).filter(User.role == "authority").first()
        if not cls.authority:
            cls.authority = User(
                username="test_authority_cctv",
                email="authority_cctv@test.org",
                role="authority",
                hashed_password="hash",
                full_name="Officer Sharma"
            )
            cls.db.add(cls.authority)
            cls.db.commit()
            cls.db.refresh(cls.authority)

        cls.citizen_headers = {"Authorization": f"Bearer {create_access_token({'user_id': cls.citizen.id})}"}
        cls.authority_headers = {"Authorization": f"Bearer {create_access_token({'user_id': cls.authority.id})}"}
        cls.service_headers = {"X-CCTV-Service-Key": CCTV_SERVICE_KEY}

        # Clean any stale test events from prior runs
        cls._cleanup_test_data()

        # 1x1 test JPEG
        cls.tiny_jpeg_b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

    @classmethod
    def _cleanup_test_data(cls):
        test_events = cls.db.query(CctvEvent).filter(CctvEvent.event_id.like("test_evt_%")).all()
        for ev in test_events:
            if ev.complaint_id:
                cls.db.query(Complaint).filter(Complaint.id == ev.complaint_id).delete()
            cls.db.delete(ev)
        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls._cleanup_test_data()
        cls.db.close()

    def test_01_valid_cctv_event_submission(self):
        """Test 1: Submitting a valid confirmed CCTV event with service key succeeds."""
        payload = {
            "event_id": "test_evt_001",
            "event_type": "POTHOLE_DETECTED",
            "camera_id": "CAM-TEST-01",
            "source_video": "street_pothole_sample_3.mp4",
            "confidence": 0.654,
            "peak_confidence": 0.710,
            "event_score": 0.820,
            "severity": "HIGH",
            "timestamp": "00:00:03.200",
            "frame_number": 48,
            "bbox": [150.0, 220.0, 290.0, 280.0],
            "persistence_seconds": 0.60,
            "supporting_detections": 10,
            "evidence_image_base64": self.tiny_jpeg_b64,
            "location_metadata": {
                "latitude": 18.5204,
                "longitude": 73.8567,
                "address": "Shivajinagar Road Corridor"
            }
        }
        res = self.client.post("/api/cctv/events", json=payload, headers=self.service_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], "STORED")
        self.assertEqual(data["event_id"], "test_evt_001")
        self.assertEqual(data["review_status"], "PENDING_REVIEW")

        # Verify DB record
        ev = self.db.query(CctvEvent).filter(CctvEvent.event_id == "test_evt_001").first()
        self.assertIsNotNone(ev)
        self.assertEqual(ev.camera_id, "CAM-TEST-01")
        self.assertEqual(ev.severity, "HIGH")
        self.assertAlmostEqual(ev.confidence, 0.654, places=3)
        self.assertEqual(ev.supporting_detections, 10)
        self.assertIsNotNone(ev.evidence_image_path)

    def test_02_invalid_payload_rejection(self):
        """Test 2: Submitting invalid payload (confidence > 1.0) is rejected."""
        payload = {
            "event_id": "test_evt_invalid",
            "event_type": "POTHOLE_DETECTED",
            "camera_id": "CAM-TEST-01",
            "confidence": 1.55,  # Invalid: > 1.0
            "severity": "HIGH"
        }
        res = self.client.post("/api/cctv/events", json=payload, headers=self.service_headers)
        self.assertEqual(res.status_code, 422)

    def test_03_unauthorized_request_rejection(self):
        """Test 3: Missing or invalid X-CCTV-Service-Key is rejected with 401."""
        payload = {
            "event_id": "test_evt_unauth",
            "event_type": "POTHOLE_DETECTED",
            "camera_id": "CAM-TEST-01",
            "confidence": 0.60,
            "severity": "MEDIUM"
        }
        # No header
        res1 = self.client.post("/api/cctv/events", json=payload)
        self.assertEqual(res1.status_code, 401)

        # Wrong header
        res2 = self.client.post("/api/cctv/events", json=payload, headers={"X-CCTV-Service-Key": "wrong_key"})
        self.assertEqual(res2.status_code, 401)

    def test_04_duplicate_event_replay_protection(self):
        """Test 4: Resubmitting identical event_id is rejected with 409 Conflict."""
        payload = {
            "event_id": "test_evt_dup_check",
            "event_type": "POTHOLE_DETECTED",
            "camera_id": "CAM-TEST-02",
            "confidence": 0.58,
            "severity": "MEDIUM"
        }
        # First submission
        res1 = self.client.post("/api/cctv/events", json=payload, headers=self.service_headers)
        self.assertEqual(res1.status_code, 201)

        # Second submission with same ID
        res2 = self.client.post("/api/cctv/events", json=payload, headers=self.service_headers)
        self.assertEqual(res2.status_code, 409)
        self.assertIn("already been ingested", res2.json()["detail"])

    def test_05_event_retrieval_officer(self):
        """Test 5: Authorized officer can retrieve CCTV events list."""
        res = self.client.get("/api/cctv/events", headers=self.authority_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total", data)
        self.assertIn("items", data)
        self.assertGreaterEqual(data["total"], 1)

    def test_06_event_filtering(self):
        """Test 6: Filtering by status, severity, and camera_id works."""
        # Query for HIGH severity
        res_high = self.client.get("/api/cctv/events?severity=HIGH", headers=self.authority_headers)
        self.assertEqual(res_high.status_code, 200)
        items_high = res_high.json()["items"]
        for it in items_high:
            self.assertEqual(it["severity"], "HIGH")

        # Query for camera_id
        res_cam = self.client.get("/api/cctv/events?camera_id=CAM-TEST-01", headers=self.authority_headers)
        self.assertEqual(res_cam.status_code, 200)
        for it in res_cam.json()["items"]:
            self.assertEqual(it["camera_id"], "CAM-TEST-01")

    def test_07_evidence_retrieval(self):
        """Test 7: Serving evidence snapshot returns 200 image/jpeg."""
        res = self.client.get("/api/cctv/events/test_evt_001/evidence", headers=self.authority_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "image/jpeg")
        self.assertGreater(len(res.content), 0)

    def test_08_officer_only_access(self):
        """Test 8: Officer can view detail and update review status."""
        # Detail view
        res = self.client.get("/api/cctv/events/test_evt_001", headers=self.authority_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["event_id"], "test_evt_001")

        # Review status update (VERIFIED)
        patch_res = self.client.patch(
            "/api/cctv/events/test_evt_001/status",
            json={"status": "VERIFIED", "review_notes": "Confirmed large pothole requiring asphalt patch."},
            headers=self.authority_headers
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["new_status"], "VERIFIED")

        # Verify DB
        ev = self.db.query(CctvEvent).filter(CctvEvent.event_id == "test_evt_001").first()
        self.assertEqual(ev.status, "VERIFIED")
        self.assertEqual(ev.reviewed_by_id, self.authority.id)

    def test_09_citizen_access_denied(self):
        """Test 9: Citizen access is forbidden (403) on officer endpoints."""
        # Citizen cannot list CCTV events
        res1 = self.client.get("/api/cctv/events", headers=self.citizen_headers)
        self.assertEqual(res1.status_code, 403)

        # Citizen cannot view event detail
        res2 = self.client.get("/api/cctv/events/test_evt_001", headers=self.citizen_headers)
        self.assertEqual(res2.status_code, 403)

        # Citizen cannot review status
        res3 = self.client.patch(
            "/api/cctv/events/test_evt_001/status",
            json={"status": "VERIFIED"},
            headers=self.citizen_headers
        )
        self.assertEqual(res3.status_code, 403)

    def test_10_cctv_to_sevaai_end_to_end_flow(self):
        """
        Test 10: Complete End-to-End Flow:
        1. CCTV Edge submits confirmed event (CAM-E2E)
        2. Stored in cctv_events as PENDING_REVIEW (no automatic complaint created)
        3. Officer retrieves event via API
        4. Officer reviews and explicitly converts to complaint docket
        5. Formal Complaint is created, assigned to squad, and linked to CCTV event
        """
        e2e_event_id = "test_evt_e2e_flow"
        payload = {
            "event_id": e2e_event_id,
            "event_type": "POTHOLE_DETECTED",
            "camera_id": "CAM-E2E-ROAD",
            "confidence": 0.725,
            "severity": "HIGH",
            "timestamp": "00:00:04.100",
            "evidence_image_base64": self.tiny_jpeg_b64,
            "location_metadata": {
                "latitude": 18.5204,
                "longitude": 73.8567,
                "address": "Arterial Ring Road Sector 4"
            }
        }

        # Step 1: Edge ingestion
        ingest_res = self.client.post("/api/cctv/events", json=payload, headers=self.service_headers)
        self.assertEqual(ingest_res.status_code, 201)

        # Step 2: Verify NO complaint docket was automatically created
        db_ev = self.db.query(CctvEvent).filter(CctvEvent.event_id == e2e_event_id).first()
        self.assertIsNotNone(db_ev)
        self.assertEqual(db_ev.status, "PENDING_REVIEW")
        self.assertIsNone(db_ev.complaint_id)

        # Step 3: Officer retrieves event
        get_res = self.client.get(f"/api/cctv/events/{e2e_event_id}", headers=self.authority_headers)
        self.assertEqual(get_res.status_code, 200)

        # Step 4: Officer converts to complaint
        convert_res = self.client.post(
            f"/api/cctv/events/{e2e_event_id}/convert-to-complaint",
            json={"description": "Field Squad dispatch for CCTV detected deep pothole."},
            headers=self.authority_headers
        )
        self.assertEqual(convert_res.status_code, 201)
        conv_data = convert_res.json()
        complaint_id = conv_data["complaint_id"]
        self.assertIsNotNone(complaint_id)

        # Step 5: Verify complaint in DB and linkage
        complaint = self.db.query(Complaint).filter(Complaint.id == complaint_id).first()
        self.assertIsNotNone(complaint)
        self.assertEqual(complaint.status, "Assigned")
        self.assertEqual(complaint.category, "road_infrastructure")

        # Verify CCTV event is now CONVERTED and linked
        self.db.refresh(db_ev)
        self.assertEqual(db_ev.status, "CONVERTED")
        self.assertEqual(db_ev.complaint_id, complaint_id)

    def test_11_officer_assistant_cctv_awareness(self):
        """Test 11: Officer Assistant retrieves real CCTV defect data on natural language inquiry."""
        # Query assistant as authority user
        query_payload = {
            "message": "Show recent pothole detections from CCTV cameras",
            "page_context": {
                "route": "/authority",
                "active_tab": "cctv"
            }
        }
        res = self.client.post("/api/assistant/chat", json=query_payload, headers=self.authority_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        # Should contain CCTV detection information from real DB
        self.assertTrue(
            "CCTV" in reply or "Pothole" in reply or "pothole" in reply or "CAM" in reply,
            f"Expected CCTV info in reply, got: {reply}"
        )

        # Query evidence
        ev_query_payload = {
            "message": "Show evidence for CCTV detections",
            "page_context": {
                "route": "/authority",
                "active_tab": "cctv"
            }
        }
        ev_res = self.client.post("/api/assistant/chat", json=ev_query_payload, headers=self.authority_headers)
        self.assertEqual(ev_res.status_code, 200)
        ev_reply = ev_res.json().get("reply", "")
        self.assertTrue("Evidence" in ev_reply or "evidence" in ev_reply, f"Expected evidence info, got: {ev_reply}")


if __name__ == "__main__":
    unittest.main()
