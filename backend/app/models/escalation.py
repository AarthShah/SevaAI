"""
Escalation Model
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.session import Base

class Escalation(Base):
    __tablename__ = "escalations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False)
    reason = Column(Text, nullable=False)
    level = Column(Integer, default=1)  # Level 1: Ward Officer, Level 2: Zonal Commissioner, Level 3: Ombudsman
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

    complaint = relationship("Complaint", back_populates="escalations")
