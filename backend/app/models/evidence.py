"""
Evidence Model
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.session import Base

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False)
    type = Column(String(30), default="image")  # image, audio, document
    file_url = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    ai_analysis = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    complaint = relationship("Complaint", back_populates="evidence_list")
