"""
Duplicate Candidate Model
Tracks multi-signal similarity comparisons between civic complaints.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.session import Base

class DuplicateCandidate(Base):
    __tablename__ = "duplicate_candidates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False, index=True)
    candidate_complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False, index=True)
    
    duplicate_probability = Column(Float, nullable=False)
    text_similarity = Column(Float, nullable=True)
    image_similarity = Column(Float, nullable=True)
    distance_meters = Column(Float, nullable=True)
    time_window_hours = Column(Float, nullable=True)
    reasons = Column(Text, nullable=True)  # JSON-encoded list of explanations
    
    # Status: FLAGGED, CONFIRMED_DUPLICATE, CONFIRMED_SEPARATE
    status = Column(String(30), default="FLAGGED")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    complaint = relationship("Complaint", foreign_keys=[complaint_id], backref="duplicate_candidates")
    candidate_complaint = relationship("Complaint", foreign_keys=[candidate_complaint_id])
