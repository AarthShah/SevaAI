"""
Resolution Verification & Evidence Models
Stores post-remediation evidence and automated visual comparison assessments.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.session import Base

class ResolutionEvidence(Base):
    __tablename__ = "resolution_evidence"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("officers.id"), nullable=True)
    worker_name = Column(String(100), nullable=True)
    before_image_url = Column(String(255), nullable=True)
    after_image_url = Column(String(255), nullable=False)
    resolution_notes = Column(Text, nullable=True)
    completion_lat = Column(Float, nullable=True)
    completion_lon = Column(Float, nullable=True)
    completion_address = Column(String(255), nullable=True)
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    complaint = relationship("Complaint", backref="resolution_evidence_list")
    verification = relationship("ResolutionVerification", back_populates="evidence", uselist=False, cascade="all, delete-orphan")


class ResolutionVerification(Base):
    __tablename__ = "resolution_verifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resolution_evidence_id = Column(Integer, ForeignKey("resolution_evidence.id"), nullable=False, unique=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False, index=True)
    
    # Status: PENDING, LIKELY_RESOLVED, LIKELY_NOT_RESOLVED, INCONCLUSIVE, HUMAN_REVIEW
    status = Column(String(30), default="PENDING", nullable=False)
    confidence = Column(Float, default=0.85, nullable=False)
    reason_list = Column(Text, nullable=True)  # JSON-encoded array of reasoning bullets
    
    # Authority verification outcome
    authority_decision = Column(String(30), default="PENDING")  # PENDING, CONFIRMED, REOPENED
    authority_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    evidence = relationship("ResolutionEvidence", back_populates="verification")
    complaint = relationship("Complaint", backref="resolution_verifications")
