"""
Comprehensive Test Suite for C4.3.1: Citizen Complaint Follow-Up
Tests:
1. Follow-up request -> confirmation only, NO mutation
2. Explicit confirmation -> existing API called, DB mutated
3. Explicit rejection -> no mutation
4. Ambiguous "okay" without pending confirmation -> no mutation
5. Confirmation after pending CS1001 -> only CS1001 executes
6. Foreign complaint -> safe denial, no mutation
7. Invalid complaint -> safe denial, no mutation
8. Public user -> blocked, no mutation
9. User changes topic -> pending action cancelled
10. C1 regression
11. C2 regression
12. C3.2 regression
13. C3.4 regression
14. C4.1/C4.2 regression
15. Multiple input phrasing (latest complaint, can I follow up)
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
from backend.app.models.complaint_history import ComplaintHistory
from backend.app.models.agent_action import AgentAction
from backend.app.utils.security import create_access_token


class TestC431ComplaintFollowup(unittest.TestCase):
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

            # Check citizen 1 owns CS1001
            c1001 = db.query(Complaint).filter(Complaint.id == "CS1001").first()
            assert c1001 is not None and c1001.citizen_id == cls.citizen.id
            cls.orig_updated_at = c1001.updated_at

            # Check citizen 2 owns CS9002
            c9002 = db.query(Complaint).filter(Complaint.id == "CS9002").first()
            assert c9002 is not None and c9002.citizen_id != cls.citizen.id
        finally:
            db.close()

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        try:
            c = db.query(Complaint).filter(Complaint.id == "CS1001").first()
            if c:
                c.follow_up_count = 0
                if hasattr(cls, "orig_updated_at") and cls.orig_updated_at:
                    c.updated_at = cls.orig_updated_at
            db.query(ComplaintHistory).filter(ComplaintHistory.complaint_id == "CS1001", ComplaintHistory.id > 3).delete()
            db.query(AgentAction).filter(AgentAction.complaint_id == "CS1001", AgentAction.action == "Follow-up Triggered").delete()
            db.commit()
        finally:
            db.close()

    def get_db_complaint_state(self, complaint_id):
        db = SessionLocal()
        try:
            complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
            hist_count = db.query(ComplaintHistory).filter(ComplaintHistory.complaint_id == complaint_id).count()
            action_count = db.query(AgentAction).filter(AgentAction.complaint_id == complaint_id).count()
            count = complaint.follow_up_count if complaint else None
            return count, hist_count, action_count
        finally:
            db.close()

    # -------------------------------------------------------------------------
    # 1. Follow-up request -> confirmation only, NO mutation
    # -------------------------------------------------------------------------
    def test_01_followup_request_confirmation_only_no_mutation(self):
        c_before, h_before, a_before = self.get_db_complaint_state("CS1001")

        payload = {"message": "Follow up on CS1001"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Check confirmation message phrasing
        self.assertIn("I can submit a follow-up request for complaint CS1001. Would you like me to proceed?", data["reply"])
        self.assertIsNone(data.get("action"))

        # Verify quick actions
        qa_prompts = [qa["prompt"] for qa in data.get("quick_actions", [])]
        self.assertIn("Yes, proceed", qa_prompts)

        # PROVE NO DATABASE MUTATION
        c_after, h_after, a_after = self.get_db_complaint_state("CS1001")
        self.assertEqual(c_after, c_before, "follow_up_count must NOT change on initial request")
        self.assertEqual(h_after, h_before, "ComplaintHistory must NOT be added on initial request")
        self.assertEqual(a_after, a_before, "AgentAction must NOT be added on initial request")

    # -------------------------------------------------------------------------
    # 2. Explicit confirmation -> existing API called
    # -------------------------------------------------------------------------
    def test_02_explicit_confirmation_existing_api_called(self):
        c_before, h_before, a_before = self.get_db_complaint_state("CS1001")

        history = [
            {"role": "user", "content": "Follow up on CS1001"},
            {"role": "assistant", "content": "I can submit a follow-up request for complaint CS1001. Would you like me to proceed?"}
        ]
        payload = {
            "message": "Yes, proceed",
            "conversation_history": history
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Must report actual backend result
        self.assertIn("submitted a follow-up inquiry for complaint #CS1001", data["reply"])
        self.assertIn("follow-up count is now", data["reply"])

        # PROVE EXACTLY ONE DATABASE MUTATION OCCURRED
        c_after, h_after, a_after = self.get_db_complaint_state("CS1001")
        self.assertEqual(c_after, c_before + 1, "follow_up_count must increment by exactly 1")
        self.assertEqual(h_after, h_before + 1, "Exactly one ComplaintHistory record must be created")
        self.assertEqual(a_after, a_before + 1, "Exactly one AgentAction record must be created")

        # Verify history remarks and agent action
        db = SessionLocal()
        try:
            latest_h = db.query(ComplaintHistory).filter(ComplaintHistory.complaint_id == "CS1001").order_by(ComplaintHistory.timestamp.desc()).first()
            self.assertIn("follow-up", latest_h.remarks.lower())
            latest_a = db.query(AgentAction).filter(AgentAction.complaint_id == "CS1001").order_by(AgentAction.timestamp.desc()).first()
            self.assertEqual(latest_a.agent_name, "Followup Agent")
        finally:
            db.close()

    # -------------------------------------------------------------------------
    # 3. Explicit rejection -> no mutation
    # -------------------------------------------------------------------------
    def test_03_explicit_rejection_no_mutation(self):
        c_before, h_before, a_before = self.get_db_complaint_state("CS1001")

        history = [
            {"role": "user", "content": "Follow up on CS1001"},
            {"role": "assistant", "content": "I can submit a follow-up request for complaint CS1001. Would you like me to proceed?"}
        ]
        for cancel_msg in ["No", "Cancel", "Don't do it"]:
            payload = {
                "message": cancel_msg,
                "conversation_history": history
            }
            res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()

            self.assertIn("cancelled", data["reply"].lower())
            self.assertIn("no changes were made", data["reply"].lower())

            # PROVE ZERO MUTATION
            c_after, h_after, a_after = self.get_db_complaint_state("CS1001")
            self.assertEqual(c_after, c_before, f"follow_up_count must NOT change on '{cancel_msg}'")
            self.assertEqual(h_after, h_before)
            self.assertEqual(a_after, a_before)

    # -------------------------------------------------------------------------
    # 4. Ambiguous "okay" without pending confirmation -> no mutation
    # -------------------------------------------------------------------------
    def test_04_ambiguous_okay_no_mutation(self):
        c_before, h_before, a_before = self.get_db_complaint_state("CS1001")

        # Case A: "Okay" without pending confirmation
        payload = {"message": "Okay", "conversation_history": []}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        c_after, _, _ = self.get_db_complaint_state("CS1001")
        self.assertEqual(c_after, c_before)

        # Case B: "Okay" WITH pending confirmation -> clarification prompt, no mutation!
        history = [
            {"role": "user", "content": "Follow up on CS1001"},
            {"role": "assistant", "content": "I can submit a follow-up request for complaint CS1001. Would you like me to proceed?"}
        ]
        payload = {"message": "Okay", "conversation_history": history}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Please reply 'Yes' or 'Confirm'", data["reply"])
        c_after2, _, _ = self.get_db_complaint_state("CS1001")
        self.assertEqual(c_after2, c_before, "'Okay' must NOT execute the mutation")

    # -------------------------------------------------------------------------
    # 5. Confirmation after pending CS1001 -> only CS1001 executes
    # -------------------------------------------------------------------------
    def test_05_confirmation_only_pending_complaint_executes(self):
        c1002_before, _, _ = self.get_db_complaint_state("CS1002")
        c1003_before, _, _ = self.get_db_complaint_state("CS1003")
        c1001_before, _, _ = self.get_db_complaint_state("CS1001")

        history = [
            {"role": "user", "content": "Follow up on CS1001"},
            {"role": "assistant", "content": "I can submit a follow-up request for complaint CS1001. Would you like me to proceed?"}
        ]
        payload = {"message": "Confirm", "conversation_history": history}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)

        c1001_after, _, _ = self.get_db_complaint_state("CS1001")
        c1002_after, _, _ = self.get_db_complaint_state("CS1002")
        c1003_after, _, _ = self.get_db_complaint_state("CS1003")

        self.assertEqual(c1001_after, c1001_before + 1, "CS1001 must increment")
        self.assertEqual(c1002_after, c1002_before, "CS1002 must remain untouched")
        self.assertEqual(c1003_after, c1003_before, "CS1003 must remain untouched")

    # -------------------------------------------------------------------------
    # 6. Foreign complaint -> safe denial
    # -------------------------------------------------------------------------
    def test_06_foreign_complaint_safe_denial(self):
        c9002_before, _, _ = self.get_db_complaint_state("CS9002")

        payload = {"message": "Follow up on CS9002"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("couldn't find that complaint in your account", data["reply"].lower())
        self.assertNotIn("Would you like me to proceed", data["reply"])

        c9002_after, _, _ = self.get_db_complaint_state("CS9002")
        self.assertEqual(c9002_after, c9002_before, "Foreign complaint must NOT mutate")

    # -------------------------------------------------------------------------
    # 7. Invalid complaint -> safe denial
    # -------------------------------------------------------------------------
    def test_07_invalid_complaint_safe_denial(self):
        payload = {"message": "Follow up on CS9999"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("couldn't find that complaint in your account", data["reply"].lower())
        self.assertNotIn("Would you like me to proceed", data["reply"])

    # -------------------------------------------------------------------------
    # 8. Public user -> blocked
    # -------------------------------------------------------------------------
    def test_08_public_user_blocked(self):
        c_before, _, _ = self.get_db_complaint_state("CS1001")

        # Step 1: Follow-up request by public user
        payload = {"message": "Follow up on CS1001"}
        res = self.client.post("/api/assistant/chat", json=payload) # no headers
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("log in to your civicseva account", data["reply"].lower())
        self.assertNotIn("Would you like me to proceed", data["reply"])

        # Step 2: Confirmation attempt by public user
        history = [
            {"role": "user", "content": "Follow up on CS1001"},
            {"role": "assistant", "content": "I can submit a follow-up request for complaint CS1001. Would you like me to proceed?"}
        ]
        payload = {"message": "Yes, proceed", "conversation_history": history}
        res2 = self.client.post("/api/assistant/chat", json=payload)
        self.assertEqual(res2.status_code, 200)
        self.assertIn("log in", res2.json()["reply"].lower())

        c_after, _, _ = self.get_db_complaint_state("CS1001")
        self.assertEqual(c_after, c_before, "Public user must never mutate DB")

    # -------------------------------------------------------------------------
    # 9. User changes topic -> pending action cancelled
    # -------------------------------------------------------------------------
    def test_09_user_changes_topic_pending_action_cancelled(self):
        c_before, _, _ = self.get_db_complaint_state("CS1001")

        # User was offered confirmation for CS1001, but asked to show complaints instead
        history = [
            {"role": "user", "content": "Follow up on CS1001"},
            {"role": "assistant", "content": "I can submit a follow-up request for complaint CS1001. Would you like me to proceed?"},
            {"role": "user", "content": "Show my complaints"},
            {"role": "assistant", "content": "Here are your submitted complaints:\n1. CS1099 — Low Pressure — Escalated\n2. CS1005 — Drainage — Acknowledged\n3. CS1001 — Pothole — In Progress"}
        ]
        # Now user says "Yes" after topic change
        payload = {"message": "Yes", "conversation_history": history}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Follow-up must NOT have executed
        self.assertNotIn("submitted a follow-up inquiry", data["reply"])
        c_after, _, _ = self.get_db_complaint_state("CS1001")
        self.assertEqual(c_after, c_before, "Pending follow-up must be discarded upon topic change")

    # -------------------------------------------------------------------------
    # 10. C1 regression
    # -------------------------------------------------------------------------
    def test_10_c1_regression(self):
        res = self.client.post("/api/assistant/chat", json={"message": "I want to report a pothole"}, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["action"], "OPEN_REPORT_PAGE")

    # -------------------------------------------------------------------------
    # 11. C2 regression
    # -------------------------------------------------------------------------
    def test_11_c2_regression(self):
        res = self.client.post("/api/assistant/chat", json={"message": "Show my complaints"}, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn("submitted complaints", res.json()["reply"].lower())

    # -------------------------------------------------------------------------
    # 12. C3.2 regression
    # -------------------------------------------------------------------------
    def test_12_c3_2_regression(self):
        ctx = {"route": "/track/CS1001", "page_name": "TrackComplaintPage", "selected_complaint_id": "CS1001"}
        res = self.client.post(
            "/api/assistant/chat",
            json={"message": "Why is my complaint still in progress?", "page_context": ctx, "selected_complaint_id": "CS1001"},
            headers=self.citizen_headers
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("in progress", res.json()["reply"].lower())

    # -------------------------------------------------------------------------
    # 13. C3.4 regression
    # -------------------------------------------------------------------------
    def test_13_c3_4_regression(self):
        ctx = {"route": "/report", "page_name": "ReportIssuePage"}
        res = self.client.post(
            "/api/assistant/chat",
            json={"message": "What kind of photo is needed?", "page_context": ctx},
            headers=self.citizen_headers
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("photo should meet these criteria", res.json()["reply"].lower())

    # -------------------------------------------------------------------------
    # 14. C4.1 and C4.2 regression
    # -------------------------------------------------------------------------
    def test_14_c4_1_c4_2_regression(self):
        # C4.1
        res1 = self.client.post("/api/assistant/chat", json={"message": "Open complaint CS1001"}, headers=self.citizen_headers)
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["action"], "OPEN_TRACK_COMPLAINT:CS1001")

        # C4.2
        res2 = self.client.post("/api/assistant/chat", json={"message": "Open my complaint that's in progress"}, headers=self.citizen_headers)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["action"], "OPEN_TRACK_COMPLAINT:CS1001")

    # -------------------------------------------------------------------------
    # 15. Variations: latest complaint and "Can I follow up on my complaint?"
    # -------------------------------------------------------------------------
    def test_15_phrasing_variations(self):
        c_before, _, _ = self.get_db_complaint_state("CS1099")

        # "Submit a follow-up for my latest complaint" -> identifies CS1099
        payload = {"message": "Submit a follow-up for my latest complaint"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("I can submit a follow-up request for complaint CS1099. Would you like me to proceed?", data["reply"])

        c_after, _, _ = self.get_db_complaint_state("CS1099")
        self.assertEqual(c_after, c_before, "No mutation before confirmation")

        # "I want to follow up on CS1001"
        res2 = self.client.post("/api/assistant/chat", json={"message": "I want to follow up on CS1001"}, headers=self.citizen_headers)
        self.assertEqual(res2.status_code, 200)
        self.assertIn("I can submit a follow-up request for complaint CS1001. Would you like me to proceed?", res2.json()["reply"])


if __name__ == "__main__":
    unittest.main()
