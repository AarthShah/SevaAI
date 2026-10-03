"""
Comprehensive Test Suite for C3.4: Citizen Report Guidance
Tests:
1. "What kind of photo is needed?" -> Photo criteria, format, size, clarity, framing.
2. "What types of civic issues can I report?" -> Grounded categories (Road, Waste, Streetlight, Water, Drainage).
3. "Why is location important when reporting?" -> Precise dispatch, ward routing, duplicate detection, live GPS.
4. "How does the AI analyze my photo?" -> 4-step workflow (Upload, AI analysis, Citizen review, Field verification).
5. Dynamic ReportIssuePage form context integration (Step 1, GPS locked, AI summary).
6. Public user capability for report guidance.
7. Regressions:
   - C1 ("I want to report a pothole" -> OPEN_REPORT_PAGE)
   - C2 ("Show my complaints", "Track complaint CS1001")
   - C3.1 ("What do I do here?" on ReportIssuePage)
   - C3.2 ("Why is my complaint still in progress?")
   - C3.3 ("What should I know?")
   - C4.1 ("Open the Report Issue page", "Take me to the dashboard")
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


class TestC34ReportGuidance(unittest.TestCase):
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
    # 1. CORE C3.4 REPORT GUIDANCE QUESTIONS
    # =========================================================================

    def test_01_photo_guidance_authenticated(self):
        """'What kind of photo is needed?' -> clear photo guidance based on ReportIssuePage."""
        payload = {
            "message": "What kind of photo is needed?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")

        # Verify key grounded criteria
        self.assertIn("JPG or PNG", reply)
        self.assertIn("10MB", reply)
        self.assertTrue("pothole" in reply.lower() or "defect" in reply.lower())
        self.assertTrue("blurry" in reply.lower() or "focus" in reply.lower())
        print("\n[C3.4 - 01] Photo guidance reply:\n", reply)

    def test_02_categories_guidance_authenticated(self):
        """'What types of civic issues can I report?' -> only supported categories."""
        payload = {
            "message": "What types of civic issues can I report?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")

        # Verify supported categories
        self.assertIn("Road Infrastructure", reply)
        self.assertIn("Waste Management", reply)
        self.assertIn("Street Lighting", reply)
        self.assertIn("Water Supply", reply)
        self.assertIn("Stormwater & Drainage", reply)
        print("\n[C3.4 - 02] Categories guidance reply:\n", reply)

    def test_03_location_guidance_authenticated(self):
        """'Why is location important when reporting?' -> explains GPS, dispatch, ward, duplicates."""
        payload = {
            "message": "Why is location important when reporting?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")

        # Verify purpose of location
        self.assertTrue("squad" in reply.lower() or "dispatch" in reply.lower())
        self.assertTrue("ward" in reply.lower() or "routing" in reply.lower())
        self.assertTrue("duplicate" in reply.lower())
        self.assertTrue("gps" in reply.lower())
        print("\n[C3.4 - 03] Location guidance reply:\n", reply)

    def test_04_ai_analysis_guidance_authenticated(self):
        """'How does the AI analyze my photo?' -> explains 4-step analysis & review workflow."""
        payload = {
            "message": "How does the AI analyze my photo?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")

        # Verify AI workflow
        self.assertTrue("photo" in reply.lower() or "image" in reply.lower())
        self.assertTrue("category" in reply.lower() or "department" in reply.lower())
        self.assertTrue("review" in reply.lower() or "edit" in reply.lower())
        self.assertTrue("field" in reply.lower() or "officer" in reply.lower() or "verification" in reply.lower())
        print("\n[C3.4 - 04] AI analysis guidance reply:\n", reply)

    # =========================================================================
    # 2. CONTEXTUAL FORM INTEGRATION (ReportIssuePage dynamic state)
    # =========================================================================

    def test_05_photo_guidance_with_step1_form_context(self):
        """Photo guidance contextualized when user is on Step 1."""
        payload = {
            "message": "What kind of photo is needed?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"},
            "form_context": {
                "active": True,
                "current_step": 1,
                "has_image": False,
                "is_analyzing": False
            }
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        reply = res.json().get("reply", "")
        self.assertIn("Step 1", reply)

    def test_06_location_guidance_with_gps_locked(self):
        """Location guidance contextualized when GPS is currently locked."""
        payload = {
            "message": "Why is location important when reporting?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"},
            "form_context": {
                "active": True,
                "current_step": 1,
                "gps_locked": True
            }
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        reply = res.json().get("reply", "")
        self.assertIn("GPS is currently locked", reply)

    def test_07_ai_guidance_with_analysis_summary(self):
        """AI guidance contextualized when an analysis summary is currently displayed."""
        payload = {
            "message": "How does the AI analyze my photo?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"},
            "form_context": {
                "active": True,
                "current_step": 3,
                "ai_analysis_available": True,
                "ai_analysis_summary": {
                    "issue": "Road Pothole",
                    "category": "Road Infrastructure",
                    "severity": "HIGH",
                    "department": "Road Department",
                    "confidence": "92%"
                }
            }
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        reply = res.json().get("reply", "")
        self.assertIn("Road Pothole", reply)
        self.assertIn("92%", reply)

    # =========================================================================
    # 3. PUBLIC VISITOR ACCESS
    # =========================================================================

    def test_08_public_user_can_ask_report_guidance(self):
        """Unauthenticated visitor can ask report guidance questions safely."""
        for msg, expected_kw in [
            ("What kind of photo is needed?", "JPG or PNG"),
            ("What types of civic issues can I report?", "Road Infrastructure"),
            ("Why is location important when reporting?", "GPS"),
            ("How does the AI analyze my photo?", "department")
        ]:
            res = self.client.post("/api/assistant/chat", json={"message": msg})
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertIsNone(data.get("action"))
            self.assertIn(expected_kw.lower(), data.get("reply", "").lower())

    # =========================================================================
    # 4. REGRESSION TESTS (C1, C2, C3.1, C3.2, C3.3, C4.1)
    # =========================================================================

    def test_09_regression_c1_navigation(self):
        """C1 regression: 'I want to report a pothole' -> OPEN_REPORT_PAGE."""
        payload = {"message": "I want to report a pothole"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_REPORT_PAGE")

    def test_10_regression_c2_retrieval(self):
        """C2 regression: 'Show my complaints' -> lists complaints."""
        payload = {"message": "Show my complaints"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        self.assertIn("CS1001", data.get("reply", ""))

    def test_11_regression_c3_1_page_help(self):
        """C3.1 regression: 'What do I do here?' on ReportIssuePage -> generic page help intact."""
        payload = {
            "message": "What do I do here?",
            "page_context": {"page_name": "ReportIssuePage", "route": "/report"}
        }
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNone(data.get("action"))
        reply = data.get("reply", "")
        self.assertIn("Report Issue page. Here is how it works:", reply)
        self.assertIn("Upload a clear photo of the civic problem", reply)
        self.assertIn("Submit your complaint to receive a tracking ID", reply)

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

    def test_13_regression_c3_3_proactive_assistance(self):
        """C3.3 regression: 'What should I know?' on TrackComplaintPage -> proactive summary."""
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
        self.assertIsNone(data.get("action"))
        self.assertIn("CS1001 is currently In Progress", data.get("reply", ""))

    def test_14_regression_c4_1_convenience_navigation(self):
        """C4.1 regression: 'Take me to the dashboard' -> OPEN_DASHBOARD_PAGE."""
        payload = {"message": "Take me to the dashboard"}
        res = self.client.post("/api/assistant/chat", json=payload, headers=self.citizen_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("action"), "OPEN_DASHBOARD_PAGE")


if __name__ == "__main__":
    unittest.main()
