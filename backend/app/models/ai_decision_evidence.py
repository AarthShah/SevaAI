"""
AI Decision Evidence Model
Maintains auditable, evidence-grounded records for all algorithmic outputs.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.session import Base

class AIDecisionEvidence(Base):
    __tablename__ = "ai_decision_evidence"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False, index=True)
    
    # Decision Types: SEVERITY, DEPARTMENT, DUPLICATE, CLUSTERING, SLA, RESOLUTION, ESCALATION
    decision_type = Column(String(50), nullable=False)
    decision = Column(String(100), nullable=False)
    confidence = Column(Float, default=0.90)
    
    # Structured evidence references: [{ type: "IMAGE", reference: "evidence_1" }, ...]
    evidence_references = Column(Text, nullable=False)  # JSON-encoded array of evidence dicts
    reason_codes = Column(Text, nullable=True)          # JSON-encoded list of reason codes
    reasoning = Column(Text, nullable=False)            # Concise explainable human-readable rationale
    
    model_name = Column(String(100), default="CivicSeva Intelligence Engine")
    model_version = Column(String(30), default="v1.0")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    complaint = relationship("Complaint", backref="decision_evidence_records")
