"""
Location Intelligence Model
Enriches raw coordinates with municipal administrative boundary hierarchy and consistency flags.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.session import Base

class LocationIntelligence(Base):
    __tablename__ = "location_intelligence"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False, unique=True, index=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    street = Column(String(120), nullable=True)
    area = Column(String(120), nullable=True)
    ward = Column(String(50), nullable=True)           # e.g., Ward 12
    zone = Column(String(50), nullable=True)           # e.g., Municipal Zone 3
    landmark = Column(String(150), nullable=True)
    municipal_jurisdiction = Column(String(150), nullable=True)
    responsible_department_name = Column(String(100), nullable=True)
    
    # Metadata consistency inspection
    image_gps_lat = Column(Float, nullable=True)
    image_gps_lon = Column(Float, nullable=True)
    gps_source = Column(String(50), default="CITIZEN_PIN")
    is_consistent = Column(Boolean, default=True)
    
    # Flag: CONSISTENT, LOCATION_REVIEW_REQUIRED
    consistency_flag = Column(String(50), default="CONSISTENT")
    consistency_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    complaint = relationship("Complaint", backref="location_intelligence_record")
