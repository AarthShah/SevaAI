"""
Comprehensive Test Suite for C4.2: Complaint-Focused Convenience Navigation
Tests:
1. Open escalated complaint (Multiple matches -> prompt selection without navigating)
2. Open in-progress complaint (Single match -> OPEN_TRACK_COMPLAINT:CS1001)
3. Open resolved complaint (Single match -> OPEN_TRACK_COMPLAINT:CS1003)
4. Open pothole complaint (Single match -> OPEN_TRACK_COMPLAINT:CS1001)
5. Open drainage complaint (Single match -> OPEN_TRACK_COMPLAINT:CS1005)
6. Multiple matching complaints (CS1099 and CS1004 escalated -> lists both, no auto-navigation)
7. No matching complaint (e.g. non-existent category or status -> safe guidance, no navigation)
8. Foreign complaint protection (Cannot access complaints of other citizens)
9. Public user (Prompts login)
10. C1 regression ("I want to report a pothole" -> OPEN_REPORT_PAGE)
11. C2 regression ("Show my complaints" -> C2 retrieval)
12. C3.2 regression ("Why is my complaint still in progress?" -> C3.2 contextual explanation)
13. C3.4 regression ("What kind of photo is needed?" -> C3.4 report guidance)
14. C4.1 specific complaint navigation ("Open complaint CS1001" -> C4.1 OPEN_TRACK_COMPLAINT:CS1001)
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


class TestC42ComplaintConvenience(unittest.TestCase):
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
            zero_user = db.query(User).filter(User.email == "zerocomplaints_c42@civicseva.org").first()
            if not zero_user:
                zero_user = User(
                    name="Zero Complaints Citizen C42",
                    email="zerocomplaints_c42@civicseva.org",
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

            # User with 1 complaint (CS8001 - In Progress pothole)
            single_user = db.query(User).filter(User.email == "single_c42@civicseva.org").first()
            if not single_user:
                single_user = User(
                    name="Single Complaint Citizen C42",
                    email="single_c42@civicseva.org",
                    password_hash="test_hash",
                    role="citizen"
                )
                db.add(single_user)
                db.commit()
                db.refresh(single_user)
            token_single = create_access_token(data={
                "user_id": single_user.id,
                "email": single_user.email,
                "role": single_user.role
            })
            cls.single_user_headers = {"Authorization": f"Bearer {token_single}"}

            cs8001 = db.query(Complaint).filter(Complaint.id == "CS8001").first()
            if not cs8001:
                cs8001 = Complaint(
                    id="CS8001",
                    citizen_id=single_user.id,
                    category="road_infrastructure",
                    issue_type="POTHOLE",
                    description="Single test pothole",
                    severity="MEDIUM",
                    status="In Progress"
                )
                db.add(cs8001)
                db.commit()

            # Ensure foreign complaint CS9002 exists (owned by citizen 999999)
            cs9002 = db.query(Complaint).filter(Complaint.id == "CS9002").first()
            if not cs9002:
                cs9002 = Complaint(
                    id="CS9002",
                    citizen_id=999999,
                    category="drainage_sanitation",
                    issue_type="DRAINAGE",
                    description="Private foreign drainage complaint",
                    severity="HIGH",
                    status="Escalated"
                )
                db.add(cs9002)
                db.commit()
        finally:
            db.close()

    # =========================================================================
    # 1. CORE C4.2 COMPLAINT FILTER TESTS
    # =========================================================================

    def test_01_open_escalated_complaint_multiple_matches(self):
        """'Open my escalated complaint' -> detects multiple escalated (CS1099, CS1004) and prompts selection."""
        payload = {"message": "Open my escalated complaint"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        # Must NOT navigate automatically when multiple match
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("complaints that are Escalated", reply)
        self.assertIn("CS1099", reply)
        self.assertIn("CS1004", reply)
        self.assertIn("Which one would you like to open?", reply)

        # Quick actions should offer to open each
        actions = [qa.get("label") for qa in data.get("quick_actions", [])]
        self.assertTrue(any("CS1099" in a for a in actions))
        self.assertTrue(any("CS1004" in a for a in actions))
        print("\n[C4.2 - 01] Open escalated complaint (multiple):\n", reply)

    def test_02_open_in_progress_complaint_single_match(self):
        """'Open my complaint that's in progress' -> single match (CS1001) -> OPEN_TRACK_COMPLAINT:CS1001."""
        payload = {"message": "Open my complaint that's in progress"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_TRACK_COMPLAINT:CS1001")
        reply = data.get("reply", "")
        self.assertIn("CS1001", reply)
        self.assertIn("In Progress", reply)
        print("\n[C4.2 - 02] Open complaint in progress:\n", reply)

    def test_03_open_resolved_complaint_single_match(self):
        """'Take me to my resolved complaint' -> single match (CS1003) -> OPEN_TRACK_COMPLAINT:CS1003."""
        payload = {"message": "Take me to my resolved complaint"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_TRACK_COMPLAINT:CS1003")
        reply = data.get("reply", "")
        self.assertIn("CS1003", reply)
        self.assertIn("Resolved", reply)
        print("\n[C4.2 - 03] Take me to resolved complaint:\n", reply)

    def test_04_open_pothole_complaint_single_match(self):
        """'Show me my pothole complaint' -> single match (CS1001) -> OPEN_TRACK_COMPLAINT:CS1001."""
        payload = {"message": "Show me my pothole complaint"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_TRACK_COMPLAINT:CS1001")
        reply = data.get("reply", "")
        self.assertIn("CS1001", reply)
        self.assertIn("pothole", reply.lower())
        print("\n[C4.2 - 04] Show me pothole complaint:\n", reply)

    def test_05_open_drainage_complaint_single_match(self):
        """'Open my drainage complaint' -> single match (CS1005) -> OPEN_TRACK_COMPLAINT:CS1005."""
        payload = {"message": "Open my drainage complaint"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_TRACK_COMPLAINT:CS1005")
        reply = data.get("reply", "")
        self.assertIn("CS1005", reply)
        self.assertIn("drainage", reply.lower())
        print("\n[C4.2 - 05] Open drainage complaint:\n", reply)

    def test_06_multiple_matching_complaints_formatting(self):
        """Verify strict formatting when multiple match."""
        payload = {"message": "Open my escalated complaint"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        reply = res.json().get("reply", "")
        # Format must match: "I found N complaints that are ...:\n1. ...\n2. ...\n\nWhich one would you like to open?"
        self.assertTrue(reply.startswith("I found 2 complaints that are Escalated:"))
        self.assertIn("Which one would you like to open?", reply)

    def test_07_no_matching_complaint(self):
        """'Open my escalated complaint' when user has only an in-progress complaint -> clean explanation without navigation."""
        # For citizen with 0 complaints:
        res = self.client.post("/api/assistant/chat", json={"message": "Open my in-progress complaint"}, headers=self.zero_user_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        self.assertIn("You have not submitted any complaints yet.", data.get("reply", ""))

        # For user with complaints, but no matching status (CS8001 is In Progress, asking for Escalated):
        res2 = self.client.post("/api/assistant/chat", json={"message": "Open my escalated complaint"}, headers=self.single_user_headers)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertIsNone(data2.get("action"))
        self.assertIn("couldn't find an escalated complaint in your account", data2.get("reply", "").lower())

        # For user with complaints, but no matching issue type (asking for drainage):
        res3 = self.client.post("/api/assistant/chat", json={"message": "Open my drainage complaint"}, headers=self.single_user_headers)
        self.assertEqual(res3.status_code, 200)
        data3 = res3.json()
        self.assertIsNone(data3.get("action"))
        self.assertIn("couldn't find a drainage complaint in your account", data3.get("reply", "").lower())

    def test_08_foreign_complaint_protection(self):
        """Citizen 1 cannot open or discover CS9002 via filtering."""
        # CS9002 is owned by 999999. If zero_user asks "Open my drainage complaint":
        res = self.client.post("/api/assistant/chat", json={"message": "Open my drainage complaint"}, headers=self.zero_user_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        self.assertNotIn("CS9002", data.get("reply", ""))

    def test_09_public_user_gate(self):
        """Public visitor asking to open complaint -> login prompt without action."""
        payload = {"message": "Open my escalated complaint"}
        res = self.client.post("/api/assistant/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        self.assertIn("log in", data.get("reply", "").lower())

    # =========================================================================
    # 2. REGRESSION TESTS (C1, C2, C3.2, C3.4, C4.1)
    # =========================================================================

    def test_10_regression_c1_navigation(self):
        """C1 regression: 'I want to report a pothole' -> OPEN_REPORT_PAGE."""
        payload = {"message": "I want to report a pothole"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")

    def test_11_regression_c2_retrieval(self):
        """C2 regression: 'Show my complaints' -> informational retrieval."""
        payload = {"message": "Show my complaints"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        self.assertIn("CS1001", data.get("reply", ""))

    def test_12_regression_c3_2_complaint_explanation(self):
        """C3.2 regression: 'Why is my complaint still in progress?' on TrackComplaintPage."""
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
        self.assertIsNone(data.get("action"))
        self.assertIn("In Progress", data.get("reply", ""))

    def test_13_regression_c3_4_report_guidance(self):
        """C3.4 regression: 'What kind of photo is needed?' -> photo guidance."""
        payload = {
            "message": "What kind of photo is needed?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        self.assertIn("JPG or PNG", data.get("reply", ""))

    def test_14_regression_c4_1_specific_complaint_navigation(self):
        """C4.1 regression: 'Open complaint CS1001' -> OPEN_TRACK_COMPLAINT:CS1001."""
        payload = {"message": "Open complaint CS1001"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_TRACK_COMPLAINT:CS1001")


if __name__ == "__main__":
    unittest.main()
