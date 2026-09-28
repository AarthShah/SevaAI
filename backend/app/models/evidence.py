"""
Evidence Model
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
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
    
    # Evidence Authenticity & Forensics Fields
    authenticity_score = Column(Float, default=95.0, nullable=True)
    authenticity_verdict = Column(String(30), default="PASS", nullable=True)
    tampering_score = Column(Float, default=0.05, nullable=True)
    ai_generated_probability = Column(Float, default=0.04, nullable=True)
    forensic_details = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    complaint = relationship("Complaint", back_populates="evidence_list")
