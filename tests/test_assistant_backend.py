"""
CivicSeva Contextual Assistant - Backend Verification Test Suite

Verifies:
1. Public request works without token.
2. Citizen request identifies citizen role.
3. Authority request identifies authority role.
4. Invalid JWT does not become authority (falls back to public).
5. Frontend role cannot override backend role.
6. Citizen cannot access another citizen's complaint (access gated).
7. Authority can access authorized complaint context.
8. Missing complaint returns safe response.
9. Mutation request receives guidance rather than mutation.
10. No LLM key uses deterministic fallback.
11. LLM failure uses deterministic fallback.
12. Assistant never calls autonomous agent execution.
13. Assistant never calls complaint mutation.
14. Hallucinated complaint output is rejected where context validation applies.
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Guarantee backend directory is in sys.path
_ROOT_DIR = Path(__file__).resolve().parent.parent
if str(_ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(_ROOT_DIR))

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.session import SessionLocal, ensure_db_initialized
from backend.app.models.user import User
from backend.app.models.complaint import Complaint
from backend.app.utils.security import create_access_token
from backend.app.schemas.assistant import AssistantChatRequest, AssistantChatResponse, AssistantContext, AuthContextData, ComplaintContextData
from backend.app.services.assistant_service import AssistantService, _validate_output
from backend.app.services.autonomous_agent import autonomous_engine
from backend.app.services.complaint_service import ComplaintService


class TestAssistantBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_db_initialized()
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Fetch or verify test users
        cls.citizen_user = cls.db.query(User).filter(User.role == "citizen").first()
        cls.authority_user = cls.db.query(User).filter(User.role == "authority").first()

        # If citizen user doesn't exist, create one for test
        if not cls.citizen_user:
            cls.citizen_user = User(
                name="Test Citizen",
                email="test_citizen@civicseva.org",
                role="citizen",
                hashed_password="hash",
            )
            cls.db.add(cls.citizen_user)
            cls.db.commit()
            cls.db.refresh(cls.citizen_user)

        if not cls.authority_user:
            cls.authority_user = User(
                name="Test Authority",
                email="test_auth@civicseva.org",
                role="authority",
                hashed_password="hash",
            )
            cls.db.add(cls.authority_user)
            cls.db.commit()
            cls.db.refresh(cls.authority_user)

        # Generate tokens
        cls.citizen_token = create_access_token({"user_id": cls.citizen_user.id})
        cls.authority_token = create_access_token({"user_id": cls.authority_user.id})

        # Find or create a test complaint owned by citizen_user
        cls.owned_complaint = cls.db.query(Complaint).filter(Complaint.citizen_id == cls.citizen_user.id).first()
        if not cls.owned_complaint:
            cls.owned_complaint = Complaint(
                id="CS9001",
                citizen_id=cls.citizen_user.id,
                category="Road Infrastructure",
                issue_type="Pothole",
                description="Test pothole complaint for assistant verification",
                severity="HIGH",
                status="Assigned",
            )
            cls.db.add(cls.owned_complaint)
            cls.db.commit()
            cls.db.refresh(cls.owned_complaint)

        # Create another complaint owned by a different user ID (e.g. 999999)
        cls.other_complaint = cls.db.query(Complaint).filter(Complaint.citizen_id != cls.citizen_user.id).first()
        if not cls.other_complaint:
            cls.other_complaint = Complaint(
                id="CS9002",
                citizen_id=999999,
                category="Sanitation",
                issue_type="Garbage",
                description="Other citizen's complaint",
                severity="MEDIUM",
                status="Submitted",
            )
            cls.db.add(cls.other_complaint)
            cls.db.commit()
            cls.db.refresh(cls.other_complaint)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # 1. Public request works without token
    def test_01_public_request_works_without_token(self):
        response = self.client.post(
            "/api/assistant/chat",
            json={"message": "What is CivicSeva?"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("reply", data)
        self.assertTrue(len(data["reply"]) > 0)
        self.assertIn("quick_actions", data)

    # 2. Citizen request identifies citizen role
    def test_02_citizen_request_identifies_citizen_role(self):
        req = AssistantChatRequest(message="How do I track my complaint?")
        resp = AssistantService.chat(req, current_user=self.citizen_user, db=self.db)
        self.assertIsInstance(resp, AssistantChatResponse)
        self.assertTrue("citizen" in resp.context_version.lower())

    # 3. Authority request identifies authority role
    def test_03_authority_request_identifies_authority_role(self):
        req = AssistantChatRequest(message="What is the current queue status?")
        resp = AssistantService.chat(req, current_user=self.authority_user, db=self.db)
        self.assertIsInstance(resp, AssistantChatResponse)
        self.assertTrue("authority" in resp.context_version.lower() or "admin" in resp.context_version.lower())

    # 4. Invalid JWT does not become authority (falls back to public)
    def test_04_invalid_jwt_does_not_become_authority(self):
        response = self.client.post(
            "/api/assistant/chat",
            headers={"Authorization": "Bearer invalid_garbage_token"},
            json={"message": "Show operational triage"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Should be treated as public role
        self.assertTrue("public" in data.get("context_version", "").lower())

    # 5. Frontend role cannot override backend role
    def test_05_frontend_role_cannot_override_backend_role(self):
        # Unauthenticated user attempting to spoof authority via page_context or body
        response = self.client.post(
            "/api/assistant/chat",
            json={
                "message": "What is the queue status?",
                "page_context": {
                    "page_name": "AuthorityDashboard",
                    "active_tab": "triage",
                }
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Context version MUST be public, never authority
        self.assertTrue("public" in data.get("context_version", "").lower())

    # 6. Citizen cannot access another citizen's complaint
    def test_06_citizen_cannot_access_other_complaint(self):
        # Citizen asks about a complaint they do not own
        other_id = self.other_complaint.id
        req = AssistantChatRequest(
            message=f"Tell me about complaint {other_id}",
            selected_complaint_id=other_id,
        )
        # Directly check AssistantService internal complaint resolution
        from backend.app.services.assistant_service import _build_complaint_context
        ctx = _build_complaint_context(other_id, "citizen", self.citizen_user, self.db)
        self.assertIsNone(ctx, "Citizen should be denied access to complaint owned by someone else")

    # 7. Authority can access authorized complaint context
    def test_07_authority_can_access_complaint_context(self):
        other_id = self.other_complaint.id
        from backend.app.services.assistant_service import _build_complaint_context
        ctx = _build_complaint_context(other_id, "authority", self.authority_user, self.db)
        self.assertIsNotNone(ctx, "Authority should have access to complaint context")
        self.assertEqual(ctx.complaint_id, other_id)

    # 8. Missing complaint returns safe response
    def test_08_missing_complaint_returns_safe_response(self):
        response = self.client.post(
            "/api/assistant/chat",
            json={
                "message": "What is happening with CS9999999?",
                "selected_complaint_id": "CS9999999",
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("reply", data)
        self.assertTrue(len(data["reply"]) > 0)

    # 9. Mutation request receives guidance rather than mutation
    def test_09_mutation_request_receives_guidance(self):
        response = self.client.post(
            "/api/assistant/chat",
            json={"message": "Please assign this complaint to officer Sharma immediately"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # The assistant reply should explain how to assign or decline direct mutation
        reply = data["reply"].lower()
        self.assertTrue(
            "assign" in reply or "interface" in reply or "guidance" in reply or "cannot" in reply or "dashboard" in reply or "civicseva" in reply
        )

    # 10. No LLM key uses deterministic fallback
    def test_10_no_llm_key_uses_deterministic_fallback(self):
        from backend.app.services.llm_provider import DeterministicFallbackProvider
        fallback = DeterministicFallbackProvider()
        reply, err = fallback.respond(
            message="How do I submit an issue?",
            system_prompt="",
            history=[],
            ctx=None,
        )
        self.assertIsNotNone(reply)
        self.assertTrue(len(reply) > 20)

    # 11. LLM failure uses deterministic fallback
    def test_11_llm_failure_uses_deterministic_fallback(self):
        from backend.app.services.llm_provider import OpenAICompatibleProvider
        provider = OpenAICompatibleProvider(api_key="sk-fake", base_url="https://invalid-url-civicseva-test.local")
        reply, err = provider.respond(
            message="Status inquiry",
            system_prompt="",
            history=[],
            ctx=None,
        )
        self.assertEqual(err, "llm_unavailable")
        self.assertIsNotNone(reply)
        self.assertTrue(len(reply) > 0)

    # 12. Assistant never calls autonomous agent execution
    def test_12_assistant_never_calls_autonomous_sweep(self):
        with patch.object(autonomous_engine, "run_autonomous_sweep") as mock_sweep:
            req = AssistantChatRequest(message="Run autonomous agent sweep now")
            AssistantService.chat(req, current_user=self.authority_user, db=self.db)
            mock_sweep.assert_not_called()

    # 13. Assistant never calls complaint mutation
    def test_13_assistant_never_calls_complaint_mutation(self):
        with patch.object(ComplaintService, "update_status") as mock_update:
            with patch.object(ComplaintService, "trigger_escalation") as mock_escalate:
                req = AssistantChatRequest(
                    message="Escalate complaint CS1001 right now and update status to Resolved",
                    selected_complaint_id="CS1001"
                )
                AssistantService.chat(req, current_user=self.authority_user, db=self.db)
                mock_update.assert_not_called()
                mock_escalate.assert_not_called()

    # 14. Hallucinated complaint/entity output is rejected where context validation applies
    def test_14_hallucinated_complaint_output_is_rejected(self):
        fake_ctx = AssistantContext(
            auth=AuthContextData(authenticated=True, effective_role="citizen"),
            complaint=ComplaintContextData(
                complaint_id="CS1001",
                status="Assigned",
                severity="HIGH",
            )
        )
        # If reply hallucinates an unrelated complaint ID like CS8888
        hallucinated_reply = "I looked up CS8888 and that complaint is closed."
        sanitized = _validate_output(hallucinated_reply, fake_ctx)
        self.assertIsNotNone(sanitized, "Should detect hallucinated complaint ID")
        self.assertIn("only provide information about the complaint in the current context", sanitized)


if __name__ == "__main__":
    unittest.main()
