"""
Comprehensive Test Suite for C3.1: Citizen Assistant Page Awareness.
Verifies page-specific guidance across LandingPage, ReportIssuePage, TrackComplaintPage,
and CitizenDashboard while ensuring C1 and C2 behavior remain 100% intact.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import unittest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.user import User
from backend.app.utils.security import create_access_token


class TestC3PageAwareness(unittest.TestCase):
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
        finally:
            db.close()

    # =========================================================================
    # 1. C3.1 FOCUSED PAGE AWARENESS TESTS
    # =========================================================================

    def test_01_report_issue_page_what_do_i_do_here(self):
        """ReportIssuePage + 'What do I do here?' -> explains photo/AI/submission workflow."""
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
        self.assertIn("AI automatically analyzes", reply)
        self.assertIn("Submit your complaint", reply)
        print("\n[C3.1 - 01] ReportIssuePage 'What do I do here?':\n", reply)

    def test_02_report_issue_page_what_can_i_do_on_this_page(self):
        """ReportIssuePage + 'What can I do on this page?' -> explains reporting."""
        payload = {
            "message": "What can I do on this page?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Report Issue page", reply)
        self.assertIn("Upload a clear photo", reply)

    def test_03_track_page_with_selected_complaint(self):
        """TrackComplaintPage + CS1001 + 'What do I do here?' -> contextual tracking explanation."""
        payload = {
            "message": "What do I do here?",
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
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("tracking page", reply)
        self.assertIn("CS1001", reply)
        self.assertIn("In Progress", reply)
        print("\n[C3.1 - 03] TrackComplaintPage with CS1001:\n", reply)

    def test_04_track_page_what_does_this_status_mean(self):
        """TrackComplaintPage + CS1001 + 'What does this status mean?' -> explains In Progress status."""
        payload = {
            "message": "What does this status mean?",
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
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("CS1001", reply)
        self.assertIn("In Progress", reply)
        self.assertIn("actively working on-site", reply)
        print("\n[C3.1 - 04] TrackComplaintPage 'What does this status mean?':\n", reply)

    def test_05_track_page_without_selected_complaint(self):
        """TrackComplaintPage without selected complaint -> tells user to enter complaint ID."""
        payload = {
            "message": "What do I do here?",
            "page_context": {
                "page_name": "TrackComplaintPage",
                "route": "/track",
                "selected_complaint_id": None
            }
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("tracking page", reply)
        self.assertIn("Enter your complaint ID", reply)
        print("\n[C3.1 - 05] TrackComplaintPage without selection:\n", reply)

    def test_06_citizen_dashboard_what_do_i_do_here(self):
        """CitizenDashboard + 'What do I do here?' -> explains viewing/filtering complaints."""
        payload = {
            "message": "What do I do here?",
            "page_context": {"page_name": "CitizenDashboard", "route": "/dashboard"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Citizen Dashboard", reply)
        self.assertIn("view all the civic grievances you've submitted", reply)
        self.assertIn("filter them by status", reply)
        print("\n[C3.1 - 06] CitizenDashboard 'What do I do here?':\n", reply)

    def test_07_landing_page_what_is_this_website(self):
        """LandingPage + 'What is this website?' -> explains CivicSeva platform."""
        payload = {
            "message": "What is this website?",
            "page_context": {"page_name": "LandingPage", "route": "/"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("CivicSeva Home page", reply)
        self.assertIn("Indore", reply)
        self.assertIn("report new civic issues", reply)
        print("\n[C3.1 - 07] LandingPage 'What is this website?':\n", reply)

    def test_08_landing_page_what_can_i_do_here(self):
        """LandingPage + 'What can I do here?' -> explains CivicSeva Home capabilities."""
        payload = {
            "message": "What can I do here?",
            "page_context": {"page_name": "LandingPage", "route": "/"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("CivicSeva Home page", reply)

    def test_09_generic_hello_does_not_trigger_page_help(self):
        """Generic 'Hello' on ReportIssuePage must NOT trigger PAGE_HELP."""
        payload = {
            "message": "Hello",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        # Must not be the 4-step report instructions
        self.assertNotIn("1. Upload a clear photo", reply)

    def test_10_generic_thanks_does_not_trigger_page_help(self):
        """Generic 'Thanks' on TrackComplaintPage must NOT trigger PAGE_HELP."""
        payload = {
            "message": "Thanks",
            "page_context": {"page_name": "TrackComplaintPage", "route": "/track"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertNotIn("Enter your complaint ID (such as CS1001)", reply)

    # =========================================================================
    # 2. C1 & C2 REGRESSION INTEGRITY
    # =========================================================================

    def test_11_c1_file_complaint_still_navigates(self):
        """C1 Navigation regression: 'I want to file a complaint' must return OPEN_REPORT_PAGE."""
        payload = {
            "message": "I want to file a complaint",
            "page_context": {"page_name": "LandingPage", "route": "/"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")

    def test_12_c1_informational_no_action(self):
        """C1 Informational regression: 'How do I report a pothole?' must NOT navigate."""
        payload = {
            "message": "How do I report a pothole?",
            "page_context": {"page_name": "LandingPage", "route": "/"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))

    def test_13_c2_show_my_complaints_still_works(self):
        """C2 Retrieval regression: 'Show my complaints' on CitizenDashboard must list complaints."""
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

    def test_14_security_unauthorized_selected_complaint_on_track_page(self):
        """
        Security: TrackComplaintPage with selected_complaint_id='CS9002' (owned by another user)
        must NOT leak details when user asks 'What do I do here?'.
        """
        payload = {
            "message": "What do I do here?",
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
        self.assertIn("could not be found in your account", reply)
        self.assertNotIn("Private complaint owned by another user", reply)


if __name__ == "__main__":
    unittest.main()
