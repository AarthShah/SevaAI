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

__all__ = [
    "Base",
    "User",
    "Department",
    "Complaint",
    "Evidence",
    "ComplaintHistory",
    "AgentAction",
    "Escalation",
    "Notification"
]
