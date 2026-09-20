"""
Agent Action Model (AI Decision Audit Trail)
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.session import Base

class AgentAction(Base):
    __tablename__ = "agent_actions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False)
    agent_name = Column(String(80), nullable=False)
    action = Column(String(120), nullable=False)
    input_summary = Column(Text, nullable=True)
    output_summary = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    complaint = relationship("Complaint", back_populates="agent_actions")
