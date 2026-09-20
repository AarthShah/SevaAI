"""
CivicSeva End-to-End Agentic Workflow
Encapsulates state graph execution for civic complaint processing:
START
 ↓
INPUT ANALYZER
 ↓
CLASSIFICATION AGENT
 ↓
EVIDENCE AGENT
 ↓
SEVERITY AGENT
 ↓
DEPARTMENT AGENT
 ↓
COMPLAINT GENERATOR
 ↓
HUMAN CONFIRMATION
 ↓
SUBMISSION
 ↓
TRACKING AGENT
 ↓
FOLLOW-UP AGENT
 ↓
ESCALATION AGENT
 ↓
END
"""

from typing import Dict, Any, Optional
from ..agents.civic_agent import civic_agent
from ..agents.followup_agent import followup_agent

class CivicComplaintWorkflow:
    def run_pre_submission_analysis(
        self,
        text: Optional[str] = None,
        voice_transcription: Optional[str] = None,
        image_path: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        image_filename: Optional[str] = None,
        location: Optional[Dict[str, Any]] = None,
        user_info: Optional[Dict[str, Any]] = None,
        configured_departments: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes workflow phases from START through HUMAN CONFIRMATION.
        """
        result = civic_agent.analyze_complaint(
            text=text,
            voice_transcription=voice_transcription,
            image_path=image_path,
            image_bytes=image_bytes,
            image_filename=image_filename,
            location=location,
            user_info=user_info,
            configured_departments=configured_departments
        )
        return result

    def evaluate_sla_and_followup(
        self,
        complaint_id: str,
        severity: str,
        status: str,
        elapsed_hours: float,
        escalation_count: int = 0
    ) -> Dict[str, Any]:
        """
        Executes the post-submission FOLLOW-UP AGENT and ESCALATION AGENT checks.
        """
        return followup_agent.evaluate_complaint(
            complaint_id=complaint_id,
            severity=severity,
            current_status=status,
            elapsed_hours=elapsed_hours,
            escalation_count=escalation_count
        )

workflow = CivicComplaintWorkflow()
