"""
Comprehensive End-to-End Test Suite for C2: Citizen Read-Only Complaint Retrieval
Tests the POST /api/assistant/chat endpoint with authenticated JWT, role validation,
ownership checks, C1 navigation regressions, and security boundaries.
"""

import sys
import unittest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.user import User
from backend.app.models.complaint import Complaint
from backend.app.utils.security import create_access_token


class TestC2ComplaintRetrieval(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db = SessionLocal()
        try:
            # 1. Citizen 1 (has complaints CS1001..CS1005)
            cls.citizen1 = db.query(User).filter(User.id == 1).first()
            assert cls.citizen1 is not None, "Citizen 1 must exist in DB"
            token1 = create_access_token(data={
                "user_id": cls.citizen1.id,
                "email": cls.citizen1.email,
                "role": cls.citizen1.role
            })
            cls.citizen1_headers = {"Authorization": f"Bearer {token1}"}

            # 2. Check CS9002 belongs to another user
            cs9002 = db.query(Complaint).filter(Complaint.id == "CS9002").first()
            if not cs9002:
                # Create a complaint owned by another user for testing
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

            # 3. Create a test citizen with 0 complaints
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
            cls.zero_user = zero_user
            token_zero = create_access_token(data={
                "user_id": cls.zero_user.id,
                "email": cls.zero_user.email,
                "role": cls.zero_user.role
            })
            cls.zero_user_headers = {"Authorization": f"Bearer {token_zero}"}

        finally:
            db.close()

    # =========================================================================
    # 1. CORE C2 CITIZEN RETRIEVAL TESTS
    # =========================================================================

    def test_01_show_my_complaints(self):
        """Verify 'Show my complaints' lists the authenticated citizen's complaints."""
        res = self.client.post("/api/assistant/chat", json={"message": "Show my complaints"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Here are your submitted complaints:", reply)
        self.assertIn("CS1001", reply)
        print("\n[TEST 01] 'Show my complaints' reply:\n", reply)

    def test_02_what_is_my_latest_complaint(self):
        """Verify 'What is my latest complaint?' retrieves latest complaint details."""
        res = self.client.post("/api/assistant/chat", json={"message": "What is my latest complaint?"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Your latest complaint is #", reply)
        self.assertIn("Status:", reply)
        self.assertIn("Department:", reply)
        print("\n[TEST 02] 'What is my latest complaint?' reply:\n", reply)

    def test_03_status_of_my_latest_complaint(self):
        """Verify 'What is the status of my latest complaint?' works."""
        res = self.client.post("/api/assistant/chat", json={"message": "What is the status of my latest complaint?"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Your latest complaint is #", reply)
        self.assertIn("Status:", reply)
        print("\n[TEST 03] 'What is the status of my latest complaint?' reply:\n", reply)

    def test_04_i_want_to_track_my_complaint(self):
        """Verify 'I want to track my complaint' provides complaint tracking overview."""
        res = self.client.post("/api/assistant/chat", json={"message": "I want to track my complaint"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Sure. I can check your complaints.", reply)
        self.assertIn("Here are your recent complaints:", reply)
        print("\n[TEST 04] 'I want to track my complaint' reply:\n", reply)

    def test_05_can_you_check_my_complaint(self):
        """Verify 'Can you check my complaint?' works."""
        res = self.client.post("/api/assistant/chat", json={"message": "Can you check my complaint?"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Sure. I can check your complaints.", reply)
        print("\n[TEST 05] 'Can you check my complaint?' reply:\n", reply)

    def test_06_track_complaint_cs1001(self):
        """Verify 'Track complaint CS1001' retrieves authorized dossier."""
        res = self.client.post("/api/assistant/chat", json={"message": "Track complaint CS1001"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Complaint #CS1001:", reply)
        self.assertIn("Status: In Progress", reply)
        self.assertIn("Department:", reply)
        self.assertIn("Recent Timeline:", reply)
        # Ensure private officer phone is NOT in reply
        self.assertNotIn("+91", reply)
        self.assertNotIn("assigned_officer_phone", reply)
        print("\n[TEST 06] 'Track complaint CS1001' reply:\n", reply)

    def test_07_whats_the_status_of_cs1001(self):
        """Verify 'What\'s the status of CS1001?' retrieves authorized dossier."""
        res = self.client.post("/api/assistant/chat", json={"message": "What's the status of CS1001?"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Complaint #CS1001:", reply)
        self.assertIn("Status: In Progress", reply)
        print("\n[TEST 07] 'What's the status of CS1001?' reply:\n", reply)

    # =========================================================================
    # 2. SECURITY & OWNERSHIP TESTS
    # =========================================================================

    def test_08_security_other_citizen_complaint(self):
        """
        Verify that a citizen requesting a complaint belonging to another citizen
        (CS9002 owned by citizen_id 999999) receives a safe response with NO private data.
        """
        res = self.client.post("/api/assistant/chat", json={"message": "Track complaint CS9002"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("I couldn't find that complaint in your complaints", reply)
        # Verify no details leaked
        self.assertNotIn("Private complaint owned by another user", reply)
        self.assertNotIn("999999", reply)
        print("\n[TEST 08] Security (Other Citizen Complaint CS9002) reply:\n", reply)

    def test_09_security_unauthenticated_public_user(self):
        """Verify unauthenticated user cannot retrieve complaint information."""
        # A. Track complaint
        res1 = self.client.post("/api/assistant/chat", json={"message": "Track complaint CS1001"})
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertIsNone(data1.get("action"))
        reply1 = data1.get("reply", "")
        self.assertIn("Please log in to your CivicSeva account", reply1)
        self.assertNotIn("In Progress", reply1)

        # B. Show my complaints
        res2 = self.client.post("/api/assistant/chat", json={"message": "Show my complaints"})
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        reply2 = data2.get("reply", "")
        self.assertIn("Please log in to your CivicSeva account", reply2)
        self.assertNotIn("CS1001", reply2)

        # C. Latest complaint
        res3 = self.client.post("/api/assistant/chat", json={"message": "What is my latest complaint?"})
        self.assertEqual(res3.status_code, 200)
        data3 = res3.json()
        reply3 = data3.get("reply", "")
        self.assertIn("Please log in to your CivicSeva account", reply3)
        print("\n[TEST 09] Security (Unauthenticated User) reply:\n", reply1)

    def test_10_empty_citizen_complaints(self):
        """Verify citizen with 0 complaints receives safe empty message."""
        res = self.client.post("/api/assistant/chat", json={"message": "Show my complaints"}, headers=self.zero_user_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("I couldn't find any complaints submitted from your account yet", reply)

        res2 = self.client.post("/api/assistant/chat", json={"message": "What is my latest complaint?"}, headers=self.zero_user_headers)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        reply2 = data2.get("reply", "")
        self.assertIn("I couldn't find any complaints submitted from your account yet", reply2)
        print("\n[TEST 10] Zero-complaint citizen reply:\n", reply)

    # =========================================================================
    # 3. C1 REPORT NAVIGATION REGRESSION TESTS
    # =========================================================================

    def test_11_c1_file_complaint(self):
        """Regression test: 'I want to file a complaint' must still trigger OPEN_REPORT_PAGE."""
        res = self.client.post("/api/assistant/chat", json={"message": "I want to file a complaint"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")
        self.assertIn("Report Issue", data.get("reply", ""))

    def test_12_c1_report_pothole(self):
        """Regression test: 'I want to report a pothole' must trigger OPEN_REPORT_PAGE."""
        res = self.client.post("/api/assistant/chat", json={"message": "I want to report a pothole"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")

    def test_13_c1_complain_about_garbage(self):
        """Regression test: 'I need to complain about garbage' must trigger OPEN_REPORT_PAGE."""
        res = self.client.post("/api/assistant/chat", json={"message": "I need to complain about garbage"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")

    def test_14_c1_open_report_issue_tab(self):
        """Regression test: 'Open the Report Issue tab' must trigger OPEN_REPORT_PAGE."""
        res = self.client.post("/api/assistant/chat", json={"message": "Open the Report Issue tab"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")

    # =========================================================================
    # 4. INFORMATIONAL & NON-ACTION QUERIES
    # =========================================================================

    def test_15_informational_how_to_report(self):
        """Informational question: 'How do I report a pothole?' must NOT trigger navigation."""
        res = self.client.post("/api/assistant/chat", json={"message": "How do I report a pothole?"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))

    def test_16_informational_how_to_complain(self):
        """Informational question: 'How can I complain about garbage?' must NOT trigger navigation."""
        res = self.client.post("/api/assistant/chat", json={"message": "How can I complain about garbage?"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))

    def test_17_non_action_random(self):
        """Random prompt: 'Take me somewhere random' must NOT trigger any action."""
        res = self.client.post("/api/assistant/chat", json={"message": "Take me somewhere random"}, headers=self.citizen1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))


if __name__ == "__main__":
    unittest.main()
