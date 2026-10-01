"""
Watchdog Event Model
Logs autonomous surveillance triggers, stall detection events, and corrective recommendations.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.session import Base

class WatchdogEvent(Base):
    __tablename__ = "watchdog_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False, index=True)
    
    # Event: SLA_RISK_DETECTED, STALLED_WORKFLOW, NO_PROGRESS_UPDATE, ESCALATION_RECOMMENDED
    event = Column(String(60), nullable=False)
    
    # Risk: LOW, MEDIUM, HIGH, CRITICAL
    risk = Column(String(20), default="MEDIUM")
    reason = Column(Text, nullable=False)
    
    # Action: NOTIFY_OFFICER, SEND_REMINDER, INCREASE_PRIORITY, RECOMMEND_REASSIGNMENT, RECOMMEND_ESCALATION
    recommended_action = Column(String(60), nullable=False)
    action_taken = Column(Boolean, default=False)
    action_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    complaint = relationship("Complaint", backref="watchdog_events")
