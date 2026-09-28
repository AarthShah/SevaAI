"""
Complaint Model
"""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database.session import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(30), primary_key=True, index=True)  # e.g., CS1001
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    category = Column(String(80), nullable=False)
    issue_type = Column(String(80), nullable=True)
    description = Column(Text, nullable=False)
    generated_complaint = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String(255), nullable=True)
    severity = Column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(30), default="Submitted", nullable=False)
    # Draft, Submitted, Acknowledged, Assigned, In Progress, Awaiting Verification, Resolved, Rejected, Escalated
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    assigned_officer_id = Column(Integer, ForeignKey("officers.id"), nullable=True)
    assigned_officer_name = Column(String(100), nullable=True)
    assigned_officer_phone = Column(String(30), nullable=True)
    officer_distance_km = Column(Float, nullable=True)
    officer_eta_minutes = Column(Integer, nullable=True)
    cluster_id = Column(String(50), nullable=True)
    is_duplicate = Column(Integer, default=0)
    ai_confidence = Column(Float, default=0.90)
    severity_reason = Column(Text, nullable=True)
    grounded_explanation = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    follow_up_count = Column(Integer, default=0)
    
    # Evidence Authenticity & Forensics Subsystem Fields
    authenticity_score = Column(Float, default=95.0, nullable=True)
    authenticity_verdict = Column(String(30), default="PASS", nullable=True)  # PASS, REVIEW
    authenticity_risk = Column(String(30), default="LOW", nullable=True)        # LOW, MEDIUM, HIGH
    authenticity_flags = Column(Text, nullable=True)                            # JSON list of forensic flags
    requires_human_review = Column(Integer, default=0, nullable=False)          # 0 = Auto-dispatch safe, 1 = Review required
    tampering_score = Column(Float, default=0.05, nullable=True)
    ai_generated_probability = Column(Float, default=0.04, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    citizen = relationship("User", back_populates="complaints", foreign_keys=[citizen_id])
    department = relationship("Department", back_populates="complaints")
    assigned_officer = relationship("Officer", back_populates="complaints", foreign_keys=[assigned_officer_id])
    evidence_list = relationship("Evidence", back_populates="complaint", cascade="all, delete-orphan")
    history = relationship("ComplaintHistory", back_populates="complaint", cascade="all, delete-orphan")
    agent_actions = relationship("AgentAction", back_populates="complaint", cascade="all, delete-orphan")
    escalations = relationship("Escalation", back_populates="complaint", cascade="all, delete-orphan")

