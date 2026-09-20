"""
Officer Model
Represents municipal field engineers, squad inspectors, and maintenance technicians
available for autonomous geo-proximity dispatch.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from ..database.session import Base

class Officer(Base):
    __tablename__ = "officers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    role = Column(String(100), nullable=False)  # e.g., Senior Civil Engineer, Waste Squad Lead
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(100), nullable=True)
    current_lat = Column(Float, nullable=False)
    current_lon = Column(Float, nullable=False)
    current_address = Column(String(255), nullable=True)
    status = Column(String(30), default="AVAILABLE")  # AVAILABLE, ON_DUTY, BUSY, OFFLINE
    active_tickets = Column(Integer, default=0)
    rating = Column(Float, default=4.8)
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    department = relationship("Department", backref="officers")
    complaints = relationship("Complaint", back_populates="assigned_officer")
