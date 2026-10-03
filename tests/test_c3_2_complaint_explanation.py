"""
Comprehensive Test Suite for C3.2: Citizen Assistant Contextual Complaint Explanation
Tests specific complaint explanation, status explanation, progress/timeline explanations,
department assignment, escalation explanation without hallucinated reasons, ownership gating,
and regressions against C1, C2, and C3.1.
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


class TestC32ComplaintExplanation(unittest.TestCase):
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

            # Ensure CS9002 exists and belongs to another citizen
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

            # Ensure an escalated complaint WITHOUT reason exists for Citizen 1 (CS1099)
            cs1099 = db.query(Complaint).filter(Complaint.id == "CS1099").first()
            if not cs1099:
                cs1099 = Complaint(
                    id="CS1099",
                    citizen_id=cls.citizen.id,
                    category="water_supply",
                    issue_type="Low Pressure",
                    description="Low water pressure in locality",
                    severity="MEDIUM",
                    status="Escalated"
                )
                db.add(cs1099)
                db.commit()
        finally:
            db.close()

    # =========================================================================
    # A. Specific Complaint Explanation ("What happened to my complaint?")
    # =========================================================================
    def test_a_specific_complaint_explanation(self):
        """A. 'What happened to my complaint?' on TrackComplaintPage with CS1001."""
        payload = {
            "message": "What happened to my complaint?",
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
        self.assertIn("Municipal Road Department", reply)
        self.assertIn("There is no completion date recorded in the available information.", reply)
        # Ensure no fabricated ETA or future dates
        self.assertNotIn("will be resolved tomorrow", reply.lower())
        self.assertNotIn("estimated time of arrival", reply.lower())
        print("\n[C3.2 - A] 'What happened to my complaint?':\n", reply)

    # =========================================================================
    # B. Status Explanation ("What does this status mean?")
    # =========================================================================
    def test_b_status_explanation(self):
        """B. 'What does this status mean?' explains In Progress status grounded in system semantics."""
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
        reply = data.get("reply", "")
        self.assertIn("CS1001", reply)
        self.assertIn("In Progress", reply)
        self.assertIn("actively working on-site", reply)
        self.assertIn("The available complaint record does not provide an estimated completion date.", reply)
        print("\n[C3.2 - B] 'What does this status mean?':\n", reply)

    # =========================================================================
    # C. Progress Explanation ("Why is my complaint still in progress?")
    # =========================================================================
    def test_c_progress_explanation(self):
        """C. 'Why is my complaint still in progress?' explains status meaning without inventing ETA."""
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
        # Ensure it does NOT fabricate completion dates
        self.assertNotIn("tomorrow", reply.lower())
        self.assertNotIn("will finish", reply.lower())
        print("\n[C3.2 - C] 'Why is my complaint still in progress?':\n", reply)

    # =========================================================================
    # D. Timeline Explanation ("Explain the timeline.")
    # =========================================================================
    def test_d_timeline_explanation(self):
        """D. 'Explain the timeline.' summarizes actual ComplaintHistory events in order."""
        payload = {
            "message": "Explain the timeline.",
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
        self.assertIn("Timeline for complaint #CS1001:", reply)
        self.assertIn("Submitted", reply)
        self.assertIn("Assigned", reply)
        self.assertIn("In Progress", reply)
        self.assertIn("There is no completion date recorded in the available information.", reply)
        print("\n[C3.2 - D] 'Explain the timeline.':\n", reply)

    # =========================================================================
    # E. Summary ("Summarize my complaint.")
    # =========================================================================
    def test_e_summary(self):
        """E. 'Summarize my complaint.' returns concise factual summary."""
        payload = {
            "message": "Summarize my complaint.",
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
        self.assertIn("Complaint #CS1001", reply)
        self.assertIn("Department: Municipal Road Department", reply)
        self.assertIn("Severity: HIGH", reply)
        self.assertIn("Recent progress:", reply)
        self.assertIn("There is no completion date recorded in the available information.", reply)
        print("\n[C3.2 - E] 'Summarize my complaint.':\n", reply)

    # =========================================================================
    # F. Department Handling ("Which department is handling it?")
    # =========================================================================
    def test_f_department(self):
        """F. 'Which department is handling it?' returns assigned department without leaking private data."""
        payload = {
            "message": "Which department is handling it?",
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
        self.assertIn("Municipal Road Department", reply)
        self.assertNotIn("+91", reply)
        self.assertNotIn("phone", reply.lower())
        print("\n[C3.2 - F] 'Which department is handling it?':\n", reply)

    # =========================================================================
    # G. Submission Date ("When was my complaint submitted?")
    # =========================================================================
    def test_g_submission_date(self):
        """G. 'When was my complaint submitted?' returns recorded created_at date."""
        payload = {
            "message": "When was my complaint submitted?",
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
        self.assertIn("Complaint #CS1001 was submitted on", reply)
        self.assertIn("September 2026", reply)
        print("\n[C3.2 - G] 'When was my complaint submitted?':\n", reply)

    # =========================================================================
    # H. Assignment Date ("When was it assigned?")
    # =========================================================================
    def test_h_assignment_date(self):
        """H. 'When was it assigned?' returns assignment timestamp from history."""
        payload = {
            "message": "When was it assigned?",
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
        self.assertIn("Complaint #CS1001 was assigned on", reply)
        self.assertIn("26 Sep 2026", reply)
        print("\n[C3.2 - H] 'When was it assigned?':\n", reply)

    # =========================================================================
    # I. Escalation Without Reason ("Why was my complaint escalated?")
    # =========================================================================
    def test_i_escalation_without_reason(self):
        """I. 'Why was my complaint escalated?' on CS1099 (no reason in DB) must NOT invent a reason."""
        payload = {
            "message": "Why was my complaint escalated?",
            "page_context": {
                "page_name": "TrackComplaintPage",
                "route": "/track/CS1099",
                "selected_complaint_id": "CS1099"
            },
            "selected_complaint_id": "CS1099"
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        reply = data.get("reply", "")
        self.assertIn("The complaint #CS1099 is marked as Escalated, but the available record does not include a reason for the escalation.", reply)
        # Ensure it does not infer reasons
        self.assertNotIn("because of high severity", reply.lower())
        self.assertNotIn("due to category", reply.lower())
        print("\n[C3.2 - I] Escalation without reason reply:\n", reply)

    def test_i2_escalation_on_non_escalated_complaint(self):
        """I2. 'Why was my complaint escalated?' on CS1001 (In Progress) clarifies it is not escalated."""
        payload = {
            "message": "Why was my complaint escalated?",
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
        self.assertIn("Complaint #CS1001 is currently marked as In Progress, not Escalated.", reply)
        print("\n[C3.2 - I2] Escalation on non-escalated complaint:\n", reply)

    # =========================================================================
    # J. Foreign Complaint (Security: citizen accessing another's complaint)
    # =========================================================================
    def test_j_foreign_complaint_safe_denial(self):
        """J. Citizen requesting explanation for CS9002 receives safe denial without leaking data."""
        payload = {
            "message": "What happened to my complaint?",
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
        print("\n[C3.2 - J] Foreign complaint safe denial:\n", reply)

    # =========================================================================
    # K. Public User (Unauthenticated)
    # =========================================================================
    def test_k_public_user_safe_response(self):
        """K. Public user receives login prompt, no private complaint data exposed."""
        payload = {
            "message": "What happened to my complaint?",
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
        print("\n[C3.2 - K] Public user response:\n", reply)

    # =========================================================================
    # L. Invalid Complaint ID
    # =========================================================================
    def test_l_invalid_complaint_safe_response(self):
        """L. Invalid complaint ID yields safe not-found response."""
        payload = {
            "message": "What happened to complaint CS9999?",
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
        self.assertIn("I couldn't find that complaint in your account", reply)
        print("\n[C3.2 - L] Invalid complaint response:\n", reply)

    # =========================================================================
    # M. C1 Regression ("I want to report a pothole" -> OPEN_REPORT_PAGE)
    # =========================================================================
    def test_m_c1_regression_report_pothole(self):
        """M. C1 Navigation regression: 'I want to report a pothole' must trigger OPEN_REPORT_PAGE."""
        payload = {
            "message": "I want to report a pothole",
            "page_context": {"page_name": "TrackComplaintPage", "route": "/track"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")
        self.assertIn("Report Issue", data.get("reply", ""))
        print("\n[C3.2 - M] C1 regression action:\n", data.get("action"))

    # =========================================================================
    # N. C2 Regression ("Show my complaints" -> complaint list)
    # =========================================================================
    def test_n_c2_regression_show_my_complaints(self):
        """N. C2 Retrieval regression: 'Show my complaints' lists citizen's complaints."""
        payload = {
            "message": "Show my complaints",
            "page_context": {"page_name": "TrackComplaintPage", "route": "/track/CS1001", "selected_complaint_id": "CS1001"},
            "selected_complaint_id": "CS1001"
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Here are your submitted complaints:", reply)
        self.assertIn("CS1001", reply)
        print("\n[C3.2 - N] C2 regression reply snippet:\n", reply[:120])

    # =========================================================================
    # O. C2 Regression ("Track complaint CS1001" -> dossier)
    # =========================================================================
    def test_o_c2_regression_track_complaint(self):
        """O. C2 Retrieval regression: 'Track complaint CS1001' returns full dossier."""
        payload = {
            "message": "Track complaint CS1001",
            "page_context": {"page_name": "TrackComplaintPage", "route": "/track"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Complaint #CS1001:", reply)
        self.assertIn("Status: In Progress", reply)
        self.assertIn("Recent Timeline:", reply)
        print("\n[C3.2 - O] C2 regression dossier reply snippet:\n", reply[:120])

    # =========================================================================
    # P. C3.1 Regression ("What do I do here?" -> page guidance)
    # =========================================================================
    def test_p_c3_1_regression_what_do_i_do_here(self):
        """P. C3.1 Page Awareness regression: 'What do I do here?' returns page-level guidance."""
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
        self.assertIn("You're on the complaint tracking page", reply)
        self.assertIn("review the progress stepper and timeline history", reply)
        print("\n[C3.2 - P] C3.1 regression reply:\n", reply)


if __name__ == "__main__":
    unittest.main()
