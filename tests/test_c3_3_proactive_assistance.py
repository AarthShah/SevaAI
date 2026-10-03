"""
Comprehensive Test Suite for C3.3: Proactive Citizen Contextual Assistance
Tests proactive context-aware assistance across TrackComplaintPage, CitizenDashboard,
LandingPage, empty complaint state, foreign complaint gating, public user protection,
absence of fabricated information, and regressions for C1, C2, C3.1, and C3.2.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import unittest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.user import User
from backend.app.models.complaint import Complaint
from backend.app.utils.security import create_access_token


class TestC33ProactiveAssistance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db = SessionLocal()
        try:
            cls.citizen = db.query(User).filter(User.id == 1).first()
            assert cls.citizen is not None, "Citizen 1 must exist"
            token = create_access_token(data={
                "user_id": cls.citizen.id,
                "email": cls.citizen.email,
                "role": cls.citizen.role
            })
            cls.citizen_headers = {"Authorization": f"Bearer {token}"}

            # User with 0 complaints
            zero_user = db.query(User).filter(User.email == "zerocomplaints@civicseva.org").first()
            if not zero_user:
                zero_user = User(
                    name="Zero Complaints Citizen",
                    email="zerocomplaints@civicseva.org",
                    password_hash="test_hash",
                    role="citizen"
                )
                db.add(zero_user)
                db.commit()
                db.refresh(zero_user)
            token_zero = create_access_token(data={
                "user_id": zero_user.id,
                "email": zero_user.email,
                "role": zero_user.role
            })
            cls.zero_user_headers = {"Authorization": f"Bearer {token_zero}"}

            # Foreign complaint CS9002
            cs9002 = db.query(Complaint).filter(Complaint.id == "CS9002").first()
            if not cs9002:
                cs9002 = Complaint(
                    id="CS9002",
                    citizen_id=999999,
                    category="sanitation",
                    issue_type="Garbage Dump",
                    description="Private complaint owned by another user",
                    severity="MEDIUM",
                    status="Submitted"
                )
                db.add(cs9002)
                db.commit()
        finally:
            db.close()

    # =========================================================================
    # 1. TrackComplaintPage with selected complaint
    # =========================================================================
    def test_01_track_page_with_selected_complaint(self):
        """1. Proactive assistance on TrackComplaintPage with CS1001."""
        payload = {
            "message": "What should I know?",
            "page_context": {
                "page_name": "TrackComplaintPage",
                "route": "/track/CS1001",
                "selected_complaint_id": "CS1001"
            },
            "selected_complaint_id": "CS1001"
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("CS1001", reply)
        self.assertIn("In Progress", reply)
        self.assertIn("27 September", reply)
        self.assertIn("No completion date is recorded.", reply)
        print("\n[C3.3 - 01] TrackComplaintPage proactive reply:\n", reply)

    def test_01b_programmatic_proactive_trigger(self):
        """1b. Programmatic __proactive__ trigger from frontend on TrackComplaintPage."""
        payload = {
            "message": "__proactive__",
            "page_context": {
                "page_name": "TrackComplaintPage",
                "route": "/track/CS1001",
                "selected_complaint_id": "CS1001"
            },
            "selected_complaint_id": "CS1001"
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("CS1001", reply)
        self.assertIn("In Progress", reply)
        self.assertIn("No completion date is recorded.", reply)


    # =========================================================================
    # 2. CitizenDashboard with complaints
    # =========================================================================
    def test_02_citizen_dashboard_with_complaints(self):
        """2. Proactive assistance on CitizenDashboard gives concise status breakdown."""
        payload = {
            "message": "What should I know?",
            "page_context": {
                "page_name": "CitizenDashboard",
                "route": "/dashboard"
            }
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("You currently have", reply)
        self.assertIn("complaints:", reply)
        self.assertIn("In Progress", reply)
        self.assertIn("Escalated", reply)
        print("\n[C3.3 - 02] CitizenDashboard proactive reply:\n", reply)

    # =========================================================================
    # 3. Empty complaint state
    # =========================================================================
    def test_03_empty_complaint_state(self):
        """3. Proactive assistance for user with 0 complaints."""
        payload = {
            "message": "What should I know?",
            "page_context": {
                "page_name": "CitizenDashboard",
                "route": "/dashboard"
            }
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.zero_user_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("You have not submitted any complaints yet.", reply)
        print("\n[C3.3 - 03] Empty complaint state reply:\n", reply)

    # =========================================================================
    # 4. Unauthorized / foreign complaint
    # =========================================================================
    def test_04_unauthorized_foreign_complaint(self):
        """4. Proactive assistance with CS9002 yields safe denial without leaking data."""
        payload = {
            "message": "What should I know?",
            "page_context": {
                "page_name": "TrackComplaintPage",
                "route": "/track/CS9002",
                "selected_complaint_id": "CS9002"
            },
            "selected_complaint_id": "CS9002"
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("I couldn't find that complaint in your account", reply)
        self.assertNotIn("Private complaint owned by another user", reply)
        self.assertNotIn("999999", reply)
        print("\n[C3.3 - 04] Unauthorized complaint reply:\n", reply)

    # =========================================================================
    # 5. Public user (unauthenticated)
    # =========================================================================
    def test_05_public_user(self):
        """5. Public user asking for proactive assistance receives safe login guidance."""
        payload = {
            "message": "What should I know?",
            "page_context": {
                "page_name": "TrackComplaintPage",
                "route": "/track/CS1001",
                "selected_complaint_id": "CS1001"
            },
            "selected_complaint_id": "CS1001"
        }
        res = self.client.post("/api/assistant/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("Please log in to your CivicSeva account", reply)
        self.assertNotIn("Municipal Road Department", reply)
        print("\n[C3.3 - 05] Public user reply:\n", reply)

    # =========================================================================
    # 6. No fabricated information
    # =========================================================================
    def test_06_no_fabricated_information(self):
        """6. Proactive assistance must never invent ETAs, completion dates, or officer schedules."""
        payload = {
            "message": "PROACTIVE",
            "page_context": {
                "page_name": "TrackComplaintPage",
                "route": "/track/CS1001",
                "selected_complaint_id": "CS1001"
            },
            "selected_complaint_id": "CS1001"
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("No completion date is recorded.", reply)
        self.assertNotIn("tomorrow", reply.lower())
        self.assertNotIn("estimated time of arrival", reply.lower())
        self.assertNotIn("will be resolved by", reply.lower())
        print("\n[C3.3 - 06] Grounded verification reply:\n", reply)

    # =========================================================================
    # 7. C1 Regression
    # =========================================================================
    def test_07_c1_regression(self):
        """7. C1 Action regression: 'I want to report a pothole' returns OPEN_REPORT_PAGE."""
        payload = {
            "message": "I want to report a pothole",
            "page_context": {"page_name": "LandingPage", "route": "/"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")

    # =========================================================================
    # 8. C2 Regression
    # =========================================================================
    def test_08_c2_regression(self):
        """8. C2 Retrieval regression: 'Show my complaints' lists submitted complaints."""
        payload = {
            "message": "Show my complaints",
            "page_context": {"page_name": "CitizenDashboard", "route": "/dashboard"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Here are your submitted complaints:", reply)
        self.assertIn("CS1001", reply)

    # =========================================================================
    # 9. C3.1 Regression
    # =========================================================================
    def test_09_c3_1_regression(self):
        """9. C3.1 Page Awareness regression: 'What do I do here?' on ReportIssuePage."""
        payload = {
            "message": "What do I do here?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Report Issue page", reply)
        self.assertIn("Upload a clear photo", reply)

    # =========================================================================
    # 10. C3.2 Regression
    # =========================================================================
    def test_10_c3_2_regression(self):
        """10. C3.2 Contextual Explanation regression: 'Why is my complaint still in progress?'."""
        payload = {
            "message": "Why is my complaint still in progress?",
            "page_context": {
                "page_name": "TrackComplaintPage",
                "route": "/track/CS1001",
                "selected_complaint_id": "CS1001"
            },
            "selected_complaint_id": "CS1001"
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("CS1001", reply)
        self.assertIn("In Progress", reply)
        self.assertIn("actively working on-site", reply)
        self.assertIn("The available record does not provide an estimated completion date", reply)


if __name__ == "__main__":
    unittest.main()
