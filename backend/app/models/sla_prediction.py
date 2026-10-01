"""
SLA Prediction Model
Stores empirical probability metrics and estimated completion hours based on active workloads and historical telemetry.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.session import Base

class SLAPrediction(Base):
    __tablename__ = "sla_predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False, unique=True, index=True)
    
    target_sla_hours = Column(Float, nullable=False)
    predicted_resolution_hours = Column(Float, nullable=False)
    sla_breach_probability = Column(Float, default=0.10)
    
    # Risk status: LOW_RISK, MEDIUM_RISK, HIGH_RISK, BREACHED
    risk_status = Column(String(30), default="LOW_RISK")
    influencing_factors = Column(Text, nullable=True)  # JSON-encoded array or dict of contributing factors
    
    predicted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    complaint = relationship("Complaint", backref="sla_prediction_record")
