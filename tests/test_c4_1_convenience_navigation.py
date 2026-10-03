"""
Comprehensive Test Suite for C4.1: Citizen Convenience Navigation
Tests citizen convenience navigation actions:
- Open Report Issue
- Open Dashboard / Open my complaints
- Open Track Complaint
- Open latest complaint
- Open owned complaint by ID
- Foreign complaint ID (CS9002 security gating)
- Invalid complaint ID (CS9999 security gating)
- Public user protection
- C1 regression ("I want to report a pothole")
- C2 regression ("Show my complaints", "Track complaint CS1001")
- C3.1 regression ("What do I do here?")
- C3.2 regression ("Why is my complaint still in progress?")
- C3.3 regression ("What should I know?")
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


class TestC41ConvenienceNavigation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db = SessionLocal()
        try:
            cls.citizen = db.query(User).filter(User.id == 1).first()
            assert cls.citizen is not None, "Citizen 1 must exist in DB"
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

            # Ensure foreign complaint CS9002 exists (owned by 999999)
            cs9002 = db.query(Complaint).filter(Complaint.id == "CS9002").first()
            if not cs9002:
                cs9002 = Complaint(
                    id="CS9002",
                    citizen_id=999999,
                    category="sanitation",
                    issue_type="Garbage Dump",
                    description="Private foreign complaint",
                    severity="MEDIUM",
                    status="Submitted"
                )
                db.add(cs9002)
                db.commit()

            # Ensure citizen 1's latest complaint exists
            cls.latest_complaint = (
                db.query(Complaint)
                .filter(Complaint.citizen_id == cls.citizen.id)
                .order_by(Complaint.created_at.desc())
                .first()
            )
            assert cls.latest_complaint is not None, "Citizen 1 must have at least one complaint"
        finally:
            db.close()

    # =========================================================================
    # 1. Open Report Issue
    # =========================================================================
    def test_01_open_report_issue_page(self):
        """1. 'Open the Report Issue page' returns OPEN_REPORT_PAGE action."""
        payload = {"message": "Open the Report Issue page"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")
        self.assertIn("Report Issue", data.get("reply", ""))
        print("\n[C4.1 - 01] Open Report Issue reply:\n", data.get("reply"))

    # =========================================================================
    # 2. Open Dashboard
    # =========================================================================
    def test_02_open_dashboard(self):
        """2. 'Take me to the dashboard' returns OPEN_DASHBOARD_PAGE action."""
        payload = {"message": "Take me to the dashboard"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_DASHBOARD_PAGE")
        self.assertIn("Dashboard", data.get("reply", ""))
        print("\n[C4.1 - 02] Open Dashboard reply:\n", data.get("reply"))

    def test_02b_open_my_complaints(self):
        """2b. 'Open my complaints' navigates to dashboard complaints destination."""
        payload = {"message": "Open my complaints"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_DASHBOARD_PAGE")
        self.assertIn("complaints", data.get("reply", "").lower())
        print("\n[C4.1 - 02b] Open my complaints reply:\n", data.get("reply"))

    # =========================================================================
    # 3. Open Track Complaint
    # =========================================================================
    def test_03_open_track_complaint_page(self):
        """3. 'Take me to Track Complaint' returns OPEN_TRACK_PAGE action."""
        payload = {"message": "Take me to Track Complaint"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_TRACK_PAGE")
        self.assertIn("Track Complaint", data.get("reply", ""))
        print("\n[C4.1 - 03] Open Track Complaint reply:\n", data.get("reply"))

    # =========================================================================
    # 4. Open latest complaint
    # =========================================================================
    def test_04_open_latest_complaint(self):
        """4. 'Open my latest complaint' retrieves latest ID and returns OPEN_TRACK_COMPLAINT:{id}."""
        payload = {"message": "Open my latest complaint"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        expected_action = f"OPEN_TRACK_COMPLAINT:{self.latest_complaint.id}"
        self.assertEqual(data.get("action"), expected_action)
        self.assertIn(self.latest_complaint.id, data.get("reply", ""))
        print("\n[C4.1 - 04] Open latest complaint reply:\n", data.get("reply"))

    def test_04b_open_latest_complaint_empty_user(self):
        """4b. User with 0 complaints asking to open latest complaint gets safe empty message."""
        payload = {"message": "Open my latest complaint"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.zero_user_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        self.assertIn("You have not submitted any complaints yet", data.get("reply", ""))
        print("\n[C4.1 - 04b] Open latest complaint (empty user) reply:\n", data.get("reply"))

    # =========================================================================
    # 5. Open owned complaint by ID
    # =========================================================================
    def test_05_open_owned_complaint_by_id(self):
        """5. 'Open complaint CS1001' verifies ownership and returns OPEN_TRACK_COMPLAINT:CS1001."""
        payload = {"message": "Open complaint CS1001"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_TRACK_COMPLAINT:CS1001")
        self.assertIn("CS1001", data.get("reply", ""))
        print("\n[C4.1 - 05] Open owned complaint CS1001 reply:\n", data.get("reply"))

    # =========================================================================
    # 6. Foreign complaint ID
    # =========================================================================
    def test_06_open_foreign_complaint_safe_denial(self):
        """6. 'Open complaint CS9002' owned by another user yields safe denial, action=None."""
        payload = {"message": "Open complaint CS9002"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("I couldn't find that complaint in your account", reply)
        self.assertNotIn("999999", reply)
        print("\n[C4.1 - 06] Foreign complaint safe denial reply:\n", reply)

    # =========================================================================
    # 7. Invalid complaint ID
    # =========================================================================
    def test_07_open_invalid_complaint_safe_denial(self):
        """7. 'Open complaint CS9999' (non-existent) yields safe denial, action=None."""
        payload = {"message": "Open complaint CS9999"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("I couldn't find that complaint in your account", reply)
        print("\n[C4.1 - 07] Invalid complaint safe denial reply:\n", reply)

    # =========================================================================
    # 8. Public user
    # =========================================================================
    def test_08_public_user_complaint_navigation_blocked(self):
        """8. Public user attempting to open private complaints is safely blocked."""
        # A. Specific complaint
        res1 = self.client.post("/api/assistant/chat", json={"message": "Open complaint CS1001"})
        self.assertEqual(res1.status_code, 200)
        self.assertIsNone(res1.json().get("action"))
        self.assertIn("Please log in", res1.json().get("reply", ""))

        # B. Latest complaint
        res2 = self.client.post("/api/assistant/chat", json={"message": "Open my latest complaint"})
        self.assertEqual(res2.status_code, 200)
        self.assertIsNone(res2.json().get("action"))
        self.assertIn("Please log in", res2.json().get("reply", ""))

        # C. Dashboard
        res3 = self.client.post("/api/assistant/chat", json={"message": "Take me to the dashboard"})
        self.assertEqual(res3.status_code, 200)
        self.assertIsNone(res3.json().get("action"))
        self.assertIn("Please log in", res3.json().get("reply", ""))

        # D. Public report page IS allowed
        res4 = self.client.post("/api/assistant/chat", json={"message": "Open the Report Issue page"})
        self.assertEqual(res4.status_code, 200)
        self.assertEqual(res4.json().get("action"), "OPEN_REPORT_PAGE")

    # =========================================================================
    # 9. C1 Regression
    # =========================================================================
    def test_09_c1_regression(self):
        """9. C1 regression: 'I want to report a pothole' returns OPEN_REPORT_PAGE."""
        payload = {"message": "I want to report a pothole"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")

    # =========================================================================
    # 10. C2 Regression
    # =========================================================================
    def test_10_c2_regression(self):
        """10. C2 regression: 'Show my complaints' and 'Track complaint CS1001' do not navigate."""
        # A. 'Show my complaints' -> returns text list, no action
        res1 = self.client.post("/api/assistant/chat", json={"message": "Show my complaints"}, headers=self.citizen_headers)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertIsNone(data1.get("action"))
        self.assertIn("Here are your submitted complaints:", data1.get("reply", ""))

        # B. 'Track complaint CS1001' -> returns text status, no action
        res2 = self.client.post("/api/assistant/chat", json={"message": "Track complaint CS1001"}, headers=self.citizen_headers)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertIsNone(data2.get("action"))
        self.assertIn("Complaint #CS1001", data2.get("reply", ""))

    # =========================================================================
    # 11. C3.1 / C3.2 / C3.3 Regressions
    # =========================================================================
    def test_11_c3_regressions(self):
        """11. C3.1, C3.2, C3.3 regressions."""
        # C3.1: 'What do I do here?' on ReportIssuePage
        res1 = self.client.post(
            "/api/assistant/chat",
            json={"message": "What do I do here?", "page_context": {"page_name": "ReportIssuePage", "route": "/report"}},
            headers=self.citizen_headers
        )
        self.assertEqual(res1.status_code, 200)
        self.assertIsNone(res1.json().get("action"))
        self.assertIn("Report Issue page", res1.json().get("reply", ""))

        # C3.2: 'Why is my complaint still in progress?' on TrackComplaintPage with CS1001
        res2 = self.client.post(
            "/api/assistant/chat",
            json={
                "message": "Why is my complaint still in progress?",
                "page_context": {"page_name": "TrackComplaintPage", "route": "/track/CS1001", "selected_complaint_id": "CS1001"},
                "selected_complaint_id": "CS1001"
            },
            headers=self.citizen_headers
        )
        self.assertEqual(res2.status_code, 200)
        self.assertIsNone(res2.json().get("action"))
        self.assertIn("CS1001", res2.json().get("reply", ""))
        self.assertIn("In Progress", res2.json().get("reply", ""))

        # C3.3: 'What should I know?' on TrackComplaintPage with CS1001
        res3 = self.client.post(
            "/api/assistant/chat",
            json={
                "message": "What should I know?",
                "page_context": {"page_name": "TrackComplaintPage", "route": "/track/CS1001", "selected_complaint_id": "CS1001"},
                "selected_complaint_id": "CS1001"
            },
            headers=self.citizen_headers
        )
        self.assertEqual(res3.status_code, 200)
        self.assertIsNone(res3.json().get("action"))
        self.assertIn("Complaint #CS1001 is currently In Progress", res3.json().get("reply", ""))
        self.assertIn("No completion date is recorded.", res3.json().get("reply", ""))


if __name__ == "__main__":
    unittest.main()
