"""
Phase 11 Real-World SevaAI CCTV Workflow & Officer UX Validation Test Suite.

Comprehensive validation covering:
1. Complete Officer Workflow (Login -> Triage -> Inspect -> Verify -> Convert -> Docket)
2. Non-Automatic Complaint Rule (AI detection MUST NOT auto-create complaints)
3. Officer Assistant 11 Query Variations (Real DB Grounded Responses)
4. Citizen Isolation Verification (403 Forbidden on all endpoints & assistant privacy notice)
5. Full Event Lifecycle & Idempotency (PENDING -> VERIFIED -> CONVERTED vs DISMISSED)
6. Dismissed Event Conversion Rejection (400 Bad Request)
7. Re-conversion Idempotency (400 Bad Request)
8. Security & Service Authentication (401 on invalid/missing key, 422 on invalid payload, 409 on duplicate)
9. Evidence Serving Security (401 unauth, 403 citizen, 200 officer Bearer, 200 officer query token, 200 service key)
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


class TestPhase11Workflow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_db_initialized()
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Users
        cls.citizen = cls.db.query(User).filter(User.role == "citizen").first()
        if not cls.citizen:
            cls.citizen = User(
                name="Aarav Citizen",
                email="citizen_p11@test.org",
                role="citizen",
                password_hash="hash"
            )
            cls.db.add(cls.citizen)
            cls.db.commit()
            cls.db.refresh(cls.citizen)

        cls.authority = cls.db.query(User).filter(User.role == "authority").first()
        if not cls.authority:
            cls.authority = User(
                name="Er. Rajesh Patil",
                email="authority_p11@test.org",
                role="authority",
                password_hash="hash"
            )
            cls.db.add(cls.authority)
            cls.db.commit()
            cls.db.refresh(cls.authority)

        cls.citizen_token = create_access_token({"user_id": cls.citizen.id})
        cls.authority_token = create_access_token({"user_id": cls.authority.id})

        cls.citizen_headers = {"Authorization": f"Bearer {cls.citizen_token}"}
        cls.authority_headers = {"Authorization": f"Bearer {cls.authority_token}"}
        cls.service_headers = {"X-CCTV-Service-Key": CCTV_SERVICE_KEY}

        # 1x1 test JPEG
        cls.tiny_jpeg_b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

        # Clean existing test events
        cls._cleanup_test_data()

    @classmethod
    def _cleanup_test_data(cls):
        test_events = cls.db.query(CctvEvent).filter(CctvEvent.event_id.like("p11_%")).all()
        for ev in test_events:
            if ev.complaint_id:
                cls.db.query(Complaint).filter(Complaint.id == ev.complaint_id).delete()
            cls.db.delete(ev)
        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls._cleanup_test_data()
        cls.db.close()

    # =========================================================================
    # STEP 2 & 5: OFFICER WORKFLOW & LIFECYCLE
    # =========================================================================
    def test_01_complete_officer_workflow(self):
        """
        Validates full human-in-the-loop workflow:
        1. CCTV Edge Ingests event
        2. Verified in PENDING_REVIEW (no automatic complaint)
        3. Officer retrieves event with full telemetry
        4. Officer marks VERIFIED
        5. Officer converts to municipal complaint docket
        6. Complaint verified in DB with squad assigned
        """
        event_id = "p11_wf_event_01"
        payload = {
            "event_id": event_id,
            "event_type": "POTHOLE_DETECTED",
            "camera_id": "CAM_PN_03",
            "source_video": "street_pothole_sample_3.mp4",
            "confidence": 0.68,
            "peak_confidence": 0.72,
            "event_score": 0.81,
            "severity": "HIGH",
            "timestamp": "00:00:02.100",
            "frame_number": 32,
            "bbox": [180.0, 240.0, 310.0, 300.0],
            "persistence_seconds": 0.58,
            "supporting_detections": 11,
            "evidence_image_base64": self.tiny_jpeg_b64,
            "location_metadata": {
                "latitude": 18.5204,
                "longitude": 73.8567,
                "address": "Shivajinagar Junction Arterial Crossing"
            }
        }

        # 1. Edge Ingestion
        ingest_res = self.client.post("/api/cctv/events", json=payload, headers=self.service_headers)
        self.assertEqual(ingest_res.status_code, 201)
        data = ingest_res.json()
        self.assertEqual(data["review_status"], "PENDING_REVIEW")

        # 2. Strict Rule: AI Detection MUST NOT automatically create a complaint!
        db_ev = self.db.query(CctvEvent).filter(CctvEvent.event_id == event_id).first()
        self.assertIsNotNone(db_ev)
        self.assertEqual(db_ev.status, "PENDING_REVIEW")
        self.assertIsNone(db_ev.complaint_id)

        # 3. Officer retrieval and inspection
        get_res = self.client.get(f"/api/cctv/events/{event_id}", headers=self.authority_headers)
        self.assertEqual(get_res.status_code, 200)
        ev_data = get_res.json()
        self.assertEqual(ev_data["event_type"], "POTHOLE_DETECTED")
        self.assertEqual(ev_data["camera_id"], "CAM_PN_03")
        self.assertEqual(ev_data["severity"], "HIGH")
        self.assertEqual(ev_data["confidence"], 0.68)
        self.assertEqual(ev_data["supporting_detections"], 11)
        self.assertIsNotNone(ev_data["evidence_image_url"])
        self.assertIn("Shivajinagar", ev_data["address"])

        # 4. Officer Review Action: Mark VERIFIED
        patch_res = self.client.patch(
            f"/api/cctv/events/{event_id}/status",
            json={"status": "VERIFIED", "review_notes": "Cavitation verified on live lane."},
            headers=self.authority_headers
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["new_status"], "VERIFIED")

        # Verify still no complaint created yet (human authorization required)
        self.db.refresh(db_ev)
        self.assertEqual(db_ev.status, "VERIFIED")
        self.assertIsNone(db_ev.complaint_id)

        # 5. Explicit Officer Action: Create Work Order / Convert to Complaint
        conv_res = self.client.post(
            f"/api/cctv/events/{event_id}/convert-to-complaint",
            json={"description": "Field Squad dispatch for CCTV detected deep pothole."},
            headers=self.authority_headers
        )
        self.assertEqual(conv_res.status_code, 201)
        conv_data = conv_res.json()
        complaint_id = conv_data["complaint_id"]
        self.assertIsNotNone(complaint_id)

        # 6. Verify Complaint in DB
        complaint = self.db.query(Complaint).filter(Complaint.id == complaint_id).first()
        self.assertIsNotNone(complaint)
        self.assertEqual(complaint.status, "Assigned")
        self.assertEqual(complaint.category, "road_infrastructure")
        self.assertIsNotNone(complaint.assigned_officer_name)

        # Verify linkage
        self.db.refresh(db_ev)
        self.assertEqual(db_ev.status, "CONVERTED")
        self.assertEqual(db_ev.complaint_id, complaint_id)

    def test_02_dismissed_event_lifecycle(self):
        """
        Validates dismissal lifecycle:
        1. Ingest event
        2. Officer reviews and marks DISMISSED (false alarm)
        3. Attempt to convert dismissed event to complaint is rejected with 400 Bad Request
        """
        event_id = "p11_wf_dismiss_02"
        payload = {
            "event_id": event_id,
            "event_type": "POTHOLE_DETECTED",
            "camera_id": "CAM_PN_02",
            "confidence": 0.48,
            "severity": "LOW",
            "timestamp": "00:00:05.000",
            "evidence_image_base64": self.tiny_jpeg_b64
        }
        self.client.post("/api/cctv/events", json=payload, headers=self.service_headers)

        # Mark as DISMISSED
        patch_res = self.client.patch(
            f"/api/cctv/events/{event_id}/status",
            json={"status": "DISMISSED", "review_notes": "Surface shadow artifact only."},
            headers=self.authority_headers
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["new_status"], "DISMISSED")

        # Attempt to convert dismissed event MUST fail with 400
        conv_res = self.client.post(
            f"/api/cctv/events/{event_id}/convert-to-complaint",
            headers=self.authority_headers
        )
        self.assertEqual(conv_res.status_code, 400)
        self.assertIn("DISMISSED as a false alarm", conv_res.json()["detail"])

    def test_03_conversion_idempotency_and_double_conversion(self):
        """Validates that converting an already converted event is rejected with 400."""
        # Use first event from test_01 which is already CONVERTED
        conv_res = self.client.post(
            "/api/cctv/events/p11_wf_event_01/convert-to-complaint",
            headers=self.authority_headers
        )
        self.assertEqual(conv_res.status_code, 400)
        self.assertIn("already converted", conv_res.json()["detail"])

    # =========================================================================
    # STEP 3: OFFICER ASSISTANT 11 QUERY VARIATIONS
    # =========================================================================
    def test_04_officer_assistant_query_variations(self):
        """
        Tests 11 distinct natural-language CCTV queries using the actual Officer Assistant.
        Verifies correct intent recognition, real DB telemetry, and grounded responses.
        """
        queries = [
            # 1. Recent pothole detections
            ("Show recent pothole detections.", ["CCTV", "Pothole", "CAM_"]),
            # 2. What road issues were detected today?
            ("What road issues were detected today?", ["CCTV", "Telemetr", "Pothole"]),
            # 3. Latest CCTV event
            ("Show me the latest CCTV event.", ["Latest Confirmed", "Event ID", "CAM_"]),
            # 4. Show evidence for this pothole
            ("Show evidence for this pothole.", ["Evidence", "View Evidence Frame"]),
            # 5. Which cameras detected potholes?
            ("Which cameras detected potholes?", ["Active Cameras", "CAM_"]),
            # 6. Show unresolved CCTV events
            ("Show unresolved CCTV events.", ["Unresolved", "active"]),
            # 7. What potholes are pending review?
            ("What potholes are pending review?", ["Unresolved", "Pending Officer Review"]),
            # 8. How many severe potholes are active?
            ("How many severe potholes are active?", ["Severity", "Severe"]),
            # 9. List verified road defects ready for dispatch
            ("List verified road defects ready for dispatch.", ["CCTV", "Telemetr"]),
            # 10. Show CCTV events from camera
            ("Show CCTV events from camera CAM_PN_03.", ["CAM_PN_03", "Confidence"]),
            # 11. General overview
            ("Give me an overview of all CCTV infrastructure detections.", ["Pending Officer Review", "Total Potholes"])
        ]

        for q_text, expected_tokens in queries:
            with self.subTest(query=q_text):
                res = self.client.post(
                    "/api/assistant/chat",
                    json={"message": q_text, "page_context": {"route": "/authority", "active_tab": "cctv"}},
                    headers=self.authority_headers
                )
                self.assertEqual(res.status_code, 200)
                reply = res.json().get("reply", "")
                self.assertGreater(len(reply), 20)
                matched = any(tok in reply for tok in expected_tokens)
                self.assertTrue(
                    matched,
                    f"Query '{q_text}' reply did not contain any expected tokens {expected_tokens}. Reply: {reply[:150]}"
                )

    # =========================================================================
    # STEP 4: CITIZEN ISOLATION
    # =========================================================================
    def test_05_citizen_strict_isolation(self):
        """
        Verifies that a normal citizen is strictly blocked from:
        - CCTV events list (403)
        - CCTV event details (403)
        - CCTV evidence snapshots (403)
        - CCTV status review (403)
        - CCTV complaint conversion (403)
        - CCTV telemetry in assistant (privacy notice returned)
        """
        event_id = "p11_wf_event_01"

        # 1. Event list
        res_list = self.client.get("/api/cctv/events", headers=self.citizen_headers)
        self.assertEqual(res_list.status_code, 403)

        # 2. Event detail
        res_detail = self.client.get(f"/api/cctv/events/{event_id}", headers=self.citizen_headers)
        self.assertEqual(res_detail.status_code, 403)

        # 3. Evidence frame
        res_ev = self.client.get(f"/api/cctv/events/{event_id}/evidence", headers=self.citizen_headers)
        self.assertEqual(res_ev.status_code, 403)
        self.assertIn("Citizens are not authorized", res_ev.json()["detail"])

        # 4. Status review
        res_patch = self.client.patch(
            f"/api/cctv/events/{event_id}/status",
            json={"status": "VERIFIED"},
            headers=self.citizen_headers
        )
        self.assertEqual(res_patch.status_code, 403)

        # 5. Conversion
        res_conv = self.client.post(
            f"/api/cctv/events/{event_id}/convert-to-complaint",
            headers=self.citizen_headers
        )
        self.assertEqual(res_conv.status_code, 403)

        # 6. Assistant Citizen Query Isolation
        res_ast = self.client.post(
            "/api/assistant/chat",
            json={"message": "Show recent pothole detections from CCTV cameras"},
            headers=self.citizen_headers
        )
        self.assertEqual(res_ast.status_code, 200)
        citizen_reply = res_ast.json().get("reply", "")
        self.assertIn("restricted to authorized municipal officers", citizen_reply)
        self.assertNotIn("cctv_events", citizen_reply)
        self.assertNotIn("CAM_PN_03", citizen_reply)

    # =========================================================================
    # STEP 6 & 9: EVIDENCE SERVING & SECURITY
    # =========================================================================
    def test_06_evidence_authenticated_serving(self):
        """
        Validates secure evidence image serving across all authentication modes:
        - Unauthenticated request -> 401
        - Citizen request -> 403
        - Officer with Bearer token header -> 200 image/jpeg
        - Officer with ?token= query parameter -> 200 image/jpeg
        - CCTV Service Key header -> 200 image/jpeg
        """
        event_id = "p11_wf_event_01"

        # 1. Unauthenticated -> 401
        res_unauth = self.client.get(f"/api/cctv/events/{event_id}/evidence")
        self.assertEqual(res_unauth.status_code, 401)

        # 2. Citizen token -> 403
        res_cit = self.client.get(f"/api/cctv/events/{event_id}/evidence", headers=self.citizen_headers)
        self.assertEqual(res_cit.status_code, 403)

        # 3. Officer Bearer Token Header -> 200
        res_off_hdr = self.client.get(f"/api/cctv/events/{event_id}/evidence", headers=self.authority_headers)
        self.assertEqual(res_off_hdr.status_code, 200)
        self.assertEqual(res_off_hdr.headers.get("content-type"), "image/jpeg")

        # 4. Officer Query Param Token (?token=...) -> 200
        res_off_query = self.client.get(f"/api/cctv/events/{event_id}/evidence?token={self.authority_token}")
        self.assertEqual(res_off_query.status_code, 200)
        self.assertEqual(res_off_query.headers.get("content-type"), "image/jpeg")

        # 5. CCTV Service Key Header -> 200
        res_svc = self.client.get(f"/api/cctv/events/{event_id}/evidence", headers=self.service_headers)
        self.assertEqual(res_svc.status_code, 200)
        self.assertEqual(res_svc.headers.get("content-type"), "image/jpeg")

    def test_07_service_authentication_and_payload_validation(self):
        """
        Validates edge ingestion security:
        - Missing key -> 401
        - Invalid key -> 401
        - Malformed payload (confidence > 1.0) -> 422
        - Duplicate event_id -> 409
        """
        # Missing key
        res_missing = self.client.post("/api/cctv/events", json={"event_id": "test_auth_fail"})
        self.assertEqual(res_missing.status_code, 401)

        # Invalid key
        res_invalid = self.client.post(
            "/api/cctv/events",
            json={"event_id": "test_auth_fail"},
            headers={"X-CCTV-Service-Key": "malicious_spoofed_key"}
        )
        self.assertEqual(res_invalid.status_code, 401)

        # Malformed payload (confidence 2.50)
        res_malformed = self.client.post(
            "/api/cctv/events",
            json={"event_id": "p11_malformed", "camera_id": "C1", "confidence": 2.50},
            headers=self.service_headers
        )
        self.assertEqual(res_malformed.status_code, 422)

        # Duplicate event_id
        res_dup = self.client.post(
            "/api/cctv/events",
            json={"event_id": "p11_wf_event_01", "camera_id": "C1", "confidence": 0.8},
            headers=self.service_headers
        )
        self.assertEqual(res_dup.status_code, 409)


if __name__ == "__main__":
    unittest.main()
