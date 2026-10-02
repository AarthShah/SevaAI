"""Citizen feedback used to measure practical usability after resolution."""

from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ..database.session import Base


class ComplaintFeedback(Base):
    __tablename__ = "complaint_feedback"
    __table_args__ = (CheckConstraint("rating >= 1 AND rating <= 5", name="ck_feedback_rating"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False, unique=True, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    submitted_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    complaint = relationship("Complaint")
