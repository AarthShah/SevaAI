"""
Base imports to ensure all models are registered with SQLAlchemy Base metadata.
"""

from .session import Base
from ..models.user import User
from ..models.department import Department
from ..models.complaint import Complaint
from ..models.evidence import Evidence
from ..models.complaint_history import ComplaintHistory
from ..models.agent_action import AgentAction
from ..models.escalation import Escalation
from ..models.notification import Notification

from ..models.officer import Officer
from ..models.resolution_verification import ResolutionEvidence, ResolutionVerification
from ..models.duplicate_candidate import DuplicateCandidate
from ..models.complaint_cluster import ComplaintCluster, ComplaintClusterMember
from ..models.location_intelligence import LocationIntelligence
from ..models.ai_decision_evidence import AIDecisionEvidence
from ..models.sla_prediction import SLAPrediction
from ..models.watchdog_event import WatchdogEvent
from ..models.complaint_feedback import ComplaintFeedback

__all__ = [
    "Base",
    "User",
    "Department",
    "Officer",
    "Complaint",
    "Evidence",
    "ComplaintHistory",
    "AgentAction",
    "Escalation",
    "Notification",
    "ResolutionEvidence",
    "ResolutionVerification",
    "DuplicateCandidate",
    "ComplaintCluster",
    "ComplaintClusterMember",
    "LocationIntelligence",
    "AIDecisionEvidence",
    "SLAPrediction",
    "WatchdogEvent",
    "ComplaintFeedback",
]
